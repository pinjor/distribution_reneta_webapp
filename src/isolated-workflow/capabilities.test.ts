import { describe, expect, it } from "vitest";
import { sanitizeModuleCapability } from "@/lib/draftCapabilities";
import { sanitizeIsolatedWorkflowCapability } from "./capabilities";

describe("isolated workflow capability sanitizer", () => {
  it("allows provisional workflow flags for the test harness only", () => {
    const raw = { can_submit: true, can_approve: true, can_reject: true, can_create: true };
    expect(sanitizeIsolatedWorkflowCapability(raw).can_submit).toBe(true);
    expect(sanitizeIsolatedWorkflowCapability(raw).can_approve).toBe(true);
    expect(sanitizeIsolatedWorkflowCapability(raw).can_reject).toBe(true);
    expect(sanitizeModuleCapability(raw).can_submit).toBe(false);
  });
});
