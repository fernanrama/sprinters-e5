import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isExercise } from "./app.js";

const asset = { url: "/images/test.webp", width: 640, height: 427 };
const exercise = { id: "test", name: "Test", muscleGroup: "Test", equipment: "Test", description: "Test", instructions: "Test" };

test("medios opcionales conservan catálogos sin imagen o etiquetas", () => {
  assert.ok(isExercise(exercise));
  assert.ok(isExercise({ ...exercise, tags: [], imageUrl: "/old.jpg" }));
  assert.ok(isExercise({ ...exercise, images: { thumbnail: asset, card: asset, detail: asset } }));
});

test("las demostraciones son opcionales y solo admiten enlaces HTTPS sin credenciales", () => {
  assert.ok(isExercise({ ...exercise, demonstration: { url: "https://example.com/demo", provider: "Ejemplo" } }));
  for (const demonstration of [null, {}, { url: "https://example.com", provider: " " },
    ...["javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:secret@example.com", "/demo"].map(url => ({ url, provider: "Ejemplo" }))]) {
    assert.equal(isExercise({ ...exercise, demonstration }), false);
  }
});

test("metadatos presentes deben tener las tres variantes y dimensiones positivas", () => {
  for (const images of [null, {}, { thumbnail: asset, card: asset },
    { thumbnail: asset, card: asset, detail: { ...asset, width: 0 } },
    { thumbnail: asset, card: asset, detail: { ...asset, height: 1.5 } },
    { thumbnail: asset, card: asset, detail: { ...asset, url: "" } }]) {
    assert.equal(isExercise({ ...exercise, images }), false);
  }
});

test("recursos locales coinciden con API, hashes y presupuestos del manifiesto", async () => {
  const publicRoot = new URL("../../web/public/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("images/exercises/manifest.json", publicRoot), "utf8"));
  const catalog = JSON.parse(await readFile(new URL("../data/exercises.json", import.meta.url), "utf8"));
  assert.equal(catalog.length, 22);
  assert.equal(manifest.retained.length, 0);
  assert.equal(manifest.resources.length + manifest.retained.length, catalog.length);
  for (const resource of manifest.resources) {
    const entry = catalog.find((item: { id: string }) => item.id === resource.id);
    assert.ok(entry && isExercise(entry));
    assert.equal(entry.imageUrl, resource.derivatives.detail.url);
    for (const [variant, budget] of [["thumbnail", 100000], ["card", 180000], ["detail", 350000]] as const) {
      const asset = resource.derivatives[variant];
      const bytes = await readFile(new URL(asset.url.slice(1), publicRoot));
      assert.equal(bytes.length, asset.bytes);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
      assert.ok(asset.bytes <= budget);
      assert.ok(asset.width <= resource.original.width);
      assert.deepEqual(entry.images[variant], { url: asset.url, width: asset.width, height: asset.height });
    }
  }
});
