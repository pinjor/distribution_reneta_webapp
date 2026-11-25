/** Shared Draft edit helpers. Server flags and PUT remain authoritative. */

export const DRAFT_STATUS = "Draft";

export function canShowDraftEdit(moduleCanEdit: boolean, status?: string | null): boolean {
  return Boolean(moduleCanEdit) && status === DRAFT_STATUS;
}

export function toDateInput(value?: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function isNonDraftUpdateConflict(error: { status?: number; message?: string } | null | undefined): boolean {
  if (!error || error.status !== 409) return false;
  return String(error.message || "").includes("Only Draft documents can be updated");
}

export function formatApiError(error: any, fallback = "Request failed"): string {
  const detail = error?.details?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => (typeof item?.msg === "string" ? item.msg : null))
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

export function decimalInput(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}
