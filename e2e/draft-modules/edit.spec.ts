import { expect, test } from "@playwright/test";
import {
  apiLogin,
  e2eEnv,
  isolatedMeta,
  login,
  logoutToLogin,
  markExportSubmitted,
  markSampleGiftSubmitted,
} from "./helpers";

function today() {
  return new Date().toISOString().slice(0, 10);
}

test.describe("Sample/Gift Draft edit", () => {
  test("edit, persist, cancel, PSO denied, 409 conflict", async ({ page, request }) => {
    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const headers = { Authorization: `Bearer ${token}` };
    const created = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
      headers,
      data: {
        delivery_number: `SG-E2E-ED-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: today(),
        recipient_name: "Dr Original",
        recipient_type: "Doctor",
        remarks: "Keep remarks",
        items: [{ product_id: meta.sample_product_id, quantity: 3 }],
      },
    });
    expect(created.status()).toBe(201);
    const doc = await created.json();

    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto(`/delivery/sample-gift/${doc.id}`);
    await expect(page.getByText("Dr Original")).toBeVisible();
    await page.getByTestId("sample-gift-edit").click();
    await expect(page).toHaveURL(new RegExp(`/delivery/sample-gift/${doc.id}/edit`));
    await expect(page.locator("#recipientName")).toHaveValue("Dr Original");
    expect(Number(await page.getByTestId("line-quantity").inputValue())).toBe(3);
    await expect(page.locator("#remarks")).toHaveValue("Keep remarks");

    await page.locator("#recipientName").fill("Dr Edited");
    await page.getByTestId("line-quantity").fill("5");
    const put = page.waitForResponse(
      (res) =>
        res.url().includes(`/sample-gift-deliveries/${doc.id}`) && res.request().method() === "PUT"
    );
    await page.getByTestId("sample-gift-save").click();
    expect((await put).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/delivery/sample-gift/${doc.id}$`));
    await expect(page.getByText("Dr Edited")).toBeVisible();
    await expect(page.getByRole("cell", { name: "5" })).toBeVisible();

    const stored = await request.get(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries/${doc.id}`, {
      headers,
    });
    const body = await stored.json();
    expect(body.recipient_name).toBe("Dr Edited");
    expect(Number(body.items[0].quantity)).toBe(5);

    await page.getByTestId("sample-gift-edit").click();
    await page.locator("#recipientName").fill("Should Discard");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("draft-unsaved-dialog")).toBeVisible();
    await page.getByTestId("draft-unsaved-discard").click();
    await expect(page).toHaveURL(new RegExp(`/delivery/sample-gift/${doc.id}$`));
    await expect(page.getByText("Dr Edited")).toBeVisible();
    await expect(page.getByText("Should Discard")).toHaveCount(0);

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_PSO_EMAIL"));
    await page.goto(`/delivery/sample-gift/${doc.id}`);
    await expect(page.getByTestId("sample-gift-edit")).toHaveCount(0);
    await page.goto(`/delivery/sample-gift/${doc.id}/edit`);
    await expect(page.getByText("Editing is currently unavailable.")).toBeVisible();
    await expect(page.getByTestId("sample-gift-save")).toBeDisabled();

    await logoutToLogin(page);
    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto(`/delivery/sample-gift/${doc.id}/edit`);
    await expect(page.locator("#recipientName")).toHaveValue("Dr Edited");
    markSampleGiftSubmitted(doc.id);
    await page.locator("#recipientName").fill("After Submit");
    const conflictPut = page.waitForResponse(
      (res) =>
        res.url().includes(`/sample-gift-deliveries/${doc.id}`) && res.request().method() === "PUT"
    );
    await page.getByTestId("sample-gift-save").click();
    expect((await conflictPut).status()).toBe(409);
    await expect(page.getByTestId("draft-conflict")).toBeVisible();
    await expect(page.getByTestId("draft-conflict").getByText("Only Draft documents can be updated")).toBeVisible();
    await expect(page.getByText("Sample gift delivery updated")).toHaveCount(0);
    await expect(page.locator("#recipientName")).toHaveValue("After Submit");
    await page.getByRole("button", { name: "Back to Detail" }).click();
    await expect(page.getByTestId("draft-unsaved-dialog")).toBeVisible();
    await page.getByTestId("draft-unsaved-stay").click();
    await expect(page.locator("#recipientName")).toHaveValue("After Submit");
    const unchanged = await (
      await request.get(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries/${doc.id}`, { headers })
    ).json();
    expect(unchanged.recipient_name).toBe("Dr Edited");
    expect(unchanged.status).toBe("Submitted");
  });
});

