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

  it("surfaces 409 detail without claiming success", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "Only Draft documents can be updated" }),
    });
    localStorage.setItem("token", "valid-token");

    const { api } = await import("../lib/api");

    await expect(api.put("/sample-gift-deliveries/1", {})).rejects.toThrow(
      "Only Draft documents can be updated"
    );
    expect(window.location.href).not.toBe("/login");
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

  it("calls doctor CRUD endpoints", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => [{ id: 1, code: "DOC-0001", name: "Dr. Test" }],
    });
    sessionStorage.setItem("token", "session-jwt");
    const { apiEndpoints } = await import("../lib/api");

    await apiEndpoints.doctors.getAll();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/doctors"),
      expect.objectContaining({ method: "GET" })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => "application/json" },
      json: async () => ({ id: 2, code: "DOC-0002" }),
    });
    await apiEndpoints.doctors.create({ name: "Dr. New", specialization: "Cardio", registration_number: "R1" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/doctors"),
      expect.objectContaining({ method: "POST" })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ id: 2, city: "Dhaka" }),
    });
    await apiEndpoints.doctors.update(2, { city: "Dhaka" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/doctors/2"),
      expect.objectContaining({ method: "PUT" })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ message: "ok" }),
    });
    await apiEndpoints.doctors.delete(2);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/doctors/2"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("calls chemist shop CRUD endpoints", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => [{ id: 1, code: "CHEM-0001" }],
    });
    sessionStorage.setItem("token", "session-jwt");
    const { apiEndpoints } = await import("../lib/api");

    await apiEndpoints.chemistShops.getAll();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/chemist-shops"),
      expect.objectContaining({ method: "GET" })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => "application/json" },
      json: async () => ({ id: 3, code: "CHEM-0003" }),
    });
    await apiEndpoints.chemistShops.create({ name: "Shop", owner_name: "Owner" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/chemist-shops"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("calls vendor, depot, and route write endpoints", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ id: 1 }),
    });
    sessionStorage.setItem("token", "session-jwt");
    const { apiEndpoints } = await import("../lib/api");

    await apiEndpoints.vendors.update(1, { city: "Dhaka" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/vendors/1"),
      expect.objectContaining({ method: "PUT" })
    );
    await apiEndpoints.depots.delete(4);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/depots/4"),
      expect.objectContaining({ method: "DELETE" })
    );
    await apiEndpoints.routes.create({ route_id: "20001", name: "Route", depot_id: 1 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/routes"),
      expect.objectContaining({ method: "POST" })
    );
    await apiEndpoints.stockAdjustments.getById(9);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/stock/adjustments/9"),
      expect.objectContaining({ method: "GET" })
    );
  });
});
