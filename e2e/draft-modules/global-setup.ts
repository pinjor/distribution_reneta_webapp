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
}
