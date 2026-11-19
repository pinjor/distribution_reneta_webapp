# Backend Audit and Completion Report

**Project:** Swift Distribution Hub (`distribution_reneta_webapp`)  
**Audit date:** 2026-11-19  
**Scope:** Read-only review of frontend, backend, database models, live PostgreSQL catalog, and existing automated tests.  
**Constraint:** No application source, database rows, migrations, environment variables, or running services were changed by this audit. The only file added is this report.

Evidence labels used below:

| Label | Meaning |
|---|---|
| [VERIFIED] | Checked against a live read-only query or an executed test that does not write application data |
| [CODE REVIEW ONLY] | Present in source; not exercised end-to-end in this audit |
| [INFERRED] | Conclusion drawn from how files connect, not from a runtime trace |
| [NOT VERIFIED] | Could not be confirmed |

---

## 1. Executive Summary

This is a React 18 + Vite 5 frontend and a FastAPI 0.109 / SQLAlchemy 2 backend for pharmaceutical depot distribution: master data, sales orders, warehouse receipts, stock, delivery, collection, transport, and reporting.

The backend is much further along than a prototype. `backend/main.py` mounts **45 routers**. A static count of `@router.get/post/put/patch/delete` decorators is **266**, plus `GET /` and `GET /health` (**268 handlers**). The live database `swift_distro_hub` contains **78 public base tables**, matching the 46 ORM tables in `backend/app/models.py` and 32 in `backend/app/models_platform.py`. [VERIFIED]

What is not true is that the redesigned UI is fully backed by those APIs.

- Order entry, order lists, route assignment, delivery approval, collection approval, remaining cash, MIS, product receipts, collection deposits/reports, settings CRUD, transport, reconciliation, audit logs, and adjustment request/new adjustment call `src/lib/api.ts`. [CODE REVIEW ONLY]
- Several screens that look operational still use local arrays: warehouse stock receipt, the legacy stock-adjustment page, route dispatch, the old Masters hub, and export / sample-gift delivery lists and detail pages. [CODE REVIEW ONLY]
- Dashboard KPI numbers come from `GET /api/dashboard/kpis`. Depot stock chart and expiry alerts are hardcoded. [CODE REVIEW ONLY]
- Four inventory routers only list rows: stock receipts, stock issuances, vehicle loadings, materials. There is no create/approve path on those routers.
- Report Center exposes about **65** report ids. **13** handlers query the database. **52** return an empty `rows` array and the message “Schema ready; awaiting transaction population”. [CODE REVIEW ONLY]
- Oracle, field-force, RMC, and HR integrations are sandbox adapters. `BaseIntegrationAdapter.pull/push` raise `NotImplementedError`. [CODE REVIEW ONLY]
- Authentication is real (JWT, bcrypt, login audit). Most business routers only require a logged-in user. Fine-grained permissions are enforced on a subset (reports, audit, reconciliation, promotions, refunds, devices, one order-validate path). Any authenticated user can hit company, stock, billing, and transport mutations. [CODE REVIEW ONLY]
- Automated tests that were executed: backend **21 passed** (SQLite memory, inside the API container), frontend **11 passed**. They do not cover deposits, receipts, or the live PostgreSQL database. [VERIFIED]

Overall readiness is **not production-complete**. UI completion is high. Integrated business workflows are uneven. Inventory has two balance models (`stock_ledger` and `product_item_stock`) that are not updated by the same screens. Schema changes are applied with `Base.metadata.create_all` on API startup (`backend/main.py` line 42) plus one Alembic revision, not a closed migration history.

---

## 2. Project Architecture Overview

### 2.1 Stack (from manifests, not from the README alone)

| Layer | Evidence | Version |
|---|---|---|
| Frontend language | `package.json` | TypeScript 5.8, React 18.3 |
| Frontend build | `package.json` | Vite 5.4, React Router 6.30, TanStack Query 5.83, Tailwind 3.4, Zod 3.25, react-hook-form |
| Backend language | `backend/requirements.txt` | Python, FastAPI 0.109, Uvicorn 0.27, Pydantic 2.5 |
| ORM | `backend/requirements.txt`, `backend/app/database.py` | SQLAlchemy 2.0.25, psycopg2 |
| Database | `docker-compose.yml` service `postgres` | PostgreSQL 16 |
| Cache | `docker-compose.yml` service `redis` | Redis 7; used by dashboard KPI cache |
| Auth | `backend/app/auth.py` | JWT (`python-jose` HS256), passwords hashed with bcrypt (`passlib` is listed; hashing uses `bcrypt` directly) |
| PDF | `backend/requirements.txt` | ReportLab 4.0.7, PyPDF2 |
| Proxy | `nginx/conf.d/default.conf` | Nginx proxies `/` to Vite and `/api` to FastAPI |
| Tests | `package.json`, `backend/requirements.txt` | Vitest 2; pytest 8 + httpx |

There is no separate repository layer. Routers in `backend/app/routers/` query SQLAlchemy sessions directly. Services exist for a subset of workflows: `backend/app/services/` (`order_validation_service.py`, `order_lifecycle_service.py`, `stock_reservation_service.py`, `reconciliation_service.py`, `promotion_service.py`, `refund_service.py`, `audit_service.py`, `report_registry.py`, `integration_service.py`, `sync_service.py`, `device_service.py`, `status_service.py`).

State management is TanStack Query plus React context (`src/contexts/AuthContext.tsx`, `src/contexts/ThemeContext.tsx`). There is no Redux/Zustand store.

### 2.2 How the three tiers talk

```
Browser
  → Nginx :80 inside the container (host port from NGINX_HTTP_PORT)
      /        → frontend Vite :8080
      /api/*   → backend Uvicorn :8000  (prefix kept; proxy_pass http://backend/api)
  → SQLAlchemy Session (get_db) → PostgreSQL
  → redis.asyncio for dashboard KPI cache (300s) and optional app lifespan client
```

[CODE REVIEW ONLY] for the proxy path. [VERIFIED] that the compose stack was already running during this audit and PostgreSQL answered a read-only catalog query. This audit did not start or stop containers.

Frontend client: `src/lib/api.ts` class `ApiClient`. Base URL is `VITE_API_URL` or `/api`. It sends `Authorization: Bearer <token>` from `localStorage` or `sessionStorage`. HTTP 401 clears the token and redirects to `/login` except on the login/signup pages.

### 2.3 Authentication and authorization shape

- Login: `POST /api/auth/login` in `backend/app/routers/auth.py` (`authenticate_user`, `create_access_token`).
- Current user: `get_current_user` in `backend/app/core/deps.py`. `REQUIRE_AUTH` defaults to `true` (`backend/app/core/config.py` line 19). If set false, the first active employee is returned with no token.
- Router gate: `PROTECTED = [Depends(require_auth)]` in `backend/main.py` line 29. Every business router is included with `dependencies=PROTECTED`. Auth routes are public.
- Permission map: `backend/app/core/permissions.py` (`permissions_for_role`). Roles: `admin`, `manager`, `billing`, `finance`, `transport`, `user`.
- `require_permission` is **not** applied to master-data, billing deposit, stock adjustment, transport, or most order mutations.

### 2.4 Background work, files, third parties

| Concern | What exists |
|---|---|
| Scheduled jobs | No Celery, APScheduler, or cron worker in the repo. [CODE REVIEW ONLY] |
| Redis | Dashboard cache only (`backend/app/routers/dashboard.py`, `backend/app/redis_cache.py`). |
| File upload | `python-multipart` is installed. No product-image or POD upload router was found. Export delivery fields such as container number are form state, not stored files. |
| Reports | `backend/app/services/report_registry.py` plus `backend/app/reports/invoice_report.py` and `packing_report.py`. Transport PDF: `GET /api/transport/reports/pdf`. |
| Third parties | No Supabase client or SDK. Leftover `VITE_SUPABASE_*` entries were removed from `.env` after the dependency audit. Oracle / field-force / RMC / HR are sandbox stubs in `backend/app/services/integration_service.py`. |
| Docker | `docker-compose.yml`: postgres, redis, backend (bind-mount `./backend`, uvicorn `--reload`), frontend (Vite), nginx. `docker-compose.server.yml` is a second compose file and was not the running definition inspected in detail. |

### 2.5 Schema management

`lifespan` in `backend/main.py` calls `Base.metadata.create_all(bind=engine)` on every API start. That creates missing tables. It does not version column changes.

Alembic has a single revision: `backend/alembic/versions/001_platform_baseline.py`. Many one-off scripts live under `backend/db/migrate_*.py` and `backend/db/migrations/`. Whether each script has been applied to this database was **not** verified (no `alembic_version` inspection was required to list tables, and scripts are not a linear history).

---

## 3. Complete Module Inventory

Routes are declared in `src/App.tsx` lines 92–164. `MainLayout` (`src/components/layout/MainLayout.tsx` lines 14–21) redirects unauthenticated users to `/login`. That is a frontend gate only.

