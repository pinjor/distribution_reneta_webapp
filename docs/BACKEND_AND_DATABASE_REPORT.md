# Backend and Database Report

Date: 23 November 2026  
Scope: `backend/`, the running PostgreSQL database `swift_distro_hub`, Redis, and leftover Supabase configuration.  
Source of live numbers: container `swift_distro_postgres` (PostgreSQL 16.14), queried while the Docker stack was up.

## 1. What the backend is

Swift Distribution Hub is a warehouse and distribution API for a pharmaceutical / FMCG depot operation (Renata-style product and depot data). The backend is a single FastAPI application, version 2.0.0, not a set of separate microservices.

| Layer | Implementation |
|---|---|
| HTTP API | FastAPI 0.109.0, Uvicorn, reload in Docker |
| ORM | SQLAlchemy 2.0.25, declarative `Base` in `backend/app/database.py` |
| Schemas | Pydantic models in `backend/app/schemas.py` (about 1,600 lines) |
| Database | PostgreSQL 16, database `swift_distro_hub`, user `swift_user` |
| Cache | Redis 7, database 0. Used by the dashboard KPI cache |
| Auth | Email + bcrypt password on `employees`, JWT (HS256, python-jose) |
| Migrations | Alembic revision `001_platform` exists, but it has not been applied to this database |
| Tests | `backend/tests/` covers auth/RBAC, depot scope, order lifecycle, status, stock issue, stock reservation, validation, demo inventory rules |

Entry point: `backend/main.py`.

On startup the app:

1. Refuses to boot in production if `SECRET_KEY` is still the default.
2. Connects to Redis at the hardcoded URL `redis://redis:6379/0` (the `REDIS_URL` environment variable is used only by `backend/app/redis_cache.py`).
3. Runs `Base.metadata.create_all()`, which creates missing tables and does not alter existing ones.
4. Adds `employees.is_blocked` if that column is missing.
5. Inserts any missing rows in `permissions` and default order-validation rules.

## 2. Supabase

Supabase is not part of the running backend or frontend code.

What was removed:

- No `@supabase/supabase-js` dependency in `package.json`.
- No Supabase client, import, or `createClient` call under `src/`.
- No Supabase driver or client in `backend/requirements.txt` or any Python module.
- The frontend talks to this API through `src/lib/api.ts`, which uses `VITE_API_URL` (default `http://localhost/api`) and a Bearer token stored in `localStorage` or `sessionStorage`.

What the older docs say (`PROJECT_SUMMARY.md`, `MIGRATION_COMPLETE.md`): the app used to be a Supabase project and was rewritten onto PostgreSQL + FastAPI + Redis + Docker. Those docs describe the migration as complete. They are historical. The live schema is much larger than the “15 tables” figure in `MIGRATION_COMPLETE.md`.

What is still left over, and unused by application code:

The root `.env` still contains three Vite variables:

