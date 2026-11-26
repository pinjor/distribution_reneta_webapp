import { describe, expect, it } from "vitest";
import { assertIsolatedFrontendConfig, healthUrl } from "./runtime";
import { messageForWorkflowStatus, rejectionReasonError, trimmedRejectionReason } from "./errors";

describe("isolated workflow runtime", () => {
  it("requires the isolated flag and refuses production-looking API URLs", () => {
    expect(() => assertIsolatedFrontendConfig({ VITE_API_URL: "http://127.0.0.1:18012/api" })).toThrow(
      /VITE_ISOLATED_WORKFLOW/,
    );
    expect(() =>
      assertIsolatedFrontendConfig({
        VITE_ISOLATED_WORKFLOW: "1",
        VITE_API_URL: "http://127.0.0.1:9080/api",
      }),
    ).toThrow(/refuses API URL/);
    expect(
      assertIsolatedFrontendConfig({
        VITE_ISOLATED_WORKFLOW: "1",
        VITE_API_URL: "http://127.0.0.1:18012/api",
      }),
    ).toBe("http://127.0.0.1:18012/api");
  });

  it("maps health to the API origin", () => {
    expect(healthUrl("http://127.0.0.1:18012/api")).toBe("http://127.0.0.1:18012/health");
  });
});

describe("rejection reason", () => {
  it("rejects blank and whitespace-only reasons", () => {
    expect(rejectionReasonError("   ")).toBe("A rejection reason is required");
    expect(trimmedRejectionReason("  incomplete lines  ")).toBe("incomplete lines");
    expect(rejectionReasonError("incomplete")).toBeNull();
  });
});

describe("workflow HTTP messages", () => {
  it("fails closed with specific status copy", () => {
    expect(messageForWorkflowStatus(403, "denied", "x")).toBe("denied");
    expect(messageForWorkflowStatus(404, "secret", "x")).toBe("Not found");
    expect(messageForWorkflowStatus(409, "Cannot submit", "x")).toBe("Cannot submit");
    expect(messageForWorkflowStatus(422, "A rejection reason is required", "x")).toBe(
      "A rejection reason is required",
    );
  });
});