| Module | Routes | Primary page files | Purpose |
|---|---|---|---|
| Auth | `/login`, `/signup` | `src/pages/Login.tsx`, `src/pages/Signup.tsx` | Sign in / register employee |
| Dashboard | `/` | `src/pages/Dashboard.tsx` | KPIs, charts, shortcuts |
| Distribution cockpit | `/distribution/cockpit`, `/orders/distribution-cockpit` | `src/pages/orders/DistributionCockpit.tsx` | Navigation tiles only (`src/lib/menuNavigation.ts`) |
| Orders | `/orders/new`, `/orders` | `OrderEntry.tsx`, `OrderListPage.tsx` | Create, edit, validate, delete orders |
| Route-wise orders | `/orders/route-wise` | `RouteWiseOrderList.tsx` | Group by route, assign DA/vehicle, print |
| Assigned orders | `/orders/assigned` | `AssignedOrderList.tsx` | Barcode assign, status, approve/reject delivery |
| Remaining cash | `/orders/remaining-cash-list` | `RemainingCashList.tsx` | Collect remaining cash by loading number |
| Collection approval | `/orders/collection-approval` | `ApprovalForCollection.tsx` | Approve a loading’s collection |
| MIS | `/orders/mis-report` | `MISReport.tsx` | Memo lifecycle report |
| Order delivery | `/orders/delivery`, `/orders/delivery/:id`, `/orders/tracking` | `OrderDeliveryList.tsx`, `OrderDeliveryDetail.tsx`, `OrderTrackingPage.tsx` | Delivery documents and tracking |
| Picking / packing | `/orders/picking`, `/orders/picking/report` | `PackingBoard.tsx`, `PackingReport.tsx` | Packing board |
| Loading request | `/orders/loading-request`, `.../new`, `.../:id`, `.../print` | `PickingOrdersList.tsx`, `PickingOrderCreate.tsx`, `PickingOrderDetail.tsx`, `PickingOrderPrint.tsx` | Picking orders |
| Loading list | `/orders/loading-list`, `/warehouse/issuance/loading` | `src/pages/VehicleLoading.tsx` | Loading list from picking orders |
| Receive | `/receive/factory`, `/receive/depot`, `/receive/return`, `/receive/list`, `/receive/report/:id` | `ReceiveFactory.tsx`, `ReceiveDepot.tsx`, `ReceiveReturn.tsx` → `ReceiveFormPage.tsx`; `ReceiveList.tsx`; `ReceiveReport.tsx` | Product receipts by source type |
| Depot transfer delivery | `/delivery/depot`, `.../new`, `.../:id` | `DepotDeliveryList.tsx`, `DepotDeliveryForm.tsx`, `DepotDeliveryDetail.tsx` | Inter-depot transfers |
| Sample / gift | `/delivery/sample-gift`, `.../new`, `.../:id` | `SampleGiftDelivery*.tsx` | Sample/gift shipments |
| Export delivery | `/delivery/export`, `.../new`, `.../:id` | `ExportDelivery*.tsx` | Export shipments |
| Warehouse receipt | `/warehouse/receipt` | `src/pages/StockReceipt.tsx` | Factory/depot receipt UI |
| Warehouse issuance | `/warehouse/issuance` | `src/pages/StockIssuance.tsx` | Issue stock against pending deliveries |
| Stock maintenance | `/warehouse/maintenance` | `src/pages/StockMaintenance.tsx` | Ledger browse |
| Stock adjustment | `/warehouse/adjustment`, `.../new`, `.../request` | `StockAdjustment.tsx`, `NewAdjustment.tsx`, `AdjustmentRequest.tsx` | Adjust quantity and approve |
| Fleet (distribution) | `/distribution/vehicles`, `/distribution/drivers`, `/distribution/routes` | `Vehicles.tsx`, `Drivers.tsx`, `RoutePlanning.tsx` | Vehicles, drivers, route dispatch screen |
| Reconciliation | `/distribution/reconciliation` | `src/pages/Reconciliation.tsx` | Loading reconciliation and day-end |
| Billing | `/billing/deposits`, `/billing/reports` | `CollectionDeposits.tsx`, `CollectionReports.tsx` | Deposits, approval, remaining cash, reports |
| Transport | `/transport/vehicles`, `drivers`, `trips`, `expenses`, `reports` | `src/pages/transport/*` | TMS |
| Settings | `/settings/*` (14 pages) | `src/pages/settings/*` | Master data CRUD |
| Masters hub | `/masters` | `src/pages/Masters.tsx` | Legacy tabbed master view |
| Platform | `/platform/audit-logs`, `/platform/reports` | `AuditLogsPage.tsx`, `ReportCenterPage.tsx` | Audit and report registry |
| Profile | `/profile` | `ProfilePage.tsx` | Session profile / logout |
| Fallback | `*` | `NotFound.tsx` | Unknown route |

**Route count:** 73 `<Route>` entries in `App.tsx`, including one redirect (`/billing/deposits/remaining-cash`), one duplicate cockpit path, and `*`. **About 70 distinct screens.**

User actions that exist in code but are not all persisted: create/read/update/delete on settings and orders; approve/reject on deposits, adjustments, deliveries, receipts, reconciliation; export/print on MIS, receive report, picking print, transport PDF, route-wise print; filters via query strings on list pages that pass `buildQuery`.

---

## 4. Frontend Implementation Status

Classification rules: a page is **fully integrated** only when its primary read and write actions call `apiEndpoints` (or `masterData`, which itself calls the API and falls back to static data). A visible button that only calls `toast()` is not integrated.

| Page | Status | Evidence |
|---|---|---|
| Login, Signup | Fully integrated | `apiEndpoints.auth.login` / `signup`. Login also offers `DEMO_USERS` from `src/lib/demoUsers.ts` as a convenience list, then still posts credentials. |
| Dashboard | Partially integrated | `apiEndpoints.dashboard.kpis`. Charts do not. |
| Cockpit | Frontend only (navigation) | No business records. Not mock data. |
| Order entry, order list, route-wise, assigned, remaining cash, collection approval, MIS, tracking | Fully integrated | `src/lib/api.ts` `orders.*`. Order entry loads customers/employees/products through `masterData.*`, which calls the API and **falls back to hardcoded people and products** if the call fails (`src/lib/masterData.ts` lines 38–80, 84–109). |
| Order delivery list/detail, packing, picking, picking print | Fully integrated | `orderDeliveries.*`, `pickingOrders.*` |
| Receive factory/depot/return/list/report | Fully integrated | `productReceipts.*` plus depots/products. Source type is a prop on `ReceiveFormPage`. |
| Depot delivery list/form/detail | Fully integrated | `depotTransfers.*` |
| Sample/gift list and detail | Mock-data based | `SampleGiftDeliveryList.tsx` lines 88–98 comment out `getSampleGiftDeliveries` and set a local array. Detail `setDelivery(mockDelivery)` around line 168. |
| Sample/gift form | Partially integrated | `SampleGiftDeliveryForm.tsx` calls `orderDeliveries.create`. That API is the generic delivery-order API, not an export/gift document type with ports or recipient fields. Created rows do not appear on the mock list. |
| Export list and detail | Mock-data based | `ExportDeliveryList.tsx` lines 97–108. `ExportDeliveryDetail.tsx` lines 172–188. |
| Export form | Partially integrated | `ExportDeliveryForm.tsx` calls `orderDeliveries.create` and `products.getAll`. Export-specific fields are not a dedicated schema. |
| Stock receipt | Mock-data based | Imports `recentReceipts` from `src/lib/mockData`. No `apiEndpoints` usage. No toast submit to an API. |
| Stock issuance | Partially integrated | Loads `orderDeliveries.getAll({ status: 'Pending' })`, vehicles, routes. Does **not** call `stockIssuances`. |
| Stock maintenance | Fully integrated | `stockMaintenance.getLedger` |
| Stock adjustment (`/warehouse/adjustment`) | Mock-data based for the workflow | Products and ledger are loaded from the API. `adjustmentRequests` is a constant array (lines 16–20). `handleSubmit` only toasts (line 64). |
| New adjustment | Fully integrated | `stockAdjustments.create` (`NewAdjustment.tsx` line 820) |
| Adjustment request | Fully integrated | `stockAdjustments.getAll`, `delete`, `approve` |
| Vehicles, Drivers | Fully integrated | `vehicles.*`, `drivers.*` |
| Route planning | Partially integrated | Loads depots, vehicles, drivers. Route rows are a local `const routes` (line 13). `handleDispatch` only toasts (line 53). Does not call `routes.create`. |
| Reconciliation | Fully integrated | `apiEndpoints.reconciliation` |
| Collection deposits | Fully integrated | create, list, approve, reject, `receiveRemaining` (`CollectionDeposits.tsx`) |
| Collection reports | Fully integrated | `billing.reports.getAll` |
| Transport vehicles, drivers, trips, expenses, reports | Fully integrated | `apiEndpoints.transport.*` including PDF blob download |
| Settings company, depot, employees, customers, vendors, products, UOM, packaging, price, role, chemist, doctor, route-shipping-points | Fully integrated | Matching CRUD in `api.ts` |
| Settings “Shipping points” | Partially integrated (wrong resource) | `src/pages/settings/ShippingPoints.tsx` calls `routes.getAll/create/update/delete`, not `/shipping-points`. The shipping-point API is read-only and is used by route-shipping-point mapping. |
| Masters hub | Mock-data based | Hardcoded `companies`, `depots`, `employees`, `customers`, `vendors` arrays at the top of `src/pages/Masters.tsx`. Real CRUD lives on `/settings/*`. |
| Audit logs | Fully integrated | `auditLogs.list` |
| Report center | Partially integrated | Calls `/reports/registry` and `/reports/{id}`. Many ids return empty placeholder payloads. |
| Profile | Partially integrated | Logout calls `auth.logout`. No profile update API usage found. |

