# Backend Modernization Plan

Date: 23 November 2026  
Status: analysis complete. No application code, schema, or data has been changed for this deliverable.  
References checked against source, not copied blindly: `docs/BACKEND_AND_DATABASE_REPORT.md`, `docs/API_AND_ROLES_REPORT.md`.

This plan is the gate for later work. Do not drop tables, stamp Alembic by guessing, or rewrite working routers until the phase that names that change.

## 1. Current architecture

One FastAPI process (`backend/main.py`, title Swift Distribution Hub API, version 2.0.0) talks to PostgreSQL through SQLAlchemy 2.0.25 and optionally to Redis. The React/Vite frontend calls it with `src/lib/api.ts` (`VITE_API_URL`, Bearer token in `localStorage` or `sessionStorage`). Nginx proxies `/` to Vite and `/api` to Uvicorn.

| Piece | Where | Runtime fact |
|---|---|---|
| API | `backend/main.py`, 44 routers, 242 handlers | Auth required on every business router via `require_auth` |
| ORM | `backend/app/models.py`, `backend/app/models_platform.py` | `Base.metadata.create_all()` runs on every startup |
| Schemas | `backend/app/schemas.py` | Pydantic contracts the frontend already depends on |
| DB URL | `DATABASE_URL` in `backend/app/database.py` | Default `postgresql://swift_user:swift_password@localhost:55432/swift_distro_hub` |
| Live DB | container `swift_distro_postgres` | PostgreSQL 16.14, database `swift_distro_hub`, 80 tables, 145 foreign keys, 235 indexes. Observed 23 Nov 2026. Alembic version table absent |
| Redis | `backend/app/redis_cache.py` and lifespan in `main.py` | Dashboard KPIs only. Lifespan URL is hardcoded `redis://redis:6379/0` |
| Migrations | `backend/alembic` revision `001_platform` plus `backend/db/migrations/*.sql` | Revision replays `001_platform_hardening.sql`. It has not been applied. `init.sql` is commented out of Compose |
| Auth | `backend/app/auth.py`, `backend/app/core/deps.py` | bcrypt passwords on `employees`, JWT HS256, 60-minute access token |
| Tests | `backend/tests/` | In-memory SQLite, not the live Postgres volume |
| Docker | `docker-compose.yml` | Postgres 16, Redis 7, API, Vite, Nginx. API secret in Compose is still the default development string |

Startup also inserts missing `permissions` rows and default validation rules, and runs `ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_blocked`. That alter is additive. `create_all` creates missing tables and does not drop or rewrite existing ones.

Business services that must stay intact: order lifecycle and validation, stock reservation, stock movement / ledger, FEFO batch reads, depot transfers, picking, deliveries, invoices, billing deposits, reconciliation, transport trips, audit middleware, report registry.

## 2. Supabase dependency audit

Verified by scanning the repo, excluding `node_modules`, `dist`, and `.git`.

| Check | Result |
|---|---|
| `@supabase/supabase-js` in `package.json` / lockfile dependency name | Not present |
| `supabase` in `backend/requirements.txt` | Not present |
| `createClient`, Supabase auth, or Supabase storage in `src/` or `backend/` | No matches |
| Frontend data path | `src/lib/api.ts` only |

Remaining hits are configuration and historical prose:

| File | Action in a later phase |
|---|---|
| `.env` | Remove the three unused lines: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Project ref observed: `xnxskpfeqniguzbxumzx`, host `https://xnxskpfeqniguzbxumzx.supabase.co`. Nothing in source reads these names. Do not print the JWT into docs or commits |
| `PROJECT_SUMMARY.md`, `MIGRATION_COMPLETE.md`, `CHECKLIST.md`, `APPLICATION_RUNNING.md`, `FULL_BACKEND_ANALYSIS_REPORT.md`, `docs/SWIFT_DISTRIBUTION_HUB_CLIENT_DOCUMENTATION.md` | Keep. They describe the completed migration. This plan does not treat them as cleanup targets |
| `docs/BACKEND_AND_DATABASE_REPORT.md` | Keep. It records the leftover `.env` keys |

