# RENATA website API integration and dummy-data audit

**Date:** 26 November 2026  
**Scope:** production `src/App.tsx` website (`main:app`). Isolated F.4 workflow and LogiCollect mobile APIs were **not** used as website backends.  
**Live database:** read-only checks only. No live writes, truncates, or migrations.

This is **not** 100% completion. Every route was inventoried from source. Dummy **display** of business records was removed where found. Most listing pages already called `apiEndpoints`; they were **code-traced**, not re-proven with per-page SQL in this session unless noted.

---

## Architecture

- Vite + React (`src/App.tsx`) → `ApiClient` (`src/lib/api.ts`, `VITE_API_URL` `/api`) → FastAPI `main:app` → SQLAlchemy → PostgreSQL `swift_distro_hub`.
- Isolated workflow: `src/isolated-workflow/App.tsx` + `isolated_workflow_app` (not production nav).
- LogiCollect: `logicollect_app` on `:18040` (not used by the website).

---

## Page inventory

`src/App.tsx` defines **77 routes** (76 functional + `*`). Duplicate cockpit: `/distribution/cockpit` and `/orders/distribution-cockpit`.  
Isolated-only warehouse print routes are **not** in production App.

Full per-page table: `docs/RENATA_PAGE_BY_PAGE_API_CONNECTION_MATRIX.md`.

---

## Dummy / mock findings (and disposition)

| Location | What it showed | Fix |
|---|---|---|
| `src/lib/mockData.ts` | Fake receipts, orders, invoices, vehicles, drivers | **No remaining imports.** File still on disk unused. |
| `src/pages/StockReceipt.tsx` | `recentReceipts` + fake EBS verify + fake save + Mumbai depot names | List = `GET /stock/receipts`. Verify/save no longer pretend success. Depots from API. Persist via Receive from Factory (`product_receipts`). |
| `src/pages/StockAdjustment.tsx` | Hardcoded ADJ rows + toast-only submit | List + `POST /stock/adjustments` (Pending; no stock qty change until a future approval API). |
| `src/pages/AdjustmentRequest.tsx` | Seven fake vouchers | List from `GET /stock/adjustments`. |
| `src/pages/NewAdjustment.tsx` | Seeded “Acarbose” record | Empty until user adds lines; Save already posted to API. |
| `src/pages/Dashboard.tsx` + `StockChart.tsx` + `ExpiryAlerts.tsx` | Hardcoded depot bars and Paracetamol expiry cards | KPIs already live; charts/alerts now from `/dashboard/kpis` (`stock_ledger`, `product_item_stock_details`). Error shows Retry, not zeros-as-live. |
| `src/pages/orders/AssignedOrderList.tsx` | Alternating Accepted / fake delivery statuses / PROD001 items | Group status from `mobile_accepted`; delivery from `collection_status`; real order items. Backend now returns those fields. |
| `src/pages/Vehicles.tsx` / `Drivers.tsx` | Fake rows when API empty | Empty table. Driver create no longer inserts a row on **error**. |
| `src/pages/VehicleLoading.tsx` | Invented invoice IDs | `GET /invoices` filtered by loading; empty if none. |
| `OrderDeliveryDetail` / `DeliveryOrderDetail` | Random ledger ids | Skip rows without a real `id`. |
| `src/lib/demoUsers.ts` + Login | Demo **login shortcuts** | Left in place. Credentials for seed users, not fake dashboard numbers. |
| `src/components/ui/*-demo.tsx` | UI kit demos | Not routed. STATIC UI. |

---

## Fixes applied

1. Dashboard `stock_by_depot` + `expiry_alerts` (read-only, depot-scoped when `user.depot_id` set).  
2. Dummy tables/charts/fallbacks listed above.  
3. Assigned-order payload includes `mobile_accepted`, `collection_status`, `delivery_status`, `items`.  
4. Website Playwright harness (`e2e/website-audit/`, `playwright.website.config.ts`) — **not executed** (requires `E2E_WEB_AUDIT=1`; default Playwright still targets isolated Vite 15174).

**Not activated:** Sample/Gift and Export submit/approve/reserve/pick/dispatch on production (`SAMPLE_GIFT_DRAFT_WRITES` / `EXPORT_DRAFT_WRITES` unchanged). Isolated F.4 routes remain unmounted on `main:app`.

---

## Dashboard validation

| KPI / chart | Source |
|---|---|
| Total stock, orders today, validated, assigned | `GET /api/dashboard/kpis` → `stock_ledger`, `orders` |
| Order management cards + pie | Same `order_management` object |
| Depot stock bars | `stock_ledger` grouped by `depots.name` |
| Expiry list | `product_item_stock_details.expiry_date` within 60 days |

Failure: error banner + Retry; numeric tiles show "—", not invented counts.

---

## CRUD validation (high risk)

| Action | Status |
|---|---|
| Master data settings (customers, products, …) | Existing pytest CRUD; API-wired |
| New stock adjustment save | Existing `POST /stock/adjustments` — Pending record only |
| Warehouse receipt confirm on `/warehouse/receipt` | **No POST** on stock receipts. Redirects to Receive from Factory |
| EBS challan verify | **Missing backend** |
| Adjustment delete | **Missing backend** — UI says so |
| Draft workflow mutations | **BLOCKED BY APPROVAL** |

---

## Role / depot

Backend `require_auth` / `require_permission` and `apply_depot_*` remain the authority. Frontend `usePermissions` hides nav. This session did not run a multi-role browser matrix against live.

---

## Browser testing

| Suite | Result |
|---|---|
| Isolated Playwright (`e2e/isolated-workflow`, ports 15174/15175) | **Not executed** — Vite not running |
| Official draft Playwright | **Not executed** — would hit isolated E2E stack or risk live |
| New `e2e/website-audit` | **Not executed** — `E2E_WEB_AUDIT` unset on purpose (avoids treating live hub as a fixture) |

---

## Regression

| Suite | Result |
|---|---|
| Backend pytest | **228 passed, 33 skipped, 0 failed** (LogiCollect PG + F.4 env URLs unset) |
| Vitest | **56 passed** |
| `npm run build` | **OK** |
| Typecheck | Covered by Vite build |

---

## Production safety (after)

| Check | Value |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| `lc_*` | 0 |
| Orders | 131 |
| Invoices | 5 |
| LogiCollect on `main:app` | False |
| Compose / live migrations | Unchanged |

---

## Remaining issues

See `docs/RENATA_REMAINING_MOCK_DATA_AND_API_GAPS.md`.

**Overall API integration (business pages in production App):** about **70%** source-wired to real endpoints, **dummy display of records removed from identified screens**, **browser+SQL verification of every page not complete**. Ready for **manual review**, not a go-live claim.