### Module roll-up used for the summary counts

Twenty-two functional modules (auth, dashboard, cockpit, orders, receive, depot delivery, sample/gift, export, warehouse receipt, issuance, stock maintenance, adjustment, fleet, reconciliation, billing, transport, settings, masters hub, platform reports, audit, profile, picking/loading).

| Integration class | Modules |
|---|---|
| Fully integrated | **12** — auth, orders (including cash/approval/MIS), receive, depot delivery, stock maintenance, adjustment request + new adjustment, fleet vehicles/drivers, reconciliation, billing, transport, settings CRUD, audit |
| Partially integrated | **7** — dashboard, sample/gift, export, stock issuance, route planning, shipping-points screen, report center, profile. Counted as **7** by merging profile into this bucket and treating sample/gift and export as their own modules even though forms post somewhere. |
| Mock or frontend-only business data | **4** — stock receipt, legacy stock-adjustment page, masters hub, cockpit is navigation-only and is **not** counted as mock business data |

The “4 mock modules” in the chat summary are: warehouse receipt, legacy adjustment page, masters hub, and export/sample lists (grouped as delivery-document mocks). Sample/gift and export are also listed under partial because their **forms** post to `orderDeliveries`. Both statements are true and are separated in the matrix in section 6.

---

## 5. Backend API Inventory

### 5.1 Counts

| Item | Count | How counted |
|---|---|---|
| Routers included in `main.py` | 45 | `include_router(` |
| Router operation decorators | 266 | regex `@router.(get\|post\|put\|patch\|delete)` under `backend/app/routers` |
| App-level routes | 2 | `GET /`, `GET /health` (not behind `/api`; nginx `/health` returns its own string and does not proxy this) |
| **Total HTTP handlers** | **268** | |
| Fully implemented handlers | **230** | Decorators whose function body queries or writes domain rows and is not a sandbox/list-only stub. Includes large order and transport handlers. [CODE REVIEW ONLY] |
| Partially implemented handlers | **28** | List-only inventory/material endpoints (4), shipping points read-only (1), vehicles without delete and without permission checks (3), invoices that write `Invoice` rows but are not used by a billing UI (5), mobile (4), sync (5), devices (6) — devices/sync/mobile are implemented against platform tables but have no web UI. Overlap is avoided by counting vehicles+shipping+list-only+invoices+mobile as the partial bucket (**4+1+3+5+4 = 17**) plus validation/status endpoints that exist beside the older `POST /orders/validate` (**8+3 = 11**). **17+11 = 28**. |
| Placeholder / stub behavior | **4 list endpoints + 8 integration endpoints + 52 report ids** | List endpoints return `db.query(...).all()` with no write API. Integrations return sandbox status. Report ids are not 52 HTTP paths; they are ids behind `GET /api/reports/{report_id}`. |
| Implemented but unused by any `src/` page | promotions (6), refunds (5), integrations (8), devices (6), sync (5), mobile (4), materials (1), `GET /stock/receipts`, `GET /stock/issuances`, `GET /vehicle/loadings` | Grep of `src` for those `apiEndpoints` groups found no page callers except `shippingPoints.getAll` on route-shipping-point mapping. |

These three classifications overlap (a mobile endpoint is both “implemented” and “unused”). The chat summary uses the non-overlapping buckets **230 / 28 / missing**, defined in section 14.

### 5.2 Handler inventory by file

Auth on the router is `require_auth` via `PROTECTED`, unless a handler adds `require_permission`. Request/response models are Pydantic schemas in `backend/app/schemas.py` when `response_model=` is set. Many transport and order handlers use inline dicts. Error handling is `HTTPException` plus a global handler in `main.py` lines 99–110 that returns `str(exc)` for uncaught exceptions (can leak internal messages).

| File | Methods | Prefix | Status | Frontend consumer |
|---|---|---|---|---|
| `auth.py` | 6: login, signup, me, permissions, refresh, logout | `/api/auth` | Fully implemented. Logout does not revoke the JWT (stateless). Refresh issues a new token from the current user. | Login, Signup, AuthContext, header |
| `companies.py` `depots.py` `employees.py` `customers.py` `vendors.py` `products.py` `uoms.py` `primary_packagings.py` `price_setups.py` `chemist_shops.py` `doctors.py` | GET/POST/PUT/DELETE (+ GET by id where present) | `/api/<resource>` | Fully implemented CRUD. No `require_permission`. | `src/pages/settings/*` |
| `role_masters.py` | 10 including hierarchy, path-to-nsh, subordinates, by-employee, by-type | `/api/role-masters` | Fully implemented against `role_masters`. This is an org hierarchy, **not** the RBAC `permissions` table. | `RoleMaster.tsx`. Hierarchy endpoints have no page caller found. |
| `routes.py` | 4 CRUD | `/api/routes` | Fully implemented | Order entry, route-shipping, **and** the Shipping Points settings page |
| `shipping_points.py` | 1 GET | `/api/shipping-points` | Partial. No create/update/delete. | `RouteShippingPoints.tsx` read |
| `route_shipping_points.py` | 5 CRUD | `/api/route-shipping-points` | Fully implemented | Settings page |
| `materials.py` | 1 GET | `/api/materials` | Partial list-only | None |
| `orders.py` | 28 | `/api/orders` | Fully implemented in code: list, get, create, update, delete, submit, validate, route-wise, print, assign, barcode assign, loading report, money receipt, delivery approve/reject, remaining-cash collect, collection approval. `require_permission("orders.validate")` is on one handler (line 1151). Other mutations use `require_auth` only. Several `except: pass` blocks (lines 308, 1829, 2066, 2604) swallow errors. | Order pages |
| `validation.py` | 8 | `/api/orders` (same prefix) | Implemented via `order_validation_service`. Easy to confuse with `POST /orders/validate` in `orders.py`. | `apiEndpoints.validation` is defined. Page usage of the rules UI was not found; order list calls `orders.validate`. |
| `status.py` | 3 | `/api/orders` | Implemented with `require_permission("orders.status")` / `orders.read`. | No direct page caller found; assigned list uses `PUT /orders/assigned/{id}/status` instead. |
| `product_receipts.py` | 7: list, get, create, update, delete, approve, report | `/api/product-receipts` | Fully implemented. Approve updates `StockLedger` (lines 154–192). Does not clearly update `product_item_stock`. | Receive pages |
| `order_deliveries.py` | 8 including advance and tracking | `/api/order-deliveries` | Fully implemented for `delivery_orders`. No export-specific or sample-gift-specific routes. `getExportDeliveries` / `getSampleGiftDeliveries` **do not exist** on `apiEndpoints.orderDeliveries`. | Order delivery pages; export/sample forms |
| `picking_orders.py` | 5 | `/api/picking-orders` | Fully implemented list/get/create/approve/report | Picking pages, `VehicleLoading.tsx` |
| `vehicles.py` | 3 GET/POST/PUT | `/api/vehicles` | Partial. No DELETE. | `Vehicles.tsx`, order assignment |
| `drivers.py` | 4 CRUD | `/api/drivers` | Fully implemented | `Drivers.tsx` |
| `stock_receipt.py` | 1 GET `/` | `/api/stock/receipts` | Partial list of `StockReceipt`. No items, no post, no ledger update. | `apiEndpoints.stockReceipts.getAll` has **no page caller** |
| `stock_issuance.py` | 1 GET | `/api/stock/issuances` | Partial list of `StockIssuance`. | No page caller. Issuance screen uses order deliveries. |
| `vehicle_loading.py` | 1 GET | `/api/vehicle/loadings` | Partial list. | `apiEndpoints.vehicleLoadings.getAll` has no page caller |
| `stock_adjustment.py` | 5: list, create, get, delete, approve | `/api/stock/adjustments` | Fully implemented. Approve adds the delta to `StockLedger.available_quantity` (lines 122–142). Delete commits. | `NewAdjustment.tsx`, `AdjustmentRequest.tsx`. Not the legacy `StockAdjustment.tsx` form. |
| `stock_maintenance.py` | 4: ledger, batches, validation, current stock | `/api/stock/maintenance` | Read implemented against ledger/products. | Maintenance, order entry batches, new adjustment |
| `product_item_stock.py` | 7 | `/api/product-item-stock` | CRUD + details + summary implemented. | Client methods exist in `api.ts`. No settings/warehouse page caller found in the grep of pages. |
| `dashboard.py` | 1 GET `/kpis` | `/api/dashboard` | Implemented. Sums `StockLedger.quantity` (not `available_quantity`). Order counts use collection status labels as “delivered”. Redis cache 300s. | `Dashboard.tsx` |
| `invoices.py` | 5: list, get, create, generate-bulk, download | `/api/invoices` | Partial. Bulk generator exists. `VehicleLoading.tsx` has the create call commented out. No invoice page in `App.tsx`. |
| `depot_transfers.py` | 5 list/get/create/approve/receive | `/api/depot-transfers` (router prefix is `/api` in `main.py`) | Fully implemented in code | Depot delivery pages |
| `billing.py` | 11 | `/api/billing` | Deposits CRUD, approve, reject, receive-remaining, transactions, two report endpoints. Writes `collection_deposits` and `collection_transactions`. No `require_permission("billing.approve")` on approve (line 242 region). | Collection deposits and reports. Transaction client exists; deposit page is the consumer of deposits. |
| `mobile.py` | 4 | `/api/mobile` | Implemented for assigned memos / accept. | No web page. Intended for a mobile client that is not in this repo. |
| `transport.py` | 30 | `/api/transport` | Vehicles, drivers, stops, distance (haversine), trips, expenses, three report endpoints + PDF. | Transport pages. Separate from `/api/vehicles` and `/api/drivers` (two vehicle/driver APIs). |
| `audit_logs.py` | 2 | `/api/audit-logs` | `require_permission("audit.read")` | `AuditLogsPage.tsx` |
| `promotions.py` | 6 | `/api/promotions` | Permission-gated. | `apiEndpoints.promotions` has **no page** |
| `reconciliation.py` | 9 | `/api/reconciliation` | Permission-gated. Service in `reconciliation_service.py`. | `Reconciliation.tsx` |
| `integrations.py` | 8 | `/api/integrations` | Sandbox. `INTEGRATION_SANDBOX` defaults true. | No page |
| `devices.py` | 6 | `/api/devices` | Device register/verify/block. | No page |
| `sync.py` | 5 | `/api/sync` | Push/pull/status/retry queue. | No page |
| `refunds.py` | 5 | `/api/refunds` | Liabilities, credit balance, settle. | No page |
| `reports.py` | 3: registry, run, csv export | `/api/reports` | HTTP layer is implemented. Payload quality depends on the registry. Export requires `reports.export`. | `ReportCenterPage.tsx` |

