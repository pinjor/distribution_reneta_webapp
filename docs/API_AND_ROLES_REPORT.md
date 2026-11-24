# API and Roles Report

Date: 23 November 2026  
Sources: `backend/app/routers`, `backend/main.py`, `backend/app/core/permissions.py`, `src/lib/api.ts`, `src/lib/menuNavigation.ts`, and the screens those menus open.

The backend exposes **242 route handlers** across **44 mounted routers**. The web client in `src/lib/api.ts` already calls most of them. What is still missing is a smaller set of screens that run on mock data or browser memory, plus write operations that were never added to routers that only list data.

Every business route requires a logged-in, active, unblocked employee. Fine-grained permission checks exist only on the platform routers listed in section 3. Master-data and warehouse routes do not check `admin` / `manager` / `user`. Any logged-in role can call them.

## 1. Two different role systems

They are not connected.

### 1.1 Login role (`employees.role`)

This string is what the JWT and `permissions_for_role()` use. Seeded accounts today are only `admin`, `manager`, and `user`. The code also understands `billing`, `finance`, and `transport`, but no employee with those roles is in the database, and the login screen only offers Admin, Manager, and PSO/User.

The sidebar does not hide menus by role. A PSO sees the same pages as an admin. The API, not the menu, is what blocks some actions.

| Permission | admin | manager | billing | finance | transport | user |
|---|---|---|---|---|---|---|
| orders.read | yes | yes | yes | yes | yes | yes |
| orders.write | yes | yes | yes | | | yes |
| orders.validate | yes | yes | yes | | | |
| orders.approve_exception | yes | yes | yes | | | |
| orders.assign | yes | yes | | | yes | |
| orders.print | yes | yes | | | yes | |
| orders.status | yes | yes | | | yes | |
| inventory.read | yes | yes | | | yes | yes |
| inventory.write | yes | yes | | | | |
| billing.read | yes | yes | yes | yes | | yes |
| billing.write | yes | yes | yes | | | |
| billing.approve | yes | yes | yes | yes | | |
| reconciliation.read | yes | yes | yes | yes | | |
| reconciliation.write | yes | yes | yes | yes | | |
| reconciliation.approve | yes | yes | yes | yes | | |
| promotions.read | yes | yes | yes | | | |
| promotions.write | yes | yes | | | | |
| promotions.approve | yes | yes | | | | |
| reports.read | yes | yes | yes | yes | yes | yes |
| reports.export | yes | yes | yes | yes | | |
| audit.read | yes | yes | yes | yes | | |
| integrations.read / write | yes | yes | | | | |
| devices.read / manage | yes | yes | | | | |
| sync.read / write | yes | yes | | | | |
| mobile.access | yes | yes | | | yes | |
| admin.users / admin.roles | yes | | | | | |

`admin` is also allowed through every `require_role(...)` check even when not listed.

What each login role is for:

| Role | Intended job | What the API actually enforces |
|---|---|---|
| admin | Full system, users, and settings | All 30 permissions. Only role that passes `admin.users` and `admin.roles`. Those two codes are not attached to any route yet. |
| manager | Depot operations, billing, reports | Same as admin except user/role administration. Can approve reconciliation, promotions, and validation exceptions. |
| billing | Cash collection and deposit approval | Orders (read, validate, exception approval), billing, reconciliation except final approve, promotions read, reports, audit. Cannot change order status, assign vehicles, or open integrations. |
| finance | Day-end money control | Read orders, read and approve billing, full reconciliation, reports, audit. Cannot create orders or deposits. |
| transport | Fleet and delivery assignment | Read orders, assign, print, change status, read inventory, read reports, mobile. Cannot validate orders, take payment, or see audit. |
| user | Field PSO | Read and create orders, read inventory, read billing, read reports. Cannot validate, assign, approve deposits, or open audit, devices, sync, or integrations. |

Depot scope is separate from these permissions. Admin sees every depot. Other roles are filtered to `employees.depot_id` on depot, route, order, and stock queries that call `apply_depot_id_filter`. The three PSO logins have `depot_id` empty, so depot-scoped lists can come back empty for them.

### 1.2 Sales hierarchy (`role_masters.role_type`)

This is the field-force tree, not the login role.

| Code | Meaning | Place in the tree |
|---|---|---|
| NSH | National Sales Head | Top. `parent_id` is empty |
| TSM | Territory Sales Manager | Under NSH |
| RSM | Regional Sales Manager | Under TSM |
| DSM | District Sales Manager | Under RSM |
| SM | Sales Manager | Under DSM |
| SO | Sales Officer | Under SM |

