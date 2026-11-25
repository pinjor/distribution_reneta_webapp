import { describe, expect, it } from "vitest";
import {
  DRAFT_NOT_FOR_DISPATCH,
  EXPORT_NOT_OFFICIAL,
  formatDraftDate,
  formatDraftDecimal,
  mapExportDraftPrint,
  mapSampleGiftDraftPrint,
  printViewHasOfficialClaims,
} from "./draftPrint";

const sampleRow = {
  id: 11,
  delivery_number: "SG-1",
  depot_id: 3,
  document_kind: "sample",
  status: "Draft",
  delivery_date: "2026-11-25",
  recipient_name: "Dr Sample",
  recipient_type: "Doctor",
  recipient_phone: "01700",
  recipient_email: "dr@test.com",
  recipient_address: "Dhaka",
  gift_type: null,
  occasion: null,
  remarks: "Keep",
  items: [{ product_id: 9, product_name: "Amoxicillin 250", quantity: "3.00", giftType: null }],
};

describe("draftPrint mapping", () => {
  it("maps a Sample document with watermark and no invented money", () => {
    const view = mapSampleGiftDraftPrint(sampleRow);
    expect(view).not.toBeNull();
    expect(view?.title).toBe("Sample Delivery Draft");
    expect(view?.fields.find((f) => f.label === "Recipient")?.value).toBe("Dr Sample");
    expect(view?.lines[0].productName).toBe("Amoxicillin 250");
    expect(view?.lines[0].quantity).toBe(Number(3).toLocaleString(undefined, { maximumFractionDigits: 4 }));
    expect(view?.watermark).toBe(DRAFT_NOT_FOR_DISPATCH);
    expect(view?.notForDispatch).toBe(DRAFT_NOT_FOR_DISPATCH);
    expect(view?.totals.some((t) => t.label.toLowerCase().includes("value"))).toBe(false);
    expect(printViewHasOfficialClaims(view!)).toBe(false);
  });

  it("maps a Gift document kind", () => {
    const view = mapSampleGiftDraftPrint({ ...sampleRow, document_kind: "gift", gift_type: "Promo" });
    expect(view?.title).toBe("Gift Delivery Draft");
    expect(view?.fields.find((f) => f.label === "Gift type")?.value).toBe("Promo");
    expect(view?.notForDispatch).toBe(DRAFT_NOT_FOR_DISPATCH);
  });

  it("maps Export fields including server total without currency", () => {
    const view = mapExportDraftPrint({
      id: 4,
      delivery_number: "EX-1",
      depot_id: 3,
      status: "Draft",
      delivery_date: "2026-11-25T00:00:00",
      destination_country: "Malaysia",
      port_of_loading: "Chattogram",
      port_of_discharge: "Port Klang",
      shipping_line: "Maersk",
      container_number: "MSKU1",
      bl_number: "BL-1",
      invoice_number: "INV-REF",
      lc_number: "LC-1",
      incoterms: "FOB",
      payment_terms: "LC",
      remarks: "Note",
      total_items: 1,
      total_quantity: "4",
      total_value: "41.00",
      items: [
        {
          product_id: 2,
          product_name: "Export SKU",
          quantity: 4,
          unit_price: "10.25",
          line_total: "41",
          batch_number: "B1",
          expiry_date: "2027-01-01",
          hsn_code: "3004",
        },
      ],
    });
    expect(view?.title).toBe("Export Delivery Draft");
    expect(view?.disclaimer).toBe(EXPORT_NOT_OFFICIAL);
    expect(view?.lines[0].unitPrice).toBe(
      Number(10.25).toLocaleString(undefined, { maximumFractionDigits: 4 })
    );
    expect(view?.totals.find((t) => t.label === "Total value")?.value).toBe(
      Number(41).toLocaleString(undefined, { maximumFractionDigits: 4 })
    );
    expect(JSON.stringify(view)).not.toMatch(/\$|USD|BDT/);
    expect(printViewHasOfficialClaims(view!)).toBe(false);
  });

  it("uses dashes for missing optional fields and empty lines", () => {
    const view = mapSampleGiftDraftPrint({
      id: 1,
      delivery_number: "SG-EMPTY",
      depot_id: 1,
      document_kind: "sample",
      status: "Draft",
      delivery_date: "2026-11-25",
      recipient_name: "X",
      recipient_type: "Doctor",
    });
    expect(view?.fields.find((f) => f.label === "Phone")?.value).toBe("—");
    expect(view?.lines).toEqual([]);
    expect(view?.emptyLinesLabel).toContain("No line items");
  });

  it("rejects rows that are not persisted documents", () => {
    expect(mapSampleGiftDraftPrint(null)).toBeNull();
    expect(mapSampleGiftDraftPrint({})).toBeNull();
    expect(mapExportDraftPrint({ recipient_name: "no id" })).toBeNull();
  });

  it("keeps long item lists in order", () => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      product_id: i + 1,
      product_name: `SKU ${i + 1}`,
      quantity: i + 1,
    }));
    const view = mapSampleGiftDraftPrint({ ...sampleRow, items });
    expect(view?.lines).toHaveLength(40);
    expect(view?.lines[39].productName).toBe("SKU 40");
  });

  it("formats dates and decimals consistently", () => {
    expect(formatDraftDate("2026-11-25T12:00:00")).toBe("2026-11-25");
    expect(formatDraftDate(null)).toBe("—");
    expect(formatDraftDecimal("3.00")).toBe(Number(3).toLocaleString(undefined, { maximumFractionDigits: 4 }));
    expect(formatDraftDecimal("")).toBe("—");
  });

  it("does not mutate the source document", () => {
    const source = { ...sampleRow, items: [...sampleRow.items] };
    const frozen = JSON.parse(JSON.stringify(source));
    mapSampleGiftDraftPrint(source);
    expect(source).toEqual(frozen);
  });
});