test.describe("Export Draft edit", () => {
  test("edit shipping and lines, 404, 409", async ({ page, request }) => {
    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const headers = { Authorization: `Bearer ${token}` };
    const created = await request.post(`${e2eEnv("E2E_API_URL")}/export-deliveries`, {
      headers,
      data: {
        delivery_number: `EX-E2E-ED-${Date.now()}`,
        depot_id: meta.depot_a_id,
        delivery_date: today(),
        destination_country: "Malaysia",
        port_of_loading: "Chattogram",
        port_of_discharge: "Port Klang",
        shipping_line: "Maersk Line",
        bl_number: "BL-KEEP",
        invoice_number: "INV-KEEP",
        lc_number: "LC-KEEP",
        incoterms: "FOB",
        payment_terms: "LC",
        remarks: "Export remarks",
        items: [{ product_id: meta.export_product_id, quantity: 4, unit_price: "10.25" }],
      },
    });
    expect(created.status()).toBe(201);
    const doc = await created.json();
    expect(Number(doc.total_value)).toBe(41);

    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto(`/delivery/export/${doc.id}`);
    await page.getByTestId("export-edit").click();
    await expect(page).toHaveURL(new RegExp(`/delivery/export/${doc.id}/edit`));
    await expect(page.locator("#destinationCountry")).toHaveValue("Malaysia");
    await expect(page.locator("#portOfLoading")).toHaveValue("Chattogram");
    await expect(page.locator("#portOfDischarge")).toHaveValue("Port Klang");
    expect(Number(await page.getByTestId("line-quantity").inputValue())).toBe(4);
    expect(Number(await page.getByTestId("line-unit-price").inputValue())).toBe(10.25);

    await page.locator("#destinationCountry").fill("Singapore");
    await page.locator("#portOfLoading").fill("Mongla");
    await page.getByTestId("line-quantity").fill("2");
    await page.getByTestId("line-unit-price").fill("12.50");
    const put = page.waitForResponse(
      (res) => res.url().includes(`/export-deliveries/${doc.id}`) && res.request().method() === "PUT"
    );
    await page.getByTestId("export-save").click();
    expect((await put).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/delivery/export/${doc.id}$`));
    await expect(page.getByText("Singapore").first()).toBeVisible();
    await expect(page.getByText("Mongla")).toBeVisible();
    await expect(page.getByText("25").first()).toBeVisible();

    const stored = await (
      await request.get(`${e2eEnv("E2E_API_URL")}/export-deliveries/${doc.id}`, { headers })
    ).json();
    expect(stored.destination_country).toBe("Singapore");
    expect(stored.port_of_loading).toBe("Mongla");
    expect(Number(stored.total_value)).toBe(25);

    await page.goto(`/delivery/export/${doc.id}/edit`);
    await page.getByTestId("line-quantity").fill("0");
    await page.getByTestId("export-save").click();
    await expect(page.getByText("Enter valid quantity", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/edit/);

    await page.goto("/delivery/export/999999991/edit");
    await expect(page.getByText(/Unable to load delivery details|Not Found/i).first()).toBeVisible();

    await page.goto(`/delivery/export/${doc.id}/edit`);
    await expect(page.locator("#destinationCountry")).toHaveValue("Singapore");
    markExportSubmitted(doc.id);
    await page.locator("#destinationCountry").fill("Thailand");
    const conflictPut = page.waitForResponse(
      (res) => res.url().includes(`/export-deliveries/${doc.id}`) && res.request().method() === "PUT"
    );
    await page.getByTestId("export-save").click();
    expect((await conflictPut).status()).toBe(409);
    await expect(page.getByTestId("draft-conflict")).toBeVisible();
    const after = await (
      await request.get(`${e2eEnv("E2E_API_URL")}/export-deliveries/${doc.id}`, { headers })
    ).json();
    expect(after.destination_country).toBe("Singapore");
    expect(after.status).toBe("Submitted");
  });
});