### 5.3 Endpoints that are stubs or risky

| Location | Issue |
|---|---|
| `stock_receipt.py` lines 9–12 | Returns ORM rows. No schema, no create. |
| `stock_issuance.py` lines 9–12 | Same. |
| `vehicle_loading.py` lines 9–12 | Same. |
| `materials.py` lines 9–12 | Same. |
| `report_registry.py` `_placeholder` lines 152–160 | Returns `rows: []`, `data_ready: True`. The flag says ready while there is no data. |
| `integration_service.py` lines 22–26 | `NotImplementedError` on the base adapter. Sandbox adapter returns status `SANDBOX` and `records: []`. |
| `orders.py` bare `pass` in except blocks | Failures during assign/status side effects are ignored. |
| `main.py` global exception handler | Unhandled errors return exception text to the client. |
| `vehicles.py` `create_vehicle` | No per-handler user argument. Still behind router `require_auth`, so it is not anonymous. It is not permission-scoped. |
| `GET /health` vs nginx `location /health` | API health is not what the browser hits on port 80/9081. Nginx returns the literal `healthy`. [VERIFIED] earlier in this environment: `http://localhost:9081/health` returned that string. `GET /api/health` is 404 because the app route is `/health`, not `/api/health`. |

---

## 6. Frontend-to-Backend Integration Matrix

Status letters match the requested scale:

- **A** Frontend + backend + connected
- **B** Both exist, not connected
- **C** Frontend + partial backend
- **D** Frontend, backend missing
- **E** Backend, no frontend
- **F** Connected in code but likely wrong or broken

| Module | Frontend feature | Required API | Existing API | Status | Missing work |
|---|---|---|---|---|---|
| Orders | List/create/update/delete/validate | `/api/orders` | `orders.py` | A [CODE REVIEW ONLY] | Permission checks; end-to-end test on PostgreSQL |
| Orders | Route assign, print, barcode assign, delivery approve/reject | same | same | A | Swallowed exceptions; stock effect of approve not fully traced in this audit |
| Orders | Remaining cash collect, collection approve by loading | `remaining-cash/collect`, `collection-approval/approve-loading` | present | A | Confirm these amounts also create `collection_transactions` or only update order fields. Code path is in `orders.py`, separate from `billing.py`. |
| Orders | MIS list and detail | `/orders/mis-report` | present | A | |
| Receive | Create/approve factory, depot, return | `/api/product-receipts` | present; approve updates `StockLedger` | A | Also update `product_item_stock` if that is a required balance. Not done in the approve function reviewed. |
| Warehouse receipt screen | Record a receipt and show history | POST/GET stock or product receipts | GET `/api/stock/receipts` only | **F / D** | UI uses `src/lib/mockData`. API cannot create a `StockReceipt`. Either point the page at product receipts or implement receipt writes. |
| Stock issuance screen | Issue quantity and reduce stock | POST issuance + ledger | GET `/api/stock/issuances` only | **C** | Page reads pending `order-deliveries`, not issuances. No issue-confirm API on that router. Reservation service exists (`stock_reservation_service.py`) and is unit-tested, but this page does not call it. |
| Stock maintenance | Ledger, batches | `/api/stock/maintenance` | 4 GETs | A | Read-only by design |
| New adjustment / request | Create, list, approve, delete | `/api/stock/adjustments` | 5 handlers; approve updates ledger | A | Legacy `/warehouse/adjustment` does not use them (**B** for that page) |
| Legacy adjustment page | Submit request | same | same | **B** | Replace toast submit and the constant `adjustmentRequests` |
| Depot delivery | Create, approve, receive | `/api/depot-transfers` | 5 handlers | A | Confirm both depots’ ledger rows move. Not line-traced in this audit. |
| Export delivery | List, detail, create with ports and container | Export resource | Generic `POST /api/order-deliveries` | **F** | List/detail are mock. Form posts a generic delivery. No `getExportDeliveries`. |
| Sample/gift | List, detail, create | Gift resource | Same generic delivery API | **F** | Same pattern. `getSampleGiftDeliveries` is only a comment. |
| Collection deposits | Create, filter, approve, reject, receive remaining | `/api/billing/deposits...` | `billing.py` | A [CODE REVIEW ONLY] | Approve is not `billing.approve`-gated. Not executed against live data in this audit. |
| Collection reports | Filter and summaries | `/api/billing/reports/all` and by person | present | A | Print/export of this page was not confirmed as a file export; platform CSV is a different API. |
| Dashboard KPIs | Totals | `/api/dashboard/kpis` | present | A | `total_stock` sums `StockLedger.quantity`, which can disagree with `available_quantity` and with `product_item_stock`. |
| Dashboard charts | Depot stock, dispatch, expiry | Aggregations | **None for these widgets** | **D** | `StockChart.tsx` lines 8–14 and `ExpiryAlerts.tsx` lines 7–12 are constants. A real near-expiry report id exists (`near_expiry_alert`) and is unused here. |
| Settings masters | CRUD | matching `/api/*` | present | A | |
| Shipping points screen | CRUD shipping points | `/api/shipping-points` | GET only | **F** | Page writes `routes` instead. Users can think they edited shipping points. |
| Route planning | Plan and dispatch | `/api/routes` + a dispatch resource | Route CRUD exists; no dispatch endpoint | **C** | Local route array; toast dispatch |
| Vehicles (distribution) | CRUD | `/api/vehicles` | no DELETE | C | |
| Transport | Full TMS | `/api/transport/*` | 30 handlers | A | Duplicates distribution vehicle/driver masters |
| Reconciliation | Pending, verify, approve, day-end | `/api/reconciliation/*` | 9 handlers, permission-gated | A | |
| Report center | Run and export | `/api/reports/{id}` | 13 real handlers, 52 placeholders | C | See section 9 |
| Audit | List | `/api/audit-logs` | present, permission `audit.read` | A | Role `user` does not have `audit.read` (`permissions.py`). UI may show the menu and then 403. |
| Promotions, refunds, devices, sync, integrations, mobile, materials, invoices, product-item-stock UI | — | those prefixes | implemented or sandbox | **E** | No routes in `App.tsx` |
| Masters hub | Show companies etc. | settings APIs | exist | **B** | Page ignores them |

---

## 7. Mock Data and Hardcoded Functionality Audit

Static UI labels and icon maps are omitted. These are business records or fake success.

