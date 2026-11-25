import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function isolatedMeta() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "../.isolation.json"), "utf8")
  ) as {
    database: string;
    depot_a_id: number;
    depot_b_id: number;
    sample_product_id: number;
    export_product_id: number;
  };
}

export function e2eEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function logoutToLogin(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
  });
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.locator("#login-email").waitFor({ state: "visible", timeout: 20_000 });
}

export async function login(page: Page, email: string, password = e2eEnv("E2E_ISOLATED_PASSWORD")) {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 20_000 });
  const emailField = page.locator("#login-email");
  if (!(await emailField.isVisible().catch(() => false))) {
    await logoutToLogin(page);
  }
  await emailField.waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

export async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${e2eEnv("E2E_API_URL")}/auth/login`, {
    data: { email, password: e2eEnv("E2E_ISOLATED_PASSWORD"), remember_me: false },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  return body.access_token as string;
}

export async function selectOption(page: Page, trigger: string, option: string | RegExp) {
  await page.locator(trigger).click();
  await page.getByRole("option", { name: option }).click();
}

export function productCombobox(page: Page) {
  return page
    .locator("div.space-y-2")
    .filter({ has: page.getByText("Product *", { exact: true }) })
    .getByRole("combobox");
}

function markTableSubmitted(table: "sample_gift_deliveries" | "export_deliveries", id: number) {
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || documentId <= 0) {
    throw new Error("document id must be a positive integer");
  }
  const sql = `UPDATE ${table} SET status = 'Submitted' WHERE id = ${documentId} AND status = 'Draft';`;
  const runtime = process.env.E2E_RUNTIME || "docker";
  const pg = process.env.E2E_PG_CONTAINER;
  if (runtime !== "host" && pg && !pg.includes("swift_distro")) {
    execFileSync(
      "docker",
      ["exec", pg, "psql", "-U", "e2e_user", "-d", "reneta_e2e", "-v", "ON_ERROR_STOP=1", "-c", sql],
      { stdio: "pipe" }
    );
    return;
  }
  execFileSync("python3", [path.join(__dirname, "mark_submitted.py"), table, String(documentId)], {
    env: { ...process.env },
    stdio: "pipe",
  });
}

export function markSampleGiftSubmitted(id: number) {
  markTableSubmitted("sample_gift_deliveries", id);
}

export function markExportSubmitted(id: number) {
  markTableSubmitted("export_deliveries", id);
}
