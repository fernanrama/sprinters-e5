import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const port = 3001;

const app = createApp({
  webDirectory: fileURLToPath(new URL("../../web/dist", import.meta.url)),
  dbFile: "api/data/healthylife.db",
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
