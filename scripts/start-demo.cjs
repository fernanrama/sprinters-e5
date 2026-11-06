const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

// Separate persistent data: edits survive restarts without touching personal routines.
async function main() {
  const root = resolve(__dirname, '..');
  const { createApp } = await import(pathToFileURL(resolve(root, 'api/dist/api/src/app.js')).href);
  const { createRoutineStore } = await import(pathToFileURL(resolve(root, 'api/dist/api/src/routines.js')).href);
  const routinesFile = pathToFileURL(resolve(root, 'api/data/routines.demo.local.json'));
  const routinesSeed = pathToFileURL(resolve(root, 'api/data/routines.demo.json'));
  // Fail before opening the server if the existing demo data cannot be read.
  await createRoutineStore(routinesFile, routinesSeed).read();
  const app = createApp({
    webDirectory: resolve(root, 'web/dist'),
    catalogFile: pathToFileURL(resolve(root, 'api/data/exercises.json')),
    routinesFile,
    routinesSeed,
  });
  const server = app.listen(3108, '127.0.0.1', () => {
    console.log('Demo Healthy Life: http://127.0.0.1:3108');
    console.log('Ejemplos de demostración. Cambios guardados en api/data/routines.demo.local.json.');
    console.log('Las rutinas personales permanecen en su archivo habitual.');
  });
  server.on('error', error => {
    console.error('No se pudo arrancar la demo:', error.message);
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close());
  }
}

main().catch(error => {
  console.error('No se pudo preparar la demo:', error.message);
  process.exitCode = 1;
});