The API for this tree is already built: list, get, create, update, delete, hierarchy, path to NSH, subordinates, by employee, by type. The `role_masters` table has **0 rows**, and these codes are never read during login. Assigning someone as RSM does not change what their JWT can do.

`role_permissions` also has 0 rows. Changing it in the database does not change access. Access comes only from the Python table in section 1.1.

## 2. APIs that are already created

Status words used below:

- **Done** — router exists and the web client calls it.
- **API only** — router exists; the web app does not call it (mobile, or an action with no button).
- **Partial** — some methods exist; the screen or the missing methods still need work.
- **Not built** — no router. The screen uses mock data or component state.

### 2.1 Done

| Area | Base path | What exists |
|---|---|---|
| Auth | `/api/auth` | `POST /login`, `POST /signup`, `GET /me`, `GET /permissions`, `POST /refresh`, `POST /logout` |
| Dashboard | `/api/dashboard` | `GET /kpis` (Redis cache) |
| Companies | `/api/companies` | List, get, create, update, delete |
| Employees | `/api/employees` | List, get, create, update, delete |
| Products | `/api/products` | List, get, create, update, delete |
| UOM | `/api/uoms` | Full CRUD |
| Primary packaging | `/api/primary-packagings` | Full CRUD |
| Price setup | `/api/price-setups` | Full CRUD |
| Role master | `/api/role-masters` | Full CRUD plus hierarchy, path-to-NSH, subordinates, by employee, by type |
| Route shipping points | `/api/route-shipping-points` | Full CRUD |
| Orders | `/api/orders` | List, get, create, update, delete, submit, route-wise list/print/assign/validate, assigned list, barcode assign, delivery approval, collection approval, remaining cash, MIS report |
| Order validation | `/api/orders` | Validate one, batch validate, result, pending list, approve exception, reject, list rules, update rule |
| Order status | `/api/orders` | Transition, history, status config |
| Product receipts | `/api/product-receipts` | List, get, create, update, delete, approve, report. Factory, depot, and return screens post here with a source type |
| Deliveries | `/api/order-deliveries` | List, get, create, create-from-order, update, delete, advance status, tracking |
| Picking | `/api/picking-orders` | List, get, create, approve, report |
| Invoices | `/api/invoices` | List, get, create, bulk generate, download |
| Depot transfer | `/api/depot-transfers` | List, get, create, approve, receive |
| Billing | `/api/billing` | Deposits CRUD-ish (no delete), approve, receive remaining, transactions, collection reports |
| Product item stock | `/api/product-item-stock` | List, get, create, update, batch details, product summary |
| Stock maintenance | `/api/stock/maintenance` | Ledger, FEFO batches, current stock, batch validation |
| Transport | `/api/transport` | Vehicles, drivers, and expenses CRUD; route stops and distance; trips assign/update/delete; backfill from orders; vehicle, driver, and PDF reports |
| Audit | `/api/audit-logs` | List, by entity. Requires `audit.read` |
| Promotions | `/api/promotions` | List, create, submit, approve, reject, utilization |
| Reconciliation | `/api/reconciliation` | Pending, get, create from assignment, verify, approve, reject, day-end create/approve/status |
| Devices | `/api/devices` | Register, verify, list, block, unblock, login attempts |
| Sync | `/api/sync` | Push, pull, status, failures, retry |
| Reports | `/api/reports` | Registry, run, CSV export |
| Integrations | `/api/integrations` | Oracle inventory pull, Oracle revenue push, Field Force import, RMC sales push, HR employee sync, job list, retry, failures. All adapters are sandbox stubs |

### 2.2 API only (built, not used by the website)

