import { expect, test } from "@playwright/test";
import { e2eEnv, login, logoutToLogin, productCombobox, selectOption } from "../draft-modules/helpers";

async function createExportDraft(page, number: string) {
  await page.goto("/delivery/export/new");
  await page.locator("#deliveryNumber").fill(number);
  await page.locator("#destinationCountry").fill("Malaysia");
  await page.locator("#portOfLoading").fill("Chattogram");
  await page.locator("#portOfDischarge").fill("Port Klang");
  await page.locator("#shippingLine").fill("Maersk Line");
  await selectOption(page, "#incoterms", /FOB/);
  await productCombobox(page).click();
  await page.getByRole("option", { name: /E2E Export Product/ }).click();
  await page.locator("input[type=number]").nth(0).fill("4");
  await page.locator("input[type=number]").nth(1).fill("10.25");
  await page.getByRole("button", { name: "Add Item" }).click();
  await page.getByTestId("export-save").click();
  await expect(page).toHaveURL(/\/delivery\/export$/);
  await page.getByRole("row", { name: new RegExp(number) }).getByRole("button", { name: "View" }).click();
}

test.describe("Isolated Export workflow UI", () => {
  test("submit, approve, preserve shipping totals, reject another document", async ({ page }) => {
    const stamp = Date.now();
    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    const approveNumber = `EX-WF-AP-${stamp}`;
    await createExportDraft(page, approveNumber);
    await expect(page.getByText("Malaysia")).toBeVisible();
    await expect(page.getByText("Maersk Line")).toBeVisible();
    await expect(page.getByTestId("isolated-workflow-bar")).toBeVisible();
    await expect(page.getByTestId("draft-workflow-submit")).toBeVisible();
    await page.getByTestId("draft-workflow-submit").click();
    await page.getByTestId("draft-workflow-confirm-action").click();
    await expect(page.getByText(/^Submitted$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Malaysia")).toBeVisible();
    await expect(page.getByRole("cell", { name: "41" })).toBeVisible();

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/export");
    await page.getByRole("row", { name: new RegExp(approveNumber) }).getByRole("button", { name: "View" }).click();
    await page.getByTestId("draft-workflow-approve").click();
    await page.getByTestId("draft-workflow-confirm-action").click();
    await expect(page.getByText(/^Approved$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Chattogram")).toBeVisible();
    await expect(page.getByText("Port Klang")).toBeVisible();
    await expect(page.getByTestId("draft-workflow-approve")).toHaveCount(0);

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    const rejectNumber = `EX-WF-RJ-${stamp}`;
    await createExportDraft(page, rejectNumber);
    await page.getByTestId("draft-workflow-submit").click();
    await page.getByTestId("draft-workflow-confirm-action").click();
    await expect(page.getByText(/^Submitted$/)).toBeVisible({ timeout: 20_000 });
    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/export");
    await page.getByRole("row", { name: new RegExp(rejectNumber) }).getByRole("button", { name: "View" }).click();
    await page.getByTestId("draft-workflow-reject").click();
    await page.getByTestId("draft-reject-reason").fill("Export papers incomplete");
    await page.getByTestId("draft-reject-confirm").click();
    await expect(page.getByText(/^Rejected$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Malaysia")).toBeVisible();
  });
});
