import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";

async function serve(t: TestContext, catalogFile?: URL) {
  const server = createApp({ catalogFile }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

async function fixture(t: TestContext, content: string) {
  const directory = await mkdtemp(join(tmpdir(), "sprinters-api-"));
  const file = join(directory, "exercises.json");
  await writeFile(file, content);
  t.after(async () => {
    await unlink(file);
    await rmdir(directory);
  });
  return pathToFileURL(file);
}

test("el catálogo de la API coincide con el JSON y está disponible para la web", async (t) => {
  const origin = await serve(t);
  const expected = JSON.parse(await readFile(
    new URL("../data/exercises.json", import.meta.url), "utf8",
  ));
  for (const route of ["/exercises", "/api/exercises"]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
  }
});

test("un catálogo vacío es una respuesta válida", async (t) => {
  const origin = await serve(t, await fixture(t, "[]"));
  const response = await fetch(origin + "/exercises");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test("datos mal formados producen un error controlado sin exponer detalles", async (t) => {
  const origin = await serve(t, await fixture(t, '[{"name":"Incompleto"}]'));
  const response = await fetch(origin + "/exercises");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudo cargar el catálogo." });
});

test("archivo inexistente da 500 controlado", async (t) => {
  const origin = await serve(t, pathToFileURL("/ruta/que/no/existe.json"));
  const response = await fetch(origin + "/exercises");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudo cargar el catálogo." });
});

test("JSON inválido da 500 controlado", async (t) => {
  const origin = await serve(t, await fixture(t, "{no es json}"));
  const response = await fetch(origin + "/exercises");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudo cargar el catálogo." });
});

test("catálogo que no es array da 500 controlado", async (t) => {
  const origin = await serve(t, await fixture(t, '{"id":"1"}'));
  const response = await fetch(origin + "/exercises");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudo cargar el catálogo." });
});

test("ejercicio con nombre vacío da 500 controlado", async (t) => {
  const origin = await serve(t, await fixture(t,
    '[{"id":"1","name":"","muscleGroup":"pecho","equipment":"barra"}]'
  ));
  const response = await fetch(origin + "/exercises");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudo cargar el catálogo." });
});