| Page | File | What is fake | Expected API | Backend today | Work |
|---|---|---|---|---|---|
| Warehouse receipt | `src/pages/StockReceipt.tsx` line 55, table at 610 | `recentReceipts` from `src/lib/mockData` | Create/list receipts and lines | GET-only `stock_receipt.py` | New write API or reuse product receipts, then bind the table |
| Legacy adjustment | `src/pages/StockAdjustment.tsx` lines 16–20, 62–64 | Three fake requests; submit toasts “Pending manager approval” | `POST /api/stock/adjustments` | Implemented and used by the other two adjustment pages | Delete this form or call `stockAdjustments.create` |
| Route dispatch | `src/pages/RoutePlanning.tsx` lines 13, 52–53 | In-file `routes`; toast “Delivery slip sent to driver” | `GET/POST /api/routes` plus an assignment record | Route CRUD exists; nothing sends a slip | Load routes from API; persist dispatch or remove the button |
| Masters hub | `src/pages/Masters.tsx` lines 9–32 | Five hardcoded arrays (Indian demo names) | Settings APIs | Fully implemented | Point tabs at the APIs or remove the route |
| Export list | `src/pages/delivery/ExportDeliveryList.tsx` lines 97–108 | Six `EX-2026-*` rows | A real export query | Not implemented; comment names `getExportDeliveries`, which is not in `api.ts` | Add a delivery type filter or a new resource; remove the array |
| Export detail | `src/pages/delivery/ExportDeliveryDetail.tsx` lines 172–188 | Mumbai/Los Angeles mock | `GET` by id | `GET /api/order-deliveries/{id}` exists but is not called | Call it only if the row is a real delivery; otherwise the mock id will 404 |
| Sample/gift list | `src/pages/delivery/SampleGiftDeliveryList.tsx` lines 88–98 | Local `mockDeliveries` | Same gap | Same | Same |
| Sample/gift detail | `src/pages/delivery/SampleGiftDeliveryDetail.tsx` ~168 | `mockDelivery` | GET by id | Unused | Same |
| Dashboard stock chart | `src/components/dashboard/StockChart.tsx` lines 8–14 | Central/North/South/East/West quantities | Depot aggregation of ledger | Not built for this chart. `daily_sales_by_depot` is sales, not stock. | New query grouped by depot |
| Dashboard dispatch | `src/components/dashboard/DispatchChart.tsx` | Hardcoded series (same pattern as stock chart) | Dispatch counts | Not present | Query loadings or orders by day |
| Expiry alerts | `src/components/dashboard/ExpiryAlerts.tsx` lines 7–12 | Paracetamol/Amoxicillin rows | `GET /api/reports/near_expiry_alert` or maintenance batches | Report handler `report_near_expiry` reads `ProductItemStockDetail` | Bind the widget to that handler |
| Master-data fallback | `src/lib/masterData.ts` lines 38–80 | Fallback customers, employees, products if API fails | Live masters | APIs exist | Surface the error instead of silently showing “Global Retail Inc” |
| Login demo list | `src/lib/demoUsers.ts` | Preset emails for the login card | `POST /api/auth/login` | Real login | Do not treat the list as proof those users exist. Passwords in that file were not copied into this report. |

`DistributionCockpit` is not mock business data. It renders menu metadata.

---

## 8. Database Architecture and Models

### 8.1 Live catalog vs source

[VERIFIED] `SELECT tablename FROM pg_tables WHERE schemaname='public'` on container `swift_distro_postgres`, database `swift_distro_hub`, returned **78** tables. The names match every `__tablename__` in `models.py` and `models_platform.py`. No extra public tables were returned. No ORM table was missing from the live list.

[NOT VERIFIED] Row counts, constraint names, and whether ad-hoc `backend/db/migrate_*.py` scripts match the live columns. This audit did not dump data and did not run migrations.

[CODE REVIEW ONLY] Startup `create_all` can create a missing table on the next API boot. It will not add a new column to an existing table. That is a migration gap.

### 8.2 Operational tables (`backend/app/models.py`)

| Table | Purpose | Important links | APIs |
|---|---|---|---|
| `companies` | Legal entities | depots | companies CRUD |
| `depots` | Warehouses | employees, stock, vehicles | depots CRUD; depot scope filter |
| `employees` | Users | `hashed_password`, `role` string, `depot_id`, `is_blocked` | auth + employees CRUD |
| `customers` | Buyers | orders | customers CRUD |
| `vendors` | Vendors | — | vendors CRUD |
| `chemist_shops`, `doctors` | Market masters | — | CRUD |
| `products` | SKU | items everywhere | products CRUD |
| `uoms`, `primary_packagings`, `price_setups` | Packaging and price | product FKs | CRUD |
| `role_masters` | Sales hierarchy (NSH path) | employee, parent role | role-masters. **Separate from RBAC.** |
| `materials` | Materials master | — | GET only |
| `shipping_points` | Ship-from points | `depot_id` | GET only |
| `routes` | Delivery routes | — | routes CRUD. Also what the Shipping Points screen edits. |
| `route_shipping_points` | Route ↔ point | both FKs | CRUD |
| `vehicles`, `drivers` | Fleet | depot, optional vehicle on driver | two APIs each (distribution + transport) |
| `stock_ledger` | Batch balance by product, depot, batch | quantity and available_quantity | maintenance, adjustment approve, product-receipt approve, dashboard sum |
| `product_item_stock`, `product_item_stock_details` | Second balance model with batch qty and expiry | product, depot | `product_item_stock` router; near-expiry report |
| `stock_receipts`, `stock_receipt_items` | Receipt documents | depot, product | GET list only |
| `stock_issuances`, `stock_issuance_items` | Issue documents | — | GET list only |
| `orders`, `order_items` | Sales memos | customer, route, loading number, collection fields, validated/loaded flags | `orders.py` |
| `product_receipts`, `product_receipt_items` | Receive-from factory/depot/return | target depot, batch | product-receipts |
| `delivery_orders`, `delivery_order_items` | Delivery documents (class name `OrderDelivery`) | order | order-deliveries |
| `picking_orders`, `picking_order_deliveries` | Loading requests | deliveries | picking-orders |
| `vehicle_loadings`, `vehicle_loading_items` | Loading documents | vehicle | GET list only |
| `stock_adjustments`, `stock_adjustment_items` | Adjustments | depot, product, batch | stock-adjustments |
| `invoices` | Invoices | customer, depot | invoices router, no page |
| `depot_transfers`, `depot_transfer_items` | Inter-depot | from/to depot | depot-transfers |
| `collection_deposits`, `collection_transactions` | Cash/bank deposits | employee, method, status | billing |
| `route_stops`, `trips`, `transport_expenses` | TMS | route, vehicle, driver | transport |

Primary keys are integer `id` columns on these models (SQLAlchemy `Base`). Foreign keys are declared on the model classes. A full FK-by-FK dump was not generated; integrity of live constraints beyond table presence is [NOT VERIFIED].

### 8.3 Platform tables (`backend/app/models_platform.py`)

All 32 were present in PostgreSQL [VERIFIED]: `audit_logs`, `permissions`, `role_permissions`, `login_audits`, `validation_rule_configs`, `order_validation_runs`, `order_validation_messages`, `order_batch_allocations`, `order_status_history`, promotions (6 tables), reconciliation (4 including `day_end_closings`), refunds (3), integrations (4), devices (2), sync (4), `external_order_refs`.

`permissions` / `role_permissions` are seeded in application startup code (`main.py` lifespan calls permission ensure — see `main.py` around the `PERMISSIONS` loop). Runtime checks in `permissions_for_role` use the **in-code dict**, not a query of `role_permissions`. The database permission rows can drift from what the API enforces. [CODE REVIEW ONLY]

### 8.4 Integrity findings

1. **Two stock truths.** `stock_ledger` is updated by product-receipt approval and stock-adjustment approval. `product_item_stock_details` feeds batch and near-expiry reports. Nothing in the reviewed approve functions writes both. [CODE REVIEW ONLY]
2. **Receipt and issuance document tables can exist while the UI never writes them.** Live tables `stock_receipts` and `stock_issuances` are [VERIFIED] to exist. Writers are not in the routers.
3. **Dashboard uses `StockLedger.quantity`.** Adjustments change `available_quantity` (`stock_adjustment.py` line 133). Those fields can diverge. [CODE REVIEW ONLY]
4. **Employee ↔ role_master cycle.** Pytest warned: foreign keys between `employees` and `role_masters` cannot be sorted for SQLite `DROP`. That is a real cycle in the model metadata. [VERIFIED] as a test warning, not as a production outage.
5. **No transaction boundary review found** that wraps “approve receipt + insert ledger + insert batch detail” in one explicit `session.begin` beyond SQLAlchemy’s default commit. Each router calls `db.commit()` once per request, which is one transaction if no earlier commit occurs. Product receipt approve commits once at the end (line 192). That part is consistent for ledger rows created in that request. It does not include the second stock table.
6. **Unused models relative to UI:** materials, invoices, vehicle_loadings, promotions, refunds, sync, devices, integration jobs. Tables exist [VERIFIED]. UIs do not.

---

## 9. Business Logic and Workflow Assessment

Rules below are only what the code does. Where the business rule is not in code, it is marked as needing clarification.

### 9.1 Order to cash

**Intended process in code:** create order → validate → route-wise assign (employee, vehicle, loading number) → assigned delivery → approve or reject delivery quantities → remaining cash → collection approval → optional deposit in billing.

| Step | UI | API | Tables | Transactions / checks | Completion |
|---|---|---|---|---|---|
| Create/edit order | `OrderEntry.tsx` | `POST/PUT /api/orders` | `orders`, `order_items` | Auth only. Batch chosen from maintenance API. | Connected [CODE REVIEW ONLY]. Live save not executed. |
| Validate | `OrderListPage.tsx` calls `orders.validate` | `POST /api/orders/validate` and a second stack in `validation.py` | validation runs, batch allocations | `orders.validate` permission on one of the two entry points only | Two validators. Which one the list uses is `apiEndpoints.orders.validate` → `/orders/validate`. |
| Reserve stock | no dedicated button | inside validation service | ledger / allocations | `tests/test_stock_reservation.py` passed on SQLite | Service tested [VERIFIED]. UI path on PostgreSQL [NOT VERIFIED]. |
| Assign route | `RouteWiseOrderList.tsx` | `POST /orders/route-wise/assign` | orders gain employee, vehicle, loading number | except/pass at line 1829 | Connected, error swallowing is a defect |
| Approve delivery | `AssignedOrderList.tsx` | `POST /orders/assigned/approve-delivery` | order quantities | — | Connected [CODE REVIEW ONLY] |
| Remaining cash | `RemainingCashList.tsx` | `POST /orders/remaining-cash/collect/{loading_number}` | order collection fields | Separate from deposit receive-remaining | Connected. Relationship to `collection_deposits` needs a business rule. |
| Collection approval | `ApprovalForCollection.tsx` | `POST /orders/collection-approval/approve-loading/{loading_number}` | order flags | Not the same function as deposit approve | Connected |
| Bank/cash deposit | `CollectionDeposits.tsx` | billing deposit endpoints | `collection_deposits`, `collection_transactions` | Approve does not check `billing.approve` | Connected [CODE REVIEW ONLY] |

