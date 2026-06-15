import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

describe("ApiClient auth handling", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    localStorage.clear();
    sessionStorage.clear();
    mockFetch.mockReset();
    delete (window as { location?: Location }).location;
    window.location = { href: "", pathname: "/dashboard" } as Location;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to login on 401 and clears tokens", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "Unauthorized" }),
    });
    localStorage.setItem("token", "expired-token");
    localStorage.setItem("user", '{"id":1}');

    const { api } = await import("../lib/api");

    await expect(api.get("/orders")).rejects.toThrow("Authentication required");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("throws permission error on 403 without redirect", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "Forbidden" }),
    });
    localStorage.setItem("token", "valid-token");

    const { api } = await import("../lib/api");

    await expect(api.get("/audit-logs")).rejects.toThrow(
      "You do not have permission to perform this action"
    );
    expect(localStorage.getItem("token")).toBe("valid-token");
    expect(window.location.href).not.toBe("/login");
  });

  it("sends Authorization header when token is stored", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    });
    sessionStorage.setItem("token", "session-jwt");

    const { api } = await import("../lib/api");
    await api.get("/health");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-jwt",
        }),
      })
    );
  });
});