No Supabase package, import, or implementation file remains to delete. Phase A is limited to `.env`.

## 3. Database and migration findings

### 3.1 What created the live schema

Three writers overlap:

1. SQLAlchemy `create_all` on API startup. This is the active path.
2. `backend/db/init.sql`. Older and smaller. Not mounted.
3. SQL files in `backend/db/migrations/` and Alembic `001_platform`, which only executes `001_platform_hardening.sql`. `public.alembic_version` does not exist, so that revision was never stamped or run on this volume.

`create_all` cannot add columns to tables that already exist, and it cannot drop the four tables that have no model. Applying `001_platform` or an autogenerate revision onto this volume without a diff is unsafe. Old scripts include data deletes (`clear_all_orders.sql`, `remove_old_products.sql`). Those stay unused.

### 3.2 Schema drift (verified earlier against the running database and re-checked in models)

| Drift | Evidence | Safe response |
|---|---|---|
| Tables in Postgres with no model | `doctors`, `chemist_shops`, `delivery_allocation_outcomes`, `return_verifications` | Map the first two to new models in the Doctor/Chemist phase. Leave the outcome and return tables until a design says they are still the custody model. Do not autogenerate a drop |
| Models whose transactional tables are empty | `orders`, invoices, deliveries, receipts, issuances, promotions, refunds | Not drift. Data was not seeded. Do not invent rows during stabilization |
| `role_masters` and `role_permissions` empty | Models exist. Login does not read them | Do not drop. RBAC keeps using the Python map until a later phase decides otherwise |
| Alembic metadata would not match live DDL | Check constraints on `delivery_allocation_outcomes` and `return_verifications` exist only in the database | A blind `alembic revision --autogenerate` will propose drops and type changes. Forbidden until a reviewed diff exists |
| `alembic.ini` has a hardcoded local URL and password | `env.py` overrides it when `DATABASE_URL` is set | Later: stop committing a live password in `alembic.ini`. Do not point Alembic at a new database name by accident |

### 3.3 Alembic baseline rule

Do not run upgrade on `swift_distro_hub` in the first implementation phase.

When a baseline is established:

1. Dump schema only (`pg_dump --schema-only`) and store it outside git if it contains no data.
2. Diff `Base.metadata` against the live catalog with a script that prints, and does not execute, missing tables, extra tables, and missing columns.
3. Generate a new revision that is additive only: new tables and new nullable columns the application is about to use.
4. Stamp is allowed only after that revision is proven to be a no-op against the current catalog, or after the additive revision is applied and checked.
5. Never include `DROP TABLE`, `DROP COLUMN`, or the historical one-off SQL scripts in that revision.

`create_all` can stay for development until the baseline is trusted. After the baseline is stamped, startup should stop being the schema authority. Removing `create_all` is its own step, done only after a fresh empty database can be built with Alembic alone in a disposable database, not in `swift_distro_hub`.

## 4. API completeness matrix

Classification of screens and routers after reading `src/lib/api.ts`, `src/lib/menuNavigation.ts`, and the router modules.

