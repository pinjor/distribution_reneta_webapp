import { expect, test } from "@playwright/test";
import { e2eEnv, login, productCombobox, selectOption } from "./helpers";

test.describe("Export browser Draft flow", () => {
  test("create export draft and show server total_value", async ({ page }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/export");
    await expect(page.getByRole("heading", { name: "Export Delivery List" })).toBeVisible();

    const number = `EX-E2E-${Date.now()}`;
    await page.getByRole("button", { name: "New Export" }).click();
    await page.locator("#deliveryNumber").fill(number);
    await page.locator("#destinationCountry").fill("Malaysia");
    await page.locator("#portOfLoading").fill("Chattogram");
    await page.locator("#portOfDischarge").fill("Port Klang");
    await page.locator("#shippingLine").fill("Maersk Line");
    await page.locator("#containerNumber").fill("MSKU9999999");
    await page.locator("#blNumber").fill("BL-E2E-1");
    await page.locator("#invoiceNumber").fill("INV-REF-E2E");
    await page.locator("#lcNumber").fill("LC-E2E-1");
    await selectOption(page, "#incoterms", /FOB/);
    await selectOption(page, "#paymentTerms", /Letter of Credit/);
    await page.locator("#remarks").fill("Isolated export draft");

    await expect(page.getByTestId("export-save")).toBeDisabled();

    await productCombobox(page).click();
    await page.getByRole("option", { name: /E2E Export Product/ }).click();
    const qty = page.locator("input[type=number]").nth(0);
    const price = page.locator("input[type=number]").nth(1);
    await qty.fill("-1");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByText("Enter valid quantity", { exact: true })).toBeVisible();
    await qty.fill("4");
    await price.fill("-2");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByText("Unit price cannot be negative", { exact: true })).toBeVisible();
    await price.fill("10.25");
    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.getByRole("cell", { name: "E2E Export Product" })).toBeVisible();

    await page.locator("#destinationCountry").fill("");
    await page.getByTestId("export-save").click();
    await expect(page).toHaveURL(/\/delivery\/export\/new/);
    await page.locator("#destinationCountry").fill("Malaysia");
    await page.getByTestId("export-save").click();
    await expect(page).toHaveURL(/\/delivery\/export$/);
    await expect(page.getByRole("cell", { name: number })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Malaysia" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Print" }).first()).toBeDisabled();

    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByText("Malaysia").first()).toBeVisible();
    await expect(page.getByText("Chattogram")).toBeVisible();
    await expect(page.getByText("Port Klang")).toBeVisible();
    await expect(page.getByText("INV-REF-E2E")).toBeVisible();
    await expect(page.getByText("BL-E2E-1")).toBeVisible();
    await expect(page.getByText("LC-E2E-1")).toBeVisible();
    await expect(page.getByText("FOB")).toBeVisible();
    await expect(page.getByText("41").first()).toBeVisible();
    await expect(page.getByTestId("export-preview")).toBeVisible();

    await page.goto("/delivery/export/new");
    await page.locator("#deliveryNumber").fill(number);
    await page.locator("#destinationCountry").fill("Singapore");
    await page.locator("#portOfLoading").fill("Chattogram");
    await page.locator("#portOfDischarge").fill("Port Klang");
    await productCombobox(page).click();
    await page.getByRole("option", { name: /E2E Export Product/ }).click();
    await page.locator("input[type=number]").nth(0).fill("1");
    await page.locator("input[type=number]").nth(1).fill("1");
    await page.getByRole("button", { name: "Add Item" }).click();
    const duplicate = page.waitForResponse(
      (res) => res.url().includes("/export-deliveries") && res.request().method() === "POST"
    );
    await page.getByTestId("export-save").click();
    expect((await duplicate).status()).toBe(409);
    await expect(page.getByText("Unable to create delivery", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/delivery\/export\/new/);
  });
});
