import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/website-audit",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:9080",
    trace: "off",
  },
});
