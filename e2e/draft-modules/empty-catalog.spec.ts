import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta, login, productCombobox } from "./helpers";

test.describe("Empty catalog vs flagged catalog", () => {
  test("empty flagged catalog shows guidance and cannot save lines", async ({ page, request }) => {
    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const headers = { Authorization: `Bearer ${token}` };
    const strip = (row: Record<string, unknown>) => {
      const { id, created_at, updated_at, ...rest } = row;
      return rest;
    };
    const sample = strip(
      await (await request.get(`${e2eEnv("E2E_API_URL")}/products/${meta.sample_product_id}`, { headers })).json()
    );
    const exp = strip(
      await (await request.get(`${e2eEnv("E2E_API_URL")}/products/${meta.export_product_id}`, { headers })).json()
    );
    await request.put(`${e2eEnv("E2E_API_URL")}/products/${meta.sample_product_id}`, {
      headers,
      data: { ...sample, product_type_sample: false },
    });
    await request.put(`${e2eEnv("E2E_API_URL")}/products/${meta.export_product_id}`, {
      headers,
      data: { ...exp, product_type_export: false },
    });

    try {
      await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
      await page.goto("/delivery/sample-gift/new");
      await expect(page.getByText(/No products are flagged as sample/).first()).toBeVisible();
      await expect(page.getByText(/No sample-flagged products|No sample-flagged products in the catalog/)).toBeVisible();
      await page.getByRole("button", { name: "Add Item" }).click();
      await expect(page.getByText("Select a product", { exact: true })).toBeVisible();
      await expect(page.getByTestId("sample-gift-save")).toBeDisabled();

      await page.goto("/delivery/export/new");
      await expect(page.getByText(/No products are flagged as export/).first()).toBeVisible();
      await expect(page.getByTestId("export-save")).toBeDisabled();
    } finally {
      await request.put(`${e2eEnv("E2E_API_URL")}/products/${meta.sample_product_id}`, {
        headers,
        data: { ...sample, product_type_sample: true },
      });
      await request.put(`${e2eEnv("E2E_API_URL")}/products/${meta.export_product_id}`, {
        headers,
        data: { ...exp, product_type_export: true },
      });
    }

    await page.goto("/delivery/sample-gift/new");
    await productCombobox(page).click();
    await expect(page.getByRole("option", { name: /E2E Sample Product/ })).toBeVisible();
    await page.goto("/delivery/export/new");
    await productCombobox(page).click();
    await expect(page.getByRole("option", { name: /E2E Export Product/ })).toBeVisible();
  });
});
