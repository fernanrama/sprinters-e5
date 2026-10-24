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

export function isRoutine(value: unknown): value is Routine {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return false;
  if (typeof r.version !== "number" || !Number.isInteger(r.version)) return false;
  if (!Array.isArray(r.items)) return false;
  
  return r.items.every((i: any) => 
    typeof i === "object" && i !== null &&
    typeof i.id === "string" &&
    typeof i.exerciseId === "string" &&
    typeof i.sets === "number" && Number.isInteger(i.sets) && i.sets > 0 &&
    typeof i.repetitions === "number" && Number.isInteger(i.repetitions) && i.repetitions > 0 &&
    (i.parameters === undefined || (typeof i.parameters === "object" && i.parameters !== null))
  );
}

export function isRoutineUpdate(value: unknown): value is RoutineUpdate {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  
  // Validaciones estrictas exigidas por routines.test.ts
  if (typeof r.name !== "string" || r.name.trim() === "") return false;
  if (typeof r.version !== "number" || !Number.isInteger(r.version) || r.version < 1) return false;
  if (!Array.isArray(r.items)) return false;

  return r.items.every((i: any) => 
    typeof i === "object" && i !== null &&
    typeof i.id === "string" &&
    typeof i.exerciseId === "string" && 
    typeof i.sets === "number" && Number.isInteger(i.sets) && i.sets > 0 &&
    typeof i.repetitions === "number" && Number.isInteger(i.repetitions) && i.repetitions > 0 &&
    (i.parameters === undefined || (typeof i.parameters === "object" && i.parameters !== null))
  );
}
