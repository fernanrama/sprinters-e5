const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { startTestServer } = require('./browser-test-server.cjs');

(async () => {
  const catalog = JSON.parse(await readFile('api/data/exercises.json', 'utf8'));
  const routine = { id: 'zoom-test', name: 'Entrenamiento largo para revisar el zoom del navegador', version: 1,
    items: catalog.slice(0, 14).map((exercise, index) => ({ id: `zoom-${index}`, exerciseId: exercise.id, sets: 3, repetitions: 10, parameters: { restSeconds: 60, rir: 0 } })) };
  const server = await startTestServer(undefined, [routine]);
  const temporary = await mkdtemp(join(tmpdir(), 'healthy-life-zoom-profile-'));
  const extension = join(temporary, 'extension');
  const { mkdir } = require('node:fs/promises');
  await mkdir(extension);
  await writeFile(join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Local Healthy Life zoom check', version: '1.0', permissions: ['tabs'], host_permissions: ['http://127.0.0.1/*'], background: { service_worker: 'background.js' } }));
  await writeFile(join(extension, 'background.js'), "chrome.runtime.onInstalled.addListener(() => {});");
  let context;
  try {
    context = await chromium.launchPersistentContext(join(temporary, 'profile'), {
      channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 10000 });
    const page = await context.newPage();
    await page.goto(server.origin);
    await page.locator('.catalog > li').first().waitFor();
    const before = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
    const zoom = await worker.evaluate(async origin => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(tab => tab.url?.startsWith(origin));
      if (!tab?.id) throw new Error('Isolated local test tab missing');
      await chrome.tabs.setZoomSettings(tab.id, { mode: 'automatic', scope: 'per-tab' });
      await chrome.tabs.setZoom(tab.id, 2);
      return chrome.tabs.getZoom(tab.id);
    }, server.origin);
    assert.equal(zoom, 2);
    await page.waitForFunction(width => innerWidth <= width / 2 + 1, before.width);
    const checks = [];
    async function record(scenario) {
      const dimensions = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio, contentWidth: document.documentElement.scrollWidth }));
      assert.ok(dimensions.contentWidth <= dimensions.width, `${scenario}: horizontal overflow`);
      const screenshot = join(tmpdir(), `healthy-life-final-zoom200-${scenario}.png`);
      await page.screenshot({ path: screenshot });
      checks.push({ scenario, ...dimensions, screenshot });
    }
    await record('catalog');
    await page.getByRole('button', { name: 'Ver ficha de Plancha', exact: true }).click();
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Mis rutinas', exact: true }).click();
    await page.getByRole('button', { name: '+ Crear Nueva Rutina', exact: true }).click();
    await page.getByLabel('Ejercicio', { exact: true }).selectOption('peso-muerto-semirrigido-mancuernas');
    await page.locator('.exercise-selection-preview img').evaluate(img => img.decode());
    await record('create');
    await page.getByRole('button', { name: 'Volver a Mis rutinas', exact: true }).click();
    await page.getByRole('button', { name: `Editar ${routine.name}`, exact: true }).click();
    assert.equal(await page.locator('.routine-form-item').count(), 14);
    await record('edit');
    const output = join(tmpdir(), 'healthy-life-final-browser-zoom.json');
    await writeFile(output, JSON.stringify({ browser: context.browser()?.version() ?? await page.evaluate(() => navigator.userAgent), mechanism: 'chrome.tabs.setZoom, actual browser zoom; no CSS zoom or pinch emulation', before, zoom, checks }, null, 2));
    console.log(output);
  } finally {
    await context?.close(); await server.close();
    await rm(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
