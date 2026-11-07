import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import type { Routine } from "../../shared/routines";

for (const width of [1440, 390]) {
  test(`six demo routines render complete editable sessions at ${width}px`, async ({ page, request }) => {
    const seed: Routine[] = JSON.parse(await readFile("api/data/routines.demo.json", "utf8"));
    const created: Routine[] = [];
    try {
      for (const routine of seed) {
        const response = await request.post("/api/routines", { data: { ...routine, name: `${routine.name} · demo ${width}` } });
        expect(response.status()).toBe(201);
        created.push(await response.json());
      }
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/#/rutinas");
      for (const routine of created) {
        await page.getByRole("button", { name: `Editar ${routine.name}`, exact: true }).click();
        await expect(page.getByRole("textbox", { name: "Nombre de la rutina", exact: false })).toHaveValue(routine.name);
        const items = page.locator(".routine-form-item");
        await expect(items).toHaveCount(routine.items.length);
        for (let index = 0; index < routine.items.length; index++) {
          const image = items.nth(index).locator("img");
          await image.scrollIntoViewIfNeeded();
          await expect(image).toBeVisible();
          await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.getByRole("button", { name: "Volver a Mis rutinas", exact: true }).click();
      }
      await page.reload();
      for (const routine of created) {
        await expect(page.getByRole("button", { name: `Editar ${routine.name}`, exact: true })).toBeVisible();
      }
    } finally {
      for (const routine of created) expect((await request.delete(`/api/routines/${routine.id}`)).status()).toBe(204);
    }
  });
}
