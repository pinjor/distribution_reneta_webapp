import { expect, test } from "@playwright/test";
import { e2eEnv, login, logoutToLogin, productCombobox, selectOption } from "../draft-modules/helpers";

async function createSampleDraft(page, number: string) {
  await page.goto("/delivery/sample-gift/new");
  await page.locator("#deliveryNumber").fill(number);
  await selectOption(page, "#documentKind", "Sample");
  await page.locator("#recipientName").fill("Dr Workflow");
  await selectOption(page, "#recipientType", "Doctor");
  await productCombobox(page).click();
  await page.getByRole("option", { name: /E2E Sample Product/ }).click();
  await page.locator("input[type=number]").fill("2");
  await page.getByRole("button", { name: "Add Item" }).click();
  await page.getByTestId("sample-gift-save").click();
  await expect(page).toHaveURL(/\/delivery\/sample-gift$/);
  await page.getByRole("row", { name: new RegExp(number) }).getByRole("button", { name: "View" }).click();
}

test.describe("Isolated Sample/Gift workflow UI", () => {
  test("submit, deny self-approve, approve as other user, reject another document", async ({ page }) => {
    const stamp = Date.now();
    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    await page.goto("/");
    await expect(page.getByTestId("isolated-workflow-banner")).toBeVisible();

    const approveNumber = `SG-WF-AP-${stamp}`;
    await createSampleDraft(page, approveNumber);
    await expect(page.getByTestId("draft-workflow-submit")).toBeVisible();
    await page.getByTestId("draft-workflow-submit").click();
    await page.getByTestId("draft-workflow-confirm-action").click();
    await expect(page.getByText(/^Submitted$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("draft-workflow-approve")).toHaveCount(0);

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await page.getByRole("row", { name: new RegExp(approveNumber) }).getByRole("button", { name: "View" }).click();
    await expect(page.getByTestId("draft-workflow-approve")).toBeVisible();
    await page.getByTestId("draft-workflow-approve").click();
    await page.getByTestId("draft-workflow-confirm-action").click();
    await expect(page.getByText(/^Approved$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("draft-workflow-submit")).toHaveCount(0);
    await expect(page.getByTestId("draft-workflow-approve")).toHaveCount(0);
    await expect(page.getByTestId("draft-workflow-reject")).toHaveCount(0);

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    const rejectNumber = `SG-WF-RJ-${stamp}`;
    await createSampleDraft(page, rejectNumber);
    await page.getByTestId("draft-workflow-submit").click();
    await page.getByTestId("draft-workflow-confirm-action").click();
    await expect(page.getByText(/^Submitted$/)).toBeVisible({ timeout: 20_000 });

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await page.getByRole("row", { name: new RegExp(rejectNumber) }).getByRole("button", { name: "View" }).click();
    await page.getByTestId("draft-workflow-reject").click();
    await page.getByTestId("draft-reject-confirm").click();
    await expect(page.getByTestId("draft-reject-error")).toContainText("required");
    await page.getByTestId("draft-reject-reason").fill("   ");
    await page.getByTestId("draft-reject-confirm").click();
    await expect(page.getByTestId("draft-reject-error")).toContainText("required");
    await page.getByTestId("draft-reject-reason").fill("Incomplete lines");
    await page.getByTestId("draft-reject-confirm").click();
    await expect(page.getByText(/^Rejected$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("draft-workflow-submit")).toHaveCount(0);
  });

  test("PSO does not see workflow actions", async ({ page }) => {
    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    const number = `SG-WF-PSO-${Date.now()}`;
    await createSampleDraft(page, number);
    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_PSO_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await page.getByRole("row", { name: new RegExp(number) }).getByRole("button", { name: "View" }).click();
    await expect(page.getByTestId("draft-workflow-submit")).toHaveCount(0);
    await expect(page.getByTestId("draft-workflow-approve")).toHaveCount(0);
  });
});
