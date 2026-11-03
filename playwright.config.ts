import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: join(tmpdir(), "healthy-life-p0-results"),
  use: {
    baseURL: "http://127.0.0.1:3107",
    browserName: "chromium",
    screenshot: "off",
    trace: "off",
  },
  webServer: {
    command: "node --import tsx tests/serve.mts",
    url: "http://127.0.0.1:3107/api/health",
    reuseExistingServer: false,
  },
});
