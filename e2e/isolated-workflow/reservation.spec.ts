import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta } from "../draft-modules/helpers";

async function approveSample(request, workflow: string, managerToken: string, adminToken: string, meta: ReturnType<typeof isolatedMeta>, qty = 1) {
  const created = await request.post(`${workflow}/sample-gift-deliveries`, {
    headers: { Authorization: `Bearer ${managerToken}` },
    data: {
      delivery_number: `SG-RES-${Date.now()}-${qty}`,
      depot_id: meta.depot_a_id,
      document_kind: "sample",
      delivery_date: new Date().toISOString().slice(0, 10),
      recipient_name: "Reserve Check",
      recipient_type: "Doctor",
      items: [{ product_id: meta.sample_product_id, quantity: qty }],
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).id;
  const submitted = await request.post(`${workflow}/sample-gift-deliveries/${id}/submit`, {
    headers: { Authorization: `Bearer ${managerToken}` },
    data: {},
  });
  expect(submitted.status()).toBe(200);
  const approved = await request.post(`${workflow}/sample-gift-deliveries/${id}/approve`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {},
  });
  expect(approved.status(), await approved.text()).toBe(200);
  return id;
}

test.describe("Isolated reservation API", () => {
  test("reserves FEFO, skips expired, rejects draft, restores on release, production stays 404", async ({ request }) => {
    const meta = isolatedMeta();
    const workflow = e2eEnv("E2E_WORKFLOW_API_URL");
    const managerToken = await apiLogin(request, e2eEnv("E2E_MANAGER_EMAIL"));
    const adminToken = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));

    const draft = await request.post(`${workflow}/sample-gift-deliveries`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {
        delivery_number: `SG-RES-DRAFT-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Draft Reserve",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(draft.status()).toBe(201);
    const draftId = (await draft.json()).id;
    const draftReserve = await request.post(`${workflow}/isolated-inventory/sample-gift-deliveries/${draftId}/reserve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: "draft-key" },
    });
    expect(draftReserve.status()).toBe(409);

    await request.post(`${workflow}/sample-gift-deliveries/${draftId}/submit`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {},
    });
    const submittedReserve = await request.post(`${workflow}/isolated-inventory/sample-gift-deliveries/${draftId}/reserve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: "submitted-key" },
    });
    expect(submittedReserve.status()).toBe(409);

    const id = await approveSample(request, workflow, managerToken, adminToken, meta, 1);
    const reserved = await request.post(`${workflow}/isolated-inventory/sample-gift-deliveries/${id}/reserve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `sg-${id}` },
    });
    expect(reserved.status(), await reserved.text()).toBe(200);
    const body = await reserved.json();
    expect(body.status).toBe("RESERVED");
    expect(body.slices[0].batch_no).toBe("SG-EARLY");
    expect(body.slices.map((s: { batch_no: string }) => s.batch_no)).not.toContain("SG-EXPIRED");

    const retry = await request.post(`${workflow}/isolated-inventory/sample-gift-deliveries/${id}/reserve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `sg-${id}` },
    });
    expect(retry.status()).toBe(200);
    expect((await retry.json()).reservation_id).toBe(body.reservation_id);

    const shortId = await approveSample(request, workflow, managerToken, adminToken, meta, 500);
    const short = await request.post(`${workflow}/isolated-inventory/sample-gift-deliveries/${shortId}/reserve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `short-${shortId}` },
    });
    expect(short.status()).toBe(409);
    const listedShort = await request.get(`${workflow}/isolated-inventory/sample-gift-deliveries/${shortId}/reservations`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(listedShort.status()).toBe(200);
    expect(await listedShort.json()).toEqual([]);

    const released = await request.post(`${workflow}/isolated-inventory/reservations/${body.reservation_id}/release`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(released.status()).toBe(200);
    expect((await released.json()).status).toBe("RELEASED");

    const exportCreated = await request.post(`${workflow}/export-deliveries`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {
        delivery_number: `EX-RES-${Date.now()}`,
        depot_id: meta.depot_a_id,
        delivery_date: new Date().toISOString().slice(0, 10),
        destination_country: "MY",
        port_of_loading: "CTG",
        port_of_discharge: "PKG",
        items: [{ product_id: meta.export_product_id, quantity: 1, unit_price: 1 }],
      },
    });
    expect(exportCreated.status(), await exportCreated.text()).toBe(201);
    const exportId = (await exportCreated.json()).id;
    await request.post(`${workflow}/export-deliveries/${exportId}/submit`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {},
    });
    const exportApproved = await request.post(`${workflow}/export-deliveries/${exportId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {},
    });
    expect(exportApproved.status()).toBe(200);
    const exportReserved = await request.post(`${workflow}/isolated-inventory/export-deliveries/${exportId}/reserve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: { idempotency_key: `ex-${exportId}` },
    });
    expect(exportReserved.status(), await exportReserved.text()).toBe(200);
    expect((await exportReserved.json()).slices[0].batch_no).toBe("EX-EARLY");

    const foreignToken = await apiLogin(request, e2eEnv("E2E_FOREIGN_MANAGER_EMAIL"));
    const foreign = await request.post(`${workflow}/isolated-inventory/sample-gift-deliveries/${id}/reserve`, {
      headers: { Authorization: `Bearer ${foreignToken}` },
      data: { idempotency_key: "foreign" },
    });
    expect(foreign.status()).toBe(404);
    expect(JSON.stringify(await foreign.json()).toLowerCase()).not.toMatch(/reserve check/);

    const production = await request.post(
      `${e2eEnv("E2E_API_URL")}/isolated-inventory/sample-gift-deliveries/${id}/reserve`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
        data: { idempotency_key: "prod" },
      }
    );
    expect(production.status()).toBe(404);
  });
});
