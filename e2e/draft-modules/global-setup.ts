import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LIVE = "swift_distro_hub";

export default async function globalSetup() {
  const root = path.join(__dirname, "../..");
  const isolationPath = path.join(root, "e2e/.isolation.json");
  const envPath = path.join(root, "e2e/.env.isolated");
  if (!fs.existsSync(isolationPath) || !fs.existsSync(envPath)) {
    throw new Error(
      "Isolated E2E stack is not running. Start it with npm run test:e2e:isolated"
    );
  }
  const isolation = JSON.parse(fs.readFileSync(isolationPath, "utf8"));
  if (isolation.database === LIVE) {
    throw new Error("Isolation file points at the live database. Refusing to run browser writes.");
  }
  const allowed = new Set(["reneta_e2e", "f4b1b_iso"]);
  if (!allowed.has(isolation.database)) {
    throw new Error(`Unexpected isolated database ${isolation.database}`);
  }
  const api = process.env.E2E_API_URL;
  if (!api) {
    throw new Error("E2E_API_URL is missing");
  }
  if (api.includes(LIVE)) {
    throw new Error("E2E_API_URL includes the live database name");
  }
  const health = await fetch(api.replace(/\/api$/, "") + "/health");
  if (!health.ok) {
    throw new Error(`Isolated API health failed: ${health.status}`);
  }
  const probe = await fetch(`${api}/sample-gift-deliveries`);
  if (probe.status === 200) {
    throw new Error("Unauthenticated Draft list returned 200; isolated API auth is misconfigured");
  }
  const workflowApi = process.env.E2E_WORKFLOW_API_URL;
  if (workflowApi) {
    if (workflowApi.includes(LIVE)) {
      throw new Error("E2E_WORKFLOW_API_URL includes the live database name");
    }
    const wfHealth = await fetch(workflowApi.replace(/\/api$/, "") + "/health");
    if (!wfHealth.ok) {
      throw new Error(`Isolated workflow API health failed: ${wfHealth.status}`);
    }
    const wfBody = await wfHealth.json();
    if (wfBody.isolated_workflow !== true) {
      throw new Error("E2E_WORKFLOW_API_URL is not isolated_workflow_app");
    }
  }
  const workflowUi = process.env.E2E_WORKFLOW_BASE_URL;
  if (workflowUi) {
    const origin = workflowUi.replace(/\/$/, "");
    for (const path of ["/", "/delivery/sample-gift/new", "/delivery/export/1"]) {
      const page = await fetch(origin + path);
      const html = await page.text();
      if (!html.includes("isolated-workflow")) {
        throw new Error(`Isolated Vite ${path} did not serve isolated-workflow.html`);
      }
      if (html.includes("/src/main.tsx")) {
        throw new Error(`Isolated Vite ${path} served the production entrypoint`);
      }
    }
  }
}
