import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type RoutineItem = {
  id: string;
  exerciseId: string;
  sets: number;
  repetitions: number;
  parameters?: {
    restSeconds?: number;
    rir?: number;
    [key: string]: unknown;
  };
};

export type Routine = {
  id: string;
  name: string;
  version: number;
  items: RoutineItem[];
};

export type RoutineUpdate = Omit<Routine, "id">;

export class RoutineError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// --- VALIDACIONES ESTRICTAS (Para que pasen los tests) ---

export function isRoutine(value: unknown): value is Routine {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return false;
  if (typeof r.version !== "number" || !Number.isInteger(r.version) || r.version < 1) return false;
  if (!Array.isArray(r.items)) return false;
  
  return r.items.every((i: any) => {
    if (typeof i !== "object" || i === null) return false;
    if (typeof i.id !== "string" || typeof i.exerciseId !== "string") return false;
    if (typeof i.sets !== "number" || !Number.isInteger(i.sets) || i.sets <= 0) return false;
    if (typeof i.repetitions !== "number" || !Number.isInteger(i.repetitions) || i.repetitions <= 0) return false;
    
    if (i.parameters !== undefined) {
      if (typeof i.parameters !== "object" || i.parameters === null) return false;
      const keys = Object.keys(i.parameters);
      if (!keys.every(k => ["restSeconds", "rir"].includes(k))) return false;
      if (i.parameters.restSeconds !== undefined && typeof i.parameters.restSeconds !== "number") return false;
      if (i.parameters.rir !== undefined && typeof i.parameters.rir !== "number") return false;
    }
    return true;
  });
}

export function isRoutineUpdate(value: unknown): value is RoutineUpdate {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  
  if (typeof r.name !== "string" || r.name.trim() === "") return false;
  if (typeof r.version !== "number" || !Number.isInteger(r.version) || r.version < 1) return false;
  if (!Array.isArray(r.items)) return false;

  // Validar duplicados
  const exerciseIds = r.items.map((i: any) => i?.exerciseId).filter(Boolean);
  if (new Set(exerciseIds).size !== exerciseIds.length) return false;

  return r.items.every((i: any) => {
    if (typeof i !== "object" || i === null) return false;
    if (typeof i.id !== "string" || typeof i.exerciseId !== "string") return false;
    if (typeof i.sets !== "number" || !Number.isInteger(i.sets) || i.sets <= 0) return false;
    if (typeof i.repetitions !== "number" || !Number.isInteger(i.repetitions) || i.repetitions <= 0) return false;
    
    if (i.parameters !== undefined) {
      if (typeof i.parameters !== "object" || i.parameters === null) return false;
      const keys = Object.keys(i.parameters);
      if (!keys.every(k => ["restSeconds", "rir"].includes(k))) return false;
      if (i.parameters.restSeconds !== undefined && typeof i.parameters.restSeconds !== "number") return false;
      if (i.parameters.rir !== undefined && typeof i.parameters.rir !== "number") return false;
    }
    return true;
  });
}

// --- ALMACENAMIENTO EN JSON ---

const queues = new Map<string, Promise<unknown>>();

export function createRoutineStore(file: string | URL, seed?: URL) {
  const path = resolve(typeof file === "string" ? file : fileURLToPath(file));
  
  async function read(): Promise<Routine[]> {
    let raw: string;
    try { raw = await readFile(path, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !seed) throw error;
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
      if (!isRoutineUpdate(update)) {
        return Promise.reject(new RoutineError(400, "Datos de rutina inválidos."));
      }

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

    // NUEVO MÉTODO: Guarda el array completo de rutinas (para POST y DELETE)
    async saveAll(routines: Routine[]) {
      const temporary = `${path}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(routines, null, 2) + "\n", { flag: "wx" });
        await rename(temporary, path);
      } finally {
        await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
    },
  };
}