| Area | Class | Backend | Frontend |
|---|---|---|---|
| Login, me, permissions, refresh, logout | Fully integrated | `/api/auth` | `apiEndpoints.auth` |
| Dashboard KPIs | Fully integrated | `GET /api/dashboard/kpis` | client calls it |
| Orders, route-wise, assigned, collection, MIS | Fully integrated | `orders.py` plus validation and status routers | client covers the main flows |
| Product receipts (factory, depot, return screens) | Fully integrated | `/api/product-receipts` | `ReceiveFormPage` posts with source type |
| Order deliveries and tracking | Fully integrated | `/api/order-deliveries` | client |
| Picking, invoices, depot transfers | Fully integrated | existing routers | client |
| Billing deposits, transactions, reports | Fully integrated | `/api/billing` | client |
| Item stock, ledger, FEFO batches | Fully integrated | product-item-stock and stock maintenance | client |
| Transport vehicles, drivers, trips, expenses, PDF | Fully integrated | `/api/transport` | client |
| UOM, packaging, prices, role master, route-shipping points | Fully integrated | full CRUD routers | client |
| Employees, products | Fully integrated | full CRUD | client. Pages that use the client are integrated. The Company page is not |
| Audit, promotions, reconciliation, devices, sync status, report registry | Fully integrated for the calls the client makes | permission-gated | client |
| Mobile memos, sync push/pull, device register, integration triggers | API only | routes exist | no web caller. Leave them |
| Refunds, day-end create/approve, loading report, money receipt, status history, validation pending, reject validation, rule update, delivery advance | API only | routes exist | no client method. Add client calls only when a screen needs them |
| Companies API | Backend complete, page not integrated | full CRUD | `src/pages/settings/Company.tsx` keeps rows in React state |
| Vendors | Partially integrated | `GET` and `POST` only | `Vendors.tsx` does not call the API. Local state |
| Depots | Partially integrated | `GET`, `GET /{id}`, `POST` | client matches that. No update or delete |
| Customers | Partially integrated | full CRUD including get-by-code | client has list and create only |
| Shipping points | localStorage as data source | `GET /api/shipping-points` only | `ShippingPoints.tsx` uses `localStorage` key `depotMasterData` |
| Routes | Partially integrated | `GET /api/routes` only | client lists them. Stops live under transport |
| Distribution vehicles | Partially integrated | `GET`, `POST`, `PUT` on `/api/vehicles` | delete is only on `/api/transport/vehicles` |
| Distribution drivers | Partially integrated | `GET`, `POST` on `/api/drivers` | full CRUD is on `/api/transport/drivers` |
| Materials | Missing from the product UI | `GET /api/materials` only | no page |
| Stock receipts router | Partially integrated | `GET /api/stock/receipts` only | `StockReceipt.tsx` renders `recentReceipts` from `src/lib/mockData.ts` |
| Stock issuances | Partially integrated | `GET` only | no create |
| Vehicle loadings | Partially integrated | `GET` only | no create |
| Stock adjustments | Partially integrated | `GET` list and `POST` | client calls `GET /api/stock/adjustments/{id}`, which does not exist |
| Doctors | Missing backend endpoints | table `doctors` only, no model, no router | `Doctor.tsx` hardcoded `useState` list |
| Chemist shops | Missing backend endpoints | table `chemist_shops` only | `ChemistShop.tsx` hardcoded `useState` list |
| Sample/gift delivery | Missing backend endpoints | no table, no router | `SampleGiftDeliveryList.tsx` mock array. Comment names a future `getSampleGiftDeliveries()` |
| Export delivery | Missing backend endpoints | no table, no router | `ExportDeliveryList.tsx` mock array |

`src/lib/mockData.ts` is still imported by the legacy stock-receipt page. Theme storage in `ThemeContext.tsx` is UI preference and stays.

## 5. Authentication and RBAC gaps

Login roles understood by `permissions_for_role()` in `backend/app/core/permissions.py`:

| Role | Gap |
|---|---|
| admin | All 30 codes. `admin.users` and `admin.roles` are granted and used by no route |
| manager | All operational codes except those two admin codes. Same as admin on unprotected routers |
| billing | Orders read/validate/exception, billing, reconciliation except the finance-only approve split is already in the map, promotions read, reports, audit. No seeded employee |
| finance | Orders read, billing read/approve, full reconciliation, reports, audit. No seeded employee |
| transport | Orders read/assign/print/status, inventory read, reports read, mobile. No seeded employee |
| user / PSO | Orders read/write, inventory read, billing read, reports read. Seeded. Depot id is null on PSO-001, PSO-002, and PSO-003, so depot filters can return empty lists |

