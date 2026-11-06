import { test, expect, type Page } from "@playwright/test";
import type { Routine } from "../../shared/routines";

async function create(page: Page, name: string) {
  await page.goto("/#/rutinas");
  await page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre de la rutina", exact: false }).fill(name);
  const picker = page.getByRole("region", { name: "Añadir ejercicio", exact: true });
  await picker.getByLabel("Ejercicio", { exact: true }).selectOption("remo-mancuerna");
  await picker.getByLabel("Series", { exact: true }).fill("3");
  await picker.getByLabel("Repeticiones", { exact: true }).fill("12");
  await picker.getByLabel("Descanso (s)", { exact: true }).fill("60");
  await expect(picker.getByRole("spinbutton", { name: "RIR", exact: false })).toHaveValue("0");
  await picker.getByRole("button", { name: "+ Añadir", exact: true }).click();
  return picker;
}

test("list loading, network/HTTP/invalid payload errors and retry never masquerade as empty", async ({ page }) => {
  let mode = "wait";
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/routines", async route => {
    if (mode === "wait") await gate;
    if (mode === "network") return route.abort();
    if (mode === "http") return route.fulfill({ status: 500, contentType: "text/html", body: "Server error" });
    return route.fulfill({ json: mode === "invalid" ? { unexpected: true } : [] });
  });
  await page.goto("/#/rutinas");
  await expect(page.getByText("Cargando rutinas…", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rutinas guardadas", exact: true })).toHaveAttribute("aria-busy", "true");
  mode = "http"; release();
  for (const next of ["network", "invalid", "empty"]) {
    await expect(page.getByRole("alert")).toContainText("No hemos podido cargar");
    await expect(page.getByRole("heading", { name: "Tu primera rutina empieza aquí" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true })).toBeDisabled();
    mode = next;
    await page.getByRole("button", { name: "Volver a intentar", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Tu primera rutina empieza aquí" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true })).toBeEnabled();
});

test("catalog failure is recoverable; valid empty catalog still allows editing an existing routine", async ({ page }) => {
  let mode = "error";
  await page.route("**/api/exercises", route => route.fulfill(mode === "error" ? { status: 500, json: { error: "test" } } : { json: [] }));
  await page.route("**/api/routines", route => route.fulfill({ json: [{ id: "existing", name: "Sin medios", version: 1,
    items: [{ id: "entry", exerciseId: "missing", sets: 3, repetitions: 12 }] }] }));
  await page.goto("/#/rutinas");
  await expect(page.getByRole("alert")).toBeVisible();
  mode = "empty";
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await page.getByRole("button", { name: "Editar Sin medios", exact: true }).click();
  await expect(page.getByLabel("Ejercicio", { exact: true })).toBeDisabled();
  await expect(page.locator(".routine-form-item")).toContainText("Imagen no disponible");
  await expect(page.locator(".routine-form-item")).toContainText("Descanso: sin especificar");
  await expect(page.locator(".routine-form-item")).toContainText("RIR: sin especificar");
  await expect(page.getByRole("button", { name: "Guardar Cambios", exact: true })).toBeEnabled();
});

test("validation associates errors and focuses fields; returning from an unchanged editor does not write", async ({ page }) => {
  let writes = 0;
  page.on("request", request => { if (["POST", "PUT", "DELETE"].includes(request.method())) writes++; });
  await page.goto("/#/rutinas");
  const createButton = page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true });
  await createButton.click();
  await expect(page.getByRole("heading", { name: "Crear nueva rutina", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
  const name = page.getByRole("textbox");
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription("El nombre de la rutina es obligatorio.");
  await page.getByRole("button", { name: "Volver a Mis rutinas", exact: true }).click();
  await expect(createButton).toBeFocused();
  expect(writes).toBe(0);
});

test("real create/save/reload keeps order, parameters, optional RIR and media identity", async ({ page, request }) => {
  const name = `P3 persistencia ${Date.now()}`;
  const picker = await create(page, name);
  await picker.getByLabel("Ejercicio", { exact: true }).selectOption("dominadas");
  await picker.getByLabel("Series", { exact: true }).fill("4");
  await picker.getByLabel("Repeticiones", { exact: true }).fill("8");
  await picker.getByRole("spinbutton", { name: "RIR", exact: false }).fill("");
  await picker.getByRole("button", { name: "+ Añadir", exact: true }).click();
  const first = page.locator(".routine-form-item").first();
  await expect(first).toContainText("Descanso: 60 s");
  await expect(first).toContainText("RIR: 0");
  await first.getByRole("button", { name: /^Mover abajo / }).click();
  const moved = page.locator(".routine-form-item").nth(1);
  await expect(moved).toContainText("Remo con mancuerna");
  await expect(moved.getByRole("button", { name: /^Mover arriba / })).toBeFocused();
  await expect(page.getByRole("status")).toContainText("posición 2 de 2");
  await moved.getByRole("spinbutton", { name: /^Series de / }).fill("5");
  await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Rutina creada correctamente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true })).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Editar rutina", exact: true })).toBeFocused();
  await expect(page.locator(".routine-form-item").first()).toContainText("Dominadas");
  await expect(page.locator(".routine-form-item").first()).toContainText("RIR: sin especificar");
  const saved: Routine[] = await (await request.get("/api/routines")).json();
  const routine = saved.find(routine => routine.name === name)!;
  expect(routine.items.map(item => item.exerciseId)).toEqual(["dominadas", "remo-mancuerna"]);
  expect(routine.items[0].parameters).not.toHaveProperty("rir");
  expect(routine.items[1]).toMatchObject({ sets: 5, repetitions: 12, parameters: { restSeconds: 60, rir: 0 } });
  expect(routine.items[1]).not.toHaveProperty("imageUrl");
  expect(routine.items[1]).not.toHaveProperty("images");
});

test("network and non-JSON save failures retain the draft and can be retried", async ({ page, request }) => {
  const name = `P3 reintento ${Date.now()}`;
  await create(page, name);
  let mode = "network";
  await page.route("**/api/routines", route => {
    if (route.request().method() !== "POST" || mode === "ready") return route.continue();
    return mode === "network" ? route.abort() : route.fulfill({ status: 500, contentType: "text/html", body: "Error" });
  });
  for (const next of ["html", "ready"]) {
    await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("borrador");
    await expect(page.getByRole("textbox")).toHaveValue(name);
    await expect(page.locator(".routine-form-item")).toHaveCount(1);
    mode = next;
  }
  await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
  const routines: Routine[] = await (await request.get("/api/routines")).json();
  expect(routines.filter(routine => routine.name === name)).toHaveLength(1);
});

test("delete cancellation/Escape return focus; failed DELETE retains dialog and data; retry removes only that routine", async ({ page, request }) => {
  const name = `P3 borrar ${Date.now()}`;
  await create(page, name);
  await page.getByRole("button", { name: "Crear Rutina", exact: true }).click();
  const trigger = page.getByRole("button", { name: `Borrar ${name}`, exact: true });
  await expect(trigger).toBeVisible();
  const before: Routine[] = await (await request.get("/api/routines")).json();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar rutina completa?", exact: true });
  await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  let mode = "network";
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/routines/*", async route => {
    if (route.request().method() !== "DELETE") return route.continue();
    requests++;
    if (mode === "network") return route.abort();
    if (mode === "pending") await gate;
    if (mode === "error") return route.fulfill({ status: 500, contentType: "text/html", body: "No" });
    return route.continue();
  });
  await trigger.click();
  await dialog.getByRole("button", { name: "Sí, eliminar rutina", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("No se ha confirmado el borrado");
  expect(await (await request.get("/api/routines")).json()).toEqual(before);
  mode = "error";
  await dialog.getByRole("button", { name: "Sí, eliminar rutina", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("No se pudo completar la operación");
  expect(await (await request.get("/api/routines")).json()).toEqual(before);
  mode = "pending";
  await dialog.getByRole("button", { name: "Sí, eliminar rutina", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Eliminando…", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.getByRole("link", { name: "Catálogo", exact: true }).evaluate((link: HTMLAnchorElement) => { link.click(); });
  await expect(page).toHaveURL(/#\/rutinas$/);
  mode = "ready"; release();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("eliminada");
  await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeFocused();
  expect(requests).toBe(3);
  const after: Routine[] = await (await request.get("/api/routines")).json();
  expect(after).toEqual(before.filter(routine => routine.name !== name));
  await page.reload();
  await expect(trigger).toHaveCount(0);
});

test("creating blocks duplicate submission and navigation until the request finishes", async ({ page, request }) => {
  const name = `P3 envío único ${Date.now()}`;
  await create(page, name);
  let writes = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/routines", async route => {
    if (route.request().method() !== "POST") return route.continue();
    writes++; await gate; await route.continue();
  });
  await page.locator(".routine-form").evaluate(form => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(page.getByRole("button", { name: "Guardando…", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Volver a Mis rutinas", exact: true })).toBeDisabled();
  await expect(page.getByRole("textbox")).toBeDisabled();
  await expect.poll(() => writes).toBe(1);
  await page.getByRole("link", { name: "Catálogo", exact: true }).click();
  await expect(page).toHaveURL(/#\/rutinas$/);
  release();
  await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
  const routines: Routine[] = await (await request.get("/api/routines")).json();
  expect(routines.filter(routine => routine.name === name)).toHaveLength(1);
});

test("discard dialog has a safe default, keyboard loop and returns to the editor or list", async ({ page }) => {
  await create(page, `P3 cancelar ${Date.now()}`);
  const back = page.getByRole("button", { name: "Volver a Mis rutinas", exact: true });
  await back.click();
  const dialog = page.getByRole("dialog", { name: "¿Descartar los cambios?", exact: true });
  const stay = dialog.getByRole("button", { name: "Seguir editando", exact: true });
  await expect(stay).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Descartar cambios", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(stay).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(back).toBeFocused();
  await back.click();
  await dialog.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await expect(page.getByRole("button", { name: "+ Crear Nueva Rutina", exact: true })).toBeFocused();
});

for (const width of [320, 390, 768, 1440]) {
  test(`long names and controls reflow at ${width}px; removing the last entry preserves an existing empty routine`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const name = `P3 largo ${Date.now()} ` + "Entrenamiento".repeat(20);
    const response = await request.post("/api/routines", { data: { name, items: [{ id: "long-entry", exerciseId: "remo-mancuerna", sets: 3, repetitions: 10, parameters: { restSeconds: 90, rir: 0 } }] } });
    expect(response.ok()).toBeTruthy();
    await page.goto("/#/rutinas");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
    await expect(page.locator(".routine-form-item")).toContainText("Descanso: 90 s");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole("button", { name: /^Quitar Remo con mancuerna/ }).click();
    await expect(page.getByLabel("Ejercicio", { exact: true })).toBeFocused();
    await expect(page.getByRole("status")).toContainText("quitado del borrador");
    await page.getByRole("button", { name: "Guardar Cambios", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mis Rutinas", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `Editar ${name}`, exact: true })).toBeFocused();
    await page.reload();
    await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
    await expect(page.locator(".routine-form-item")).toHaveCount(0);
    await expect(page.getByText("Esta rutina no tiene ejercicios.", { exact: true })).toBeVisible();
    const saved: Routine[] = await (await request.get("/api/routines")).json();
    expect(saved.find(routine => routine.name === name)?.items).toEqual([]);
  });
}
