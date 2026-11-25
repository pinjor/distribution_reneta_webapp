import { toDateInput } from "@/lib/draftDocumentUi";

export const DRAFT_NOT_FOR_DISPATCH = "DRAFT — NOT FOR DISPATCH";
export const DRAFT_INTERNAL_PREVIEW = "Internal draft preview only.";
export const EXPORT_NOT_OFFICIAL =
  "Internal draft preview only. Not a commercial invoice, shipping authorization, or customs document.";

export type DraftPrintField = { label: string; value: string };

export type DraftPrintLine = {
  productId: string;
  productName: string;
  quantity: string;
  extra: DraftPrintField[];
  unitPrice?: string;
  lineTotal?: string;
};

export type DraftPrintView = {
  module: "sample_gift" | "export";
  title: string;
  documentNumber: string;
  status: string;
  date: string;
  watermark: typeof DRAFT_NOT_FOR_DISPATCH;
  notForDispatch: typeof DRAFT_NOT_FOR_DISPATCH;
  disclaimer: string;
  fields: DraftPrintField[];
  lines: DraftPrintLine[];
  emptyLinesLabel: string;
  totals: DraftPrintField[];
};

export function formatDraftDate(value?: string | null): string {
  const date = toDateInput(value);
  return date || "—";
}

export function formatDraftDecimal(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function displayDraftText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

function kindTitle(kind: string): string {
  const normalized = kind.trim().toLowerCase();
  if (normalized === "gift") return "Gift Delivery Draft";
  if (normalized === "sample") return "Sample Delivery Draft";
  return "Sample/Gift Delivery Draft";
}

export function mapSampleGiftDraftPrint(row: unknown): DraftPrintView | null {
  if (!row || typeof row !== "object") return null;
  const doc = row as Record<string, unknown>;
  const id = doc.id;
  const deliveryNumber = displayDraftText(doc.delivery_number);
  if (id === null || id === undefined || deliveryNumber === "—") return null;

  const kind = displayDraftText(doc.document_kind);
  const items = Array.isArray(doc.items) ? doc.items : [];
  const lines: DraftPrintLine[] = items.map((raw) => {
    const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const productId = displayDraftText(item.product_id);
    return {
      productId,
      productName: displayDraftText(item.product_name) === "—" ? `Product ${productId}` : displayDraftText(item.product_name),
      quantity: formatDraftDecimal(item.quantity),
      extra: [{ label: "Gift type", value: displayDraftText(item.gift_type) }],
    };
  });

  const totalQty =
    doc.total_quantity !== undefined && doc.total_quantity !== null
      ? formatDraftDecimal(doc.total_quantity)
      : formatDraftDecimal(items.reduce((sum, raw) => {
          const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
          const qty = Number(item.quantity);
          return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0));

  return {
    module: "sample_gift",
    title: kindTitle(kind === "—" ? "" : kind),
    documentNumber: deliveryNumber,
    status: displayDraftText(doc.status),
    date: formatDraftDate(typeof doc.delivery_date === "string" ? doc.delivery_date : String(doc.delivery_date ?? "")),
    watermark: DRAFT_NOT_FOR_DISPATCH,
    notForDispatch: DRAFT_NOT_FOR_DISPATCH,
    disclaimer: DRAFT_INTERNAL_PREVIEW,
    fields: [
      { label: "Document kind", value: kind },
      { label: "Status", value: displayDraftText(doc.status) },
      { label: "Document date", value: formatDraftDate(String(doc.delivery_date ?? "")) },
      { label: "Recipient", value: displayDraftText(doc.recipient_name) },
      { label: "Recipient type", value: displayDraftText(doc.recipient_type) },
      { label: "Phone", value: displayDraftText(doc.recipient_phone) },
      { label: "Email", value: displayDraftText(doc.recipient_email) },
      { label: "Address", value: displayDraftText(doc.recipient_address) },
      { label: "Gift type", value: displayDraftText(doc.gift_type) },
      { label: "Occasion", value: displayDraftText(doc.occasion) },
      { label: "Depot ID", value: displayDraftText(doc.depot_id) },
      { label: "Remarks", value: displayDraftText(doc.remarks) },
    ],
    lines,
    emptyLinesLabel: "No line items on this document.",
    totals: [
      { label: "Line count", value: String(lines.length) },
      { label: "Total quantity", value: totalQty },
    ],
  };
}

export function mapExportDraftPrint(row: unknown): DraftPrintView | null {
  if (!row || typeof row !== "object") return null;
  const doc = row as Record<string, unknown>;
  const deliveryNumber = displayDraftText(doc.delivery_number);
  if (doc.id === null || doc.id === undefined || deliveryNumber === "—") return null;

  const items = Array.isArray(doc.items) ? doc.items : [];
  const lines: DraftPrintLine[] = items.map((raw) => {
    const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const productId = displayDraftText(item.product_id);
    return {
      productId,
      productName: displayDraftText(item.product_name) === "—" ? `Product ${productId}` : displayDraftText(item.product_name),
      quantity: formatDraftDecimal(item.quantity),
      unitPrice: formatDraftDecimal(item.unit_price),
      lineTotal: formatDraftDecimal(item.line_total),
      extra: [
        { label: "Batch", value: displayDraftText(item.batch_number) },
        { label: "Expiry", value: formatDraftDate(item.expiry_date == null ? "" : String(item.expiry_date)) },
        { label: "HSN", value: displayDraftText(item.hsn_code) },
      ],
    };
  });

  return {
    module: "export",
    title: "Export Delivery Draft",
    documentNumber: deliveryNumber,
    status: displayDraftText(doc.status),
    date: formatDraftDate(String(doc.delivery_date ?? "")),
    watermark: DRAFT_NOT_FOR_DISPATCH,
    notForDispatch: DRAFT_NOT_FOR_DISPATCH,
    disclaimer: EXPORT_NOT_OFFICIAL,
    fields: [
      { label: "Status", value: displayDraftText(doc.status) },
      { label: "Document date", value: formatDraftDate(String(doc.delivery_date ?? "")) },
      { label: "Destination country", value: displayDraftText(doc.destination_country) },
      { label: "Port of loading", value: displayDraftText(doc.port_of_loading) },
      { label: "Port of discharge", value: displayDraftText(doc.port_of_discharge) },
      { label: "Shipping line", value: displayDraftText(doc.shipping_line) },
      { label: "Container", value: displayDraftText(doc.container_number) },
      { label: "B/L reference", value: displayDraftText(doc.bl_number) },
      { label: "L/C reference", value: displayDraftText(doc.lc_number) },
      { label: "Invoice reference", value: displayDraftText(doc.invoice_number) },
      { label: "Incoterms", value: displayDraftText(doc.incoterms) },
      { label: "Payment terms", value: displayDraftText(doc.payment_terms) },
      { label: "Depot ID", value: displayDraftText(doc.depot_id) },
      { label: "Remarks", value: displayDraftText(doc.remarks) },
    ],
    lines,
    emptyLinesLabel: "No line items on this document.",
    totals: [
      { label: "Line count", value: String(doc.total_items ?? lines.length) },
      { label: "Total quantity", value: formatDraftDecimal(doc.total_quantity) },
      { label: "Total value", value: formatDraftDecimal(doc.total_value) },
    ],
  };
}

export function printViewHasOfficialClaims(view: DraftPrintView): boolean {
  const labels = [view.title, ...view.fields.map((field) => field.label), ...view.totals.map((field) => field.label)]
    .join(" ")
    .toLowerCase();
  return (
    labels.includes("commercial invoice") ||
    labels.includes("authorized for dispatch") ||
    labels.includes("customs declaration") ||
    labels.includes("signature") ||
    labels.includes("approved for dispatch")
  );
}
