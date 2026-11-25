import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta, login } from "./helpers";

test.describe("Draft module authentication and roles", () => {
  test("unauthenticated users are sent to login", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/delivery/sample-gift");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/delivery/export");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin can open Sample/Gift and Export lists from the API", async ({ page }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("heading", { name: "Sample Gift Delivery List" })).toBeVisible();
    await expect(page.getByText("No sample gift deliveries yet")).toBeVisible();
    await page.goto("/delivery/export");
    await expect(page.getByRole("heading", { name: "Export Delivery List" })).toBeVisible();
    await expect(page.getByText("No export deliveries yet")).toBeVisible();
  });

  test("manager can read Draft lists", async ({ page }) => {
    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("button", { name: "New Sample Gift" })).toBeVisible();
    await page.goto("/delivery/export");
    await expect(page.getByRole("heading", { name: "Export Delivery List" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Export" })).toBeVisible();
  });

  test("PSO can read but create is rejected by the API", async ({ page, request }) => {
    await login(page, e2eEnv("E2E_PSO_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("heading", { name: "Sample Gift Delivery List" })).toBeVisible();
    const token = await apiLogin(request, e2eEnv("E2E_PSO_EMAIL"));
    const meta = isolatedMeta();
    const res = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Should Fail",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/created|success/i);
  });

  test("foreign depot detail is hidden", async ({ page, request }) => {
    const adminToken = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const created = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        delivery_number: `SG-E2E-FOR-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Depot A Only",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id;
    await login(page, e2eEnv("E2E_FOREIGN_EMAIL"));
    await page.goto(`/delivery/sample-gift/${id}`);
    await expect(page.getByText("Loading delivery details...")).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText("Not found").nth(1)).toBeVisible();
  });
});
