import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { catalogFixture, catalogSize } from "./catalog-fixture";

async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map(({ id, nodes }) => ({ id, elements: nodes.map(node => ({ html: node.html, reason: node.failureSummary })) }))).toEqual([]);
}

test("keyboard alone navigates, creates, edits, saves and reopens a routine", async ({ page }) => {
  async function tabTo(target: Locator) {
    for (let i = 0; i < 100; i++) {
      if (await target.evaluate(el => el === document.activeElement)) {
        await expect(target).toBeInViewport();
        expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).toBe("solid");
        return;
      }
      await page.keyboard.press("Tab");
    }
    throw new Error(`Control not reachable by Tab: ${await target.getAttribute("aria-label")}`);
  }
  const name = `Solo teclado ${Date.now()}`;
  await page.goto("/");
  await expect(page.locator(".catalog > li")).toHaveCount(catalogSize);
  await tabTo(page.getByRole("link", { name: "Mis rutinas", exact: true }));
  await page.keyboard.press("Enter");
  await tabTo(page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true }));
  await page.keyboard.press("Enter");
  await tabTo(page.getByRole("textbox"));
  await page.keyboard.type(name);
  await tabTo(page.getByLabel("Ejercicio", { exact: true }));
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Ejercicio", { exact: true })).toHaveValue(catalogFixture[0].id);
  const picker = page.getByRole("region", { name: "Añadir ejercicio", exact: true });
  await tabTo(picker.getByLabel("Series", { exact: true }));
  await page.keyboard.type("3");
  await page.keyboard.press("Tab");
  await page.keyboard.type("10");
  await tabTo(picker.getByRole("button", { name: "+ Añadir", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.locator(".routine-form-item")).toHaveCount(1);
  await tabTo(page.getByRole("button", { name: "Crear Rutina", exact: true }));
  await page.keyboard.press("Enter");
  const edit = page.getByRole("button", { name: `Editar ${name}`, exact: true });
  await expect(edit).toBeVisible();
  await tabTo(edit);
  await page.keyboard.press("Enter");
  const series = page.getByRole("spinbutton", { name: /^Series de / });
  await tabTo(series);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("4");
  await tabTo(page.getByRole("button", { name: "Guardar Cambios", exact: true }));
  await page.keyboard.press("Enter");
  await expect(edit).toBeVisible();
  await page.reload();
  await tabTo(edit);
  await page.keyboard.press("Enter");
  await expect(series).toHaveValue("4");
  await expect(page.locator(".routine-form-item")).toContainText("Descanso: 0 s");
  await expect(page.locator(".routine-form-item")).toContainText("RIR: 0");
});

test("malformed catalog entries show a recoverable error instead of crashing filters or exposing unsafe links", async ({ page }) => {
  const invalid = [{ id: "incomplete" }, { ...catalogFixture[0], tags: [null] },
    { ...catalogFixture[0], demonstration: { url: "javascript:alert(1)", provider: "Ejemplo" } }];
  let index = 0;
  await page.route("**/api/exercises", route => route.fulfill({ json: index < invalid.length ? [invalid[index]] : catalogFixture }));
  await page.goto("/");
  for (; index < invalid.length;) {
    await expect(page.getByRole("alert")).toContainText("No hemos podido cargar");
    await expect(page.locator(".catalog > li")).toHaveCount(0);
    await accessible(page);
    index++;
    await page.getByRole("button", { name: "Volver a intentar", exact: true }).click();
  }
  await expect(page.locator(".catalog > li")).toHaveCount(catalogSize);
});

test("WCAG automated checks cover catalog, details, zero results, list, editor and discard dialog", async ({ page }) => {
  await page.route("**/api/routines", route => route.fulfill({ json: [] }));
  await page.goto("/");
  await expect(page.locator(".catalog > li")).toHaveCount(catalogSize);
  await accessible(page);
  await page.getByRole("button", { name: "Ver ficha de Sentadilla goblet con kettlebell", exact: true }).click();
  await accessible(page);
  const link = page.getByRole("link", { name: "Ver demostración en NASM", exact: true });
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute("target", "_blank");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cerrar", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("searchbox").fill("no-existe-este-ejercicio");
  await expect(page.getByRole("region", { name: "Sin resultados", exact: true })).toBeVisible();
  await accessible(page);
  await page.getByRole("link", { name: "Mis rutinas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu primera rutina empieza aquí" })).toBeVisible();
  await accessible(page);
  await page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true }).click();
  await accessible(page);
  await page.getByRole("textbox").fill("Borrador accesible");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await accessible(page);
});

