import { displayDraftText, formatDraftDate, formatDraftDecimal } from "@/lib/draftPrint";

export const WAREHOUSE_WATERMARK = "PROVISIONAL — TEST DOCUMENT — NOT FOR DISPATCH";
export const WAREHOUSE_DISCLAIMER =
  "Isolated test document. Not an official challan, issue slip, shipping authorization, commercial invoice, or proof of delivery.";

export type WarehouseModule = "sample_gift" | "export";
export type WarehouseDocType = "pick_list" | "pick_confirm" | "issue_slip" | "dispatch_note" | "delivery";

export type WarehousePrintField = { label: string; value: string };

export type WarehousePrintLine = {
  product: string;
  productId: string;
  sku: string;
  batch: string;
  expiry: string;
  reserved: string;
  requested: string;
  picked: string;
  issued: string;
  discrepancy: string;
};

export type WarehouseAuditRow = {
  action: string;
  actor: string;
  fromStatus: string;
  toStatus: string;
  at: string;
};

export type WarehousePrintView = {
  docType: WarehouseDocType;
  title: string;
  watermark: typeof WAREHOUSE_WATERMARK;
  disclaimer: string;
  unavailable: string | null;
  status: string;
  failedDelivery: boolean;
  fields: WarehousePrintField[];
  columns: Array<keyof WarehousePrintLine | "product">;
  lines: WarehousePrintLine[];
  emptyLinesLabel: string;
  audit: WarehouseAuditRow[];
};

const DOC_TITLES: Record<WarehouseDocType, string> = {
  pick_list: "Warehouse Pick List",
  pick_confirm: "Picking Confirmation Sheet",
  issue_slip: "Stock Issue Slip",
  dispatch_note: "Dispatch Note / Delivery Challan",
  delivery: "Delivery Confirmation",
};

