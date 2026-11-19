import { describe, expect, it } from "vitest";

import { signedAdjustmentQuantity } from "./adjustmentDirection";

describe("signedAdjustmentQuantity", () => {
  it("keeps found stock positive", () => {
    expect(signedAdjustmentQuantity("Found", 10)).toBe(10);
  });

  it("stores write off, damaged, and expired as decreases", () => {
    expect(signedAdjustmentQuantity("Write off", 10)).toBe(-10);
    expect(signedAdjustmentQuantity("Damaged", 10)).toBe(-10);
    expect(signedAdjustmentQuantity("Expired", 10)).toBe(-10);
  });

  it("requires an explicit correction direction", () => {
    expect(signedAdjustmentQuantity("Correction", 10, "Increase")).toBe(10);
    expect(signedAdjustmentQuantity("Correction", 10, "Decrease")).toBe(-10);
    expect(() => signedAdjustmentQuantity("Correction", 10)).toThrow(/increase or decrease/i);
  });

  it("does not accept a negative typed magnitude or an unknown type", () => {
    expect(() => signedAdjustmentQuantity("Write off", -10)).toThrow(/positive/i);
    expect(() => signedAdjustmentQuantity("Quantity", 10)).toThrow(/invalid adjustment type/i);
  });
});
