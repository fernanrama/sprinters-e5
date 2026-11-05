import { test, expect } from "@playwright/test";

test("cards expose independent controls; native dialog traps and restores keyboard focus", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Ver ficha de Dominadas", exact: true });
  await expect(opener).toBeVisible();
  expect(await page.locator("button button").count()).toBe(0);
  await opener.focus();
  await page.keyboard.press("Space");
  const dialog = page.getByRole("dialog", { name: "Dominadas", exact: true });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Cerrar", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.locator(".exercise-details-description").click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("local filters keep options, input focus and a concise live summary", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/exercises")) requests++; });
  await page.goto("/");
  await expect(page.locator(".catalog > li")).toHaveCount(14);
  const initialRequests = requests;
  const options = await page.locator("#tag-select option").allTextContents();
  const search = page.getByRole("searchbox");
  await search.pressSequentially("dominadas");
  await expect(search).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Mostrando 1 de 14");
  expect(await page.locator("#tag-select option").allTextContents()).toEqual(options);
  await expect(page.locator(".catalog")).not.toHaveAttribute("aria-live");
  await page.getByRole("button", { name: "Borrar término de búsqueda" }).click();
  await expect(search).toBeFocused();
  await page.getByRole("group", { name: "Grupo muscular", exact: true }).getByRole("button", { name: "Espalda", exact: true }).click();
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(page.getByRole("button", { name: "Limpiar filtros", exact: true })).toBeDisabled();
  await expect(page.locator(".catalog > li")).toHaveCount(14);
  expect(requests).toBe(initialRequests);
});

for (const width of [320, 390, 768, 1440]) {
  test(`catalog and detail reflow at ${width}px with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".catalog > li")).toHaveCount(14);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole("button", { name: "Ver ficha de Dominadas", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await dialog.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    await expect(dialog.getByRole("heading", { name: "Instrucciones de ejecución:" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("searchbox").fill("sin-resultados-".repeat(30));
    await expect(page.getByRole("region", { name: "Sin resultados", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test("long content and absent media stay readable in mobile detail", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const name = "Ejercicio".repeat(16);
  await page.route("**/api/exercises", route => route.fulfill({ json: [{
    id: "long", name, muscleGroup: "Espalda", equipment: "Equipamiento".repeat(25),
    description: "Descripción ".repeat(60), instructions: "Instrucción".repeat(100), tags: ["Etiqueta".repeat(25)],
  }] }));
  await page.goto("/");
  await page.getByRole("button", { name: `Ver ficha de ${name}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.getByRole("heading", { name: "Instrucciones de ejecución:" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Cerrar", exact: true })).toBeInViewport();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
