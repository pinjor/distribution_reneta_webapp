import type { DraftModuleCapability } from "@/lib/draftCapabilities";

/** Test-only sanitizer. Production UI must keep using sanitizeModuleCapability. */
export function sanitizeIsolatedWorkflowCapability(raw: unknown): DraftModuleCapability {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const flag = (key: keyof DraftModuleCapability) => row[key] === true;
  return {
    can_read: row.can_read !== false,
    can_create: flag("can_create"),
    can_edit: flag("can_edit"),
    writes_enabled: flag("writes_enabled"),
    can_submit: flag("can_submit"),
    can_approve: flag("can_approve"),
    can_reject: flag("can_reject"),
  };
}