const MIN_STATUS: Record<WarehouseDocType, string[]> = {
  pick_list: ["PICKING", "PICKED", "ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"],
  pick_confirm: ["PICKED", "ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"],
  issue_slip: ["ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"],
  dispatch_note: ["DISPATCHED", "DELIVERED", "FAILED_DELIVERY"],
  delivery: ["DELIVERED", "FAILED_DELIVERY"],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function auditTime(history: unknown[], action: string): string {
  const match = history
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .find((row) => String(row.action || "") === action);
  if (!match) return "—";
  const raw = match.created_at;
  return formatDraftDate(raw == null ? "" : String(raw)) === "—"
    ? displayDraftText(raw)
    : displayDraftText(raw);
}

function auditActor(history: unknown[], action: string): string {
  const match = history
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .find((row) => String(row.action || "") === action);
  if (!match) return "—";
  return displayDraftText(match.actor_id);
}

function productLookup(source: Record<string, unknown> | null): Map<string, { name: string; sku: string }> {
  const map = new Map<string, { name: string; sku: string }>();
  const items = Array.isArray(source?.items) ? source.items : [];
  for (const raw of items) {
    const item = asRecord(raw);
    if (!item) continue;
    const id = displayDraftText(item.product_id);
    if (id === "—") continue;
    const name = displayDraftText(item.product_name);
    map.set(id, {
      name: name === "—" ? `Product ${id}` : name,
      sku: displayDraftText(item.sku ?? item.sku_code),
    });
  }
  return map;
}

function reservationSlices(reservation: Record<string, unknown> | null): Record<string, unknown>[] {
  const slices = Array.isArray(reservation?.slices) ? reservation.slices : [];
  return slices.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
}

export function warehouseDocAllowed(status: string, docType: WarehouseDocType): boolean {
  return MIN_STATUS[docType].includes(status);
}

export function unavailableReason(status: string, docType: WarehouseDocType): string | null {
  if (warehouseDocAllowed(status, docType)) return null;
  if (docType === "issue_slip") return "Stock Issue Slip is available only after successful issuance.";
  if (docType === "dispatch_note") return "Dispatch Note is available only after dispatch.";
  if (docType === "delivery") return "Delivery confirmation is available only after delivery or failed delivery is recorded.";
  if (docType === "pick_confirm") return "Picking Confirmation Sheet is available only after pick quantities are confirmed.";
  return "Warehouse Pick List is available only after picking has started.";
}

export function mapWarehousePrint(input: {
  docType: WarehouseDocType;
  module: WarehouseModule;
  fulfillment: unknown;
  reservation: unknown;
  source: unknown;
  history: unknown;
}): WarehousePrintView | null {
  const fulfillment = asRecord(input.fulfillment);
  if (!fulfillment) return null;
  const status = displayDraftText(fulfillment.status);
  if (status === "—") return null;
  const reservation = asRecord(input.reservation);
  const source = asRecord(input.source);
  const history = Array.isArray(input.history) ? input.history : [];
  const products = productLookup(source);
  const reserved = reservationSlices(reservation);
  const reservedLots = new Set(reserved.map((slice) => displayDraftText(slice.lot_id)));
  const pickSlices = Array.isArray(fulfillment.slices) ? fulfillment.slices : [];
  const lines: WarehousePrintLine[] = [];
  for (const raw of pickSlices) {
    const slice = asRecord(raw);
    if (!slice) continue;
    const lotId = displayDraftText(slice.lot_id);
    if (reservedLots.size > 0 && !reservedLots.has(lotId)) continue;
    const reservedSlice = reserved.find((row) => displayDraftText(row.lot_id) === lotId);
    const productId = displayDraftText(reservedSlice?.product_id ?? slice.product_id);
    const catalog = products.get(productId);
    const reservedQty = displayDraftText(slice.reserved_quantity) === "—"
      ? formatDraftDecimal(reservedSlice?.allocated_quantity)
      : formatDraftDecimal(slice.reserved_quantity);
    const issuedQty =
      input.docType === "issue_slip" || input.docType === "dispatch_note" || input.docType === "delivery"
        ? formatDraftDecimal(slice.picked_quantity)
        : "—";
    lines.push({
      product: catalog?.name || (productId === "—" ? "Reserved batch" : `Product ${productId}`),
      productId,
      sku: catalog?.sku || "—",
      batch: displayDraftText(slice.batch_no),
      expiry: formatDraftDate(slice.expiry_date == null ? "" : String(slice.expiry_date)),
      reserved: reservedQty,
      requested: reservedQty,
      picked: formatDraftDecimal(slice.picked_quantity),
      issued: issuedQty,
      discrepancy:
        reservedQty !== formatDraftDecimal(slice.picked_quantity) &&
        reservedQty !== "—" &&
        formatDraftDecimal(slice.picked_quantity) !== "—"
          ? `${reservedQty} reserved / ${formatDraftDecimal(slice.picked_quantity)} picked`
          : "—",
    });
  }

  const failed = status === "FAILED_DELIVERY";
  const title =
    input.docType === "delivery" && failed ? "Failed Delivery Summary" : DOC_TITLES[input.docType];
  const unavailable = unavailableReason(status, input.docType);
  const sample = input.module === "sample_gift";
  const fields: WarehousePrintField[] = [
    { label: "Document type", value: sample ? displayDraftText(source?.document_kind) : "export" },
    { label: "Document reference", value: displayDraftText(source?.delivery_number) },
    { label: "Fulfillment reference", value: displayDraftText(fulfillment.fulfillment_id) },
    { label: "Reservation reference", value: displayDraftText(fulfillment.reservation_id) },
    { label: "Source depot", value: displayDraftText(fulfillment.depot_id ?? source?.depot_id) },
    { label: "Fulfillment status", value: status },
    { label: "Assigned picker", value: "—" },
    { label: "Warehouse notes", value: displayDraftText(fulfillment.remarks ?? reservation?.remarks) },
  ];

  if (sample) {
    fields.push(
      { label: "Recipient", value: displayDraftText(source?.recipient_name) },
      { label: "Recipient type", value: displayDraftText(source?.recipient_type) },
    );
  } else {
    fields.push(
      { label: "Destination country", value: displayDraftText(source?.destination_country) },
      { label: "Port of loading", value: displayDraftText(source?.port_of_loading) },
      { label: "Port of discharge", value: displayDraftText(source?.port_of_discharge) },
      { label: "Shipping line", value: displayDraftText(source?.shipping_line) },
      { label: "Container number", value: displayDraftText(source?.container_number) },
      { label: "B/L number", value: displayDraftText(source?.bl_number) },
    );
  }

  if (input.docType === "pick_list" || input.docType === "pick_confirm") {
    fields.push({ label: "Pick started", value: auditTime(history, "START_PICK") });
  }
  if (input.docType === "pick_confirm") {
    fields.push({ label: "Pick confirmed", value: auditTime(history, "CONFIRM_PICK") });
  }
  if (input.docType === "issue_slip") {
    fields.push(
      { label: "Issue reference", value: displayDraftText(fulfillment.fulfillment_id) },
      { label: "Quantity issued", value: formatDraftDecimal(fulfillment.issued_quantity) },
      { label: "Issue timestamp", value: auditTime(history, "ISSUE") },
      { label: "Issuing actor", value: auditActor(history, "ISSUE") },
    );
  }
  if (input.docType === "dispatch_note") {
    fields.push(
      { label: "Dispatch reference", value: displayDraftText(fulfillment.dispatch_id) },
      { label: "Transport reference", value: displayDraftText(fulfillment.transport_ref) },
      { label: "Dispatch timestamp", value: auditTime(history, "DISPATCH") },
      { label: "Dispatch actor", value: auditActor(history, "DISPATCH") },
    );
  }
  if (input.docType === "delivery") {
    fields.push(
      { label: "Dispatch reference", value: displayDraftText(fulfillment.dispatch_id) },
      { label: "Delivery status", value: failed ? "FAILED_DELIVERY" : status },
      {
        label: "Delivery timestamp",
        value: auditTime(history, failed ? "FAIL_DELIVERY" : "CONFIRM_DELIVERY"),
      },
      { label: "Receiver name", value: failed ? "—" : displayDraftText(fulfillment.receiver_name) },
      {
        label: "Delivered quantity",
        value: failed ? "—" : formatDraftDecimal(fulfillment.delivered_quantity),
      },
      { label: "POD reference", value: failed ? "—" : displayDraftText(fulfillment.pod_ref) },
      { label: "Delivery remarks", value: displayDraftText(fulfillment.remarks) },
      { label: "Failed-delivery reason", value: failed ? displayDraftText(fulfillment.fail_reason) : "—" },
      { label: "Confirming actor", value: auditActor(history, failed ? "FAIL_DELIVERY" : "CONFIRM_DELIVERY") },
    );
  }

  const columns: WarehousePrintView["columns"] =
    input.docType === "issue_slip"
      ? ["product", "productId", "batch", "expiry", "issued"]
      : input.docType === "dispatch_note" || input.docType === "delivery"
        ? ["product", "productId", "batch", "expiry", "issued"]
        : input.docType === "pick_confirm"
          ? ["product", "productId", "sku", "batch", "expiry", "reserved", "requested", "picked", "discrepancy"]
          : ["product", "productId", "sku", "batch", "expiry", "reserved", "requested", "picked"];

  return {
    docType: input.docType,
    title,
    watermark: WAREHOUSE_WATERMARK,
    disclaimer: WAREHOUSE_DISCLAIMER,
    unavailable,
    status,
    failedDelivery: failed,
    fields,
    columns,
    lines: unavailable ? [] : lines,
    emptyLinesLabel: unavailable || "No reserved batch slices on this fulfillment.",
    audit: history
      .map(asRecord)
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .map((row) => ({
        action: displayDraftText(row.action),
        actor: displayDraftText(row.actor_id),
        fromStatus: displayDraftText(row.from_status),
        toStatus: displayDraftText(row.to_status),
        at: displayDraftText(row.created_at),
      })),
  };
}

export function printViewHasOfficialWarehouseClaims(view: WarehousePrintView): boolean {
  const blob = [view.title, ...view.fields.map((field) => field.label)].join(" ").toLowerCase();
  return (
    blob.includes("commercial invoice") ||
    blob.includes("authorized for dispatch") ||
    blob.includes("customs declaration") ||
    blob.includes("signature") ||
    blob.includes("approved for dispatch")
  );
}

export const WAREHOUSE_DOC_PATH: Record<WarehouseDocType, string> = {
  pick_list: "pick-list",
  pick_confirm: "pick-confirm",
  issue_slip: "issue-slip",
  dispatch_note: "dispatch-note",
  delivery: "delivery",
};

export function parseWarehouseDocType(value: string | undefined): WarehouseDocType | null {
  const entry = Object.entries(WAREHOUSE_DOC_PATH).find(([, path]) => path === value);
  return entry ? (entry[0] as WarehouseDocType) : null;
}
