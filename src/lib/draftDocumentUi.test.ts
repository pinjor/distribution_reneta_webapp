import { describe, expect, it } from "vitest";
import {
  canShowDraftEdit,
  formatApiError,
  isNonDraftUpdateConflict,
  toDateInput,
} from "./draftDocumentUi";

describe("draftDocumentUi", () => {
  it("does not authorize edit from role or status alone", () => {
    expect(canShowDraftEdit(false, "Draft")).toBe(false);
    expect(canShowDraftEdit(true, "Submitted")).toBe(false);
    expect(canShowDraftEdit(true, "Draft")).toBe(true);
  });

  it("detects the non-Draft PUT 409 without treating duplicate-number 409 as the same", () => {
    expect(
      isNonDraftUpdateConflict({ status: 409, message: "Only Draft documents can be updated" })
    ).toBe(true);
    expect(
      isNonDraftUpdateConflict({ status: 409, message: "Delivery number SG-1 already exists" })
    ).toBe(false);
    expect(isNonDraftUpdateConflict({ status: 400, message: "Only Draft documents can be updated" })).toBe(
      false
    );
  });

  it("formats API errors and date inputs", () => {
    expect(toDateInput("2026-11-25T00:00:00")).toBe("2026-11-25");
    expect(formatApiError({ message: "Unable to create delivery" })).toBe("Unable to create delivery");
    expect(
      formatApiError({ details: { detail: [{ msg: "quantity must be greater than 0" }] } })
    ).toBe("quantity must be greater than 0");
  });
});
