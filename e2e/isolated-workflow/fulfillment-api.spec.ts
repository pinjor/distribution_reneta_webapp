import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta } from "../draft-modules/helpers";

async function approveSample(request, workflow: string, managerToken: string, adminToken: string, meta: ReturnType<typeof isolatedMeta>) {
  const created = await request.post(`${workflow}/sample-gift-deliveries`, {
    headers: { Authorization: `Bearer ${managerToken}` },
    data: {
      delivery_number: `SG-FF-${Date.now()}`,
      depot_id: meta.depot_a_id,
      document_kind: "sample",
      delivery_date: new Date().toISOString().slice(0, 10),
      recipient_name: "Fulfillment Check",
      recipient_type: "Doctor",
      items: [{ product_id: meta.sample_product_id, quantity: 1 }],
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).id;
  expect(
    (await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {},
    })).status()
  ).toBe(200);
  expect(
    (
      await request.post(`${workflow}/sample-gift-deliveries/${id}/approve`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {},
      })
    ).status()
  ).toBe(200);
  return id;
}

test.describe("Isolated fulfillment API", () => {
  test("picks, issues, dispatches, delivers; production stays 404", async ({ request }) => {
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
    expect(body.status).toBe("PICKING");
    const fid = body.fulfillment_id;

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
    expect(confirmed.status(), await confirmed.text()).toBe(200);
    expect((await confirmed.json()).status).toBe("PICKED");

    const issued = await request.post(`${workflow}/isolated-fulfillment/${fid}/issue`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `i-${id}` },
    });
    expect(issued.status(), await issued.text()).toBe(200);
    expect((await issued.json()).status).toBe("ISSUED");

    const dispatched = await request.post(`${workflow}/isolated-fulfillment/${fid}/dispatch`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `d-${id}`, transport_ref: "E2E-TRK" },
    });
    expect(dispatched.status(), await dispatched.text()).toBe(200);

    const delivered = await request.post(`${workflow}/isolated-fulfillment/${fid}/delivery/confirm`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `del-${id}`, receiver_name: "E2E Receiver" },
    });
    expect(delivered.status(), await delivered.text()).toBe(200);
    expect((await delivered.json()).status).toBe("DELIVERED");

    const failed = await request.post(`${workflow}/isolated-fulfillment/${fid}/delivery/fail`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `fail-${id}`, reason: "too late" },
    });
    expect(failed.status()).toBe(409);

    const history = await request.get(`${workflow}/isolated-fulfillment/${fid}/history`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(history.status()).toBe(200);
    expect((await history.json()).map((row: { action: string }) => row.action)).toEqual([
      "START_PICK",
      "CONFIRM_PICK",
      "ISSUE",
      "DISPATCH",
      "CONFIRM_DELIVERY",
    ]);

    const production = await request.post(
      `${e2eEnv("E2E_API_URL")}/isolated-fulfillment/sample-gift-deliveries/${id}/picking/start`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
        data: { idempotency_key: "prod" },
      }
    );
    expect(production.status()).toBe(404);
  });
});
