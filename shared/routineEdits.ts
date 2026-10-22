import type { Routine, RoutineItem } from "./routines.js";

export const MAX_ROUTINE_ITEMS = 500;

/** Solo transforma el borrador; no escribe ni altera la rutina recibida. */
export function appendExercises(routine: Routine, exerciseIds: string[], makeId: () => string): Routine {
  if (routine.items.length + exerciseIds.length > MAX_ROUTINE_ITEMS) {
    throw new Error(`Una rutina admite hasta ${MAX_ROUTINE_ITEMS} ejercicios.`);
  }
  const additions: RoutineItem[] = exerciseIds.map((exerciseId) => ({
    id: makeId(), exerciseId, sets: 3, repetitions: 10,
  }));
  return { ...routine, items: [...routine.items, ...additions] };
}

export function matchesExerciseName(name: string, query: string): boolean {
  const normalize = (value: string) => value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  return normalize(name).includes(normalize(query.trim()));
}
