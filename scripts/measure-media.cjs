const { chromium } = require('playwright');
const { writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

// Start tests/serve.mts first. No image interception or personal routine writes.
(async () => {
  const browser = await chromium.launch({ headless: true });
  const samples = [];
  try {
    for (const scenario of ['catalog', 'selection']) {
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const images = new Map();
        cdp.on('Network.requestWillBeSent', e => {
          if (e.type === 'Image') images.set(e.requestId, { url: e.request.url, bytes: 0, status: 'pending' });
        });
        cdp.on('Network.loadingFinished', e => {
          const image = images.get(e.requestId);
          if (image) Object.assign(image, { bytes: e.encodedDataLength, status: 'finished' });
        });
        cdp.on('Network.loadingFailed', e => {
          const image = images.get(e.requestId);
          if (image) Object.assign(image, { status: 'failed', error: e.errorText });
        });
        const started = Date.now();
        await page.goto(`http://127.0.0.1:3107/${scenario === 'selection' ? '#/rutinas' : ''}`);
        if (scenario === 'catalog') {
          await page.locator('.catalog > li').first().waitFor();
          // Scroll through the same full catalog so deferred images also enter view.
          for (let index = 0; index < 14; index++) {
            await page.locator('.catalog > li').nth(index).scrollIntoViewIfNeeded();
          }
        } else {
          await page.getByRole('button', { name: '+ Crear Nueva Rutina' }).click();
          await page.locator('.routine-form select').selectOption({ index: 1 });
        }
        const selectedAt = Date.now();
        let previewReadyMs = null;
        if (await page.locator('.exercise-selection-preview img').count()) {
          try {
            await page.waitForFunction(() => {
              const image = document.querySelector('.exercise-selection-preview img');
              return image?.complete && image.naturalWidth > 0;
            }, null, { timeout: 10000 });
            previewReadyMs = Date.now() - selectedAt;
          } catch { /* Report incomplete observation, never infer success. */ }
        }
        await page.waitForTimeout(Math.max(0, 12000 - (Date.now() - started)));
        const dimensions = await page.locator('img').evaluateAll(elements => elements.map(img => ({
          src: img.currentSrc, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
          cssWidth: img.width, cssHeight: img.height, complete: img.complete,
        })));
        const requests = [...images.values()];
        samples.push({ scenario, run, observedMs: Date.now() - started, previewReadyMs,
          requests: requests.length, bytes: requests.reduce((sum, r) => sum + r.bytes, 0),
          finished: requests.filter(r => r.status === 'finished').length,
          failed: requests.filter(r => r.status === 'failed').length, images: requests, dimensions });
        console.log(scenario, run, samples.at(-1).bytes, 'bytes', requests.length, 'requests');
        await context.close();
      }
    }
    const file = join(tmpdir(), `healthy-life-media-${process.argv[2] || 'candidate'}.json`);
    await writeFile(file, JSON.stringify({ browser: browser.version(), conditions: {
      viewport: '390x844', dpr: 1, coldCache: true, latencyMs: 150,
      downloadMbps: 1.6, uploadMbps: 0.75, cpuSlowdown: 4, observationMs: 12000,
      imageInterception: false, note: 'CDP finished transfer bytes; pending/error resources and cross-origin failures are reported. No field CWV claims.',
    }, samples }, null, 2));
    console.log(file);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