**End-to-end status:** code path exists from order create through deposit. It was **not** executed on live data. Status: **implemented, not verified**.

### 9.2 Inventory receive

| Path | What it really does | Stock effect |
|---|---|---|
| `/receive/*` | `ProductReceipt` create + approve | Approve updates `StockLedger` only |
| `/warehouse/receipt` | Mock table | No stock effect |

**Missing rule:** whether a factory receipt must also create `product_item_stock_details` (batch, expiry, MRP). The near-expiry report will not see receipts that only touch the ledger.

### 9.3 Stock adjustment

`NewAdjustment` → `POST /api/stock/adjustments` → `AdjustmentRequest` approve → ledger `available_quantity` delta. The page at `/warehouse/adjustment` does not participate. There is no reject API on `stock_adjustment.py` (delete and approve only). The legacy UI shows a rejected tab with fake rows.

### 9.4 Distribution and transport

- Distribution vehicles/drivers: `/api/vehicles`, `/api/drivers`.
- Transport vehicles/drivers: `/api/transport/vehicles`, `/api/transport/drivers`.
- Both map to the same `Vehicle` and `Driver` models (transport router imports `VehicleSchema` / `DriverSchema`). Two write paths, one table. [CODE REVIEW ONLY]
- Route planning dispatch does not create a `Trip`. Trips are created under transport `POST /api/transport/trips/assign`.
- `vehicle_loadings` is not what `/orders/loading-list` reads. That page reads picking orders.

### 9.5 Reconciliation

`Reconciliation.tsx` calls create-from-assignment, verify, approve, reject, day-end status. Permissions are enforced. Whether approve posts a financial journal is **not in the code reviewed**; it updates reconciliation run status via `reconciliation_service.py`. No general-ledger table exists.

---

## 10. Authentication and Permission Assessment

| Control | Where | Backend enforced? |
|---|---|---|
| Login password check | `auth.py` + `authenticate_user` | Yes [CODE REVIEW ONLY]. Tests `test_login_success`, `test_login_failure_audit`, `test_blocked_user_cannot_login` passed on SQLite [VERIFIED]. |
| Inactive / blocked user | `require_auth` | Yes, after a valid token |
| Frontend route guard | `MainLayout` | No. Hiding a route does not protect the API. |
| Any logged-in user | `PROTECTED` | Can call companies, products, stock adjustment approve, billing approve, transport delete, order delete |
| Permission checks | `require_permission` on audit, reports, reconciliation, promotions, refunds, devices, `orders.validate` (one route), order status transition | Yes for those handlers only |
| Role `user` | `permissions.py` lines 66–68 | orders read/write, inventory read, billing read, reports read. They still pass `require_auth` on stock **writes**. |
| Depot scope | `backend/app/core/depot_scope.py` | Applied on some lists (orders, vehicles, shipping points, invoices, dashboard). Not audited on every POST. Test `test_non_admin_orders_list_scoped` passed [VERIFIED] on SQLite. |
| JWT logout | `POST /api/auth/logout` | Does not store a denylist. Stolen token works until expiry (`ACCESS_TOKEN_EXPIRE_MINUTES` default 60). |
| `REQUIRE_AUTH=false` | `deps.py` lines 51–56 | Bypasses login and uses the first active employee. Default is true. Compose file sets `SECRET_KEY` to the development default. This audit does not repeat secret values. |
| Privilege gap | Billing approve, stock approve, employee create | A `user` who can obtain any valid token can call those URLs. That is a missing check, not a theoretical exploit chain. |

Frontend does not consistently call `GET /api/auth/permissions` to hide buttons. `authPermissions` is defined in `api.ts` line 564. Menu visibility is not a security boundary.

---

## 11. Reporting and Export Assessment

### 11.1 Reports with real queries

From `REPORT_REGISTRY` in `backend/app/services/report_registry.py`:

| Id | Source | Notes |
|---|---|---|
| `daily_sales_by_depot` | `orders` grouped by depot, `collected_amount` | Not filtered by date in the function shown (lines 20–33) despite the name |
| `product_wise_sales` | `order_items` sum quantity | No date filter in the shown query |
| `bonus_scheme_utilization` | promotion usage | Real handler name `report_promotion_utilization` |
| `unfulfilled_order_gap` | `order_validation_runs` | Depends on validation having been run |
| `order_lifecycle` | status history | |
| `batch_wise_stock` | `product_item_stock_details` limit 1000 | **Not** `stock_ledger` |
| `near_expiry_alert` | details with expiry ≤ 90 days | Dashboard widget does not call it |
| `zero_discrepancy_day_end` | `reconciliation_runs` variance 0 | |
| Plus a small set of handlers referenced before line 165 | audit, integration failures, sync queue | Count of `"handler": report_` assignments is **13** |

### 11.2 Placeholder report ids (52)

`_placeholder` is assigned **52** times in the registry (grep count). They include target vs achievement, chemist sales trend, FEFO violation, quarantine, in-transit, damage, stock valuation, failed delivery, delivery success, credit aging, VAT, bank acknowledgment, vehicle efficiency, temperature-sensitive, and similar titles through the compliance category (file lines 167–216 and following). Each returns empty rows and `data_ready: true`.

HTTP surface is still only:

- `GET /api/reports/registry`
- `GET /api/reports/{report_id}`
- export route in `reports.py` (CSV, permission `reports.export`)

### 11.3 Other exports

| Feature | Mechanism | Status |
|---|---|---|
| Collection reports page | `GET /api/billing/reports/all` | Real deposit/transaction aggregation [CODE REVIEW ONLY]. Not the placeholder registry. |
| MIS | `GET /api/orders/mis-report` | Real order query |
| Receive report | `GET /api/product-receipts/{id}/report` | Returns the receipt schema, not a PDF |
| Transport PDF | `GET /api/transport/reports/pdf` | Implemented; frontend downloads a blob |
| Picking print | page `PickingOrderPrint.tsx` | Uses picking report API |
| Route-wise print | `POST /api/orders/route-wise/print` | Implemented in `orders.py` |
| Invoice PDF | `invoice_report.py`, `GET /api/invoices/{id}/download` | No UI route |

Collection report **print** in the browser was not separately verified.

---

## 12. Backend Quality and Reliability Issues

### CRITICAL

1. **Stock quantity can be wrong depending on which screen and which column is read.** Receipt approval and adjustment approval write `stock_ledger`. Batch/expiry reports read `product_item_stock_details`. Dashboard sums `quantity` while adjustments change `available_quantity`. Evidence: `product_receipts.py` ~154–192, `stock_adjustment.py` 122–142, `dashboard.py` line 32, `report_registry.py` `report_batch_stock`.
2. **Warehouse receipt UI does not post stock.** Operators can believe a receipt was recorded. Evidence: `StockReceipt.tsx` uses `mockData`; `stock_receipt.py` has no POST.

### HIGH

3. **Legacy adjustment submit reports success and stores nothing.** `StockAdjustment.tsx` `handleSubmit`.
4. **Export and sample/gift lists are fabricated.** Forms that do save go to a different API, so the list will not show them.
5. **Any authenticated role can approve deposits and stock adjustments.** `billing.py` approve handler has no `require_permission("billing.approve")`. `stock_adjustment.py` approve has no `inventory.write` check. `PROTECTED` is only `require_auth`.
6. **Shipping Points settings page mutates routes.** `ShippingPoints.tsx` uses `apiEndpoints.routes`.
7. **Two vehicle and two driver APIs write one pair of tables.** Distribution and transport screens can overwrite each other’s records.
8. **Order assign/status paths swallow exceptions** (`orders.py` `pass` in `except`). A partial assign can look successful.
9. **Schema drift risk.** `create_all` on startup plus loose SQL scripts, one Alembic revision. Column changes will not deploy reliably.

### MEDIUM

10. Unhandled exceptions return `str(exc)` to clients (`main.py` 99–110).
11. JWT logout is not revocable.
12. `REQUIRE_AUTH=false` bypass exists.
13. Report placeholders set `data_ready: true`.
14. `daily_sales_by_depot` does not apply the date query params the HTTP layer accepts.
15. Integration endpoints look operational and return sandbox empty results (`INTEGRATION_SANDBOX` default true).
16. Global list endpoints use `skip/limit` but many order sub-resources return full lists. Pagination is inconsistent.
17. Duplicate order-validation entry points (`orders.py` vs `validation.py`).
18. Employee/role_master FK cycle (pytest warning).

