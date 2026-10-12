import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import express, { Router, type ErrorRequestHandler } from "express";
import Database from "better-sqlite3";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  imageUrl: string;
  instructions: string;
};

type Routine = {
  id: string;
  name: string;
  createdAt: string;
};

type RoutineItem = {
  exerciseId: string;
  series: number;
  reps: number;
};

type RoutineWithItems = Routine & { items: RoutineItem[] };

function isExercise(value: unknown): value is Exercise {
  if (typeof value !== "object" || value === null) return false;
  const fields = value as Record<string, unknown>;
  return ["id", "name", "muscleGroup", "equipment", "imageUrl", "instructions"].every(
    (field) => typeof fields[field] === "string" && fields[field].length > 0,
  );
}

async function loadCatalog(catalogFile: URL): Promise<Exercise[]> {
  const catalog: unknown = JSON.parse(await readFile(catalogFile, "utf8"));
  if (!Array.isArray(catalog) || !catalog.every(isExercise)) {
    throw new Error("Invalid exercise catalog");
  }
  return catalog;
}

export function createApp(options: {
  catalogFile?: URL;
  webDirectory?: string;
  dbFile?: string;
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  const router = Router();
  const catalogFile = options.catalogFile ??
    new URL("../data/exercises.json", import.meta.url);

  // --- Persistencia SQLite (rutinas) ---
  // Si se pasa dbFile, se crea el directorio si no existe y se usa el archivo.
  // Si no se pasa dbFile (p. ej. en tests), se usa una BD en memoria.
  let db: Database.Database;
  if (options.dbFile) {
    mkdirSync(dirname(options.dbFile), { recursive: true });
    db = new Database(options.dbFile);
  } else {
    db = new Database(":memory:");
  }

  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routine_items (
      routine_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      series INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (routine_id, position),
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
    );
  `);

  // --- Endpoints existentes ---
  router.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "sprinters-e5-api" });
  });

  router.get("/exercises", async (_request, response) => {
    const catalog = await loadCatalog(catalogFile);
    response.json(catalog);
  });

  router.get("/exercises/:id", async (request, response) => {
    const catalog = await loadCatalog(catalogFile);
    const exercise = catalog.find((item) => item.id === request.params.id);
    if (!exercise) {
      response.status(404).json({ error: "Ejercicio no encontrado." });
      return;
    }
    response.json(exercise);
  });

  // --- Endpoints de rutinas (HU02) ---
  router.get("/routines", (_request, response) => {
    const routines = db.prepare(
      "SELECT id, name, created_at AS createdAt FROM routines ORDER BY created_at DESC",
    ).all() as Routine[];
    response.json(routines);
  });

  router.get("/routines/:id", (request, response) => {
    const routine = db.prepare(
      "SELECT id, name, created_at AS createdAt FROM routines WHERE id = ?",
    ).get(request.params.id) as Routine | undefined;

    if (!routine) {
      response.status(404).json({ error: "Rutina no encontrada." });
      return;
    }

    const items = db.prepare(
      "SELECT exercise_id AS exerciseId, series, reps FROM routine_items WHERE routine_id = ? ORDER BY position",
    ).all(routine.id) as RoutineItem[];

    const result: RoutineWithItems = { ...routine, items };
    response.json(result);
  });

  router.post("/routines", express.json(), async (request, response) => {
    const body = request.body as { name?: unknown; items?: unknown };
    const { name, items: rawItems } = body;

    if (typeof name !== "string" || name.trim().length === 0) {
      response.status(400).json({ error: "El nombre de la rutina es obligatorio." });
      return;
    }
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      response.status(400).json({ error: "La rutina debe tener al menos un ejercicio." });
      return;
    }

    const items: RoutineItem[] = [];
    for (const raw of rawItems) {
      if (typeof raw !== "object" || raw === null) {
        response.status(400).json({ error: "Ejercicio inválido." });
        return;
      }
      const item = raw as Record<string, unknown>;
      if (
        typeof item.exerciseId !== "string" ||
        typeof item.series !== "number" || item.series <= 0 ||
        typeof item.reps !== "number" || item.reps <= 0
      ) {
        response.status(400).json({
          error: "Series y repeticiones deben ser números positivos.",
        });
        return;
      }
      items.push({
        exerciseId: item.exerciseId,
        series: item.series,
        reps: item.reps,
      });
    }

    const catalog = await loadCatalog(catalogFile);
    const validIds = new Set(catalog.map((exercise) => exercise.id));
    for (const item of items) {
      if (!validIds.has(item.exerciseId)) {
        response.status(400).json({ error: `Ejercicio desconocido: ${item.exerciseId}` });
        return;
      }
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const trimmedName = name.trim();

    const insertRoutine = db.prepare(
      "INSERT INTO routines (id, name, created_at) VALUES (?, ?, ?)",
    );
    const insertItem = db.prepare(
      "INSERT INTO routine_items (routine_id, exercise_id, series, reps, position) VALUES (?, ?, ?, ?, ?)",
    );

    const tx = db.transaction(() => {
      insertRoutine.run(id, trimmedName, createdAt);
      items.forEach((item, index) => {
        insertItem.run(id, item.exerciseId, item.series, item.reps, index);
      });
    });
    tx();

    const created: RoutineWithItems = {
      id,
      name: trimmedName,
      createdAt,
      items,
    };
    response.status(201).json(created);
  });

  // --- Montaje ---
  app.use("/api", router);
  app.use(router);
  if (options.webDirectory) app.use(express.static(options.webDirectory));

  app.use((_request, response) => {
    response.status(404).json({ error: "Recurso no encontrado." });
  });

  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error("No se pudo cargar el catálogo:", error.message);
    response.status(500).json({ error: "No se pudo cargar el catálogo." });
  };
  app.use(handleError);

  return app;
}
