import { defineConfig, devices } from "@playwright/test";
import { INTRO_SEEN_KEY } from "./src/game/storage-keys.js";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    storageState: { cookies: [], origins: [{ origin: "http://127.0.0.1:3000", localStorage: [{ name: INTRO_SEEN_KEY, value: "1" }] }] },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
