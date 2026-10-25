import assert from "node:assert/strict";
import { test } from "node:test";
import { removeRoutineItem } from "../../web/src/routines/routineDraft.js";
import type { RoutineItem } from "../../shared/routines.js";

test("quitar por id solo elimina la entrada elegida, sin mutar el original ni sus parámetros", () => {
  const items: RoutineItem[] = [
    { id: "a", exerciseId: "sentadilla", sets: 4, repetitions: 8, parameters: { rir: 0, restSeconds: 90 } },
    { id: "b", exerciseId: "remo-mancuerna", sets: 3, repetitions: 12, parameters: { restSeconds: 60 } },
    { id: "c", exerciseId: "sentadilla", sets: 2, repetitions: 15 },
  ];
  const before = structuredClone(items);
  assert.deepEqual(removeRoutineItem(items, "a"), before.slice(1));
  assert.deepEqual(removeRoutineItem(items, "b"), [before[0], before[2]]);
  assert.deepEqual(items, before);
  assert.deepEqual(removeRoutineItem(items, "no-existe"), before);
});

test("quitar la última entrada produce un borrador vacío", () => {
  const items: RoutineItem[] = [{ id: "a", exerciseId: "sentadilla", sets: 3, repetitions: 10 }];
  assert.deepEqual(removeRoutineItem(items, "a"), []);
  assert.equal(items.length, 1);
  assert.deepEqual(removeRoutineItem([], "a"), []);
});
