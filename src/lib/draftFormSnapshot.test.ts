import { describe, expect, it } from "vitest";
import {
  EXPORT_LINE_FIELDS,
  SAMPLE_GIFT_LINE_FIELDS,
  captureDraftFormSnapshot,
  isDraftFormDirty,
} from "./draftFormSnapshot";

const emptyHeader = { recipientName: "", documentKind: "sample" };

describe("draftFormSnapshot", () => {
  it("treats a clean form as not dirty", () => {
    const baseline = captureDraftFormSnapshot(emptyHeader, [], SAMPLE_GIFT_LINE_FIELDS);
    const current = captureDraftFormSnapshot({ ...emptyHeader }, [], SAMPLE_GIFT_LINE_FIELDS);
    expect(isDraftFormDirty(current, baseline)).toBe(false);
  });

  it("detects a changed header field", () => {
    const baseline = captureDraftFormSnapshot(emptyHeader, [], SAMPLE_GIFT_LINE_FIELDS);
    const current = captureDraftFormSnapshot(
      { ...emptyHeader, recipientName: "Dr A" },
      [],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(current, baseline)).toBe(true);
  });

  it("detects document-kind changes", () => {
    const baseline = captureDraftFormSnapshot(emptyHeader, [], SAMPLE_GIFT_LINE_FIELDS);
    const current = captureDraftFormSnapshot(
      { ...emptyHeader, documentKind: "gift" },
      [],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(current, baseline)).toBe(true);
  });

  it("detects quantity changes and ignores formatting", () => {
    const line = { productId: "1", quantity: "3.0", giftType: "", key: "AAA" };
    const baseline = captureDraftFormSnapshot(emptyHeader, [line], SAMPLE_GIFT_LINE_FIELDS);
    const formatted = captureDraftFormSnapshot(
      emptyHeader,
      [{ ...line, quantity: "3.00", key: "BBB" }],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(formatted, baseline)).toBe(false);
    const changed = captureDraftFormSnapshot(
      emptyHeader,
      [{ ...line, quantity: "5" }],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(changed, baseline)).toBe(true);
  });

  it("detects added and removed lines", () => {
    const baseline = captureDraftFormSnapshot(emptyHeader, [], SAMPLE_GIFT_LINE_FIELDS);
    const added = captureDraftFormSnapshot(
      emptyHeader,
      [{ productId: "9", quantity: "1", giftType: "" }],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(added, baseline)).toBe(true);
    expect(isDraftFormDirty(baseline, added)).toBe(true);
  });

  it("detects Export unit price changes", () => {
    const line = { productId: "2", quantity: "4", unitPrice: "10.25" };
    const baseline = captureDraftFormSnapshot({}, [line], EXPORT_LINE_FIELDS);
    const same = captureDraftFormSnapshot(
      {},
      [{ ...line, unitPrice: "10.250", key: "x" }],
      EXPORT_LINE_FIELDS
    );
    expect(isDraftFormDirty(same, baseline)).toBe(false);
    const changed = captureDraftFormSnapshot(
      {},
      [{ ...line, unitPrice: "12.5" }],
      EXPORT_LINE_FIELDS
    );
    expect(isDraftFormDirty(changed, baseline)).toBe(true);
  });

  it("treats reverted edits as clean", () => {
    const original = captureDraftFormSnapshot(
      { recipientName: "Dr A", remarks: "Keep" },
      [{ productId: "1", quantity: "3", giftType: "" }],
      SAMPLE_GIFT_LINE_FIELDS
    );
    const edited = captureDraftFormSnapshot(
      { recipientName: "Dr B", remarks: "Keep" },
      [{ productId: "1", quantity: "3", giftType: "" }],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(edited, original)).toBe(true);
    const reverted = captureDraftFormSnapshot(
      { recipientName: "Dr A", remarks: "Keep" },
      [{ productId: "1", quantity: "3", giftType: "" }],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(reverted, original)).toBe(false);
  });

  it("does not treat GET prepopulation as dirty until a baseline exists", () => {
    const loaded = captureDraftFormSnapshot(
      { recipientName: "Dr Original" },
      [{ productId: "1", quantity: "3", giftType: "" }],
      SAMPLE_GIFT_LINE_FIELDS
    );
    expect(isDraftFormDirty(loaded, null)).toBe(false);
    expect(isDraftFormDirty(loaded, loaded)).toBe(false);
  });

  it("ignores whitespace-only header differences", () => {
    const baseline = captureDraftFormSnapshot({ remarks: "" }, [], SAMPLE_GIFT_LINE_FIELDS);
    const current = captureDraftFormSnapshot({ remarks: "  " }, [], SAMPLE_GIFT_LINE_FIELDS);
    expect(isDraftFormDirty(current, baseline)).toBe(false);
  });
});
