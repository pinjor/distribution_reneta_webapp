import { expect, test } from "@playwright/test";
import { e2eEnv, login, productCombobox, selectOption } from "./helpers";

test.describe("Sample/Gift browser Draft flow", () => {
  test("create Sample then Gift drafts, validate, retry, print disabled", async ({ page }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("heading", { name: "Sample Gift Delivery List" })).toBeVisible();

    const stamp = Date.now();
    const sampleNumber = `SG-E2E-${stamp}`;
    await page.getByRole("button", { name: "New Sample Gift" }).click();
    await expect(page).toHaveURL(/\/delivery\/sample-gift\/new/);

    await page.locator("#deliveryNumber").fill(sampleNumber);
    await selectOption(page, "#documentKind", "Sample");
    await page.locator("#recipientName").fill("Dr E2E Sample");
    await selectOption(page, "#recipientType", "Doctor");
    await page.locator("#remarks").fill("Isolated sample draft");

    await expect(page.getByTestId("sample-gift-save")).toBeDisabled();

    await page.locator("input[type=number]").fill("0");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByText("Select a product", { exact: true })).toBeVisible();

    await productCombobox(page).click();
    await page.getByRole("option", { name: /E2E Sample Product/ }).click();
    await page.locator("input[type=number]").fill("3");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByRole("cell", { name: "E2E Sample Product" })).toBeVisible();

    await page.getByTestId("sample-gift-save").click();
    await expect(page).toHaveURL(/\/delivery\/sample-gift$/);
    await expect(page.getByRole("cell", { name: sampleNumber })).toBeVisible();
    await expect(page.getByText("Draft").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Print" }).first()).toBeDisabled();

    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByText("Dr E2E Sample")).toBeVisible();
    await expect(page.getByText("sample", { exact: true })).toBeVisible();
    await expect(page.getByText("Isolated sample draft")).toBeVisible();
    await expect(page.getByTestId("sample-gift-preview")).toBeVisible();

    await page.goto("/delivery/sample-gift/new");
    const giftNumber = `GF-E2E-${stamp}`;
    await page.locator("#deliveryNumber").fill(giftNumber);
    await selectOption(page, "#documentKind", "Gift");
    await page.locator("#recipientName").fill("Partner E2E Gift");
    await selectOption(page, "#recipientType", "Partner");
    await productCombobox(page).click();
    await page.getByRole("option", { name: /E2E Sample Product/ }).click();
    await page.locator("input[type=number]").fill("2");
    await page.getByRole("button", { name: "Add Item" }).click();
    await page.getByTestId("sample-gift-save").click();
    await expect(page.getByRole("cell", { name: giftNumber })).toBeVisible();

    await page.goto("/delivery/sample-gift/new");
    await page.route("**/sample-gift-deliveries**", (route) => {
      if (route.request().method() === "GET" && !route.request().url().match(/\/\d+(\?|$)/)) {
        return route.abort("failed");
      }
      return route.continue();
    });
    await page.goto("/delivery/sample-gift");
    await expect(page.getByText("Unable to load sample gift deliveries").first()).toBeVisible();
    await page.unrouteAll();
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("cell", { name: sampleNumber })).toBeVisible();

    await page.goto("/delivery/sample-gift/new");
    await page.locator("#deliveryNumber").fill(sampleNumber);
    await page.locator("#recipientName").fill("Dup Recipient");
    await selectOption(page, "#recipientType", "Doctor");
    await productCombobox(page).click();
    await page.getByRole("option", { name: /E2E Sample Product/ }).click();
    await page.locator("input[type=number]").fill("1");
    await page.getByRole("button", { name: "Add Item" }).click();
    await page.getByTestId("sample-gift-save").click();
    await expect(page.getByText("Unable to create delivery", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/delivery\/sample-gift\/new/);
  });
});
