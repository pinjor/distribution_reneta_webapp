export type DraftModuleCapability = {
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  writes_enabled: boolean;
  can_submit: boolean;
  can_approve: boolean;
  can_reject: boolean;
};

export const DISABLED_DRAFT_MODULE: DraftModuleCapability = {
  can_read: true,
  can_create: false,
  can_edit: false,
  writes_enabled: false,
  can_submit: false,
  can_approve: false,
  can_reject: false,
};

export function sanitizeModuleCapability(raw: unknown): DraftModuleCapability {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const flag = (key: keyof DraftModuleCapability) => row[key] === true;
  return {
    can_read: row.can_read !== false,
    can_create: flag("can_create"),
    can_edit: flag("can_edit"),
    writes_enabled: flag("writes_enabled"),
    can_submit: false,
    can_approve: false,
    can_reject: false,
  };
}
