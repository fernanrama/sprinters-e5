import { readFile } from "node:fs/promises";
import express, { Router, type ErrorRequestHandler } from "express";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
};

function isExercise(value: unknown): value is Exercise {
  if (typeof value !== "object" || value === null) return false;
  const fields = value as Record<string, unknown>;
  return ["id", "name", "muscleGroup", "equipment"].every(
    (field) => typeof fields[field] === "string" && fields[field].length > 0,
  );
}

export function createApp(options: {
  catalogFile?: URL;
  webDirectory?: string;
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  const router = Router();
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

  // /api sirve a la web compilada; las rutas directas facilitan probar la API.
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
