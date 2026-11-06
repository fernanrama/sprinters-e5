const { chromium } = require('playwright');
const { readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir, cpus, platform, release } = require('node:os');
const { createHash } = require('node:crypto');
const { startTestServer } = require('./browser-test-server.cjs');

// Run isolated tests/serve.mts servers with the same 14-exercise/routine fixtures first.
// Images are never intercepted; no personal routines are read or written.
(async () => {
  const label = process.argv[2] || 'candidate';
  let origin = process.argv[3]?.startsWith('http') ? process.argv[3] : undefined;
  const catalog = JSON.parse(await readFile('api/data/exercises.json', 'utf8')).slice(0, 14);
  const routines = [{ id: 'benchmark', name: 'Rutina de catorce ejercicios', version: 1,
    items: catalog.map((ex, i) => ({ id: `item-${i}`, exerciseId: ex.id, sets: 3, repetitions: 10, parameters: { restSeconds: 60, rir: 0 } })) }];
  const server = origin ? null : await startTestServer(catalog, routines);
  origin ??= server.origin;
  const browser = await chromium.launch();
  const checkpoint = join(tmpdir(), `healthy-life-final-performance-${label}-samples.json`);
  const previous = process.argv.includes('--resume') ? JSON.parse(await readFile(checkpoint, 'utf8')) : null;
  const samples = previous?.samples ?? [];
  try {
    if (previous && previous.browser !== browser.version()) throw new Error('Cannot mix browser versions in a resumed measurement');
    const sourceIdentity = {};
    for (const path of ['/', '/api/exercises']) sourceIdentity[path] = createHash('sha256').update(await (await fetch(`${origin}${path}`)).text()).digest('hex');
    if (previous?.sourceIdentity && JSON.stringify(previous.sourceIdentity) !== JSON.stringify(sourceIdentity)) throw new Error('Cannot mix different production builds or catalogs in a resumed measurement');
    for (const scenario of ['catalog14', 'create', 'preview', 'routine14']) {
      for (const cache of ['cold', 'warm']) {
        for (let run = 1; run <= (cache === 'cold' ? 5 : 3); run++) {
          if (samples.some(sample => sample.scenario === scenario && sample.cache === cache && sample.run === run)) continue;
          const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
          const page = await context.newPage();
          page.setDefaultNavigationTimeout(60000);
          // Fetch the revision's own catalog so the baseline retains its original media.
          if ((await (await context.request.get(`${origin}/api/exercises`)).json()).length !== 14) throw new Error('Use an isolated server with exactly 14 exercises');


          await page.addInitScript(() => {
            window.__measure = { lcp: null, shifts: [] };
            new PerformanceObserver(list => { for (const e of list.getEntries()) window.__measure.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
            new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__measure.shifts.push({ time: e.startTime, value: e.value }); }).observe({ type: 'layout-shift', buffered: true });
          });
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: cache === 'cold' });
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 });
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          const resources = new Map();
          let recording = false;
          cdp.on('Network.requestWillBeSent', e => { if (recording) resources.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0, state: 'pending' }); });
          cdp.on('Network.responseReceived', e => { const r = resources.get(e.requestId); if (r) Object.assign(r, { http: e.response.status, cached: e.response.fromDiskCache || false }); });
          cdp.on('Network.loadingFinished', e => { const r = resources.get(e.requestId); if (r) Object.assign(r, { bytes: e.encodedDataLength, state: 'finished' }); });
          cdp.on('Network.loadingFailed', e => { const r = resources.get(e.requestId); if (r) Object.assign(r, { state: 'failed', error: e.errorText }); });
          async function exerciseScenario() {
            const decodeFailures = [];
            async function decode(scope) {
              const result = await scope.evaluate(async element => {
                const img = element.querySelector('img');
                if (!img) return { decoded: false, source: 'inline fallback' };
                const source = img.currentSrc || img.src;
                try { await img.decode(); return { decoded: img.naturalWidth > 0, source }; }
                catch { return { decoded: false, source }; }
              });
              if (!result.decoded) decodeFailures.push(result.source);
            }
            await page.goto(`${origin}/${scenario === 'catalog14' ? '' : '#/rutinas'}`);
            await page.waitForTimeout(3500);
            await page.evaluate(() => document.fonts.ready);
            if (scenario === 'catalog14') await page.locator('.catalog > li').first().locator('img').evaluate(img => img.decode());
            await page.waitForTimeout(100);
            const initialLcpMs = await page.evaluate(() => window.__measure.lcp);
            let actionReadyMs = null;
            if (scenario === 'catalog14') {
              for (let i = 0; i < 14; i++) { const card = page.locator('.catalog > li').nth(i); await card.scrollIntoViewIfNeeded(); await decode(card); }
            } else if (scenario === 'routine14') {
              const start = Date.now();
              await page.getByRole('button', { name: `Editar ${routines[0].name}`, exact: true }).click();
              for (let i = 0; i < 14; i++) { const row = page.locator('.routine-form-item').nth(i); await row.locator('.exercise-image').scrollIntoViewIfNeeded(); await decode(row); }
              actionReadyMs = Date.now() - start;
            } else {
              await page.getByRole('button', { name: '+ Crear Nueva Rutina', exact: true }).click();
              if (scenario === 'preview') {
                const start = Date.now();
                await page.getByLabel('Ejercicio', { exact: true }).selectOption('plancha');
                await decode(page.locator('.exercise-selection-preview'));
                actionReadyMs = Date.now() - start;
              }
            }
            await page.waitForTimeout(3000);
            return { actionReadyMs: decodeFailures.length ? null : actionReadyMs, fallbackReadyMs: decodeFailures.length ? actionReadyMs : null, decodeFailures, initialLcpMs };
          }
          if (cache === 'warm') { await exerciseScenario(); await page.goto('about:blank'); }
          recording = true;
          const start = Date.now();
          const { actionReadyMs, fallbackReadyMs, decodeFailures, initialLcpMs } = await exerciseScenario();
          const metrics = await page.evaluate(() => {
            const entries = window.__measure.shifts; let cls = 0, total = 0, first = 0, last = 0;
            for (const e of entries) { if (e.time - last > 1000 || e.time - first > 5000) { total = 0; first = e.time; } total += e.value; cls = Math.max(cls, total); last = e.time; }
            return { lcpMs: window.__measure.lcp, cls, dimensions: [...document.images].map(img => ({ src: img.currentSrc, naturalWidth: img.naturalWidth, cssWidth: img.width, complete: img.complete })) };
          });
          const requests = [...resources.values()];
          const imageRequests = requests.filter(r => r.type === 'Image');
          const sample = { scenario, cache, run, elapsedMs: Date.now() - start, actionReadyMs, fallbackReadyMs, decodeFailures, ...metrics, lcpMs: initialLcpMs,
            imageBytes: imageRequests.reduce((s, r) => s + r.bytes, 0), transferredBytes: requests.reduce((s, r) => s + r.bytes, 0),
            failed: requests.filter(r => r.state === 'failed' || r.http >= 400).length, pending: requests.filter(r => r.state === 'pending').length, resources: requests };
          samples.push(sample);
          await writeFile(checkpoint, JSON.stringify({ label, browser: browser.version(), sourceIdentity, samples }, null, 2));
          console.log(label, scenario, cache, run, JSON.stringify({ imageBytes: sample.imageBytes, lcpMs: sample.lcpMs, cls: sample.cls, actionReadyMs, failed: sample.failed }));
          await context.close();
        }
      }
    }
    const summary = [];
    for (const scenario of ['catalog14', 'create', 'preview', 'routine14']) for (const cache of ['cold', 'warm']) {
      const group = samples.filter(s => s.scenario === scenario && s.cache === cache);
      const record = { scenario, cache, runs: group.length };
      for (const metric of ['lcpMs', 'cls', 'actionReadyMs', 'imageBytes', 'transferredBytes']) {
        const values = group.map(s => s[metric]).filter(v => v !== null).sort((a,b) => a-b);
        record[metric] = values.length ? { median: values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length/2-1]+values[values.length/2])/2, min: values[0], max: values.at(-1) } : null;
      }
      summary.push(record);
    }
    const output = join(tmpdir(), `healthy-life-final-performance-${label}.json`);
    await writeFile(output, JSON.stringify({ label, origin, browser: browser.version(), sourceIdentity, machine: { cpu: cpus()[0]?.model, platform: platform(), osRelease: release(), node: process.version }, conditions: { viewport: '390x844', dpr: 1, latencyMs: 150, downloadMbps: 1.6, uploadMbps: .75, cpuSlowdown: 4, initialObservationMs: 3500, finalObservationMs: 3000, coldRuns: 5, warmRuns: 3, fixture: 'same first 14 exercise IDs; revision-specific media; same routine; API and images served without interception from isolated 14-exercise fixture server; warm scenarios primed once; laboratory only, no field CWV claim' }, summary, samples }, null, 2));
    console.log(output);
  } finally { await browser.close(); await server?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
