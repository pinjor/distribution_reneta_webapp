import { expect, test } from "@playwright/test";
import { e2eEnv, isolatedMeta, login, productCombobox, selectOption } from "./helpers";

async function fillSampleCreate(page: import("@playwright/test").Page, recipient: string) {
  await page.locator("#recipientName").fill(recipient);
  await selectOption(page, "#recipientType", "Doctor");
}

test.describe("Draft unsaved changes", () => {
  test("Sample/Gift create: stay, discard, clean cancel, save, failed save", async ({ page }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/sample-gift/new");
    await expect(page.getByRole("heading", { name: "Create Sample Gift Delivery" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/delivery\/sample-gift$/);
    await expect(page.getByTestId("draft-unsaved-dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "New Sample Gift" }).click();
    await fillSampleCreate(page, "Dr Unsaved Stay");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByTestId("draft-unsaved-dialog")).toBeVisible();
    await page.getByTestId("draft-unsaved-stay").click();
    await expect(page.locator("#recipientName")).toHaveValue("Dr Unsaved Stay");
    await expect(page).toHaveURL(/\/delivery\/sample-gift\/new/);

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByTestId("draft-unsaved-discard").click();
    await expect(page).toHaveURL(/\/delivery\/sample-gift$/);

    await page.getByRole("button", { name: "New Sample Gift" }).click();
    const number = `SG-E2E-US-${Date.now()}`;
    await page.locator("#deliveryNumber").fill(number);
    await fillSampleCreate(page, "Dr Unsaved Save");
    await productCombobox(page).click();
    await page.getByRole("option", { name: /E2E Sample Product/ }).click();
    await page.locator("input[type=number]").fill("1");
    await page.getByRole("button", { name: "Add Item" }).click();
    await page.getByTestId("sample-gift-save").click();
    await expect(page).toHaveURL(/\/delivery\/sample-gift$/);
    await expect(page.getByTestId("draft-unsaved-dialog")).toHaveCount(0);
    await expect(page.getByRole("cell", { name: number })).toBeVisible();

    await page.getByRole("button", { name: "New Sample Gift" }).click();
    await page.locator("#deliveryNumber").fill(`SG-E2E-FAIL-${Date.now()}`);
    await fillSampleCreate(page, "Dr Keep After Fail");
    await productCombobox(page).click();
    await page.getByRole("option", { name: /E2E Sample Product/ }).click();
    await page.locator("input[type=number]").fill("2");
    await page.getByRole("button", { name: "Add Item" }).click();
    await page.route("**/sample-gift-deliveries", async (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "server error" }),
        });
      }
      return route.continue();
    });
    await page.getByTestId("sample-gift-save").click();
    await expect(page.getByText("Unable to create delivery", { exact: true })).toBeVisible();
    await expect(page.locator("#recipientName")).toHaveValue("Dr Keep After Fail");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("draft-unsaved-dialog")).toBeVisible();
    await page.getByTestId("draft-unsaved-stay").click();
    await expect(page.locator("#recipientName")).toHaveValue("Dr Keep After Fail");
  });

  test("Export create stay/discard and Sample/Gift edit cancel", async ({ page, request }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto("/delivery/export/new");
    await page.locator("#destinationCountry").fill("Malaysia");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByTestId("draft-unsaved-dialog")).toBeVisible();
    await page.getByTestId("draft-unsaved-stay").click();
    await expect(page.locator("#destinationCountry")).toHaveValue("Malaysia");
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByTestId("draft-unsaved-discard").click();
    await expect(page).toHaveURL(/\/delivery\/export$/);

    const tokenRes = await request.post(`${e2eEnv("E2E_API_URL")}/auth/login`, {
      data: { email: e2eEnv("E2E_ADMIN_EMAIL"), password: e2eEnv("E2E_ISOLATED_PASSWORD"), remember_me: false },
    });
    const token = (await tokenRes.json()).access_token;
    const meta = isolatedMeta();
    const created = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        delivery_number: `SG-E2E-UE-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Dr Edit Unsaved",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(created.status()).toBe(201);
    const doc = await created.json();
    await page.goto(`/delivery/sample-gift/${doc.id}/edit`);
    await expect(page.locator("#recipientName")).toHaveValue("Dr Edit Unsaved");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(new RegExp(`/delivery/sample-gift/${doc.id}$`));
    await page.goto(`/delivery/sample-gift/${doc.id}/edit`);
    await page.locator("#recipientName").fill("Dr Edit Dirty");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("draft-unsaved-dialog")).toBeVisible();
    await page.getByTestId("draft-unsaved-discard").click();
    await expect(page).toHaveURL(new RegExp(`/delivery/sample-gift/${doc.id}$`));
  });

  test("disabled writes still block Save; Chromium beforeunload when supported", async ({ page }) => {
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.route("**/draft-modules/capabilities", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            sample_gift: {
              can_read: true,
              can_create: false,
              can_edit: false,
              writes_enabled: false,
              can_submit: false,
              can_approve: false,
              can_reject: false,
            },
            export: {
              can_read: true,
              can_create: false,
              can_edit: false,
              writes_enabled: false,
              can_submit: false,
              can_approve: false,
              can_reject: false,
            },
          }),
        });
      }
      return route.continue();
    });
    await page.goto("/delivery/sample-gift/new");
    await expect(page.getByText("Draft creation is currently unavailable.")).toBeVisible();
    await expect(page.getByTestId("sample-gift-save")).toBeDisabled();

    await page.unroute("**/draft-modules/capabilities");
    await page.goto("/delivery/sample-gift/new");
    await fillSampleCreate(page, "Dr Beforeunload");
    let sawBeforeUnload = false;
    page.once("dialog", async (dialog) => {
      sawBeforeUnload = dialog.type() === "beforeunload";
      await dialog.dismiss();
    });
    await page.reload({ timeout: 10_000 }).catch(() => undefined);
    if (sawBeforeUnload) {
      await expect(page.locator("#recipientName")).toHaveValue("Dr Beforeunload");
    }
  });
});