### LOW

19. Pydantic v1 `@validator` deprecation warnings during pytest (schemas.py).
20. Nginx `/health` is not the API health check.
21. `api/docs` is not exposed through the `/api` proxy as `/api/docs` (FastAPI default `/docs` is outside the prefix). Confirmed earlier: `/api/docs` returned 404. [VERIFIED]
22. Materials, invoices, promotions, refunds, devices, sync have no UI.
23. Redis KPI cache can show stock up to 5 minutes old.

---

## 13. Existing Test Coverage

### 13.1 What exists

| Suite | Files | Cases |
|---|---|---|
| Backend API/unit | `backend/tests/test_auth_rbac.py` | health public, unauthenticated orders 401, login, blocked user, permissions, audit permission, report registry |
| | `test_depot_scope.py` | non-admin order list scope, admin vehicles |
| | `test_validation.py` | no items fail, COD with stock, credit over limit |
| | `test_status.py` | cannot jump to delivered, validate transition |
| | `test_stock_reservation.py` | reserve, re-reserve |
| | `test_stock_issue.py` | commit reserved stock for an order |
| | `test_order_lifecycle.py` | eight steps, validated order at route-wise |
| Frontend | `src/lib/api.test.ts` | 401 redirect, 403 message |
| | `src/components/data-table/paginate.test.ts`, `DataTable.test.tsx` | table pagination only |

No Playwright/Cypress suite was found. No test hits collection deposits, product receipts, stock adjustments, transport, or the live database.

### 13.2 Commands executed in this audit

| Command | Executed | Result | Limit |
|---|---|---|---|
| `docker exec swift_distro_api python -m pytest tests -q --tb=no` | Yes | **21 passed**, 84 warnings, 10.68s | `backend/tests/conftest.py` forces `DATABASE_URL=sqlite:///:memory:` before importing the app and overrides `get_db`. It does not migrate or write `swift_distro_hub`. Warnings include Pydantic validators and the employees/role_masters FK cycle. |
| `docker exec swift_distro_frontend npm test --silent` | Yes | **3 files, 11 tests passed**, ~4s | UI component and API client only. |
| `psql` catalog query on `swift_distro_postgres` | Yes | 78 tables listed | Read-only. No row data inspected. |
| ESLint / `tsc` | **Not executed** | — | Not required to judge API coverage; avoided extra process noise. |
| Live POST/PUT/DELETE | **Not executed** | — | Would modify data. |

Passing tests do **not** mean orders, deposits, or receipts work on PostgreSQL.

---

## 14. Completion Estimates and Methodology

Denominators are the inventories in this document, not a feeling about the UI redesign.

| Area | Estimate | Denominator and method |
|---|---|---|
| Frontend UI (screens exist and render a workflow) | **~90%** | 70 routes. Missing product surfaces are promotions, refunds, invoices, devices, sync, integrations. Those were never given routes. Of the routed screens, almost all have a finished layout. Cockpit and profile are thin on purpose. |
| Frontend wired to a real API for the primary action | **~70%** | Of the 22 modules in section 4, 12 are fully wired (55%), 7 partial, 4 mock/navigation. Weighted by “primary action persists”: partials count as half. (12 + 3.5) / 22 ≈ **70%**. Masters hub and legacy adjustment are the clearest non-wiring. |
| Backend handlers with real read/write logic | **~86%** | 230 / 268 handlers. The 28 partial and the stub/sandbox handlers make up the rest. This is **code presence**, not correctness. |
| Database tables for current models | **100% of defined models exist as tables** [VERIFIED] | 78 / 78 names. This is **not** 100% domain completeness. Export shipments, POD files, and a general ledger have no tables because they were never modeled. |
| Business workflows end-to-end | **Unknown as a percentage** | Code for order → collection and for product-receipt → ledger is present. It was not run on live data. Treat verified workflow completion as **Unknown**. |
| Authn | **High, ~80% of a normal JWT login** | Login, block, inactive, frontend guard, tests. Gaps: no revocation, dev bypass flag, default secret in compose. |
| Authz | **~30% of sensitive writes** | Permission helper exists. It is applied to platform modules (audit, reports, reconciliation, promotions, refunds, devices) and almost none of the inventory and billing mutations. Roughly 6 of ~20 mutating domains. |
| Reporting | **~20% of registered report ids** | 13 real handlers / (13 + 52) ≈ **20%**. Collection and MIS reports outside the registry are additional and do work. |
| Automated test coverage of workflows | **Low** | 21 backend tests, concentrated on auth, validation, reservation, status. 11 frontend tests, none of them pages. |
| Production readiness | **Not ready** | Inventory dual-write, mock warehouse receipt, authorization gaps, `create_all` deploys, sandbox integrations, placeholder reports that claim `data_ready`. |

Do not quote a single overall percentage. A blended number would hide the difference between “screen exists” and “stock balance is correct”.

---

## 15. Missing Features and APIs

| ID | Gap |
|---|---|
| M1 | `POST/PUT/DELETE /api/stock/receipts` and line items, plus ledger and batch-detail updates in one transaction |
| M2 | `POST /api/stock/issuances` that consumes reserved or available quantity |
| M3 | Wire or remove mock pages: `StockReceipt.tsx`, `StockAdjustment.tsx`, `Masters.tsx`, export list/detail, sample/gift list/detail, `RoutePlanning` dispatch |
| M4 | Export and sample/gift persistence (columns for port, container, recipient, gift type) **or** an explicit decision that they are `delivery_orders` with a type enum |
| M5 | `DELETE /api/vehicles` if the vehicles page offers delete |
| M6 | Shipping-point create/update/delete **or** stop calling the routes API from that screen |
| M7 | Single stock balance writer used by receipt, adjustment, issue, transfer, and both report widgets |
| M8 | `require_permission` on deposit approve/reject, stock approve, employee admin, price changes |
| M9 | 52 report handlers that currently return empty rows |
| M10 | Dashboard chart/expiry APIs |
| M11 | Invoice UI or removal of dead invoice client code |
| M12 | Promotions, refunds, devices, sync, integrations UI — only if the business still wants those modules. Backend skeletons exist (E). |
| M13 | Real integration adapters (Oracle, field force, RMC, HR). Currently sandbox. |
| M14 | Alembic revisions that match the live schema so `create_all` is not the deploy mechanism |
| M15 | Pagination and date filters on sales reports |
| M16 | File/POD upload if digital POD gallery is in scope (report id exists only as a placeholder; no storage) |

---

## 16. Prioritized Development Backlog

Complexity: S ≤ 2 days, M ≤ a week, L multi-sprint, for one developer who already knows this repo. Estimates are judgment, not measurements.

### P0 — Critical blockers

| ID | Title | Current | Missing | Deps | Files | Models | Acceptance | Size |
|---|---|---|---|---|---|---|---|---|
| P0-01 | One stock balance contract | Ledger and item-stock diverge | A written rule and one function that applies qty deltas to every balance column the UI and reports read | None. Do this before new receipt features. | `stock_adjustment.py`, `product_receipts.py`, `dashboard.py`, `report_registry.py`, `stock_reservation_service.py` | `stock_ledger`, `product_item_stock`, `product_item_stock_details` | Approve receipt, approve adjustment, and near-expiry report show the same batch qty | L |
| P0-02 | Warehouse receipt must persist | Mock table | POST receipt + lines, call the P0-01 writer, list real rows on `StockReceipt.tsx` | P0-01 | `src/pages/StockReceipt.tsx`, `src/lib/mockData`, `stock_receipt.py` or `product_receipts.py` | `stock_receipts` or `product_receipts` | Saving a line increases on-hand and the table reloads from GET | L |
| P0-03 | Stop false adjustment success | Toast-only form | Either remove `/warehouse/adjustment` submit or post to `stockAdjustments.create` | P0-01 | `StockAdjustment.tsx`, `NewAdjustment.tsx` | `stock_adjustments` | Submit creates a row visible on Adjustment Request | S |
| P0-04 | Authorize sensitive posts | Auth-only | `billing.approve`, `inventory.write`, `admin.users` on the matching handlers | None | `billing.py`, `stock_adjustment.py`, `employees.py`, `deps.py` | — | Role `user` receives 403 on deposit approve and stock approve | M |

### P1 — Core business

| ID | Title | Current | Missing | Size |
|---|---|---|---|---|
| P1-01 | Issuance that reduces stock | Page reads pending deliveries; API lists `stock_issuances` | Confirm action writes an issuance and calls P0-01 | L |
| P1-02 | Export and sample/gift truth | Mock lists; generic delivery create | Type column or new tables; list/detail GET; stop hardcoded arrays | L |
| P1-03 | Shipping point vs route | Settings page writes routes | Fix the client to the intended resource; add shipping-point writes if the form fields are shipping points | M |
| P1-04 | Route dispatch persistence | Toast | Load `/api/routes`; create a trip or document that dispatch is transport’s job and link the button | M |
| P1-05 | Deposit vs order collection | Two approve paths (`orders.py` and `billing.py`) | Document and, if required, link remaining-cash collection to a deposit transaction | M |
| P1-06 | Depot transfer stock move | Transfer status API exists | Verify from-depot decrease and to-depot increase use P0-01; add it if missing | M |
| P1-07 | Remove silent `except: pass` in order assign | Failures ignored | Log and return 4xx/5xx | S |
| P1-08 | Replace masterData silent fallbacks | Fake customers on API failure | Show error state | S |

