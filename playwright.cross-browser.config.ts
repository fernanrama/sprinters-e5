import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// These two engines are verified locally. Firefox is opt-in because its bundled
// Windows executable can fail to start before it loads the application.
const browsers = ["chromium", "webkit"];
if (process.env.HEALTHY_LIFE_TEST_FIREFOX === "1") browsers.push("firefox");

export default defineConfig({
  ...base,
  projects: browsers.map(browserName => ({
    name: browserName,
    use: { browserName: browserName as "chromium" | "firefox" | "webkit" },
  })),
});
