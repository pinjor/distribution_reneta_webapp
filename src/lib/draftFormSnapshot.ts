/** Normalized Draft form snapshots. Ignores React keys and object identity. */

export const SAMPLE_GIFT_LINE_FIELDS = ["productId", "quantity", "giftType"] as const;
export const EXPORT_LINE_FIELDS = [
  "productId",
  "quantity",
  "unitPrice",
  "batchNumber",
  "expiryDate",
  "hsnCode",
] as const;

export function normalizeDraftText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizeDraftDecimal(value: unknown): string {
  const text = normalizeDraftText(value);
  if (text === "") return "";
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return text;
  return String(numeric);
}

function normalizeField(field: string, value: unknown): string {
  if (field === "quantity" || field === "unitPrice") return normalizeDraftDecimal(value);
  return normalizeDraftText(value);
}

export function captureDraftFormSnapshot(
  header: Record<string, unknown>,
  lines: Array<Record<string, unknown>>,
  lineFields: readonly string[]
): string {
  const normalizedHeader: Record<string, string> = {};
  for (const key of Object.keys(header).sort()) {
    normalizedHeader[key] = normalizeDraftText(header[key]);
  }
  const items = lines.map((line) => {
    const row: Record<string, string> = {};
    for (const field of lineFields) {
      row[field] = normalizeField(field, line[field]);
    }
    return row;
  });
  return JSON.stringify({ header: normalizedHeader, items });
}

export function isDraftFormDirty(current: string, baseline: string | null): boolean {
  if (baseline === null) return false;
  return current !== baseline;
}
