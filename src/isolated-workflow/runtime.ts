const FORBIDDEN_API_HINTS = [
  "swift_distro_hub",
  "localhost/api",
  "127.0.0.1/api",
  ":9080",
  ":80/",
  ":8088",
];

export function assertIsolatedFrontendConfig(env: Record<string, string | undefined> = import.meta.env as Record<
  string,
  string | undefined
>): string {
  if (env.VITE_ISOLATED_WORKFLOW !== "1") {
    throw new Error("Isolated workflow frontend requires VITE_ISOLATED_WORKFLOW=1");
  }
  const api = (env.VITE_API_URL || "").trim();
  if (!api) {
    throw new Error("Isolated workflow frontend requires VITE_API_URL");
  }
  const lower = api.toLowerCase();
  for (const hint of FORBIDDEN_API_HINTS) {
    if (lower.includes(hint)) {
      throw new Error(`Isolated workflow frontend refuses API URL ${api}`);
    }
  }
  if (env.VITE_ISOLATED_DATABASE && env.VITE_ISOLATED_DATABASE === "swift_distro_hub") {
    throw new Error("Isolated workflow frontend refuses swift_distro_hub");
  }
  return api.replace(/\/$/, "");
}

export function healthUrl(apiBase: string): string {
  return apiBase.replace(/\/api\/?$/, "") + "/health";
}

export async function assertIsolatedBackend(apiBase: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  const response = await fetchImpl(healthUrl(apiBase), { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Isolated backend health failed (${response.status})`);
  }
  const body = await response.json();
  if (body?.isolated_workflow !== true) {
    throw new Error("API is not the isolated workflow app (isolated_workflow !== true)");
  }
}
