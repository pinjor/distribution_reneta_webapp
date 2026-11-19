export const ADJUSTMENT_TYPES = ["Write off", "Found", "Damaged", "Expired", "Correction"] as const;

export type AdjustmentTypeName = (typeof ADJUSTMENT_TYPES)[number];
export type CorrectionDirection = "Increase" | "Decrease";

const DECREASE_TYPES = new Set(["write off", "damaged", "expired"]);

export function signedAdjustmentQuantity(
  adjustmentType: string,
  magnitude: number,
  correctionDirection?: string,
): number {
  if (!(magnitude > 0)) {
    throw new Error("Enter a positive adjustment quantity");
  }
  const type = adjustmentType.trim().toLowerCase();
  if (type === "found") return magnitude;
  if (DECREASE_TYPES.has(type)) return -magnitude;
  if (type === "correction") {
    if (correctionDirection === "Increase") return magnitude;
    if (correctionDirection === "Decrease") return -magnitude;
    throw new Error("Select increase or decrease for a correction");
  }
  throw new Error("Invalid adjustment type");
}
