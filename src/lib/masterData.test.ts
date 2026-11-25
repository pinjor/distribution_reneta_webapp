import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

describe("masterData production fallbacks", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem("token", "session-jwt");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty list when the API returns an empty array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => [],
    });
    const { masterData } = await import("./masterData");
    await expect(masterData.getCustomers()).resolves.toEqual([]);
    await expect(masterData.getProducts()).resolves.toEqual([]);
    await expect(masterData.getDepots()).resolves.toEqual([]);
  });

  it("does not substitute demo customers when the API fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "server error" }),
    });
    const { masterData } = await import("./masterData");
    await expect(masterData.getCustomers()).rejects.toThrow();
    await expect(masterData.getProducts()).rejects.toThrow();
    await expect(masterData.getDepots()).rejects.toThrow();
  });

  it("maps PostgreSQL customer rows without fabricating codes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => [{ id: 9, code: "CUST-LIVE", name: "Live Customer", city: "Dhaka" }],
    });
    const { masterData } = await import("./masterData");
    const rows = await masterData.getCustomers();
    expect(rows).toEqual([
      expect.objectContaining({ id: "9", code: "CUST-LIVE", name: "Live Customer", city: "Dhaka" }),
    ]);
    expect(rows.some((row) => row.name === "Global Retail Inc")).toBe(false);
  });
});