Enforced today only in: `validation.py`, one route in `orders.py`, `status.py`, `audit_logs.py`, `promotions.py`, `reconciliation.py`, `refunds.py`, `reports.py`, `integrations.py`, `devices.py`, `sync.py`.

Not enforced, and called out by the task:

| Surface | Current gate | Required gate |
|---|---|---|
| `POST/PUT/DELETE /api/employees` | any logged-in user | `admin.users` |
| `/api/role-masters` writes and reads of the hierarchy used for administration | any logged-in user | `admin.roles` for writes. Reads can stay broader if screens need the tree |
| Stock receipt, issuance, adjustment, item-stock writes | any logged-in user | `inventory.write`. Reads stay `inventory.read` where a read permission is added |
| Billing deposit create, update, approve, receive-remaining, transactions | any logged-in user | `billing.write` or `billing.approve` to match the map |
| `/api/transport` vehicle, driver, trip, and expense writes | any logged-in user | a transport write split does not exist yet. Minimum: allow `admin`, `manager`, and `transport` on writes; keep reads for roles that already have `orders.read` or add `transport.read` only if a code is added to the map with a documented reason |
| Depot isolation | applied on some list queries (`depots`, `routes`, `shipping_points`, stock adjustments) | extend the same helper to writes that take a `depot_id`, without changing admin’s cross-depot access |

`role_permissions` is empty and unread. Do not switch enforcement to that table in the same change as route guards. The Python map remains the source of truth.

Frontend: `SIDEBAR_MENU` shows every item to every user. Later, hide items from the permissions returned by `GET /api/auth/permissions`. Hiding a menu is not authorization.

`REQUIRE_AUTH=false` bypasses login and returns the first active employee. Leave the switch, and do not enable it in Compose.

`SECRET_KEY` defaults to `your-secret-key-change-in-production`. `Settings.validate_production()` already refuses that value when `ENVIRONMENT` is `production` or `prod`. Compose does not set `ENVIRONMENT`, so the default secret still boots. Phase B sets an explicit development secret via env and fails closed if production is set without a replacement. Do not rotate the secret of a running demo without warning: existing JWTs would die.

CORS is a hardcoded list in `main.py` and ignores `CORS_ORIGINS`. The current Docker run serves the UI on port 8088, which is not in that list. Phase B reads `CORS_ORIGINS` (comma-separated) and keeps the current localhost ports as the development default, including 8088 and 9080 so the running stack does not break.

Redis: lifespan in `main.py` ignores `REDIS_URL`. `redis_cache.py` already uses it. Phase B uses one helper for both.

## 6. Frontend integration gaps

No UI redesign. Later phases only replace data sources inside existing pages.

| Priority | Page | Change |
|---|---|---|
| P1 | `settings/Doctor.tsx` | CRUD against new `/api/doctors`, backed by existing `doctors` |
| P1 | `settings/ChemistShop.tsx` | CRUD against new `/api/chemist-shops`, backed by existing `chemist_shops` |
| P1 | `delivery/SampleGiftDeliveryList.tsx` and detail | New persistent resource. Stop shipping the mock array |
| P1 | `delivery/ExportDeliveryList.tsx` and detail | New persistent resource. Stop shipping the mock array |
| P2 | Depot settings | Add update and delete on the existing depot router and client |
| P2 | `settings/Vendors.tsx` | Add update and delete, then call the existing list/create plus those methods |
| P2 | `settings/ShippingPoints.tsx` | Full CRUD on `/api/shipping-points`. Remove `depotMasterData` as the system of record |
| P2 | Routes | Create, update, delete on `/api/routes` |
| P2 | Stock adjustment detail | Add `GET /api/stock/adjustments/{id}` to match `api.ts` |
| P3 | `settings/Company.tsx` | Point the page at the existing company API. No new routes |
| P3 | `StockReceipt.tsx` | Point the table at `GET /api/stock/receipts` or retire the page if product receipts already cover it. Do not keep `mockData` as the list |
| P3 | Customers client | Add update and delete wrappers for routes that already exist |
| P3 | Menu | Filter `SIDEBAR_MENU` with `/api/auth/permissions` |

