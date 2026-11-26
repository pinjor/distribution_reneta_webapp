import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta } from "../draft-modules/helpers";

test.describe("Isolated workflow API permissions", () => {
  test("foreign depot is 404, flags-off is 403, production API stays 404", async ({ request }) => {
    const meta = isolatedMeta();
    const managerToken = await apiLogin(request, e2eEnv("E2E_MANAGER_EMAIL"));
    const workflow = e2eEnv("E2E_WORKFLOW_API_URL");
    const created = await request.post(`${workflow}/sample-gift-deliveries`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {
        delivery_number: `SG-WF-PERM-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Perm Check",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id;

    const foreignToken = await apiLogin(request, e2eEnv("E2E_FOREIGN_MANAGER_EMAIL"));
    const foreign = await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${foreignToken}` },
      data: {},
    });
    expect(foreign.status()).toBe(404);
    expect(JSON.stringify(await foreign.json()).toLowerCase()).not.toMatch(/perm check/);

    const psoToken = await apiLogin(request, e2eEnv("E2E_PSO_EMAIL"));
    const pso = await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${psoToken}` },
      data: {},
    });
    expect(pso.status()).toBe(403);

    const flagsOff = await request.post(`${e2eEnv("E2E_WORKFLOW_FLAGS_OFF_URL")}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {},
    });
    expect(flagsOff.status()).toBe(403);

    const production = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {},
    });
    expect(production.status()).toBe(404);

    const billingToken = await apiLogin(request, e2eEnv("E2E_BILLING_EMAIL"));
    const billing = await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${billingToken}` },
      data: {},
    });
    expect(billing.status()).toBe(403);

    const first = await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {},
    });
    expect(first.status()).toBe(200);
    const again = await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {},
    });
    expect([200, 409]).toContain(again.status());
  });
});