test("all 22 local photographs decode; credits are available without third-party image requests", async ({ page }) => {
  const externalImages: string[] = [];
  page.on("request", request => {
    if (request.resourceType() === "image" && new URL(request.url()).hostname !== "127.0.0.1") externalImages.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".catalog > li")).toHaveCount(catalogSize);
  for (const entry of catalogFixture) {
    const button = page.getByRole("button", { name: `Ver ficha de ${entry.name}`, exact: true });
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const image = page.getByRole("dialog").locator("img");
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(image).toHaveAttribute("src", entry.images!.detail.url);
    await page.keyboard.press("Escape");
  }
  expect(externalImages).toEqual([]);
  await page.getByRole("link", { name: "Créditos de imágenes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Créditos de imágenes", exact: true })).toBeVisible();
  await expect(page.getByText("Andrea Coach G", { exact: false })).toBeVisible();
  await accessible(page);
});

test("duplicate selection and fractional repetitions are rejected without modifying the draft", async ({ page }) => {
  await page.goto("/#/rutinas");
  await page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true }).click();
  await page.getByRole("textbox").fill("Entrada única");
  const picker = page.getByRole("region", { name: "Añadir ejercicio", exact: true });
  const select = picker.getByLabel("Ejercicio", { exact: true });
  await select.selectOption("plancha");
  await picker.getByLabel("Series", { exact: true }).fill("2.5");
  await picker.getByLabel("Repeticiones", { exact: true }).fill("10");
  await picker.getByRole("button", { name: "+ Añadir", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("número entero");
  await expect(picker.getByLabel("Series", { exact: true })).toBeFocused();
  await expect(page.locator(".routine-form-item")).toHaveCount(0);
  await picker.getByLabel("Series", { exact: true }).fill("3");
  await picker.getByRole("button", { name: "+ Añadir", exact: true }).click();
  await select.selectOption("plancha");
  await picker.getByRole("button", { name: "+ Añadir", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ya está en tu rutina");
  await expect(select).toBeFocused();
  await expect(page.locator(".routine-form-item")).toHaveCount(1);
  const series = page.getByRole("spinbutton", { name: /^Series de / });
  await series.fill("1.5");
  await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
  await expect(series).toBeFocused();
  await expect(series).toHaveAccessibleDescription("Series y repeticiones: números enteros mayores que 0.");
  await expect(page.getByRole("alert")).toContainText("números enteros");
  await accessible(page);
});

test("legacy duplicate routine is repairable and cancellation sends no write", async ({ page }) => {
  let writes = 0;
  await page.route("**/api/routines", route => route.fulfill({ json: [{ id: "legacy", name: "Rutina antigua", version: 1,
    items: ["a", "b"].map(id => ({ id, exerciseId: "plancha", sets: 3, repetitions: 10 })) }] }));
  page.on("request", request => { if (["POST", "PUT", "DELETE"].includes(request.method())) writes++; });
  await page.goto("/#/rutinas");
  await page.getByRole("button", { name: "Editar Rutina antigua", exact: true }).click();
  await page.getByRole("button", { name: "Guardar Cambios", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("entradas repetidas");
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Quitar Plancha, posición 2", exact: true }).click();
  await expect(page.locator(".routine-form-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  expect(writes).toBe(0);
});

test("a routine removed elsewhere produces an honest DELETE 404 and preserves the displayed data", async ({ page }) => {
  const routine = { id: "already-removed", name: "Eliminada en otra ventana", version: 1, items: [] };
  await page.route("**/api/routines", route => route.fulfill({ json: [routine] }));
  await page.route("**/api/routines/already-removed", route => route.fulfill({ status: 404, json: { error: "Rutina no encontrada." } }));
  await page.goto("/#/rutinas");
  const trigger = page.getByRole("button", { name: `Borrar ${routine.name}`, exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Sí, eliminar rutina", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Rutina no encontrada");
  await expect(page.locator('[role="status"]').filter({ hasText: "eliminada" })).toHaveCount(0);
  await accessible(page);
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(trigger).toBeFocused();
  await accessible(page);
});
