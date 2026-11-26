import { describe, expect, it } from "vitest";
import {
  mapWarehousePrint,
  printViewHasOfficialWarehouseClaims,
  unavailableReason,
  WAREHOUSE_WATERMARK,
  warehouseDocAllowed,
} from "./warehouseDocuments";

const fulfillment = {
  fulfillment_id: "ff-1",
  reservation_id: "rs-1",
  document_kind: "sample_gift",
  document_id: 11,
  depot_id: 3,
  status: "PICKING",
  issued_quantity: "0",
  slices: [
    {
      lot_id: 9,
      batch_no: "SG-EARLY",
      expiry_date: "2027-01-15",
      reserved_quantity: "1",
      picked_quantity: "0",
    },
  ],
};

const reservation = {
  reservation_id: "rs-1",
  slices: [
    {
      lot_id: 9,
      batch_no: "SG-EARLY",
      expiry_date: "2027-01-15",
      allocated_quantity: "1",
      product_id: 44,
    },
  ],
};

const sampleSource = {
  delivery_number: "SG-1",
  document_kind: "sample",
  depot_id: 3,
  recipient_name: "Dr Sample",
  recipient_type: "Doctor",
  items: [{ product_id: 44, product_name: "Amoxicillin 250", quantity: "1" }],
};

const giftSource = { ...sampleSource, delivery_number: "GF-1", document_kind: "gift" };

const exportSource = {
  delivery_number: "EX-1",
  destination_country: "MY",
  port_of_loading: "CTG",
  port_of_discharge: "PKG",
  shipping_line: "Maersk",
  container_number: "MSKU1",
  bl_number: "BL-1",
  items: [{ product_id: 44, product_name: "Export SKU", quantity: "1" }],
};

const historyPicked = [
  { action: "START_PICK", actor_id: 2, from_status: null, to_status: "PICKING", created_at: "2026-11-26T08:00:00" },
  { action: "CONFIRM_PICK", actor_id: 2, from_status: "PICKING", to_status: "PICKED", created_at: "2026-11-26T08:05:00" },
];

