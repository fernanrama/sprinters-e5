import assert from "node:assert/strict";
import { test } from "node:test";
import { appendExercises, matchesExerciseName } from "../../shared/routineEdits.js";
import type { Routine } from "../../shared/routines.js";

test("añadir permite repetidos independientes sin mutar datos ni parámetros anteriores", () => {
  const routine: Routine = { id: "a", name: "Rutina", version: 1,
    items: [{ id: "original", exerciseId: "sentadilla", sets: 4, repetitions: 8, parameters: { rir: 2 } }] };
  const before = structuredClone(routine);
  let count = 0;
  const result = appendExercises(routine, ["sentadilla", "remo-mancuerna", "sentadilla"], () => `new-${++count}`);
  assert.deepEqual(routine, before);
  assert.deepEqual(result.items[0], before.items[0]);
  assert.deepEqual(result.items.slice(1).map((i) => [i.id, i.sets, i.repetitions]), [["new-1", 3, 10], ["new-2", 3, 10], ["new-3", 3, 10]]);
  assert.equal(new Set(result.items.map((i) => i.id)).size, 4);
});
test("añadir a una rutina vacía y respetar el límite de almacenamiento", () => {
  const routine: Routine = { id: "a", name: "Rutina", version: 1, items: [] };
  assert.equal(appendExercises(routine, ["sentadilla"], () => "nuevo").items.length, 1);
  assert.throws(() => appendExercises(routine, Array(501).fill("sentadilla"), () => "nuevo"), /500/);
  assert.deepEqual(routine.items, []);
});
test("búsqueda por nombre admite mayúsculas, tildes y espacios; vacío devuelve todos", () => {
  assert(matchesExerciseName("Curl de bíceps", " BICEPS "));
  assert(matchesExerciseName("Sentadilla", "sent"));
  assert(matchesExerciseName("Sentadilla", "  "));
  assert(!matchesExerciseName("Sentadilla", "inexistente"));
});
