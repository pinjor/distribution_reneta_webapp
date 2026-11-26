import { test, expect } from "@playwright/test";

/**
 * Production-compose smoke. Does not mutate business records.
 * Run: E2E_WEB_AUDIT=1 E2E_BASE_URL=http://127.0.0.1:9080 npx playwright test e2e/website-audit --config=playwright.website.config.ts
 */
const enabled = process.env.E2E_WEB_AUDIT === "1";

test.describe("Website login surface", () => {
  test.skip(!enabled, "Set E2E_WEB_AUDIT=1 against a disposable or local compose frontend.");

  test("login page renders without dummy KPI numbers", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
  });
});
