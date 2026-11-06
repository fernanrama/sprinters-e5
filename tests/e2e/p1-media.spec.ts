import { test, expect, type Page } from "@playwright/test";
import type { Exercise } from "../../shared/exercises";
import type { Routine } from "../../shared/routines";

async function decoded(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toBeVisible();
  await expect.poll(() => page.locator(selector).evaluateAll(images => images.every(image =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
  ))).toBe(true);
}

test("real local derivatives decode and match the manifest without image fixtures", async ({ page, request }) => {
  const catalog: Exercise[] = await (await request.get("/api/exercises")).json();
  await page.goto("/");
  await expect(page.locator(".catalog > li")).toHaveCount(catalog.length);
  for (const exercise of catalog.filter(exercise => exercise.images)) {
    const row = page.locator(".catalog > li").filter({ has: page.getByRole("heading", { name: exercise.name, exact: true }) });
    await row.scrollIntoViewIfNeeded();
    const image = row.locator("img");
    await expect.poll(() => image.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await image.evaluate(image => (image as HTMLImageElement).currentSrc))
      .toMatch(new RegExp(`/images/exercises/${exercise.id}-(card|detail)\\.webp$`));
    expect(await image.evaluate(image => getComputedStyle(image).objectFit)).toBe("contain");
  }
});

test("preview/rows use catalog identity after save/reopen and keep media out of routine JSON", async ({ page, request }) => {
  const catalog: Exercise[] = await (await request.get("/api/exercises")).json();
  const name = `P1 imágenes ${Date.now()}`;
  await page.goto("/#/rutinas");
  await page.getByRole("button", { name: "+ Crear Nueva Rutina" }).click();
  await page.getByPlaceholder("Ej: Día de Pierna").fill(name);
  const picker = page.locator(".routine-form select");
  await picker.selectOption(catalog[0].id);
  await decoded(page, ".exercise-selection-preview img");
  await expect(page.locator(".exercise-selection-preview")).toContainText(catalog[0].name);
  await picker.selectOption(catalog[1].id);
  await decoded(page, ".exercise-selection-preview img");
  await expect(page.locator(".exercise-selection-preview img")).toHaveAttribute("src", catalog[1].images!.card.url);
  await page.locator(".routine-form input[type=number]").nth(0).fill("3");
  await page.locator(".routine-form input[type=number]").nth(1).fill("10");
  await page.getByRole("button", { name: "+ Añadir", exact: true }).click();
  await expect(page.locator(".routine-form-item img")).toHaveAttribute("src", catalog[1].images!.thumbnail.url);
  await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: /^Editar / }).click();
  await decoded(page, ".routine-form-item img");
  await expect(page.locator(".routine-form-item img")).toHaveAttribute("src", catalog[1].images!.thumbnail.url);
  const routines: Routine[] = await (await request.get("/api/routines")).json();
  const item = routines.find(routine => routine.name === name)!.items[0];
  expect(item.exerciseId).toBe(catalog[1].id);
  expect(item.parameters?.rir).toBe(0);
  expect(item).not.toHaveProperty("images");
  expect(item).not.toHaveProperty("imageUrl");
});

test("broken sources produce one local fallback and a new selection recovers", async ({ page }) => {
  let failures = 0;
  await page.route("**/images/exercises/sentadilla-*.webp", route => {
    failures++;
    return route.abort();
  });
  await page.goto("/#/rutinas");
  await page.getByRole("button", { name: "+ Crear Nueva Rutina" }).click();
  await page.locator(".routine-form select").selectOption("sentadilla");
  await expect(page.locator(".exercise-selection-preview")).toContainText("Imagen no disponible");
  await expect(page.locator(".exercise-selection-preview img")).toHaveCount(0);
  // The fallback is inline SVG + text: it cannot fail a second image download.
  await expect(page.locator(".exercise-selection-preview svg")).toBeVisible();
  await page.getByPlaceholder("Ej: Día de Pierna").fill("Sigue siendo editable");
  expect(failures).toBe(1);
  await page.locator(".routine-form select").selectOption("remo-mancuerna");
  await decoded(page, ".exercise-selection-preview img");
  await expect(page.locator(".exercise-selection-preview .exercise-image-fallback")).toHaveCount(0);
});

test("missing URL and a changed URL for the same id recover without a remote fallback", async ({ page, request }) => {
  const catalog: Exercise[] = await (await request.get("/api/exercises")).json();
  let mode: "missing" | "broken" | "ready" = "missing";
  const mediaRequests: string[] = [];
  page.on("request", request => { if (request.resourceType() === "image") mediaRequests.push(request.url()); });
  await page.route("**/api/exercises", route => {
    const entry = { ...catalog[0], images: undefined, imageUrl: mode === "missing" ? undefined
      : mode === "broken" ? "/missing-p1-image.webp" : catalog[0].images!.card.url };
    return route.fulfill({ json: [entry] });
  });
  await page.goto("/");
  await expect(page.locator(".catalog .exercise-image-fallback")).toBeVisible();
  expect(mediaRequests.some(url => url.includes("unsplash"))).toBe(false);
  mode = "broken";
  await page.getByRole("link", { name: "Mis rutinas", exact: true }).click();
  await page.getByRole("link", { name: "Catálogo", exact: true }).click();
  await expect(page.locator(".catalog .exercise-image-fallback")).toBeVisible();
  mode = "ready";
  await page.getByRole("link", { name: "Mis rutinas", exact: true }).click();
  await page.getByRole("link", { name: "Catálogo", exact: true }).click();
  await expect(page.locator(".catalog img")).toBeVisible();
  await decoded(page, ".catalog img");
});

for (const width of [320, 390, 768, 1440]) {
  test(`media, detail and routine controls fit ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("heading", { name: "Remo con mancuerna", exact: true }).click();
    await decoded(page, ".modal-window img");
    const media = await page.locator(".modal-window .exercise-image").boundingBox();
    expect(media!.x).toBeGreaterThanOrEqual(0);
    expect(media!.x + media!.width).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.getByRole("link", { name: "Mis rutinas", exact: true }).click();
    await page.getByRole("button", { name: "+ Crear Nueva Rutina" }).click();
    await page.locator(".routine-form select").selectOption("elevaciones-laterales");
    await decoded(page, ".exercise-selection-preview img");
    await page.locator(".routine-form input[type=number]").nth(0).fill("3");
    await page.locator(".routine-form input[type=number]").nth(1).fill("10");
    await page.getByRole("button", { name: "+ Añadir", exact: true }).click();
    await decoded(page, ".routine-form-item img");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.getByRole("button", { name: /^Quitar / })).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear Rutina", exact: true })).toBeVisible();
    const catalog = await (await request.get("/api/exercises")).json();
    expect(catalog).toHaveLength(14);
  });
}