Sample/gift and export need new tables. Reuse `order_deliveries` only if a source column can represent them without changing the sales-delivery contract. Prefer new tables if mixing them would change delivery status behavior. Decide in that phase with a written reason before adding columns to `delivery_orders`.

## 7. Implementation phases

Each phase is separately verifiable. Stop if a phase fails its checks. Do not start Phase C until Phase B’s config change still boots the current stack.

### Phase A — Remove leftover Supabase configuration

- Delete the three `VITE_SUPABASE_*` lines from `.env`.
- Re-scan for `supabase` in source, package manifests, and env examples.
- Do not edit historical markdown.

Exit: application source has zero Supabase imports; `.env` has zero Supabase keys; login still works.

### Phase B — Configuration only

- CORS origins from `CORS_ORIGINS`, with the current localhost list as default, plus 8088 and 9080.
- Lifespan Redis client uses `REDIS_URL` (default `redis://redis:6379/0` inside Compose, overridable).
- Document that production must set `ENVIRONMENT=production` and a non-default `SECRET_KEY`. Do not change the demo secret in Compose until a local `.env` for the API is in place, or active sessions will break.
- No model or route edits.

Exit: API starts, `GET /health` is 200, dashboard cache still reads Redis, a browser origin on 8088 is allowed.

### Phase C — RBAC on the unprotected writes

- Add `require_permission` on employee writes, role-master writes, inventory writes, and billing writes as in section 5.
- Transport writes: `admin`, `manager`, `transport` only, using existing role checks rather than a new permission code unless tests show the map cannot express it.
- Keep response bodies of successful calls unchanged.
- Add pytest coverage: user receives 403 on employee create, stock adjustment create, and billing deposit create; admin receives 200; depot user cannot write another depot’s adjustment when `depot_id` is present.
- Menu filtering in the frontend after the API permissions are stable.

Exit: existing admin tests still pass; new 403 tests pass; order validate and stock reservation tests still pass.

### Phase D — Alembic baseline, non-destructive

- Read-only catalog diff against `swift_distro_hub`.
- Additive revision only if Phase E or F needs columns.
- Stamp only when the revision’s SQL is reviewed and contains no drops.
- Prove Alembic on a throwaway empty database, not by rebuilding the live volume.
- Leave `doctors` and `chemist_shops` in place.

Exit: `alembic_version` either still absent or stamped to a reviewed revision. Row counts for `products`, `employees`, `stock_ledger`, and `orders` match the pre-phase counts.

### Phase E — Missing masters on existing tables

- SQLAlchemy models for `doctors` and `chemist_shops` that match the live columns (do not alter those tables if the columns already match).
- Routers: list, get, create, update, delete. Same auth and depot rules as other masters. These tables have no `depot_id`; do not invent one.
- Depot `PUT` and `DELETE`. Vendor `PUT` and `DELETE`. Shipping-point `POST`, `PUT`, `DELETE`. Route `POST`, `PUT`, `DELETE`.
- `GET /api/stock/adjustments/{id}`.
- Wire Doctor, Chemist, Vendors, Company, and Shipping Points pages to these APIs. Remove `depotMasterData` writes.

Exit: create and read back one doctor and one chemist shop through the API; restart the API; the rows are still there. Delete the test rows afterward if they were only fixtures, using the API, not a table drop.

### Phase F — Sample/gift and export

- New tables and routers, or a documented reuse of deliveries that does not change sales-order behavior.
- Replace mock arrays in the two list pages and their detail pages.
- FEFO and stock ledger changes only if a gift issue must reduce stock. If it must, call the existing stock movement service. Do not write the ledger from the router.

Exit: a created gift delivery survives a restart. An order validation test and a stock reservation test still pass.

### Phase G — Regression pack

