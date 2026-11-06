const { spawn } = require('node:child_process');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

// Production build + real API, isolated data. Never starts the personal development server.
exports.startTestServer = async function (catalog, routines) {
  const directory = await mkdtemp(join(tmpdir(), 'healthy-life-browser-fixture-'));
  const env = { ...process.env, HEALTHY_LIFE_TEST_PORT: '0' };
  if (catalog) {
    env.HEALTHY_LIFE_TEST_CATALOG = join(directory, 'catalog.json');
    await writeFile(env.HEALTHY_LIFE_TEST_CATALOG, JSON.stringify(catalog));
  }
  if (routines) {
    env.HEALTHY_LIFE_TEST_SEED = join(directory, 'seed.json');
    await writeFile(env.HEALTHY_LIFE_TEST_SEED, JSON.stringify(routines));
  }
  const child = spawn(process.execPath, ['--import', 'tsx', 'tests/serve.mts'], { cwd: resolve(__dirname, '..'), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  async function close() {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  }
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  try {
    const origin = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Test server did not start: ${errors}`)), 15000);
      let output = '';
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/HEALTHY_LIFE_TEST_URL=(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Test server exited (${code}): ${errors}`)); });
    });
    return { origin, close };
  } catch (error) { await close(); throw error; }
};
