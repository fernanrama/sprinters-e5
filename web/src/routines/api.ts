import { isRoutine, isRoutineSchedule, type Routine, type RoutineUpdate, type RoutineSchedule } from "../../../shared/routines";
import { isExercise, type Exercise } from "../../../shared/exercises";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function request(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(`/api${path}`, { cache: "no-store", ...options });
  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : undefined; }
  catch {
    throw new ApiError(response.status, response.ok ? "La respuesta del servidor no es válida." : "No se pudo completar la operación. Vuelve a intentarlo.");
  }
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body && typeof body.error === "string"
      ? body.error : "No se pudo completar la operación.";
    throw new ApiError(response.status, message);
  }
  return body;
}

export async function listRoutines(signal: AbortSignal): Promise<Routine[]> {
  const result = await request("/routines", { signal });
  if (!Array.isArray(result) || !result.every(isRoutine)) throw new Error("La lista de rutinas no es válida.");
  return result;
}

export async function loadRoutine(id: string, signal: AbortSignal): Promise<Routine> {
  const result = await request(`/routines/${encodeURIComponent(id)}`, { signal });
  if (!isRoutine(result)) throw new Error("Los datos de la rutina no son válidos.");
  return result;
}

export async function saveRoutine(routine: Routine): Promise<Routine> {
  const update: RoutineUpdate = { name: routine.name, version: routine.version, items: routine.items };
  const result = await request(`/routines/${encodeURIComponent(routine.id)}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update),
  });
  if (!isRoutine(result)) throw new Error("No se pudo confirmar el guardado. Recarga para comprobarlo.");
  return result;
}

export async function loadCatalog(signal: AbortSignal): Promise<Exercise[]> {
  const result = await request("/exercises", { signal });
  if (!Array.isArray(result) || !result.every(isExercise)) throw new Error("El catálogo no es válido.");
  return result;
}

// NUEVO: Funciones de API para la programación (HU05)
export async function loadSchedules(signal: AbortSignal): Promise<RoutineSchedule[]> {
  const result = await request("/schedules", { signal });
  if (!Array.isArray(result) || !result.every(isRoutineSchedule)) throw new Error("Las programaciones no son válidas.");
  return result;
}

export async function scheduleRoutine(routineId: string, date: string): Promise<RoutineSchedule> {
  const result = await request("/schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routineId, date }),
  });
  if (!isRoutineSchedule(result)) throw new Error("No se pudo confirmar la programación.");
  return result;
}
