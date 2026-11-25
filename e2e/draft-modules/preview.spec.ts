import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta, login, logoutToLogin } from "./helpers";

function today() {
  return new Date().toISOString().slice(0, 10);
}

test.describe("Draft preview and print", () => {
  test("Sample, Gift and Export preview show Draft marking; print is callable; access is scoped", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const headers = { Authorization: `Bearer ${token}` };
    const stamp = Date.now();

    const sample = await (
      await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
        headers,
        data: {
          delivery_number: `SG-E2E-PR-${stamp}`,
          depot_id: meta.depot_a_id,
          document_kind: "sample",
          delivery_date: today(),
          recipient_name: "Dr Preview Sample",
          recipient_type: "Doctor",
          remarks: "Preview sample remarks",
          items: [{ product_id: meta.sample_product_id, quantity: 3 }],
        },
      })
    ).json();

    const gift = await (
      await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
        headers,
        data: {
          delivery_number: `GF-E2E-PR-${stamp}`,
          depot_id: meta.depot_a_id,
          document_kind: "gift",
          delivery_date: today(),
          recipient_name: "Partner Preview Gift",
          recipient_type: "Partner",
          items: [{ product_id: meta.sample_product_id, quantity: 2 }],
        },
      })
    ).json();

    const exp = await (
      await request.post(`${e2eEnv("E2E_API_URL")}/export-deliveries`, {
        headers,
        data: {
          delivery_number: `EX-E2E-PR-${stamp}`,
          depot_id: meta.depot_a_id,
          delivery_date: today(),
          destination_country: "Malaysia",
          port_of_loading: "Chattogram",
          port_of_discharge: "Port Klang",
          items: [{ product_id: meta.export_product_id, quantity: 4, unit_price: "10.25" }],
        },
      })
    ).json();
    expect(Number(exp.total_value)).toBe(41);

    await login(page, e2eEnv("E2E_ADMIN_EMAIL"));
    await page.goto(`/delivery/sample-gift/${sample.id}`);
    await page.getByTestId("sample-gift-preview").click();
    await expect(page).toHaveURL(new RegExp(`/delivery/sample-gift/${sample.id}/preview`));
    await expect(page.getByTestId("draft-not-for-dispatch")).toHaveText("DRAFT — NOT FOR DISPATCH");
    await expect(page.getByTestId("draft-watermark")).toContainText("DRAFT — NOT FOR DISPATCH");
    await expect(page.getByText("Dr Preview Sample")).toBeVisible();
    await expect(page.getByText("E2E Sample Product")).toBeVisible();
    await expect(page.getByText("Sample Delivery Draft")).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __draftPrintCalls?: number }).__draftPrintCalls = 0;
      window.print = () => {
        const w = window as unknown as { __draftPrintCalls?: number };
        w.__draftPrintCalls = (w.__draftPrintCalls || 0) + 1;
      };
    });
    await page.getByTestId("draft-print").click();
    expect(await page.evaluate(() => (window as unknown as { __draftPrintCalls?: number }).__draftPrintCalls)).toBe(1);

    await page.emulateMedia({ media: "print" });
    await expect(page.getByTestId("draft-not-for-dispatch")).toHaveText("DRAFT — NOT FOR DISPATCH");
    expect(
      await page.getByTestId("draft-not-for-dispatch").evaluate((el) => getComputedStyle(el).display)
    ).not.toBe("none");
    expect(
      await page.getByTestId("draft-print").evaluate((el) => {
        const actions = el.closest(".draft-print-actions");
        return actions ? getComputedStyle(actions).display : getComputedStyle(el).display;
      })
    ).toBe("none");
    await page.emulateMedia({ media: "screen" });

    await page.getByRole("button", { name: "Back to Detail" }).click();
    await expect(page).toHaveURL(new RegExp(`/delivery/sample-gift/${sample.id}$`));

    await page.goto(`/delivery/sample-gift/${gift.id}/preview`);
    await expect(page.getByText("Gift Delivery Draft")).toBeVisible();
    await expect(page.getByText("Partner Preview Gift")).toBeVisible();
    await expect(page.getByTestId("draft-not-for-dispatch")).toBeVisible();

    await page.goto(`/delivery/export/${exp.id}`);
    await page.getByTestId("export-preview").click();
    await expect(page.getByText("Export Delivery Draft")).toBeVisible();
    await expect(page.getByText("Malaysia")).toBeVisible();
    await expect(page.getByText("Internal draft preview only. Not a commercial invoice")).toBeVisible();
    await expect(page.getByText("10.25").first()).toBeVisible();
    await expect(page.getByText("41").first()).toBeVisible();
    await expect(page.getByTestId("draft-not-for-dispatch")).toBeVisible();

    const after = await (
      await request.get(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries/${sample.id}`, { headers })
    ).json();
    expect(after.status).toBe("Draft");
    const afterExport = await (
      await request.get(`${e2eEnv("E2E_API_URL")}/export-deliveries/${exp.id}`, { headers })
    ).json();
    expect(afterExport.status).toBe("Draft");
    expect(Number(afterExport.total_value)).toBe(41);

    await logoutToLogin(page);
    await page.goto(`/delivery/sample-gift/${sample.id}/preview`);
    await expect(page).toHaveURL(/\/login/);

    await login(page, e2eEnv("E2E_FOREIGN_EMAIL"));
    await page.goto(`/delivery/sample-gift/${sample.id}/preview`);
    await expect(page.getByText("Loading draft preview...")).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(/Not found|Unable to load/i).first()).toBeVisible();
    await expect(page.getByTestId("draft-print")).toHaveCount(0);
  });
});
