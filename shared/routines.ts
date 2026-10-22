/** Contrato HU02/HU08. El orden de items es el orden de ejecución. */
export type RoutineItem = {
  id: string;
  exerciseId: string;
  sets: number;
  repetitions: number;
  parameters?: Record<string, string | number | boolean | null>;
};

export type Routine = {
  id: string;
  name: string;
  version: number;
  items: RoutineItem[];
};

export type RoutineUpdate = Pick<Routine, "name" | "version" | "items">;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}
function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
export function isRoutineItem(value: unknown): value is RoutineItem {
  if (!record(value) || !text(value.id) || !text(value.exerciseId) ||
      !positive(value.sets) || !positive(value.repetitions)) return false;
  return value.parameters === undefined || (record(value.parameters) &&
    Object.values(value.parameters).every((v) => v === null || typeof v === "string" ||
      typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v))));
}
export function isRoutineUpdate(value: unknown): value is RoutineUpdate {
  return record(value) && text(value.name) && positive(value.version) &&
    Array.isArray(value.items) && value.items.length <= 500 &&
    value.items.every(isRoutineItem) &&
    new Set(value.items.map((item) => item.id)).size === value.items.length;
}
export function isRoutine(value: unknown): value is Routine {
  return record(value) && text(value.id) && isRoutineUpdate(value);
}
