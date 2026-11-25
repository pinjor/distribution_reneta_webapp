import { expect, test } from "@playwright/test";
import { apiLogin, e2eEnv, isolatedMeta, markSampleGiftSubmitted } from "./helpers";

test.describe("Write flags and non-Draft conflict", () => {
  test("flags-off isolated API rejects Draft creates", async ({ request }) => {
    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const res = await request.post(`${e2eEnv("E2E_API_FLAGS_OFF_URL")}/sample-gift-deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Flag Off",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(JSON.stringify(body).toLowerCase()).toMatch(/not enabled|permission/);
    expect(JSON.stringify(body)).not.toMatch(/created/i);

    const exportRes = await request.post(`${e2eEnv("E2E_API_FLAGS_OFF_URL")}/export-deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        depot_id: meta.depot_a_id,
        delivery_date: new Date().toISOString().slice(0, 10),
        destination_country: "Malaysia",
        port_of_loading: "Chattogram",
        port_of_discharge: "Port Klang",
        items: [{ product_id: meta.export_product_id, quantity: 1, unit_price: 1 }],
      },
    });
    expect(exportRes.status()).toBe(403);
  });

  test("submit approve reject routes stay unmounted", async ({ request }) => {
    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const headers = { Authorization: `Bearer ${token}` };
    const created = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
      headers,
      data: {
        delivery_number: `SG-E2E-WF-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "No Workflow",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id;
    for (const path of [
      `/sample-gift-deliveries/${id}/submit`,
      `/sample-gift-deliveries/${id}/approve`,
      `/sample-gift-deliveries/${id}/reject`,
    ]) {
      const res = await request.post(`${e2eEnv("E2E_API_URL")}${path}`, { headers });
      expect(res.status()).toBe(404);
    }
    const exportCreated = await request.post(`${e2eEnv("E2E_API_URL")}/export-deliveries`, {
      headers,
      data: {
        delivery_number: `EX-E2E-WF-${Date.now()}`,
        depot_id: meta.depot_a_id,
        delivery_date: new Date().toISOString().slice(0, 10),
        destination_country: "Malaysia",
        port_of_loading: "Chattogram",
        port_of_discharge: "Port Klang",
        items: [{ product_id: meta.export_product_id, quantity: 1, unit_price: 2.5 }],
      },
    });
    expect(exportCreated.status()).toBe(201);
    const exportId = (await exportCreated.json()).id;
    for (const path of [
      `/export-deliveries/${exportId}/submit`,
      `/export-deliveries/${exportId}/approve`,
      `/export-deliveries/${exportId}/reject`,
    ]) {
      const res = await request.post(`${e2eEnv("E2E_API_URL")}${path}`, { headers });
      expect(res.status()).toBe(404);
    }
  });

  test("PUT after leaving Draft returns 409 with the lock message", async ({ request }) => {
    const token = await apiLogin(request, e2eEnv("E2E_ADMIN_EMAIL"));
    const meta = isolatedMeta();
    const headers = { Authorization: `Bearer ${token}` };
    const created = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries`, {
      headers,
      data: {
        delivery_number: `SG-E2E-409-${Date.now()}`,
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Keep Original",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 1 }],
      },
    });
    expect(created.status()).toBe(201);
    const doc = await created.json();
    const submit = await request.post(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries/${doc.id}/submit`, {
      headers,
    });
    expect(submit.status()).toBe(404);
    markSampleGiftSubmitted(doc.id);
    const put = await request.put(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries/${doc.id}`, {
      headers,
      data: {
        depot_id: meta.depot_a_id,
        document_kind: "sample",
        delivery_date: new Date().toISOString().slice(0, 10),
        recipient_name: "Mutated",
        recipient_type: "Doctor",
        items: [{ product_id: meta.sample_product_id, quantity: 9 }],
      },
    });
    expect(put.status()).toBe(409);
    const body = await put.json();
    expect(body.detail).toBe("Only Draft documents can be updated");
    const stored = await request.get(`${e2eEnv("E2E_API_URL")}/sample-gift-deliveries/${doc.id}`, { headers });
    expect((await stored.json()).recipient_name).toBe("Keep Original");
  });
});
