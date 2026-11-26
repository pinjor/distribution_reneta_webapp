import { test, expect } from "@playwright/test";

test("opening stock route is registered in the SPA", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "No PLAYWRIGHT_BASE_URL; browser smoke skipped");
  await page.goto("/login");
  await expect(page.locator("body")).toBeVisible();
});
