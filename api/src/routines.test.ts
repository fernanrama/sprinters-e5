import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test, type TestContext } from "node:test";
import { createApp } from "./app.js";
import { createRoutineStore } from "./routines.js";

const seed = new URL("../data/routines.seed.json", import.meta.url);
async function setup(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "sprinters-routines-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const routinesFile = pathToFileURL(join(directory, "routines.json"));
  await writeFile(routinesFile, await readFile(seed));
  async function serve() {
    const server = createApp({ routinesFile }).listen(0, "127.0.0.1");
    await once(server, "listening");
    async function stop() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve()));
    }
    t.after(() => server.listening ? stop() : undefined);
    const address = server.address(); assert(address && typeof address !== "string");
    return { origin: `http://127.0.0.1:${address.port}/api`, stop };
  }
  const app = await serve();
  const original = JSON.parse(await readFile(routinesFile, "utf8"));
  async function put(body: unknown, id = original[0].id) {
    return fetch(`${app.origin}/routines/${id}`, { method: "PUT",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  return { ...app, serve, put, original, routinesFile };
}
test("lectura individual, listado y 404 de rutinas", async (t) => {
  const { origin, original } = await setup(t);
  assert.deepEqual(await (await fetch(`${origin}/routines`)).json(), original);
  assert.deepEqual(await (await fetch(`${origin}/routines/${original[0].id}`)).json(), original[0]);
  assert.equal((await fetch(`${origin}/routines/no-existe`)).status, 404);
});
test("guardar persiste tras recrear el servidor y no cambia otras rutinas", async (t) => {
  const { put, original, routinesFile, stop, serve } = await setup(t);
  const update = { ...original[0], name: "Mi rutina revisada" };
  const response = await put(update); assert.equal(response.status, 200);
  const saved = await response.json(); assert.equal(saved.version, 2);
  assert.deepEqual(saved.items, original[0].items);
  await stop(); const restarted = await serve();
  assert.deepEqual(await (await fetch(`${restarted.origin}/routines/${saved.id}`)).json(), saved);
  const disk = JSON.parse(await readFile(routinesFile, "utf8"));
  assert.deepEqual(disk[1], original[1]);
});
test("dos guardados simultáneos solo aceptan la misma versión una vez", async (t) => {
  const { put, original } = await setup(t);
  const results = await Promise.all([put(original[0]), put(original[0])]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
});
test("dos instancias del almacén comparten la cola para el mismo archivo", async (t) => {
  const { routinesFile, original } = await setup(t);
  const a = createRoutineStore(routinesFile), b = createRoutineStore(routinesFile);
  const results = await Promise.allSettled([a.update(original[0].id, original[0]), b.update(original[0].id, original[0])]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
});
test("datos inválidos o ejercicios inexistentes no modifican el JSON", async (t) => {
  const { put, original, routinesFile } = await setup(t);
  const before = await readFile(routinesFile, "utf8");
  const item = original[0].items[0];
  for (const update of [
    { ...original[0], name: " " }, { ...original[0], version: 0 },
    { ...original[0], items: [{ ...item, sets: -1 }] },
    { ...original[0], items: [{ ...item, repetitions: 1.5 }] },
    { ...original[0], items: [item, item] },
    { ...original[0], items: [{ ...item, exerciseId: "no-existe" }] },
    { ...original[0], items: [{ ...item, parameters: { nested: {} } }] },
  ]) assert.equal((await put(update)).status, 400);
  assert.equal((await put(original[0], "no-existe")).status, 404);
  assert.equal(await readFile(routinesFile, "utf8"), before);
});
test("JSON corrupto devuelve error y nunca reinicia datos", async (t) => {
  const { origin, put, original, routinesFile } = await setup(t);
  await writeFile(routinesFile, "{corrupto");
  assert.equal((await fetch(`${origin}/routines`)).status, 500);
  assert.equal((await put(original[0])).status, 500);
  assert.equal(await readFile(routinesFile, "utf8"), "{corrupto");
});
test("almacenamiento no utilizable devuelve 500 y permite reintentar tras repararlo", async (t) => {
  const { put, original, routinesFile } = await setup(t);
  // Un directorio en lugar de archivo simula almacenamiento no utilizable.
  const before = await readFile(routinesFile, "utf8");
  await rm(routinesFile); await mkdir(routinesFile);
  assert.equal((await put(original[0])).status, 500);
  await rm(routinesFile, { recursive: true }); await writeFile(routinesFile, before);
  assert.equal((await put(original[0])).status, 200);
});
test("inicialización desde semilla solo al faltar el archivo y admite lista vacía", async (t) => {
  const { routinesFile, original } = await setup(t);
  await rm(routinesFile);
  const store = createRoutineStore(routinesFile, seed);
  assert.deepEqual(await store.read(), original);
  await writeFile(routinesFile, "[]"); assert.deepEqual(await store.read(), []);
  await writeFile(routinesFile, "null"); await assert.rejects(() => store.read());
  assert.equal(await readFile(routinesFile, "utf8"), "null");
});
test("JSON de petición mal formado se rechaza con 400", async (t) => {
  const { origin } = await setup(t);
  const response = await fetch(`${origin}/routines/rutina-demo-fuerza`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: "{roto",
  });
  assert.equal(response.status, 400);
});

test("quitar un ejercicio persiste tras reiniciar y conserva parámetros, orden, catálogo y otras rutinas", async (t) => {
  const { put, original, routinesFile, origin, stop, serve } = await setup(t);
  const routine = { ...original[0], items: [
    { id: "primero", exerciseId: "sentadilla", sets: 4, repetitions: 8, parameters: { restSeconds: 90, rir: 0 } },
    { id: "quitar", exerciseId: "plancha", sets: 3, repetitions: 30 },
    { id: "ultimo", exerciseId: "remo-mancuerna", sets: 2, repetitions: 15, parameters: { restSeconds: 60 } },
  ] };
  await writeFile(routinesFile, JSON.stringify([routine, ...original.slice(1)]));
  const catalogBefore = await (await fetch(`${origin}/exercises`)).json();
  const items = [routine.items[0], routine.items[2]];
  const response = await put({ ...routine, items });
  assert.equal(response.status, 200);
  await stop(); const restarted = await serve();
  const reopened = await (await fetch(`${restarted.origin}/routines/${routine.id}`)).json();
  assert.deepEqual(reopened.items, items);
  assert.equal(reopened.version, routine.version + 1);
  assert.deepEqual(JSON.parse(await readFile(routinesFile, "utf8")).slice(1), original.slice(1));
  assert.deepEqual(await (await fetch(`${restarted.origin}/exercises`)).json(), catalogBefore);
});

test("preparar una eliminación sin PUT no cambia los datos persistidos", async (t) => {
  const { original, routinesFile, origin } = await setup(t);
  const before = await readFile(routinesFile, "utf8");
  const draft = structuredClone(original[0]);
  draft.items = draft.items.slice(1);
  assert.deepEqual(await (await fetch(`${origin}/routines/${draft.id}`)).json(), original[0]);
  assert.equal(await readFile(routinesFile, "utf8"), before);
});

test("quitar todos los ejercicios conserva la rutina vacía tras reiniciar", async (t) => {
  const { put, original, stop, serve } = await setup(t);
  assert.equal((await put({ ...original[0], items: [] })).status, 200);
  await stop(); const restarted = await serve();
  const reopened = await (await fetch(`${restarted.origin}/routines/${original[0].id}`)).json();
  assert.equal(reopened.id, original[0].id);
  assert.equal(reopened.name, original[0].name);
  assert.deepEqual(reopened.items, []);
});

test("un borrador antiguo no sobrescribe una eliminación ya guardada", async (t) => {
  const { put, original, origin } = await setup(t);
  const items = original[0].items.slice(1);
  assert.equal((await put({ ...original[0], items })).status, 200);
  assert.equal((await put(original[0])).status, 409);
  assert.deepEqual((await (await fetch(`${origin}/routines/${original[0].id}`)).json()).items, items);
});