describe("isolated warehouse documents", () => {
  it("maps a Sample pick list from reserved slices only", () => {
    const view = mapWarehousePrint({
      docType: "pick_list",
      module: "sample_gift",
      fulfillment: {
        ...fulfillment,
        slices: [
          ...fulfillment.slices,
          { lot_id: 99, batch_no: "UNRESERVED", reserved_quantity: "5", picked_quantity: "0" },
        ],
      },
      reservation,
      source: sampleSource,
      history: historyPicked.slice(0, 1),
    });
    expect(view?.title).toBe("Warehouse Pick List");
    expect(view?.watermark).toBe(WAREHOUSE_WATERMARK);
    expect(view?.unavailable).toBeNull();
    expect(view?.fields.find((f) => f.label === "Recipient")?.value).toBe("Dr Sample");
    expect(view?.lines).toHaveLength(1);
    expect(view?.lines[0].batch).toBe("SG-EARLY");
    expect(view?.lines[0].product).toBe("Amoxicillin 250");
    expect(view?.lines[0].sku).toBe("—");
    expect(printViewHasOfficialWarehouseClaims(view!)).toBe(false);
  });

  it("maps a Gift pick list", () => {
    const view = mapWarehousePrint({
      docType: "pick_list",
      module: "sample_gift",
      fulfillment,
      reservation,
      source: giftSource,
      history: [],
    });
    expect(view?.fields.find((f) => f.label === "Document type")?.value).toBe("gift");
    expect(view?.fields.find((f) => f.label === "Document reference")?.value).toBe("GF-1");
  });

  it("maps an Export pick list with shipping fields from the source document", () => {
    const view = mapWarehousePrint({
      docType: "pick_list",
      module: "export",
      fulfillment: { ...fulfillment, document_kind: "export" },
      reservation,
      source: exportSource,
      history: [],
    });
    expect(view?.fields.find((f) => f.label === "Destination country")?.value).toBe("MY");
    expect(view?.fields.find((f) => f.label === "Port of loading")?.value).toBe("CTG");
    expect(view?.fields.find((f) => f.label === "B/L number")?.value).toBe("BL-1");
    expect(JSON.stringify(view)).not.toMatch(/customs clearance|authorized for dispatch/i);
  });

  it("maps picking confirmation after PICKED", () => {
    const view = mapWarehousePrint({
      docType: "pick_confirm",
      module: "sample_gift",
      fulfillment: { ...fulfillment, status: "PICKED", slices: [{ ...fulfillment.slices[0], picked_quantity: "1" }] },
      reservation,
      source: sampleSource,
      history: historyPicked,
    });
    expect(view?.title).toBe("Picking Confirmation Sheet");
    expect(view?.unavailable).toBeNull();
    expect(view?.lines[0].picked).toBe(Number(1).toLocaleString(undefined, { maximumFractionDigits: 4 }));
    expect(view?.lines[0].discrepancy).toBe("—");
    expect(view?.columns).toContain("discrepancy");
  });

  it("shows expiry dates including expired or missing values without inventing batches", () => {
    const view = mapWarehousePrint({
      docType: "pick_list",
      module: "sample_gift",
      fulfillment: {
        ...fulfillment,
        slices: [
          { lot_id: 9, batch_no: "SG-EXPIRED", expiry_date: "2020-01-01", reserved_quantity: "1", picked_quantity: "0" },
        ],
      },
      reservation: {
        reservation_id: "rs-1",
        slices: [{ lot_id: 9, batch_no: "SG-EXPIRED", expiry_date: "2020-01-01", allocated_quantity: "1", product_id: 44 }],
      },
      source: sampleSource,
      history: [],
    });
    expect(view?.lines[0].batch).toBe("SG-EXPIRED");
    expect(view?.lines[0].expiry).toBe("2020-01-01");
    const missing = mapWarehousePrint({
      docType: "pick_list",
      module: "sample_gift",
      fulfillment: {
        ...fulfillment,
        slices: [{ lot_id: 9, batch_no: "SG-NULL", expiry_date: null, reserved_quantity: "1", picked_quantity: "0" }],
      },
      reservation: {
        reservation_id: "rs-1",
        slices: [{ lot_id: 9, batch_no: "SG-NULL", expiry_date: null, allocated_quantity: "1", product_id: 44 }],
      },
      source: sampleSource,
      history: [],
    });
    expect(missing?.lines[0].expiry).toBe("—");
  });

  it("does not emit an issue slip before issuance", () => {
    const view = mapWarehousePrint({
      docType: "issue_slip",
      module: "sample_gift",
      fulfillment,
      reservation,
      source: sampleSource,
      history: [],
    });
    expect(view?.unavailable).toMatch(/issuance/i);
    expect(view?.lines).toEqual([]);
  });

  it("maps a stock issue slip after ISSUED", () => {
    const view = mapWarehousePrint({
      docType: "issue_slip",
      module: "sample_gift",
      fulfillment: {
        ...fulfillment,
        status: "ISSUED",
        issued_quantity: "1",
        slices: [{ ...fulfillment.slices[0], picked_quantity: "1" }],
      },
      reservation,
      source: sampleSource,
      history: [...historyPicked, { action: "ISSUE", actor_id: 8, from_status: "PICKED", to_status: "ISSUED", created_at: "2026-11-26T09:00:00" }],
    });
    expect(view?.unavailable).toBeNull();
    expect(view?.fields.find((f) => f.label === "Issuing actor")?.value).toBe("8");
    expect(view?.fields.find((f) => f.label === "Quantity issued")?.value).toBe(
      Number(1).toLocaleString(undefined, { maximumFractionDigits: 4 })
    );
    expect(view?.columns).toContain("issued");
  });

  it("maps a dispatch note only after DISPATCHED", () => {
    expect(warehouseDocAllowed("ISSUED", "dispatch_note")).toBe(false);
    const tooEarly = mapWarehousePrint({
      docType: "dispatch_note",
      module: "export",
      fulfillment: { ...fulfillment, status: "ISSUED" },
      reservation,
      source: exportSource,
      history: [],
    });
    expect(tooEarly?.unavailable).toMatch(/dispatch/i);
    const view = mapWarehousePrint({
      docType: "dispatch_note",
      module: "export",
      fulfillment: {
        ...fulfillment,
        status: "DISPATCHED",
        dispatch_id: "ds-1",
        transport_ref: "TRK-1",
        issued_quantity: "1",
        slices: [{ ...fulfillment.slices[0], picked_quantity: "1" }],
      },
      reservation,
      source: exportSource,
      history: [{ action: "DISPATCH", actor_id: 2, from_status: "ISSUED", to_status: "DISPATCHED", created_at: "2026-11-26T10:00:00" }],
    });
    expect(view?.unavailable).toBeNull();
    expect(view?.fields.find((f) => f.label === "Dispatch reference")?.value).toBe("ds-1");
    expect(view?.fields.find((f) => f.label === "Transport reference")?.value).toBe("TRK-1");
  });

  it("maps delivery confirmation without inventing a signature", () => {
    const view = mapWarehousePrint({
      docType: "delivery",
      module: "sample_gift",
      fulfillment: {
        ...fulfillment,
        status: "DELIVERED",
        dispatch_id: "ds-1",
        receiver_name: "Clinic desk",
        delivered_quantity: "1",
        pod_ref: "POD-9",
        issued_quantity: "1",
        slices: [{ ...fulfillment.slices[0], picked_quantity: "1" }],
      },
      reservation,
      source: sampleSource,
      history: [{ action: "CONFIRM_DELIVERY", actor_id: 2, from_status: "DISPATCHED", to_status: "DELIVERED", created_at: "2026-11-26T11:00:00" }],
    });
    expect(view?.title).toBe("Delivery Confirmation");
    expect(view?.failedDelivery).toBe(false);
    expect(view?.fields.find((f) => f.label === "Receiver name")?.value).toBe("Clinic desk");
    expect(JSON.stringify(view)).not.toMatch(/signature/i);
  });

  it("does not present failed delivery as delivered", () => {
    const view = mapWarehousePrint({
      docType: "delivery",
      module: "export",
      fulfillment: {
        ...fulfillment,
        status: "FAILED_DELIVERY",
        dispatch_id: "ds-2",
        fail_reason: "refused",
        receiver_name: "should not print as received",
        delivered_quantity: "1",
      },
      reservation,
      source: exportSource,
      history: [{ action: "FAIL_DELIVERY", actor_id: 2, from_status: "DISPATCHED", to_status: "FAILED_DELIVERY", created_at: "2026-11-26T12:00:00" }],
    });
    expect(view?.title).toBe("Failed Delivery Summary");
    expect(view?.failedDelivery).toBe(true);
    expect(view?.fields.find((f) => f.label === "Delivery status")?.value).toBe("FAILED_DELIVERY");
    expect(view?.fields.find((f) => f.label === "Receiver name")?.value).toBe("—");
    expect(view?.fields.find((f) => f.label === "Failed-delivery reason")?.value).toBe("refused");
  });

  it("dashes missing optional fields", () => {
    const view = mapWarehousePrint({
      docType: "dispatch_note",
      module: "sample_gift",
      fulfillment: { ...fulfillment, status: "DISPATCHED", dispatch_id: "ds", transport_ref: null, remarks: null },
      reservation,
      source: { delivery_number: "SG-1", document_kind: "sample", recipient_name: "X", recipient_type: "Doctor" },
      history: [],
    });
    expect(view?.fields.find((f) => f.label === "Transport reference")?.value).toBe("—");
    expect(view?.fields.find((f) => f.label === "Assigned picker")?.value).toBe("—");
    expect(view?.fields.find((f) => f.label === "POD reference")).toBeUndefined();
  });

  it("rejects malformed fulfillment payloads", () => {
    expect(
      mapWarehousePrint({
        docType: "pick_list",
        module: "sample_gift",
        fulfillment: null,
        reservation: null,
        source: sampleSource,
        history: [],
      })
    ).toBeNull();
    expect(
      mapWarehousePrint({
        docType: "pick_list",
        module: "sample_gift",
        fulfillment: { fulfillment_id: "x" },
        reservation: null,
        source: sampleSource,
        history: [],
      })
    ).toBeNull();
  });

  it("keeps the watermark constant with no official claims", () => {
    expect(WAREHOUSE_WATERMARK).toBe("PROVISIONAL — TEST DOCUMENT — NOT FOR DISPATCH");
    expect(unavailableReason("PICKING", "issue_slip")).toMatch(/issuance/i);
  });
});