- `VITE_SUPABASE_PROJECT_ID` = `xnxskpfeqniguzbxumzx`
- `VITE_SUPABASE_URL` = `https://xnxskpfeqniguzbxumzx.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = a Supabase anon JWT for that project

A search of `.py`, `.ts`, and `.tsx` sources found no reads of `VITE_SUPABASE_*`. The frontend Docker service does not receive those variables. They do not connect this stack to Supabase.

The anon key is a public client key by Supabase’s design, but it should be deleted from `.env` if that old project is no longer used. This report does not copy the token.

There is no Supabase schema, RLS policy, edge function, or storage bucket in this repository.

## 3. Runtime topology

```text
Browser
  -> Nginx  (host :8088 -> container :80 in the current Docker run)
       /            -> frontend Vite :8080
       /api/*       -> backend Uvicorn :8000
  Backend
       -> PostgreSQL 16  (host :55432 -> container :5432, db swift_distro_hub)
       -> Redis 7        (host :6380 -> container :6379, logical db 0)
```

Default Compose ports are Nginx 80, frontend 9080, Postgres 55432, Redis 6379. On this machine 80 and 6379 were already taken, so the stack was started with Nginx on 8088 and Redis published on 6380. Inside the Docker network Redis is still `redis:6379`.

`CORS_ORIGINS` in Compose is not read by the application. Allowed browser origins are hardcoded in `backend/main.py`: localhost and 127.0.0.1 on ports 80, 5173, 8080, and 3000. Port 8088 and 9080 are not in that list, so a browser on those origins can be blocked by CORS even though Nginx proxies the API.

Authentication is required on every business router (`require_auth`). Public routes are `/`, `/health`, and `/api/auth/*`. Setting `REQUIRE_AUTH=false` makes `get_current_user` return the first active employee and skip the token. That switch is for development only.

Default JWT lifetime is 60 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`). The Docker Compose secret is still `your-secret-key-change-in-production`. Startup allows that value when `ENVIRONMENT` is not production.

## 4. API surface

46 router modules are mounted from `main.py`. A static scan of those modules found 242 route handlers. Every business route is under `/api` and requires a valid employee JWT, an active account, and `is_blocked = false`.

| Prefix | Router | Role |
|---|---|---|
| `/api/auth` | `auth.py` | Login, signup, me, permissions, refresh, logout |
| `/api/companies` | `companies.py` | Company master |
| `/api/depots` | `depots.py` | Depot master |
| `/api/employees` | `employees.py` | Users / employees |
| `/api/customers` | `customers.py` | Customers, lookup by code |
| `/api/vendors` | `vendors.py` | Vendors |
| `/api/products` | `products.py` | Product master |
| `/api/materials` | `materials.py` | Materials |
| `/api/shipping-points` | `shipping_points.py` | Shipping points |
| `/api/route-shipping-points` | `route_shipping_points.py` | Route to shipping-point links |
| `/api/uoms` | `uoms.py` | Units of measure |
| `/api/primary-packagings` | `primary_packagings.py` | Primary packaging |
| `/api/price-setups` | `price_setups.py` | Prices |
| `/api/role-masters` | `role_masters.py` | Role hierarchy, path to NSH, subordinates |
| `/api/orders` | `orders.py`, `validation.py`, `status.py` | Orders, validation, status transitions, MIS, route-wise print |
| `/api/product-receipts` | `product_receipts.py` | Product receipts |
| `/api/order-deliveries` | `order_deliveries.py` | Delivery orders and tracking |
| `/api/picking-orders` | `picking_orders.py` | Picking |
| `/api/vehicles` | `vehicles.py` | Vehicle master (also duplicated under transport) |
| `/api/drivers` | `drivers.py` | Driver master (also duplicated under transport) |
| `/api/routes` | `routes.py` | Routes |
| `/api/stock/receipts` | `stock_receipt.py` | Stock receipts |
| `/api/stock/issuances` | `stock_issuance.py` | Stock issues |
| `/api/vehicle/loadings` | `vehicle_loading.py` | Vehicle loading |
| `/api/stock/adjustments` | `stock_adjustment.py` | Adjustments |
| `/api/stock/maintenance` | `stock_maintenance.py` | Ledger, FEFO batches, current stock |
| `/api/product-item-stock` | `product_item_stock.py` | Item stock and batch detail |
| `/api/dashboard` | `dashboard.py` | KPIs, Redis-cached |
| `/api/invoices` | `invoices.py` | Invoices and bulk generate |
| `/api` | `depot_transfers.py` | Depot transfers, approve, receive |
| `/api/billing` | `billing.py` | Collection deposits and transactions |
| `/api/mobile` | `mobile.py` | Assigned memos, accept memo, loading-number status |
| `/api/transport` | `transport.py` | Vehicles, drivers, stops, trips, expenses, PDF report |
| `/api/audit-logs` | `audit_logs.py` | Audit list and entity history |
| `/api/promotions` | `promotions.py` | Promotion schemes |
| `/api/reconciliation` | `reconciliation.py` | Reconciliation and day-end closing |
| `/api/integrations` | `integrations.py` | Oracle, Field Force, RMC, HR job queue |
| `/api/devices` | `devices.py` | Mobile device register, block, login attempts |
| `/api/sync` | `sync.py` | Offline push/pull, checkpoints, retry |
| `/api/refunds` | `refunds.py` | Refund liabilities and customer credit |
| `/api/reports` | `reports.py` | Report registry and CSV export |

Nginx only proxies paths that start with `/api`. `/health` and `/docs` exist on the API container port 8000 and are not exposed through Nginx. There is no `/api/health` route (it returns 404).

### Authorization model

Two layers exist, and they are not the same thing:

1. Code map in `backend/app/core/permissions.py`. `permissions_for_role()` decides what a role can do. Roles: `admin` (all 30 permissions), `manager`, `billing`, `finance`, `transport`, `user`.
2. Database tables `permissions` (30 rows, seeded at startup) and `role_permissions` (0 rows). The request path does not read `role_permissions`.

Depot scope is in `backend/app/core/depot_scope.py`. Admin bypasses depot checks. Other roles are limited to `employees.depot_id`.

`AuditWriteMiddleware` records mutating requests into `audit_logs`.

### Domain services

| Service | Responsibility |
|---|---|
| `order_lifecycle_service.py` | Order state changes |
| `order_validation_service.py` | Rule execution and default rule seed |
| `stock_reservation_service.py` | Batch reservation |
| `stock_movement_service.py` | Ledger movements |
| `promotion_service.py` | Promotion application |
| `reconciliation_service.py` | Cash / stock reconciliation |
| `refund_service.py` | Refund liability and credit balance |
| `status_service.py` | Status transition rules |
| `sync_service.py` | Device sync queue |
| `device_service.py` | Device registration and blocking |
| `integration_service.py` | External system job queue |
| `audit_service.py` | Audit writes |
| `report_registry.py` | Report catalogue |

External integrations are sandbox adapters only. `INTEGRATION_SANDBOX` defaults to true. Adapters exist for `ORACLE_ERP`, `FIELD_FORCE`, `RMC`, `HR_EMPRESS`, and `POWERBI`. A sandbox call returns status `SANDBOX` and does not contact an outside system. Jobs, logs, and failures are stored in `integration_jobs`, `integration_job_logs`, and `integration_failures`. Those tables are empty in the current database.

## 5. Database

| Fact | Value |
|---|---|
| Engine | PostgreSQL 16.14 (Alpine) |
| Database | `swift_distro_hub` |
| User | `swift_user` |
| Tables | 80 in `public` |
| Foreign keys | 145 |
| Indexes | 235 |
| Alembic version table | absent |

Schema ownership is split across three mechanisms:

1. SQLAlchemy models, applied by `create_all` on every API start. This is what actually shapes a fresh volume.
2. `backend/db/init.sql`, an older and smaller script (companies, depots, employees, and early masters). It is commented out of `docker-compose.yml`, so Postgres does not run it on init.
3. Hand-written SQL under `backend/db/migrations/` plus one Alembic revision (`001_platform`) that replays `001_platform_hardening.sql`. `alembic_version` does not exist, so that revision has not been stamped or run on this database.

`create_all` will not add columns to tables that already exist, drop unused tables, or apply the check constraints that live only in SQL files. The live database therefore contains objects the current Python models do not declare.

### 5.1 Tables declared in Python

Core masters and operations are in `backend/app/models.py`. Platform, audit, validation, promotions, finance close, devices, and sync are in `backend/app/models_platform.py`.

| Table | Model | Domain |
|---|---|---|
| `companies` | Company | Master |
| `depots` | Depot | Master |
| `employees` | Employee | Users, passwords, role, depot |
| `customers` | Customer | Sold-to / ship-to, credit |
| `vendors` | Vendor | Master |
| `products` | Product | 32 columns, pharma product master |
| `uoms` | UOM | Units |
| `primary_packagings` | PrimaryPackaging | Packaging |
| `price_setups` | PriceSetup | Pricing |
| `role_masters` | RoleMaster | Org hierarchy |
| `materials` | Material | Materials |
| `shipping_points` | ShippingPoint | Shipping |
| `vehicles` | Vehicle | Fleet |
| `drivers` | Driver | Fleet |
| `routes` | Route | Distribution routes |
| `route_stops` | RouteStop | Stop sequence |
| `route_shipping_points` | RouteShippingPoint | Route links |
| `trips` | Trip | Transport execution |
| `transport_expenses` | TransportExpense | Trip cost |
| `stock_ledger` | StockLedger | Quantity by product, depot, batch |
| `product_item_stock` | ProductItemStock | Stock header |
| `product_item_stock_details` | ProductItemStockDetail | Batch detail |
| `stock_receipts`, `stock_receipt_items` | StockReceipt | Inbound |
| `stock_issuances`, `stock_issuance_items` | StockIssuance | Outbound |
| `stock_adjustments`, `stock_adjustment_items` | StockAdjustment | Corrections |
| `orders`, `order_items` | Order | Sales memos. Order has 49 columns |
| `product_receipts`, `product_receipt_items` | ProductReceipt | Goods receipt |
| `delivery_orders`, `delivery_order_items` | OrderDelivery | Delivery |
| `picking_orders`, `picking_order_deliveries` | PickingOrder | Picking |
| `vehicle_loadings`, `vehicle_loading_items` | VehicleLoading | Loading |
| `invoices` | Invoice | Billing documents |
| `depot_transfers`, `depot_transfer_items` | DepotTransfer | Inter-depot |
| `collection_deposits`, `collection_transactions` | CollectionDeposit | Cash collection |
| `audit_logs` | AuditLog | 22-column audit |
| `permissions`, `role_permissions` | Permission | RBAC catalogue |
| `login_audits` | LoginAudit | Login history |
| `validation_rule_configs` | ValidationRuleConfig | Rule on/off and JSON config |
| `order_validation_runs`, `order_validation_messages` | OrderValidationRun | Validation results |
| `order_batch_allocations` | OrderBatchAllocation | FEFO allocation |
| `order_status_history` | OrderStatusHistory | Status trail |
| `promotions`, `promotion_rules`, `promotion_products`, `promotion_depots`, `promotion_customers`, `promotion_usage_logs` | Promotion | Schemes |
| `reconciliation_runs`, `reconciliation_lines`, `reconciliation_variances` | ReconciliationRun | Day reconciliation |
| `day_end_closings` | DayEndClosing | Day end |
| `refund_liabilities`, `refund_settlements`, `customer_credit_balances` | RefundLiability | Returns money |
| `integration_systems`, `integration_jobs`, `integration_job_logs`, `integration_failures` | IntegrationJob | External jobs |
| `mobile_devices`, `device_login_attempts` | MobileDevice | Device control |
| `sync_checkpoints`, `sync_events`, `sync_queue`, `sync_conflicts` | SyncEvent | Offline sync |
| `external_order_refs` | ExternalOrderRef | Ids from outside systems |

Order status values declared on the model are only `Draft`, `Submitted`, `Approved`, and `Partially Approved`. Later lifecycle states are handled in services and history tables rather than by extending this enum.

Customer priority values are `High`, `Medium`, and `Low`.

### 5.2 Tables in PostgreSQL with no current SQLAlchemy model

These four tables are real, empty, and indexed. `create_all` will not drop them. Current routers do not query them. Frontend pages still exist for doctors and chemist shops (`src/pages/settings/Doctor.tsx`, delivery sample/gift screens), so the UI concept survived after the models were removed.

| Table | Columns of note | Relations |
|---|---|---|
| `doctors` | name, code (unique), specialization, registration_number, qualification, contact | none |
| `chemist_shops` | name, code (unique), owner_name, license_number, contact | none |
| `delivery_allocation_outcomes` | reserved / delivered / undelivered quantities with check constraints that they stay non-negative and sum to reserved | FKs to orders, order items, allocations, products, depots, employees |
| `return_verifications` | verification number, expected vs received quantity, status | FK to `delivery_allocation_outcomes` and the same business parents |

`delivery_allocation_outcomes` and `return_verifications` look like a stock-custody design (what was reserved, what was delivered, what must come back, and a verified return). The current reservation service writes `order_batch_allocations` and `stock_ledger` instead.

### 5.3 Live row counts

Counted with `SELECT COUNT(*)` on 23 November 2026. `pg_stat` estimates were stale and are not used here.

Master and fleet data is present. The order-to-cash path is empty: no orders, order lines, deliveries, receipts, issuances, invoices, deposits, or promotions.

| Table | Rows | Notes |
|---|---:|---|
| companies | 2 | RENATA Limited (`RENATA`); Swift Distribution Pvt Ltd (`SWIFT-DISTRO-001`) |
| depots | 4 | Dhaka Depot `DHK`, Kushtia `120`, Khulna `107`, Dhaka Central `115` |
| employees | 6 | See logins below |
| customers | 8 | Pharmacies / clinics, including Hospital Dispensary Satkania, SUFIA PHARMACY, Dhaka Medical Pharmacy |
| products | 14 | Mix of Renata-style codes (`M01000676` Betahistine, `190000132` IZOVAC vaccine) and generic demo SKUs |
| routes | 5 | Dhaka North Loop, Chattogram Coastal, Rajshahi West, Khulna South, Sylhet Hill Route |
| vehicles | 8 | `VH-0001`–`VH-0008`. Six Active, two Inactive (`VH-0003`, `VH-0008`) |
| drivers | 7 | |
| trips | 12 | |
| transport_expenses | 22 | |
| product_item_stock | 40 | |
| product_item_stock_details | 88 | |
| stock_ledger | 88 | 22 batch rows per depot |
| stock_adjustments | 7 | |
| stock_adjustment_items | 14 | |
| permissions | 30 | Seeded from code |
| validation_rule_configs | 11 | See rules below |
| audit_logs | 41 | |
| login_audits | 42 | |
| orders and order_items | 0 | |
| invoices, deliveries, picking, loadings, receipts, issuances | 0 | |
| billing, promotions, reconciliation, refunds, sync, devices, integrations | 0 | |
| doctors, chemist_shops, delivery_allocation_outcomes, return_verifications | 0 | Orphan tables |
| role_masters, role_permissions, uoms, vendors, materials, shipping_points, price_setups | 0 | |

Stock on hand in `stock_ledger`:

| Depot | Batch rows | Quantity |
|---|---:|---:|
| 1 Dhaka Depot | 22 | 13,000.00 |
| 2 Kushtia Depot | 22 | 13,000.00 |
| 3 Khulna Depot | 22 | 12,997.00 |
| 4 Dhaka Central Depot | 22 | 13,000.00 |

Depot 3 is 3 units below the others, consistent with the adjustment documents already stored.

### 5.4 Validation rules currently stored

| Rule | Severity | Enabled |
|---|---|---|
| CUSTOMER_ACTIVE | ERROR | yes |
| PRODUCT_ACTIVE | ERROR | yes |
| CREDIT_LIMIT | ERROR | yes |
| CREDIT_PERIOD | ERROR | yes |
| STOCK_AVAILABLE | ERROR | yes |
| FEFO_ALLOCATION | ERROR | yes |
| PRICE_AVAILABLE | ERROR | yes |
| OVERDUE_CUSTOMER | ERROR | yes |
| DISCOUNT_VALID | WARNING | no |
| PROMOTION_APPLY | WARNING | no |
| HIGH_VALUE | WARNING | no |

Rule parameters sit in `config_json` (JSONB). There are no validation runs because there are no orders.

### 5.5 Logins present in this database

Passwords are bcrypt hashes on `employees.hashed_password`. The seed script `backend/db/seed_test_users.py` sets the shared demo password `admin123` for these accounts and for any employee that has no password yet.

| Employee id | Email | Role | Depot |
|---|---|---|---|
| EMP-001 | admin@swiftdistro.com | admin | 1 |
| EMP-002 | john.smith@swiftdistro.com | manager | 1 |
| EMP-003 | sarah.johnson@swiftdistro.com | user | 1 |
| PSO-001 | rahim.uddin@swiftdistro.com | user | none |
| PSO-002 | karim.ahmed@swiftdistro.com | user | none |
| PSO-003 | farhana.akter@swiftdistro.com | user | none |

PSO accounts have no `depot_id`, so depot-scoped checks that require a depot will not treat them as members of Dhaka Depot.

### 5.6 How data gets into the database

| Script | What it loads |
|---|---|
| `seed_master_data.py` | Companies, depots, customers, products, and related masters |
| `seed_settings_master.py` | Settings masters |
| `seed_test_users.py` | The six logins above |
| `seed_product_stock_data.py` | Item stock, batch detail, ledger |
| `seed_vehicles.py` | Fleet |
| `seed_drivers.py` | Drivers |
| `seed_simple_routes.py` / `seed_route_demo_data.py` | Routes |
| `seed_transport_data.py` | Trips and expenses |
| `seed_demo_environment.py` | Full demo, but only against a database whose name contains `demo` |
| `seed_consistent_workflows.py`, `seed_complete_orders.py`, `seed_delivery_orders.py`, `seed_collection_*.py`, `seed_postponed_orders.py`, `seed_depot_transfers.py` | Orders, deliveries, collections, transfers |

`seed_demo_environment.py` refuses to touch `swift_distro_hub`. It requires `DEMO_DATABASE_URL` and `DEMO_DATABASE_CONFIRM` to name a database containing `demo`. The data now in `swift_distro_hub` came from the individual seed scripts (or an earlier run), not from that guarded demo entrypoint. Transactional seeds were not applied: orders and everything downstream are empty.

`validate_demo_inventory.py` checks demo inventory rules after a demo seed.

## 6. Redis

Redis is healthy and used narrowly.

- Dashboard KPIs (`backend/app/routers/dashboard.py`) read and write through `cache_get` / `cache_set` in `backend/app/redis_cache.py`.
- Compose starts Redis with AOF persistence (`appendonly yes`) on volume `redis_data`.
- The process-wide client opened in `main.py` uses a fixed Docker hostname. A backend started on the host, outside Compose, still gets the cache client from `REDIS_URL` or `redis://localhost:6379/0` inside `redis_cache.py`, but the lifespan client would try `redis` and then set itself to `None` on failure. Cache helpers do not use that lifespan client.

No session store, queue, or rate limit uses Redis. Sync and integration queues are PostgreSQL tables.

## 7. Gaps that matter

1. Supabase is gone from code and still present as three unused variables in `.env`.
2. Schema changes depend on `create_all` plus ad hoc SQL. Alembic has not been applied to this database, so the revision history and the live schema can drift. Four tables have no model.
3. `role_permissions` is empty. Enforcement uses the Python role map, so editing role rows in the database does not change access.
4. CORS and the lifespan Redis URL ignore the environment variables Compose sets.
5. The order pipeline tables are empty, so dashboard order KPIs, invoices, deliveries, billing, and reconciliation have nothing to show until an order seed or real entry is run.
6. Integrations cannot reach Oracle, Field Force, RMC, HR, or Power BI until sandbox mode is turned off and credentials exist. No credential store is populated.
7. The published demo password and the default JWT secret are fine for a local demo and are not production settings.

## 8. File map

| Path | Purpose |
|---|---|
| `backend/main.py` | App, CORS, router mount, startup schema and seeds |
| `backend/app/database.py` | Engine and session. URL from `DATABASE_URL` |
| `backend/app/core/config.py` | Environment, secret, auth flag, sandbox flag |
| `backend/app/auth.py` | bcrypt and JWT |
| `backend/app/core/deps.py` | Current user, role, permission, depot dependencies |
| `backend/app/core/permissions.py` | The 30 permission codes and role grants |
| `backend/app/models.py` | Operational schema |
| `backend/app/models_platform.py` | Audit, validation, finance, sync, integrations |
| `backend/app/schemas.py` | Request and response models |
| `backend/app/routers/` | HTTP routes |
| `backend/app/services/` | Business rules |
| `backend/db/init.sql` | Legacy bootstrap SQL, not mounted |
| `backend/db/migrations/` | Incremental SQL and one-off data scripts |
| `backend/alembic/` | Single baseline revision, not applied here |
| `backend/db/seed_*.py` | Demo and master loaders |
| `src/lib/api.ts` | Frontend HTTP client. No Supabase |
| `.env` | Unused Supabase Vite variables only |