| Method and path | Why it is unused on the web |
|---|---|
| `GET /api/mobile/assigned-memos` | Field app |
| `POST /api/mobile/accept-memo` | Field app |
| `GET /api/mobile/my-accepted-memos` | Field app |
| `GET /api/mobile/loading-number/{loading_number}/status` | Field app |
| `POST /api/sync/push`, `GET /api/sync/pull` | Offline device sync. The web client only reads status and retries failures |
| `POST /api/devices/register`, `POST /api/devices/verify` | Device handshake. The web client only lists, blocks, and reads attempts |
| `POST /api/integrations/oracle/inventory/pull` | No screen calls the trigger. The web client only lists jobs and retries |
| `POST /api/integrations/oracle/revenue/push` | Same |
| `POST /api/integrations/field-force/orders/import` | Same |
| `POST /api/integrations/rmc/sales/push` | Same |
| `POST /api/integrations/hr/employees/sync` | Same |
| `GET /api/refunds/liabilities` | No refund screen and no client method |
| `POST /api/refunds/liabilities` | Same |
| `POST /api/refunds/liabilities/{id}/settle` | Same |
| `GET /api/refunds/settlements` | Same |
| `GET /api/refunds/customers/{customer_id}/credit-balance` | Same |
| `GET /api/materials` | No materials screen |
| `GET /api/customers/code/{code}` | Lookup helper, not wired in the client |
| `GET /api/orders/loading-report/{id}` | No client method |
| `GET /api/orders/money-receipt/{id}` | No client method |
| `GET /api/orders/{id}/status-history` | No client method |
| `GET /api/orders/status/config` | No client method |
| `GET /api/orders/validation-pending` | No client method |
| `POST /api/orders/{id}/transition-status` | No client method |
| `POST /api/orders/{id}/reject-validation` | No client method |
| `PUT /api/orders/validation-rules/{rule_code}` | No client method |
| `POST /api/order-deliveries/{id}/advance` | No client method |
| `POST /api/promotions/{id}/reject` | No client method |
| `POST /api/reconciliation/day-end-closing/create` | No client method |
| `POST /api/reconciliation/day-end-closing/{id}/approve` | No client method |
| `GET /api/stock/maintenance/products/validation` | No client method |

These do not need to be rewritten. The website needs buttons, or a mobile client, that call them.

## 3. Where permission checks actually run

Only these routers call `require_permission` or `require_role`. Everything else only checks that the token belongs to an active employee.

| Router | Gate |
|---|---|
| `validation.py` | `orders.validate`, `orders.read`, `orders.approve_exception`, and `require_role("admin", "manager")` on rule update |
| `orders.py` | `orders.validate` on one validate route |
| `status.py` | `orders.status`, `orders.read` |
| `audit_logs.py` | `audit.read` |
| `promotions.py` | `promotions.read`, `promotions.write`, `promotions.approve` |
| `reconciliation.py` | `reconciliation.read`, `reconciliation.write`, `reconciliation.approve` |
| `refunds.py` | `billing.read`, `billing.write`, `billing.approve` |
| `reports.py` | `reports.read`, `reports.export` |
| `integrations.py` | `integrations.read`, `integrations.write` |
| `devices.py` | `devices.read`, `devices.manage` |
| `sync.py` | `sync.read`, `sync.write` |

So a `user` token is rejected from audit, promotions, reconciliation, integrations, devices, and sync, and from order validation and status change. The same token is accepted for company, employee, product, stock, billing deposit, and transport writes, because those routers never ask for a permission.

`admin.users` and `admin.roles` are defined and granted only to admin. No route uses them. Employee and role-master edits are open to every logged-in role.

## 4. APIs that still need to be done

### 4.1 Not built — screens are fake

| Screen | What the UI does today | API to add |
|---|---|---|
| Doctor (`/settings/doctor`) | Rows live in React state. Sample doctors are hardcoded | `GET/POST/PUT/DELETE /api/doctors`. Table `doctors` already exists and is empty. No model and no router |
| Chemist shop (`/settings/chemist-shop`) | Same, local state | `GET/POST/PUT/DELETE /api/chemist-shops`. Table `chemist_shops` already exists and is empty |
| Sample / gift delivery (`/delivery/sample-gift`) | `SampleGiftDeliveryList` comments that production should call `getSampleGiftDeliveries()` and then loads six fake rows. Detail page is mock | Delivery type, list, create, update, dispatch, deliver. Needs a recipient that points at doctor or chemist shop. No table for this document type |
| Export delivery (`/delivery/export`) | Same pattern, fake export rows. Detail page is mock | Export shipment list, create, customs/port fields, status changes. No table |
| Legacy stock receipt page (`src/pages/StockReceipt.tsx`) | Renders `recentReceipts` from `src/lib/mockData.ts` | Either retire the page or point it at `GET /api/stock/receipts` or `/api/product-receipts` |

### 4.2 Partial — a list or create exists, the rest of the screen does not

