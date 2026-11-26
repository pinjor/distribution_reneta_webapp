import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("production source isolation", () => {
  it("does not import isolated-workflow from the production entrypoint or App", () => {
    const app = readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");
    const main = readFileSync(path.resolve(__dirname, "../main.tsx"), "utf8");
    expect(app).not.toMatch(/isolated-workflow/);
    expect(main).not.toMatch(/isolated-workflow/);
    expect(app).not.toMatch(/IsolatedWorkflowBar/);
    expect(app).not.toMatch(/draft-workflow-submit/);
    expect(app).not.toMatch(/warehouseDocuments/);
    expect(app).not.toMatch(/WarehousePrintDocument/);
    expect(app).not.toMatch(/PROVISIONAL — TEST DOCUMENT/);
    const slot = readFileSync(path.resolve(__dirname, "../components/delivery/DraftWorkflowSlot.tsx"), "utf8");
    expect(slot).not.toMatch(/IsolatedWorkflowBar/);
    expect(slot).not.toMatch(/from ["']@\/isolated-workflow/);
  });
});
