import { readFile } from "node:fs/promises";
import express, { Router, type ErrorRequestHandler } from "express";
import { createRoutineStore, RoutineError, isRoutineUpdate } from "./routines.js";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string;
  instructions: string;
};

function isExercise(value: unknown): value is Exercise {
  if (typeof value !== "object" || value === null) return false;
  const fields = value as Record<string, unknown>;
  return ["id", "name", "muscleGroup", "equipment", "description", "instructions"].every(
    (field) => typeof fields[field] === "string" && fields[field].length > 0,
  );
}

export function createApp(options: {
  catalogFile?: URL;
  webDirectory?: string;
  routinesFile?: URL;
  routinesSeed?: URL;
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  const router = Router();
  router.use(express.json({ limit: "256kb" }));
  const store = createRoutineStore(
    options.routinesFile ?? new URL("../data/routines.local.json", import.meta.url),
    options.routinesSeed,
  );
  const catalogFile = options.catalogFile ??
    new URL("../data/exercises.json", import.meta.url);

  router.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "sprinters-e5-api" });
  });

  router.get("/exercises", async (_request, response) => {
    const catalog: unknown = JSON.parse(await readFile(catalogFile, "utf8"));
    if (!Array.isArray(catalog) || !catalog.every(isExercise)) {
      throw new Error("Invalid exercise catalog");
    }
    response.json(catalog);
  });

  router.get("/routines", async (_request, response) => {
    response.set("Cache-Control", "no-store").json(await store.read());
  });
  
  router.get("/routines/:id", async (request, response) => {
    const routine = (await store.read()).find((r) => r.id === request.params.id);
    if (!routine) throw new RoutineError(404, "Rutina no encontrada.");
    response.set("Cache-Control", "no-store").json(routine);
  });

  router.post("/routines", async (request, response) => {
    if (
      typeof request.body !== "object" || request.body === null ||
      typeof request.body.name !== "string" || request.body.name.trim() === "" ||
      !Array.isArray(request.body.items)
    ) {
      throw new RoutineError(400, "Revisa el nombre y los ejercicios de la rutina.");
    }

    const catalog: unknown = JSON.parse(await readFile(catalogFile, "utf8"));
    if (!Array.isArray(catalog) || !catalog.every(isExercise)) throw new Error("Invalid exercise catalog");
    const ids = new Set(catalog.map((exercise) => exercise.id));
    if (request.body.items.some((item: any) => !ids.has(item.exerciseId))) {
      throw new RoutineError(400, "Uno de los ejercicios no está disponible en el catálogo.");
    }

    const newRoutine = {
      id: `rutina-${Date.now()}`,
      name: request.body.name.trim(),
      version: 1,
      items: request.body.items
    };

    const routines = await store.read();
    routines.push(newRoutine);
    await store.saveAll(routines);
    
    response.status(201).json(newRoutine);
  });
  
  router.put("/routines/:id", async (request, response) => {
    // Mensaje de error amigable si falla la validación estricta
    if (!isRoutineUpdate(request.body)) {
      throw new RoutineError(400, "Los datos de la rutina no son válidos. Asegúrate de que las series y repeticiones no sean negativas ni decimales, y de que no haya ejercicios duplicados.");
    }
    const catalog: unknown = JSON.parse(await readFile(catalogFile, "utf8"));
    if (!Array.isArray(catalog) || !catalog.every(isExercise)) throw new Error("Invalid exercise catalog");
    const ids = new Set(catalog.map((exercise) => exercise.id));
    if (request.body.items.some((item: { exerciseId: string }) => !ids.has(item.exerciseId))) {
      throw new RoutineError(400, "Uno de los ejercicios no está disponible en el catálogo.");
    }
    response.set("Cache-Control", "no-store").json(await store.update(request.params.id, request.body));
  });

  router.delete("/routines/:id", async (request, response) => {
    const routines = await store.read();
    const filtered = routines.filter(r => r.id !== request.params.id);
    
    if (routines.length === filtered.length) {
      throw new RoutineError(404, "Rutina no encontrada.");
    }
    
    await store.saveAll(filtered);
    response.status(204).send();
  });

  app.use("/api", router);
  app.use(router);
  if (options.webDirectory) app.use(express.static(options.webDirectory));

  app.use((_request, response) => {
    response.status(404).json({ error: "Recurso no encontrado." });
  });
  
  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof RoutineError) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
      response.status(400).json({ error: "La petición JSON no es válida o es demasiado grande." });
      return;
    }
    if (_request.path.startsWith("/routines") || _request.path.startsWith("/api/routines")) {
      console.error("No se pudieron procesar las rutinas:", error.message);
      response.status(500).json({ error: "No se pudieron cargar o guardar las rutinas. Inténtalo de nuevo." });
      return;
    }
    console.error("No se pudo cargar el catálogo:", error.message);
    response.status(500).json({ error: "No se pudo cargar el catálogo." });
  };
  app.use(handleError);
  return app;
}