| Area | Already created | Still to build |
|---|---|---|
| Depots | `GET /api/depots`, `GET /api/depots/{id}`, `POST /api/depots` | `PUT` and `DELETE`. The client has no update or delete either |
| Customers | Full CRUD on the API, including `PUT` and `DELETE` | Settings-style page is not the gap. `PUT` and `DELETE` are not in `src/lib/api.ts` |
| Vendors | `GET /api/vendors`, `POST /api/vendors` | `PUT` and `DELETE`. The Vendors page does not call the API at all; it keeps rows in component state |
| Companies | Full CRUD on the API and in `api.ts` | The Company settings page does not call it. It keeps rows in component state. Wiring, not a new route |
| Shipping points | `GET /api/shipping-points` only | `POST`, `PUT`, `DELETE`. The settings page stores depot/route pairs in `localStorage` under `depotMasterData` |
| Routes | `GET /api/routes` only. Stops and distance are under `/api/transport/routes/{id}/stops` | Create, update, and delete a route. The client can only list routes |
| Drivers (distribution master) | `GET/POST /api/drivers`. Full CRUD also exists at `/api/transport/drivers` | Update and delete on `/api/drivers`, or point the distribution screen only at the transport routes |
| Vehicles (distribution master) | `GET/POST/PUT /api/vehicles`. Full CRUD also at `/api/transport/vehicles` | `DELETE /api/vehicles` |
| Materials | `GET /api/materials` | Create, update, delete, and a screen. No menu item uses this |
| Stock receipts | `GET /api/stock/receipts` | Create and get-one. Factory/depot/return receiving already uses product receipts, so this router is the unused twin |
| Stock issuances | `GET /api/stock/issuances` | Create, get, update. No screen posts an issuance |
| Vehicle loading | `GET /api/vehicle/loadings` | Create and complete a loading. Assignment today goes through orders and trips |
| Stock adjustments | `GET /api/stock/adjustments`, `POST /api/stock/adjustments` | `GET /api/stock/adjustments/{id}` is called by `api.ts` and does not exist. No update or approve |
| Refunds | Full liability and settlement API | Web client methods and a screen |
| Day-end closing | Create, approve, and status exist | Client methods for create and approve. The reconciliation page only reads status |
| Integration config | Job list and sandbox triggers | Real adapter credentials, endpoint settings, and a non-sandbox result. There is no config API |
| Role grants | Permission rows are seeded | An API to edit `role_permissions`, and routes that actually read that table. Until then, role changes in the database do nothing |

### 4.3 Do not rebuild

Auth, orders, validation, product receipts, picking, invoices, depot transfers, billing deposits, item stock, transport trips and expenses, audit, promotions, reconciliation runs, devices, sync status, and the report registry are already on the server. Mobile memo accept is already on the server. New work there is screens and permission checks, not new URLs.

## 5. Role-by-role: what each person can call today

Assuming `REQUIRE_AUTH=true`.

**Admin** (`admin@swiftdistro.com`). Every route, including rule updates that require admin or manager. Should be the only role that can change employees and role masters once `admin.users` and `admin.roles` are enforced. Today those codes are unused, so this is policy, not behavior.

**Manager** (`john.smith@swiftdistro.com`). Same operational routes as admin. Can validate orders, approve exceptions, change status, approve promotions and reconciliation, and run integrations. Cannot be distinguished from admin on company, depot, or employee routes.

**Billing** (no seeded user). Can validate and approve order exceptions, create and approve deposits, write reconciliation but not approve day-end, read promotions, read and export reports, read audit. `POST /api/integrations/*` returns 403. `POST /api/orders/{id}/transition-status` returns 403. Creating a product or employee still succeeds.

**Finance** (no seeded user). Can read orders, approve billing, and fully run reconciliation including approve. Cannot create orders, write billing deposits, or touch promotions. Warehouse writes still succeed.

**Transport** (no seeded user). Can read orders, assign, print, and change status, and can use mobile memo routes if the client sends `mobile.access` (the mobile routes themselves do not check that permission; only the code map lists it). Cannot validate or approve money. Trip and vehicle routes do not check the transport role, so every other role can also call them.

**User / PSO** (`sarah.johnson@swiftdistro.com`, plus the three PSO emails). Can read and create orders and read stock, billing, and reports. Validation, status change, audit, promotions, reconciliation, devices, sync, and integrations return 403 where those checks exist. Collection and remaining-cash order routes do not check a billing permission, so a PSO token can still post them.

## 6. Suggested build order

1. Doctor and chemist-shop CRUD on the tables that already exist, then point the two settings pages at them.
2. Sample/gift and export delivery resources, then replace the mock lists.
3. Finish partial masters: depot update/delete, vendor update/delete, shipping-point create/update/delete, route create/update/delete, stock-adjustment get-by-id.
4. Wire Company, Vendors, and Shipping Points pages to the APIs that already exist so they stop saving only in the browser.
5. Put `require_permission` on employee, role-master, stock, billing, and transport writes so the six login roles match the table in section 1.1.
6. Add a refund screen and day-end buttons for the routes that already exist.
7. Leave Oracle, Field Force, RMC, and HR as sandbox until real credentials exist. Do not add a second integration API.
