import type { RoutineItem } from "../../../shared/routines.js";

/** Quita una entrada del borrador; conserva orden y parámetros de las restantes. */
export function removeRoutineItem(items: RoutineItem[], itemId: string): RoutineItem[] {
  return items.filter((item) => item.id !== itemId);
}
