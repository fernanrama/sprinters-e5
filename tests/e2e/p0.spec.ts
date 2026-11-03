import { test, expect, type Page } from "@playwright/test";
import type { Exercise } from "../../api/src/app";
import type { Routine } from "../../shared/routines";

test.beforeEach(async ({ page }) => {
  // External photographs are outside P0; avoid flaky downloads/fallback loops.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"/>',
  }));
});

const cards = (page: Page) => page.locator(".catalog > li");
const search = (page: Page) => page.getByRole("searchbox");
const group = (page: Page, name: string) => page.getByRole("radio", { name, exact: true });

for (const width of [320, 390, 768, 1440]) {
  test(`shell and navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(cards(page)).toHaveCount(14);
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Catálogo" })).toHaveAttribute("aria-current", "page");
    for (const locator of [page.locator(".topbar"), nav, page.locator(".page-shell")]) {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
    await nav.getByRole("link", { name: "Mis rutinas" }).click();
    await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Mis rutinas" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Catálogo" }).click();
    await expect(cards(page)).toHaveCount(14);
    await group(page, "Espalda").click();
    await page.getByLabel("Seleccionar etiqueta").selectOption("Calistenia");
    await search(page).fill("dominadas");
    await expect(cards(page)).toHaveCount(1);
    await expect(page.locator(".tag-chip.active")).toBeVisible();
    await search(page).fill("no-coincide-p0");
    await expect(page.locator(".no-results-panel")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros y ver todos", exact: true }).click();
    await expect(cards(page)).toHaveCount(14);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test("keyboard skip link and navigation keep hash routing", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page).not.toHaveURL(/#page-content/);
  const link = page.getByRole("link", { name: "Mis rutinas", exact: true });
  await link.focus();
  expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/rutinas$/);
});

test("routine order, inline values and RIR 0 survive save/reload; filtering never writes", async ({ page, request }) => {
  const catalog: Exercise[] = await (await request.get("/api/exercises")).json();
  const name = `P0 orden ${Date.now()}`;
  const initial = {
    name,
    items: catalog.slice(0, 2).map((exercise, index) => ({
      id: `item-${index}`, exerciseId: exercise.id, sets: 3, repetitions: 10,
      parameters: { restSeconds: 60, rir: 0 },
    })),
  };
  const response = await request.post("/api/routines", { data: initial });
  expect(response.ok()).toBeTruthy();
  const before = await (await request.get("/api/routines")).json();
  await page.goto("/");
  await search(page).fill("dominadas");
  await expect(cards(page)).toHaveCount(1);
  expect(await (await request.get("/api/routines")).json()).toEqual(before);
  await page.getByRole("link", { name: "Mis rutinas", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: name });
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("button", { name: "Mover abajo", exact: true }).first().click();
  await page.locator(".routine-form-item").first().getByRole("spinbutton").first().fill("5");
  await page.getByRole("button", { name: "Guardar Cambios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
  await page.reload();
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.locator(".routine-form-item").first()).toContainText(catalog[1].name);
  await expect(page.locator(".routine-form-item").first().getByRole("spinbutton").first()).toHaveValue("5");
  const saved: Routine[] = await (await request.get("/api/routines")).json();
  expect(saved.find(r => r.name === name)?.items).toEqual([
    { ...initial.items[1], sets: 5 }, initial.items[0],
  ]);
});

test("HU07 separate/combined filters, counters, clearing and detail preserve state", async ({ page, request }) => {
  const catalog = await (await request.get("/api/exercises")).json();
  await page.goto("/");
  await expect(cards(page)).toHaveCount(catalog.length);
  await group(page, "Espalda").click();
  const back = catalog.filter((e: Exercise) => e.muscleGroup.toLowerCase().includes("espalda") || e.tags?.some((t: string) => t.toLowerCase() === "espalda"));
  await expect(cards(page)).toHaveCount(back.length);
  await expect(page.locator(".catalog")).toContainText("Peso muerto");
  await expect(page.locator(".catalog")).toContainText("Remo");
  await group(page, "Espalda").click();
  await expect(group(page, "Todos")).toHaveAttribute("aria-checked", "true");
  await page.getByLabel("Seleccionar etiqueta").selectOption("Calistenia");
  const calisthenics = catalog.filter((e: Exercise) => e.muscleGroup.toLowerCase().includes("calistenia") || e.tags?.some((t: string) => t.toLowerCase() === "calistenia"));
  await expect(cards(page)).toHaveCount(calisthenics.length);
  await group(page, "Espalda").click();
  await search(page).fill(" dominadas ");
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator(".count")).toContainText("Mostrando 1 de 14");
  const options = await page.locator("#tag-select option").allTextContents();
  expect(options.length).toBeGreaterThan(2);
  await cards(page).first().getByRole("heading", { name: "Dominadas", exact: true }).click();
  const detail = page.getByRole("region", { name: "Ficha del ejercicio" });
  await expect(detail).toContainText("Calistenia");
  await expect(detail).toContainText("Equipamiento:");
  await expect(detail).toContainText("Instrucciones de ejecución:");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(search(page)).toHaveValue(" dominadas ");
  await search(page).fill("no-coincide-p0");
  await expect(page.locator(".no-results-panel")).toBeVisible();
  await expect(page.locator(".no-results-panel")).toContainText("Espalda");
  await page.getByRole("button", { name: "Borrar término de búsqueda" }).click();
  await expect(group(page, "Espalda")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Seleccionar etiqueta")).toHaveValue("Calistenia");
  await expect(cards(page)).toHaveCount(back.filter((e: Exercise) => e.tags?.includes("Calistenia") || e.muscleGroup.includes("Calistenia")).length);
  await page.getByRole("button", { name: "✕ Limpiar filtros", exact: true }).click();
  await expect(cards(page)).toHaveCount(14);
  await expect(page.getByLabel("Seleccionar etiqueta")).toHaveValue("Todas");
  await expect(group(page, "Todos")).toHaveAttribute("aria-checked", "true");
});

test("HU07 chips toggle by keyboard without opening detail", async ({ page }) => {
  await page.goto("/");
  const chip = page.locator(".tag-chip").filter({ hasText: /^Calistenia$/ }).first();
  await chip.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Seleccionar etiqueta")).toHaveValue("Calistenia");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await page.locator(".tag-chip.active").first().click();
  await expect(page.getByLabel("Seleccionar etiqueta")).toHaveValue("Todas");
  await expect(cards(page)).toHaveCount(14);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("catalog empty/error/retry and optional tags remain distinct", async ({ page }) => {
  let mode = "error";
  await page.route("**/api/exercises", async route => {
    if (mode === "error") return route.fulfill({ status: 500, json: { error: "test" } });
    if (mode === "empty") return route.fulfill({ json: [] });
    return route.fulfill({ json: [
      { id: "one", name: "Sin etiquetas", muscleGroup: "Pecho", equipment: "Ninguno", description: "Prueba", instructions: "Prueba" },
      { id: "two", name: "Etiquetas vacías", muscleGroup: "Espalda", equipment: "Ninguno", description: "Prueba", instructions: "Prueba", tags: [] },
    ] });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("No hemos podido cargar");
  mode = "empty";
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(page.getByText("Todavía no hay ejercicios disponibles en el catálogo.")).toBeVisible();
  await expect(page.locator(".no-results-panel")).toHaveCount(0);
  mode = "ready";
  await page.reload();
  await expect(cards(page)).toHaveCount(2);
  await search(page).fill("sin etiquetas");
  await expect(cards(page)).toHaveCount(1);
});

async function createRoutine(page: Page) {
  await page.goto("/#/rutinas");
  await page.getByRole("button", { name: "+ Crear Nueva Rutina" }).click();
  const name = `P0 ${Date.now()}`;
  await page.getByPlaceholder("Ej: Día de Pierna").fill(name);
  await page.locator(".routine-form select").selectOption({ index: 1 });
  const numbers = page.locator(".routine-form input[type=number]");
  await numbers.nth(0).fill("3");
  await numbers.nth(1).fill("12");
  await page.getByRole("button", { name: "+ Añadir", exact: true }).click();
  await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
  return name;
}

test("routine edit/cancel, protected navigation, save and reload use real temporary JSON", async ({ page, request }) => {
  const name = await createRoutine(page);
  const row = page.getByRole("listitem").filter({ hasText: name });
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByPlaceholder("Ej: Día de Pierna").fill(`${name} borrador`);
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("link", { name: "Catálogo", exact: true }).click();
  await expect(page).toHaveURL(/#\/rutinas$/);
  await expect(page.getByPlaceholder("Ej: Día de Pierna")).toHaveValue(`${name} borrador`);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Seguir editando" }).click();
  await expect(page.getByPlaceholder("Ej: Día de Pierna")).toHaveValue(`${name} borrador`);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByPlaceholder("Ej: Día de Pierna")).toHaveValue(name);
  await page.getByRole("button", { name: "Quitar", exact: true }).click();
  await page.getByRole("button", { name: "Guardar Cambios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
  await page.reload();
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.locator(".routine-form-item")).toHaveCount(0);
  const routines = await (await request.get("/api/routines")).json();
  const saved = routines.find((r: Routine) => r.name === name);
  expect(saved.items).toEqual([]);
  expect(saved.version).toBe(2);
});

test("saving blocks navigation and 409 preserves the draft", async ({ page }) => {
  const name = await createRoutine(page);
  await page.getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByPlaceholder("Ej: Día de Pierna").fill(`${name} cambio`);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/routines/*", async route => {
    if (route.request().method() !== "PUT") return route.continue();
    await gate;
    await route.fulfill({ status: 409, json: { error: "Conflicto de versión de prueba" } });
  });
  await page.getByRole("button", { name: "Guardar Cambios", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guardando…", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Catálogo", exact: true }).click();
  await expect(page).toHaveURL(/#\/rutinas$/);
  release();
  await expect(page.getByRole("alert")).toContainText("Conflicto de versión");
  await expect(page.getByPlaceholder("Ej: Día de Pierna")).toHaveValue(`${name} cambio`);
  await expect(page.getByRole("button", { name: "Guardar Cambios", exact: true })).toBeEnabled();
});
