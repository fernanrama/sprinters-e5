import { isRoutine, type Routine, type RoutineUpdate } from "../../../shared/routines";
export type Exercise = { id: string; name: string; muscleGroup: string; equipment: string };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function request(path: string, options?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { cache: "no-store", ...options });
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new Error("No se puede conectar con el servidor. Comprueba la conexión y vuelve a intentarlo.");
  }
  const body: unknown = await response.json();
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
  if (!Array.isArray(result) || !result.every((e) => e && typeof e.id === "string" &&
    typeof e.name === "string" && typeof e.muscleGroup === "string" && typeof e.equipment === "string")) {
    throw new Error("El catálogo no es válido.");
  }
  return result;
}
