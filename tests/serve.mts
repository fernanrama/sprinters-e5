import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createApp } from "../api/src/app.js";

// Browser tests use the real API, but never the user's routines.local.json.
const directory = await mkdtemp(join(tmpdir(), "healthy-life-p0-"));
const app = createApp({
  webDirectory: resolve("web/dist"),
  catalogFile: pathToFileURL(resolve(process.env.HEALTHY_LIFE_TEST_CATALOG ?? "api/data/exercises.json")),
  routinesFile: pathToFileURL(join(directory, "routines.json")),
  routinesSeed: pathToFileURL(resolve(process.env.HEALTHY_LIFE_TEST_SEED ?? "api/data/routines.seed.json")),
});
const server = app.listen(Number(process.env.HEALTHY_LIFE_TEST_PORT ?? 3107), "127.0.0.1", () => {
  const address = server.address();
  if (address && typeof address !== "string") console.log(`HEALTHY_LIFE_TEST_URL=http://127.0.0.1:${address.port}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(async () => {
    await rm(directory, { recursive: true, force: true });
    process.exit(0);
  }));
}
