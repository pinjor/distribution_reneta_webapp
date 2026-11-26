import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envFile = path.join(__dirname, "e2e/.env.isolated");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:15174";
const workflowBaseURL = process.env.E2E_WORKFLOW_BASE_URL || "http://127.0.0.1:15175";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      testMatch: /draft-modules\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL },
    },
    {
      name: "isolated-workflow",
      testMatch: /isolated-workflow\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: workflowBaseURL },
    },
  ],
  globalSetup: "./e2e/draft-modules/global-setup.ts",
});