- Run the existing `backend/tests` suite.
- Add the RBAC tests from Phase C if not already added.
- Hit `/health`, `/api/auth/login`, and one protected route against the Docker API.
- Confirm Redis with a dashboard KPI call.
- Do not claim a route works without one of these runs.

## 8. Risks and rollback

| Risk | Why it matters | Rollback |
|---|---|---|
| Autogenerate or old SQL against the live volume | Can drop `doctors`, `chemist_shops`, or order columns the models no longer list the same way | Do not run it. Restore is a Postgres dump taken before Phase D, not a replay of `init.sql` |
| `create_all` after new models | Creates new tables only. Safe if models match empty existing tables | Drop only the new table created in that phase, and only if it has no real rows |
| RBAC 403s on screens the UI still shows | PSO and manager lose calls that used to succeed | Revert the dependency on that router. Menu hiding ships in the same phase so the UI matches |
| Secret or CORS change | Locks out the current browser session or the 8088 origin | Restore the previous env values. No schema impact |
| Sample/gift stock writes | Can double-count if both a new table and `stock_ledger` are updated without the reservation service | Feature flag the stock effect off until the reservation test covers it |
| SQLite tests vs Postgres | Enums and JSONB can pass in SQLite and fail in Postgres | Phase G includes one request against the Docker Postgres API |

Rollback of code is git revert of that phase. Rollback of data is not required if the rules above are kept, because no phase truncates or recreates `swift_distro_hub`.

Before Phase D, take a logical dump of `swift_distro_hub` and keep it outside the repo. That dump is the rollback for a bad migration. Do not commit the dump.

## 9. Testing strategy

Existing tests, all on SQLite memory with `REQUIRE_AUTH=true`:

| File | Covers |
|---|---|
| `test_auth_rbac.py` | Health, 401 without token, login, blocked user, permissions, audit and report registry for admin |
| `test_depot_scope.py` | Depot isolation |
| `test_order_lifecycle.py` | Order flow |
| `test_validation.py` | Validation rules |
| `test_status.py` | Status transitions |
| `test_stock_issue.py` | Issuance |
| `test_stock_reservation.py` | Reservation |
| `test_demo_inventory_rules.py` | Demo inventory rules |

Add, without replacing these:

- 403 for `user` on employee create, role-master create, stock adjustment create, billing deposit create, transport trip assign.
- 200 for `admin` on those same calls.
- 403 for `billing` on transport write and for `transport` on billing approve.
- Depot mismatch on an adjustment or transfer write.
- Doctor and chemist shop round-trip once those routes exist.
- Shipping-point create once that route exists.
- Stock adjustment get-by-id once that route exists.
- One Docker check: login as the seeded admin, `GET /api/orders`, `GET /health`. Record the status codes in the phase note.

Do not point pytest at `swift_distro_hub`. `conftest.py` forces SQLite. Keep it that way so a test run cannot wipe the demo database.

## 10. Out of scope for the first implementation pass

- Rewriting order, FEFO, reservation, invoice, reconciliation, or audit logic.
- Turning on live Oracle, Field Force, RMC, HR, or Power BI credentials.
- Filling `role_permissions` and making it authoritative.
- Seeding orders into `swift_distro_hub`.
- Visual redesign, new navigation structure, or removal of historical markdown.
- Deleting `delivery_allocation_outcomes` or `return_verifications`.

## 11. Outstanding issues to record as work proceeds

- Compose still ships the default JWT secret and does not set `ENVIRONMENT`.
- `admin.users` and `admin.roles` are unused.
- Billing, finance, and transport employees are not seeded, so those roles can be tested only by fixtures.
- PSO depot ids are null.
- `GET /api/stock/adjustments/{id}` is already called by the client and 404s.
- Company, Vendors, Doctor, Chemist Shop, Shipping Points, sample/gift, export, and the legacy stock-receipt page do not persist in PostgreSQL.
- Supabase remains only as three unused `.env` lines and as history in old markdown.
