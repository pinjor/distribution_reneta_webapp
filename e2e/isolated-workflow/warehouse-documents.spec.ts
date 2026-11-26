import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta, login } from "../draft-modules/helpers";

async function approveSample(request, workflow: string, managerToken: string, adminToken: string, meta: ReturnType<typeof isolatedMeta>) {
  const created = await request.post(`${workflow}/sample-gift-deliveries`, {
    headers: { Authorization: `Bearer ${managerToken}` },
    data: {
      delivery_number: `SG-WD-${Date.now()}`,
      depot_id: meta.depot_a_id,
      document_kind: "sample",
      delivery_date: new Date().toISOString().slice(0, 10),
      recipient_name: "Warehouse Docs",
      recipient_type: "Doctor",
      items: [{ product_id: meta.sample_product_id, quantity: 1 }],
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).id;
  expect((await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, { headers: { Authorization: `Bearer ${managerToken}` }, data: {} })).status()).toBe(200);
  expect((await request.post(`${workflow}/sample-gift-deliveries/${id}/approve`, { headers: { Authorization: `Bearer ${adminToken}` }, data: {} })).status()).toBe(200);
  return id as number;
}

test.describe("Isolated warehouse documents", () => {
  test("pick list, issue slip and delivery confirmation stay provisional; production has no route", async ({ page, request }) => {
    const meta = isolatedMeta();
    const workflow = e2eEnv("E2E_WORKFLOW_API_URL");
    const managerToken = await apiLogin(request, e2eEnv("E2E_MANAGER_EMAIL"));
    const adminToken = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const id = await approveSample(request, workflow, managerToken, adminToken, meta);
    const reserved = await request.post(`${workflow}/isolated-inventory/sample-gift-deliveries/${id}/reserve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `r-${id}` },
    });
    expect(reserved.status(), await reserved.text()).toBe(200);
    const started = await request.post(`${workflow}/isolated-fulfillment/sample-gift-deliveries/${id}/picking/start`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `p-${id}` },
    });
    expect(started.status(), await started.text()).toBe(200);
    const body = await started.json();
    const fid = body.fulfillment_id as string;

    await login(page, e2eEnv("E2E_MANAGER_EMAIL"));
    await page.goto(`/delivery/sample-gift/${id}/warehouse/pick-list`);
    await expect(page.getByTestId("warehouse-watermark")).toHaveText("PROVISIONAL — TEST DOCUMENT — NOT FOR DISPATCH");
    await expect(page.getByTestId("warehouse-doc-title")).toHaveText("Warehouse Pick List");
    await expect(page.getByText("SG-EARLY")).toBeVisible();
    await expect(page.getByTestId("warehouse-print")).toBeVisible();
    await expect(page.locator(".draft-print-actions")).toBeVisible();

    await page.goto(`/delivery/sample-gift/${id}/warehouse/issue-slip`);
    await expect(page.getByTestId("warehouse-unavailable")).toContainText("issuance");

    const confirmed = await request.post(`${workflow}/isolated-fulfillment/${fid}/picking/confirm`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {
        idempotency_key: `c-${id}`,
        slices: body.slices.map((slice: { lot_id: number; reserved_quantity: string | number }) => ({
          lot_id: slice.lot_id,
          picked_quantity: slice.reserved_quantity,
        })),
      },
    });
    expect(confirmed.status()).toBe(200);
    expect((await request.post(`${workflow}/isolated-fulfillment/${fid}/issue`, { headers: { Authorization: `Bearer ${managerToken}` }, data: { idempotency_key: `i-${id}` } })).status()).toBe(200);
    expect((await request.post(`${workflow}/isolated-fulfillment/${fid}/dispatch`, { headers: { Authorization: `Bearer ${managerToken}` }, data: { idempotency_key: `d-${id}`, transport_ref: "E2E-TRK" } })).status()).toBe(200);
    expect((await request.post(`${workflow}/isolated-fulfillment/${fid}/delivery/confirm`, { headers: { Authorization: `Bearer ${managerToken}` }, data: { idempotency_key: `del-${id}`, receiver_name: "E2E Receiver" } })).status()).toBe(200);

    await page.goto(`/delivery/sample-gift/${id}/warehouse/issue-slip`);
    await expect(page.getByTestId("warehouse-doc-title")).toHaveText("Stock Issue Slip");
    await expect(page.getByTestId("warehouse-unavailable")).toHaveCount(0);

    await page.goto(`/delivery/sample-gift/${id}/warehouse/delivery`);
    await expect(page.getByTestId("warehouse-doc-title")).toHaveText("Delivery Confirmation");
    await expect(page.getByTestId("warehouse-failed-delivery")).toHaveCount(0);
    await expect(page.getByText("E2E Receiver")).toBeVisible();

    const psoToken = await apiLogin(request, e2eEnv("E2E_PSO_EMAIL"));
    const pso = await request.get(`${workflow}/isolated-fulfillment/sample-gift-deliveries/${id}/fulfillment`, {
      headers: { Authorization: `Bearer ${psoToken}` },
    });
    expect(pso.status()).toBe(403);

    const foreignToken = await apiLogin(request, e2eEnv("E2E_FOREIGN_MANAGER_EMAIL"));
    const foreign = await request.get(`${workflow}/isolated-fulfillment/sample-gift-deliveries/${id}/fulfillment`, {
      headers: { Authorization: `Bearer ${foreignToken}` },
    });
    expect(foreign.status()).toBe(404);

    const production = await request.get(
      `${e2eEnv("E2E_API_URL")}/isolated-fulfillment/sample-gift-deliveries/${id}/fulfillment`,
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    expect(production.status()).toBe(404);
  });
});
