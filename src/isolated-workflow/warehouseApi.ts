import { workflowErrorFromBody, type WorkflowHttpError } from "./errors";
import type { DraftModuleKind } from "./workflowApi";

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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

async function getJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    const error = new Error("Network timeout or connection failed") as WorkflowHttpError;
    error.status = 0;
    throw error;
  }
  const body = await readBody(response);
  if (!response.ok) {
    throw workflowErrorFromBody(response.status, body);
  }
  return body;
}

function deliveryRoot(module: DraftModuleKind): string {
  return module === "sample_gift" ? "sample-gift-deliveries" : "export-deliveries";
}

export async function fetchSourceDocument(module: DraftModuleKind, id: string): Promise<unknown> {
  return getJson(`/${deliveryRoot(module)}/${id}`);
}

export async function fetchIsolatedFulfillment(module: DraftModuleKind, id: string): Promise<unknown> {
  return getJson(`/isolated-fulfillment/${deliveryRoot(module)}/${id}/fulfillment`);
}

export async function fetchIsolatedReservations(module: DraftModuleKind, id: string): Promise<unknown[]> {
  const body = await getJson(`/isolated-inventory/${deliveryRoot(module)}/${id}/reservations`);
  return Array.isArray(body) ? body : [];
}

export async function fetchIsolatedFulfillmentHistory(fulfillmentId: string): Promise<unknown[]> {
  const body = await getJson(`/isolated-fulfillment/${fulfillmentId}/history`);
  return Array.isArray(body) ? body : [];
}

export function reservationForFulfillment(reservations: unknown[], reservationId: unknown): unknown | null {
  const id = reservationId == null ? "" : String(reservationId);
  return (
    reservations.find((row) => {
      if (!row || typeof row !== "object") return false;
      return String((row as { reservation_id?: unknown }).reservation_id || "") === id;
    }) || null
  );
}
