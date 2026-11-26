import { workflowErrorFromBody, type WorkflowHttpError } from "./errors";

export type DraftModuleKind = "sample_gift" | "export";
export type WorkflowAction = "submit" | "approve" | "reject";

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function pathFor(module: DraftModuleKind, id: string | number, action: WorkflowAction): string {
  const root = module === "sample_gift" ? "sample-gift-deliveries" : "export-deliveries";
  return `${apiBase()}/${root}/${id}/${action}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

export async function postWorkflowAction(
  module: DraftModuleKind,
  id: string | number,
  action: WorkflowAction,
  payload: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(pathFor(module, id, action), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    const error = new Error("Network timeout or connection failed") as WorkflowHttpError;
    error.status = 0;
    throw error;
  }
  const body = await readBody(response);
  if (!response.ok) {
    throw workflowErrorFromBody(response.status, body);
  }
  return (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
}

export async function fetchDocumentCapabilities(module: DraftModuleKind, id: string | number): Promise<unknown> {
  const key = module === "sample_gift" ? "sample_gift_id" : "export_id";
  const response = await fetch(`${apiBase()}/draft-modules/capabilities?${key}=${id}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw workflowErrorFromBody(response.status, body);
  }
  return body;
}

export async function fetchWorkflowHistory(module: DraftModuleKind, id: string | number): Promise<unknown[] | null> {
  const entity = module === "sample_gift" ? "sample_gift_delivery" : "export_delivery";
  const response = await fetch(`${apiBase()}/audit-logs/${entity}/${id}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 403) return null;
  const body = await readBody(response);
  if (!response.ok) return null;
  return Array.isArray(body) ? body : null;
}
