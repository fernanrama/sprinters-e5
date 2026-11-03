import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createApp } from "../api/src/app.js";

// Browser tests use the real API, but never the user's routines.local.json.
const directory = await mkdtemp(join(tmpdir(), "healthy-life-p0-"));
const app = createApp({
  webDirectory: resolve("web/dist"),
  catalogFile: pathToFileURL(resolve("api/data/exercises.json")),
  routinesFile: pathToFileURL(join(directory, "routines.json")),
  routinesSeed: pathToFileURL(resolve("api/data/routines.seed.json")),
});
const server = app.listen(3107, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(async () => {
    await rm(directory, { recursive: true, force: true });
    process.exit(0);
  }));
}
