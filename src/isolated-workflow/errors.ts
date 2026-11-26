export type WorkflowHttpError = Error & {
  status?: number;
  details?: unknown;
};

export function messageForWorkflowStatus(status: number, detail: unknown, fallback: string): string {
  const text = typeof detail === "string" ? detail : fallback;
  if (status === 401) return "Authentication required";
  if (status === 403) return text || "You do not have permission to perform this action";
  if (status === 404) return "Not found";
  if (status === 409) return text || "This document cannot be transitioned";
  if (status === 422) return text || "A rejection reason is required";
  if (status === 500) return "The document could not be saved";
  return text || fallback;
}

export function workflowErrorFromBody(status: number, body: unknown): WorkflowHttpError {
  const detail =
    body && typeof body === "object" && "detail" in body ? (body as { detail: unknown }).detail : undefined;
  const error = new Error(messageForWorkflowStatus(status, detail, `Request failed with status ${status}`)) as WorkflowHttpError;
  error.status = status;
  error.details = body;
  return error;
}

export function trimmedRejectionReason(value: string): string {
  return value.trim();
}

export function rejectionReasonError(value: string): string | null {
  if (!trimmedRejectionReason(value)) {
    return "A rejection reason is required";
  }
  return null;
}
