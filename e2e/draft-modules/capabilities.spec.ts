import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta, login, logoutToLogin } from "./helpers";

async function flagsOffCapabilities(request: APIRequestContext) {
  const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
  const res = await request.get(`${e2eEnv("E2E_API_FLAGS_OFF_URL")}/draft-modules/capabilities`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  return res.json();
}

async function useCapabilityPayload(page: Page, body: unknown) {
  await page.route("**/draft-modules/capabilities", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    }
    return route.continue();
  });
}

test.describe("Draft module capabilities", () => {
  test("API reports writes from flags and roles, never workflow", async ({ request }) => {
    const adminToken = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const on = await request.get(`${e2eEnv("E2E_API_URL")}/draft-modules/capabilities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(on.status()).toBe(200);
    const enabled = await on.json();
    expect(enabled.sample_gift.can_create).toBe(true);
    expect(enabled.export.can_edit).toBe(true);
    expect(enabled.sample_gift.can_submit).toBe(false);
    expect(enabled.export.can_approve).toBe(false);

    const psoToken = await apiLogin(request, e2eEnv("E2E_PSO_EMAIL"));
    const pso = await (
      await request.get(`${e2eEnv("E2E_API_URL")}/draft-modules/capabilities`, {
        headers: { Authorization: `Bearer ${psoToken}` },
      })
    ).json();
    expect(pso.sample_gift.can_read).toBe(true);
    expect(pso.sample_gift.can_create).toBe(false);
    expect(pso.export.can_edit).toBe(false);

    const off = await flagsOffCapabilities(request);
    expect(off.sample_gift.writes_enabled).toBe(false);
    expect(off.sample_gift.can_create).toBe(false);
    expect(off.export.can_edit).toBe(false);
    expect(JSON.stringify(off).toLowerCase()).not.toMatch(/password|secret|database_url/);

    const anon = await request.get(`${e2eEnv("E2E_API_URL")}/draft-modules/capabilities`);
    expect(anon.status()).toBe(401);
  });

  test("admin and manager see Create when isolated writes are on; PSO does not", async ({ page }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("button", { name: "New Sample Gift" })).toBeVisible();
    await page.goto("/delivery/export");
    await expect(page.getByRole("button", { name: "New Export" })).toBeVisible();

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("button", { name: "New Sample Gift" })).toBeVisible();

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_PSO_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("button", { name: "New Sample Gift" })).toHaveCount(0);
    await expect(page.getByTestId("draft-writes-unavailable")).toBeVisible();
    await page.goto("/delivery/sample-gift/new");
    await expect(page.getByText("Draft creation is currently unavailable.")).toBeVisible();
    await expect(page.getByTestId("sample-gift-save")).toBeDisabled();

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("button", { name: "New Sample Gift" })).toBeVisible();
  });

  test("flags-off capability payload hides Create and Edit and blocks direct routes", async ({
    page,
    request,
  }) => {
    const off = await flagsOffCapabilities(request);
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await useCapabilityPayload(page, off);
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("button", { name: "New Sample Gift" })).toHaveCount(0);
    await expect(page.getByTestId("draft-writes-unavailable")).toBeVisible();
    await page.goto("/delivery/export");
    await expect(page.getByRole("button", { name: "New Export" })).toHaveCount(0);
    await page.goto("/delivery/sample-gift/new");
    await expect(page.getByText("Draft creation is currently unavailable.")).toBeVisible();
    await page.goto("/delivery/export/new");
    await expect(page.getByText("Draft creation is currently unavailable.")).toBeVisible();

    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const created = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        delivery_number: `SG-E2E-CAP-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Capability Gate",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(created.status()).toBe(201);
    const doc = await created.json();
    await page.goto(`/delivery/sample-gift/${doc.id}`);
    await expect(page.getByTestId("sample-gift-edit")).toHaveCount(0);
    await expect(page.getByText("Capability Gate")).toBeVisible();
    await page.goto(`/delivery/sample-gift/${doc.id}/edit`);
    await expect(page.getByText("Editing is currently unavailable.")).toBeVisible();
    await expect(page.getByTestId("sample-gift-save")).toBeDisabled();
  });

  test("capability request failure fails closed", async ({ page }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.route("**/draft-modules/capabilities", (route) => route.abort("failed"));
    await page.goto("/delivery/sample-gift");
    await expect(page.getByRole("button", { name: "New Sample Gift" })).toHaveCount(0);
    await expect(page.getByTestId("draft-writes-unavailable")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sample Gift Delivery List" })).toBeVisible();
  });
});