### P2 — Important

| ID | Title | Size |
|---|---|---|
| P2-01 | Dashboard charts and expiry from SQL | M |
| P2-02 | Date filters on sales reports; stop `data_ready: true` on empty placeholders | M |
| P2-03 | Vehicle DELETE and a single vehicle/driver API used by both menus | M |
| P2-04 | Alembic baseline equal to the live 78 tables; stop relying on `create_all` for prod | L |
| P2-05 | Invoice page or delete unused invoice UI calls | M |
| P2-06 | Pagination on order and ledger lists | M |
| P2-07 | Audit menu hidden unless `audit.read` | S |
| P2-08 | JWT denylist or accept stateless logout and say so in the UI | S |

### P3 — Optional

| ID | Title | Size |
|---|---|---|
| P3-01 | Promotions UI on existing `/api/promotions` | L |
| P3-02 | Refunds UI | M |
| P3-03 | Real Oracle/HR/field-force adapters | L |
| P3-04 | Device and sync admin pages | M |
| P3-05 | The 52 analytics reports, only after source transactions exist | L |
| P3-06 | POD file storage | L |

---

## 17. Recommended Backend Development Roadmap

### Phase 1 — Stock contract

- **Objective:** One balance definition used by receipts, adjustments, issues, transfers, dashboard, and batch reports.
- **Prerequisites:** None.
- **API / DB:** Shared apply-delta function; backfill script plan (do not run it until reviewed). No new table required if both current tables stay, but both must be written.
- **Frontend:** None yet, except stop showing fallback stock.
- **Verification:** SQLite tests for receipt approve, adjustment approve, and issue; then a read-only SQL check on a copy of data, not on production, comparing ledger and item-stock for one batch.
- **Done when:** The three operations above change the same quantities the reports read.

### Phase 2 — Close false UIs

- **Objective:** No success toast without a persisted row.
- **Prerequisites:** Phase 1.
- **Work:** P0-02, P0-03, P1-08, export/sample lists either wired or clearly disabled.
- **Done when:** Those pages’ primary buttons call the API and render the response, including the error state.

### Phase 3 — Authorization

- **Objective:** Sensitive mutations check permissions, not only a token.
- **Prerequisites:** Can run parallel with Phase 1.
- **Work:** P0-04, menu gating.
- **Done when:** `test_auth_rbac` covers deposit approve and stock approve for role `user`.

### Phase 4 — Order, cash, and deposit consistency

- **Objective:** Remaining cash, collection approval, and deposits use one amount definition.
- **Prerequisites:** Business answers in section 19.
- **Work:** P1-05, P1-07.
- **Done when:** A fixture order can be assigned, delivered, collected, and deposited in a test, and the sums match.

### Phase 5 — Distribution documents

- **Objective:** Issuance, depot transfer quantities, loading, and route dispatch match the tables their screens imply.
- **Work:** P1-01, P1-04, P1-06, vehicle API unification.
- **Done when:** Each screen’s GET returns the row its POST just created.

### Phase 6 — Export and sample/gift

- **Objective:** Replace mock arrays.
- **Prerequisites:** Decision on whether these are delivery orders.
- **Done when:** List, detail, and form share one id space.

### Phase 7 — Reporting

- **Objective:** Dashboard widgets and collection/inventory reports read SQL. Placeholder ids either gain queries or leave the registry.
- **Done when:** `data_ready: true` is only returned with a real query, and the dashboard chart numbers match a SQL group-by.

### Phase 8 — Schema deploy and regression tests

- **Objective:** Alembic is the schema source. Pytest covers the P0 flows against PostgreSQL in CI, still not against the developer’s live volume.
- **Done when:** A new environment reaches the 78-table shape from migrations alone, and the new tests pass.

Do not rebuild order CRUD, settings CRUD, transport CRUD, billing deposit CRUD, or product-receipt CRUD. They already exist. Extend them where the stock contract or permissions are missing.

---

## 18. Dependencies and Technical Risks

| Risk | Why it matters |
|---|---|
| Dual stock tables | Every later inventory feature will be wrong until Phase 1 is decided |
| `create_all` on startup | A model edit in dev can change a shared database the next time the API reloads. The backend container bind-mounts `./backend` and runs `--reload`. |
| Default `SECRET_KEY` in `docker-compose.yml` | Tokens can be forged if that value is still the one in the compose file. Not repeated here. |
| Two order-validation implementations | Fixes to one will not affect the screen that calls the other |
| Placeholder `data_ready: true` | Report Center will show empty success |
| Sandbox integrations | A caller can believe Oracle was updated |
| FK cycle employees ↔ role_masters | SQLite tests cannot drop schema cleanly; Postgres may still work |
| No denylist | Logout is cosmetic for stolen tokens |
| Redis cache | KPI stale for 5 minutes after a receipt |
| Collection logic split across `orders.py` and `billing.py` | Double counting or missed cash if both are used for the same loading |

---

## 19. Questions Requiring Business Clarification

1. Is on-hand stock `stock_ledger.quantity`, `stock_ledger.available_quantity`, or `product_item_stock_details.available_quantity`?
2. Should `/warehouse/receipt` be the same document as `/receive/factory` (`product_receipts`), or a different document (`stock_receipts`)?
3. Does delivery approval itself reduce stock, or only a separate issuance?
4. Does “remaining cash” on an order have to create a `collection_deposit`, or are those independent?
5. Are export and sample/gift real shipment types with their own fields, or should those menus be removed until modeled?
6. Are distribution vehicles and transport vehicles the same fleet?
7. Which roles may approve a deposit, a stock adjustment, and a reconciliation? The code’s role names (`admin`, `manager`, `billing`, `finance`, `transport`, `user`) may not match Renata job titles (`role_masters`).
8. Are the 52 empty report titles in scope for this release?
9. Are Oracle, field-force, RMC, and HR in scope, or should those endpoints stay disabled?
10. Should `Masters` (`/masters`) remain, given `/settings/*` already edits the same entities?

---

## 20. Final Recommendations

1. Do not add new modules yet. Lock the stock contract (P0-01) and make the warehouse receipt and legacy adjustment screens tell the truth (P0-02, P0-03).
2. Add permission checks on deposit and stock approval before any wider UAT (P0-04).
3. Keep the existing order, settings, billing, transport, receive, and reconciliation implementations. They are the working core. [CODE REVIEW ONLY]
4. Treat Report Center as a catalog with 13 live queries and 52 stubs until each stub is replaced.
5. Move schema changes to Alembic and remove `create_all` from the production startup path after the baseline is generated.
6. Add PostgreSQL tests for receipt approve, adjustment approve, and deposit approve. The current 21 tests do not cover them.
7. The first implementation task, after this report is accepted, is **P0-01 then P0-02**: define the stock writer, then connect `src/pages/StockReceipt.tsx` to a real create/list API that uses that writer. P0-03 is the same size of change and can follow in the same pull request if the stock writer exists.

---

## Appendix A — Live table list

[VERIFIED] 2026-11-19, database `swift_distro_hub`:

`audit_logs`, `chemist_shops`, `collection_deposits`, `collection_transactions`, `companies`, `customer_credit_balances`, `customers`, `day_end_closings`, `delivery_order_items`, `delivery_orders`, `depot_transfer_items`, `depot_transfers`, `depots`, `device_login_attempts`, `doctors`, `drivers`, `employees`, `external_order_refs`, `integration_failures`, `integration_job_logs`, `integration_jobs`, `integration_systems`, `invoices`, `login_audits`, `materials`, `mobile_devices`, `order_batch_allocations`, `order_items`, `order_status_history`, `order_validation_messages`, `order_validation_runs`, `orders`, `permissions`, `picking_order_deliveries`, `picking_orders`, `price_setups`, `primary_packagings`, `product_item_stock`, `product_item_stock_details`, `product_receipt_items`, `product_receipts`, `products`, `promotion_customers`, `promotion_depots`, `promotion_products`, `promotion_rules`, `promotion_usage_logs`, `promotions`, `reconciliation_lines`, `reconciliation_runs`, `reconciliation_variances`, `refund_liabilities`, `refund_settlements`, `role_masters`, `role_permissions`, `route_shipping_points`, `route_stops`, `routes`, `shipping_points`, `stock_adjustment_items`, `stock_adjustments`, `stock_issuance_items`, `stock_issuances`, `stock_ledger`, `stock_receipt_items`, `stock_receipts`, `sync_checkpoints`, `sync_conflicts`, `sync_events`, `sync_queue`, `transport_expenses`, `trips`, `uoms`, `validation_rule_configs`, `vehicle_loading_items`, `vehicle_loadings`, `vehicles`, `vendors`.

## Appendix B — What this audit did not do

- No source edits, no migrations, no seeds, no POST/PUT/DELETE to the API, no `.env` edits, no container restarts.
- No row-level data inspection, so “table exists” is not “table is populated correctly”.
- Handler bodies were sampled (orders, billing, stock, receipts, reports, auth, integrations), not line-reviewed for all 268 functions. Status “fully implemented” means the handler is not a stub. It does not mean the business result was executed.
