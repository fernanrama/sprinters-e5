import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { createApp } from "./app.js";
import { createRoutineStore, isRoutine, isRoutineCreate, type Routine } from "./routines.js";

const seed = new URL("../data/routines.demo.json", import.meta.url);

test("demo: seis rutinas completas con ejercicios del catálogo y parámetros editables", async () => {
  const routines: Routine[] = JSON.parse(await readFile(seed, "utf8"));
  const catalog: { id: string }[] = JSON.parse(await readFile(new URL("../data/exercises.json", import.meta.url), "utf8"));
  const ids = new Set(catalog.map(exercise => exercise.id));
  assert.equal(routines.length, 6);
  assert.equal(new Set(routines.map(routine => routine.id)).size, 6);
  assert.equal(new Set(routines.map(routine => routine.name)).size, 6);
  for (const routine of routines) {
    assert(isRoutine(routine) && isRoutineCreate(routine), routine.name);
    assert(routine.items.length >= 5 && routine.items.length <= 8, routine.name);
    for (const item of routine.items) {
      assert(ids.has(item.exerciseId), item.exerciseId);
      assert(Number.isSafeInteger(item.parameters?.restSeconds) && item.parameters!.restSeconds! > 0);
      assert(Number.isSafeInteger(item.parameters?.rir) && item.parameters!.rir! >= 0);
      // The current model expresses repetitions, not timed holds.
      assert.notEqual(item.exerciseId, "plancha");
    }
  }
});

test("demo: inicializa, edita por API y conserva cambios al reiniciar sin resembrar", async t => {
  const directory = await mkdtemp(join(tmpdir(), "healthy-life-demo-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = pathToFileURL(join(directory, "demo.json"));
  const app = createApp({ routinesFile: file, routinesSeed: seed });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}/api/routines`;
  const routines: Routine[] = await (await fetch(origin)).json();
  assert.equal(routines.length, 6);
  for (const routine of routines) {
    const response = await fetch(`${origin}/${routine.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...routine, name: `${routine.name} · editada` }),
    });
    assert.equal(response.status, 200, routine.name);
    const saved: Routine = await response.json();
    assert.equal(saved.version, 2);
    assert.deepEqual(saved.items, routine.items);
  }
  const restarted = createRoutineStore(file, seed);
  const saved = await restarted.read();
  assert(saved.every(routine => routine.version === 2 && routine.name.endsWith("· editada")));
  await restarted.remove(saved[0].id);
  assert.equal((await createRoutineStore(file, seed).read()).length, 5);
  assert.equal(await readFile(seed, "utf8"), JSON.stringify(routines, null, 2) + "\n");
});
