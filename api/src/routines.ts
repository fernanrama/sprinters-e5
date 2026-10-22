import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isRoutine, type Routine, type RoutineUpdate } from "../../shared/routines.js";

export class RoutineError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Compartida por todas las instancias de la API en este proceso para el mismo archivo.
const queues = new Map<string, Promise<unknown>>();
export function createRoutineStore(file: string | URL, seed?: URL) {
  const path = resolve(typeof file === "string" ? file : fileURLToPath(file));
  async function read(): Promise<Routine[]> {
    let raw: string;
    try { raw = await readFile(path, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !seed) throw error;
      // Solo la ausencia inicial permite crear datos. Un archivo corrupto nunca se reinicia.
      await mkdir(dirname(path), { recursive: true });
      try { await copyFile(seed, path, constants.COPYFILE_EXCL); }
      catch (copyError) {
        if ((copyError as NodeJS.ErrnoException).code !== "EEXIST") throw copyError;
      }
      raw = await readFile(path, "utf8");
    }
    const routines: unknown = JSON.parse(raw);
    if (!Array.isArray(routines) || !routines.every(isRoutine) ||
        new Set(routines.map((r) => r.id)).size !== routines.length) {
      throw new Error("Invalid routines file");
    }
    return routines;
  }
  return {
    read,
    update(id: string, update: RoutineUpdate): Promise<Routine> {
      const previous = queues.get(path) ?? Promise.resolve();
      const task = previous.catch(() => undefined).then(async () => {
        const routines = await read();
        const index = routines.findIndex((r) => r.id === id);
        if (index < 0) throw new RoutineError(404, "Rutina no encontrada.");
        if (routines[index].version !== update.version) {
          throw new RoutineError(409, "La rutina ha cambiado. Recarga antes de volver a guardar.");
        }
        const updated: Routine = { id, name: update.name.trim(),
          version: update.version + 1, items: update.items };
        routines[index] = updated;
        const temporary = `${path}.${randomUUID()}.tmp`;
        try {
          await writeFile(temporary, JSON.stringify(routines, null, 2) + "\n", { flag: "wx" });
          await rename(temporary, path);
        } finally {
          await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
          });
        }
        return updated;
      });
      queues.set(path, task);
      void task.finally(() => { if (queues.get(path) === task) queues.delete(path); }).catch(() => undefined);
      return task;
    },
  };
}
