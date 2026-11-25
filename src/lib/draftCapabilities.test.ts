import { describe, expect, it } from "vitest";
import { DISABLED_DRAFT_MODULE, sanitizeModuleCapability } from "./draftCapabilities";

describe("sanitizeModuleCapability", () => {
  it("fails closed except can_read unless the server sent true", () => {
    expect(sanitizeModuleCapability(null)).toEqual({
      ...DISABLED_DRAFT_MODULE,
      can_read: true,
    });
    expect(sanitizeModuleCapability({ can_create: true, can_submit: true }).can_create).toBe(true);
    expect(sanitizeModuleCapability({ can_submit: true }).can_submit).toBe(false);
    expect(sanitizeModuleCapability({ can_approve: true, can_reject: true }).can_approve).toBe(false);
  });
});
