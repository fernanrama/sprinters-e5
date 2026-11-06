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
export type RoutineCreate = Pick<Routine, "name" | "items">;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isItem(value: unknown): value is RoutineItem {
  if (!record(value) || typeof value.id !== "string" || !value.id.trim() ||
    typeof value.exerciseId !== "string" || !value.exerciseId.trim() ||
    !Number.isSafeInteger(value.sets) || (value.sets as number) <= 0 ||
    !Number.isSafeInteger(value.repetitions) || (value.repetitions as number) <= 0) return false;
  if (value.parameters === undefined) return true;
  if (!record(value.parameters)) return false;
  return Object.entries(value.parameters).every(([key, parameter]) =>
    ["restSeconds", "rir"].includes(key) && typeof parameter === "number" && Number.isFinite(parameter) && parameter >= 0);
}

function validItems(value: unknown): value is RoutineItem[] {
  return Array.isArray(value) && value.every(isItem) && new Set(value.map(item => item.id)).size === value.length;
}

export function isRoutineCreate(value: unknown): value is RoutineCreate {
  return record(value) && typeof value.name === "string" && !!value.name.trim() && validItems(value.items) &&
    new Set(value.items.map(item => item.exerciseId)).size === value.items.length;
}

export function isRoutine(value: unknown): value is Routine {
  // Legacy files may contain a repeated exercise from the old POST contract.
  // Keep them readable so the user can remove the extra entry before saving.
  return record(value) && typeof value.id === "string" && !!value.id.trim() && typeof value.name === "string" &&
    Number.isSafeInteger(value.version) && (value.version as number) >= 1 && validItems(value.items);
}

export function isRoutineUpdate(value: unknown): value is RoutineUpdate {
  if (!record(value)) return false;
  const version = value.version;
  return isRoutineCreate(value) && Number.isSafeInteger(version) && (version as number) >= 1;
}
