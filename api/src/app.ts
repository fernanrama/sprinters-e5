import { readFile } from "node:fs/promises";
import express, { Router, type ErrorRequestHandler } from "express";
import compression from "compression";
import { createRoutineStore, createScheduleStore, RoutineError, isRoutineCreate, isRoutineUpdate } from "./routines.js";
import { isExercise } from "../../shared/exercises.js";
import type { Exercise } from "../../shared/exercises.js";
export type { Exercise } from "../../shared/exercises.js";
export { isExercise } from "../../shared/exercises.js";

export function createApp(options: {
  catalogFile?: URL;
  webDirectory?: string;
  routinesFile?: URL;
  routinesSeed?: URL;
  scheduleFile?: URL;
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(compression());
  const router = Router();
  router.use(express.json({ limit: "256kb" }));
  
  const store = createRoutineStore(
    options.routinesFile ?? new URL("../data/routines.local.json", import.meta.url),
    options.routinesSeed,
  );
  const scheduleStore = createScheduleStore(
    options.scheduleFile ?? new URL("../data/schedules.local.json", import.meta.url)
  );
  const catalogFile = options.catalogFile ??
    new URL("../data/exercises.json", import.meta.url);

  router.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "sprinters-e5-api" });
  });

  router.get("/exercises", async (request, response) => {
    const catalog: unknown = JSON.parse(await readFile(catalogFile, "utf8"));
    if (!Array.isArray(catalog) || !catalog.every(isExercise)) {
      throw new Error("Invalid exercise catalog");
    }
    let exercises = catalog;
    const groupQuery = typeof request.query.group === "string" ? request.query.group.trim().toLowerCase() : null;
    const tagQuery = typeof request.query.tag === "string" ? request.query.tag.trim().toLowerCase() : null;
    if (groupQuery) {
      exercises = exercises.filter((ex) =>
        ex.muscleGroup.toLowerCase().includes(groupQuery) ||
        (ex.tags && ex.tags.some((t) => t.toLowerCase() === groupQuery)),
      );
    }
    if (tagQuery) {
      exercises = exercises.filter((ex) =>
        ex.tags && ex.tags.some((t) => t.toLowerCase() === tagQuery),
      );
    }
    response.json(exercises);
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
    if (!isRoutineCreate(request.body)) {
      throw new RoutineError(400, "Revisa el nombre, los parámetros y los ejercicios de la rutina. Cada ejercicio solo puede aparecer una vez.");
    }
    const catalog: unknown = JSON.parse(await readFile(catalogFile, "utf8"));
    if (!Array.isArray(catalog) || !catalog.every(isExercise)) throw new Error("Invalid exercise catalog");
    const ids = new Set(catalog.map((exercise) => exercise.id));
    if (request.body.items.some(item => !ids.has(item.exerciseId))) {
      throw new RoutineError(400, "Uno de los ejercicios no está disponible en el catálogo.");
    }
    response.status(201).json(await store.create(request.body));
  });
  
  router.put("/routines/:id", async (request, response) => {
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
    await store.remove(request.params.id);
    response.status(204).send();
  });


  router.get("/schedules", async (_request, response) => {
    response.set("Cache-Control", "no-store").json(await scheduleStore.read());
  });

  router.post("/schedules", async (request, response) => {
    const { routineId, date } = request.body;
    if (typeof routineId !== "string" || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new RoutineError(400, "Datos de programación inválidos. Se requiere routineId y date (YYYY-MM-DD).");
    }
    const routine = (await store.read()).find(r => r.id === routineId);
    if (!routine) throw new RoutineError(404, "Rutina no encontrada.");
    const newSchedule = await scheduleStore.create(routineId, date);
    response.status(201).json(newSchedule);
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
    if (_request.path.startsWith("/routines") || _request.path.startsWith("/api/routines") || _request.path.startsWith("/schedules")) {
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
