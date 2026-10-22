import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const port = 3001;
// También funciona desde dist/api/src después de compilar.
const root = new URL(import.meta.url.includes("/dist/") ? "../../../../" : "../../", import.meta.url);
const app = createApp({
  webDirectory: fileURLToPath(new URL("web/dist/", root)),
  catalogFile: new URL("api/data/exercises.json", root),
  routinesFile: new URL("api/data/routines.local.json", root),
  routinesSeed: new URL("api/data/routines.seed.json", root),
});
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`API disponible en http://127.0.0.1:${port}`);
});
server.on("error", (error) => {
  console.error("No se pudo arrancar la API:", error.message);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close());
}
