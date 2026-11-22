# Full Backend Analysis Report

Branch inspected: `new-version`.
Runtime inspected: Docker Compose project on this machine.
Database connected by the running API: `swift_distro_hub` on container `swift_distro_postgres` (host port `55432`).
No `swift_distro_demo` database exists. This audit did not write to `swift_distro_hub`.

The root `.env` file only contains Vite Supabase variables. The FastAPI app does not use them. Database selection is `DATABASE_URL` in `backend/app/database.py` and `backend/app/core/config.py`, defaulting to `postgresql://swift_user:swift_password@localhost:55432/swift_distro_hub`. The Compose backend service overrides that to `swift_distro_hub` on the Docker network. Authentication is the existing JWT flow in `backend/app/auth.py` with `require_auth` and permission checks. Supabase was not added.

## Architecture

| Layer | Location | Notes |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query | `src/App.tsx`, `src/lib/api.ts` |
| API | FastAPI | `backend/main.py` mounts routers under `/api` |
| ORM | SQLAlchemy models | `backend/app/models.py`, `backend/app/models_platform.py` |
| Schemas | Pydantic | `backend/app/schemas.py` |
| Services | Validation, reservation, audit, reconciliation, promotions, sync, devices | `backend/app/services/` |
| Reports | Registry of SQL queries | `backend/app/services/report_registry.py` |
| Migrations | Alembic revision `001_platform` runs `backend/db/migrations/001_platform_hardening.sql` | This is an additive hardening script, not a full schema bootstrap. `Base.metadata.create_all()` is not a safe substitute. |

Protected routers use the existing auth dependency. Public auth routes stay under `/api/auth`.

## API map

Prefixes from `backend/main.py`:

| Prefix | Router |
| --- | --- |
| `/api/auth` | login, current user, permissions |
| `/api/companies` `/api/depots` `/api/employees` `/api/customers` `/api/vendors` `/api/products` | master data |
| `/api/materials` `/api/shipping-points` `/api/route-shipping-points` `/api/uoms` `/api/primary-packagings` `/api/price-setups` `/api/role-masters` | settings masters |
| `/api/orders` | orders, route validation, assignment, delivery approval, collection approval, remaining cash |
| `/api/orders` | `validation.py`, `status.py` (same prefix, different routers) |
| `/api/product-receipts` | factory, depot, and return receipts, including approve |
| `/api/order-deliveries` | delivery documents |
| `/api/picking-orders` | picking / loading requests |
| `/api/vehicles` `/api/drivers` `/api/routes` | distribution master |
| `/api/stock/receipts` `/api/stock/issuances` `/api/stock/adjustments` `/api/stock/maintenance` | warehouse documents and batch stock |
| `/api/vehicle/loadings` | vehicle loading documents |
| `/api/product-item-stock` | item stock maintenance |
| `/api/dashboard` | KPI counts |
| `/api/invoices` | invoices |
| `/api/depot-transfers` | depot transfer create, approve, receive |
| `/api/billing` | collection deposits and reports |
| `/api/mobile` | mobile collection/acceptance |
| `/api/transport` | trips, expenses, transport reports |
| `/api/audit-logs` | audit trail |
| `/api/promotions` `/api/reconciliation` `/api/integrations` `/api/devices` `/api/sync` `/api/refunds` `/api/reports` | platform modules |

## Inventory model

Two stock stores exist and are not updated by the same code paths.

| Store | Written by | Read by |
| --- | --- | --- |
| `product_item_stock` and `product_item_stock_details` | opening stock seed, order reservation, depot transfer approve/receive | order batch check, stock maintenance, batch reports, depot transfers |
| `stock_ledger` | product receipt approval, and previously a one-time copy from batch details | dashboard total stock |

Required balance, enforced by the new demo checks:

`product_item_stock_details.quantity = available_quantity + reserved_quantity`

`quantity` is on-hand. Reservation moves units from available to reserved and does not change on-hand.

### What the code actually does

- `StockReservationService.reserve_allocations` decreases `available_quantity` and increases `reserved_quantity` on `product_item_stock_details`. It does not touch `stock_ledger`.
- `StockReservationService.commit_for_order` marks allocations `ISSUED` and decreases `reserved_quantity` without decreasing `quantity`. That breaks `on_hand = available + reserved` and it runs from the "Out for Delivery" assignment update, which is loading time, not delivery approval.
- `POST /api/orders/assigned/approve-delivery` updates collection status and amounts only. It does not deduct `product_item_stock_details` or `stock_ledger`.
- `POST /api/product-receipts/{id}/approve` calls `post_to_stock_ledger`. It does not update `product_item_stock`.
- `POST /api/stock/adjustments` stores the document. No approve route posts the quantity into either stock store.
- `POST /api/depot-transfers/{id}/approve` and `/receive` move `product_item_stock` only. In-transit stock leaves the source immediately. Receive adds it at the destination. `stock_ledger` is unchanged. The transfer reducer checks batch `quantity`, not `available_quantity`, so a transfer can consume units that are reserved.
- Postponed and partial collection statuses do not release reservations. There is also no automatic return-to-available path in `approve_delivery`. Unverified returns are safe only because that path does not touch stock at all.

The demo seed follows the stated business rule (physical deduction only for the delivered quantity, postponed and unverified remainder stays reserved) even where the live approve endpoint does not post stock. It does not call `commit_for_order`.

## Workflows that are implemented

- JWT login, role field on `employees`, permission and depot scoping helpers.
- Order create, route-wise validate flag, assignment, loading number, collection approval, remaining-cash collect.
- Batch reservation during the platform validation service (`stock_reservation_service.py`). The older route-wise validate endpoint only flips `orders.validated`.
- Product receipt draft and approve, with ledger posting on approve.
- Depot transfer pending, in transit, received, with item-stock movement.
- Picking orders, vehicle loading documents, stock issuance list (list endpoint only).
- Billing deposits with an `approved` boolean. There is no rejected status column.
- Transport trips and expenses.
- Report registry queries over orders, batches, collections, audit, promotions, and sync failures.
- Reconciliation run/approve and day-end approve endpoints.

## Gaps and integrity risks

1. Dual stock stores drift. Dashboard total stock can disagree with stock maintenance.
2. Delivery approval does not deduct physical stock. A delivered order in the live API can still show full on-hand.
3. `commit_for_order` issues reservations without reducing on-hand, so the balance equation fails if that endpoint is used.
4. Route-wise validate does not reserve stock. Older `seed_complete_orders.py` marks orders validated with no `order_batch_allocations` row.
5. `seed_demo_modules.py` inserts approved receipts and approved adjustments without posting item stock, then copies batch rows into an empty ledger. That is a snapshot, not a receipt posting.
6. `seed_depot_transfers.py` inserts `RECEIVED` and `IN_TRANSIT` rows directly. Those rows do not move stock.
7. `seed_product_stock_data.py` used to overwrite `available_quantity` with the canonical batch quantity on every rerun. It now skips a header that already has reservations, issues, or adjustment-outs, and it skips a batch that already has reserved quantity. It still resets untouched opening batches. The demo orchestrator does not call it once opening stock exists.
8. Alembic `001_platform` does not create the base schema. A new database needs a schema-only dump (or the historical SQL used to build `swift_distro_hub`) before seed.
9. Sample gift and export delivery list pages do not call an API. Forms post into generic order deliveries, which is a different document.
10. Chemist and doctor screens keep rows in component state. Tables `chemist_shops` and `doctors` exist and are empty. Seeding those tables would not change the pages.
11. `src/pages/Masters.tsx` and `src/pages/StockReceipt.tsx` render hardcoded or `mockData` rows. Stock receipt still loads products from the API.
12. Dashboard `StockChart` and `ExpiryAlerts` use fixed arrays. KPI cards and the order pipeline use `/api/dashboard/kpis`. `DispatchChart` is fed from those KPIs. Near-expiry for the report center is a real query (`report_near_expiry`); the dashboard widget is not.
13. Collection deposits cannot represent a real rejected status. The demo seed stores a rejected example as `approved = false` with notes beginning `REJECTED`.
14. Platform tables for sync, devices, integrations, refunds, and day-end closing have no demo transactions. Empty tables are not reported as working features.
15. `orders.customer_id` is a string, not a foreign key to `customers.id`. The seed writes the customer primary key as text. The database will not reject a bad customer id.
16. Running `python -m db.seed_all_data` against any database still uses the older scripts that bypass posting. The consistent path is `python -m db.seed_demo_environment`.

## Hub contents at audit time (read-only counts)

| Table | Rows |
| --- | ---: |
| companies | 2 |
| depots | 4 |
| employees | 6 |
| customers | 8 |
| products | 14 |
| product_item_stock | 40 |
| product_item_stock_details | 88 |
| stock_ledger | 88 |
| vehicles | 8 |
| drivers | 7 |
| routes | 5 |
| trips | 12 |
| stock_adjustments | 7 |
| audit_logs | 40 |
| orders | 0 |
| product_receipts | 0 |
| collection_deposits | 0 |

Order, receipt, delivery, deposit, and transfer pages on the running app have no operational documents. Stock maintenance can show the 88 batch rows. Those hub rows were not modified.

## Recommendations

- Post delivery deduction, receipt approval, adjustment approval, and depot transfer through one function that updates batch details and the ledger together.
- Stop calling `commit_for_order` at loading. Issue stock only for the delivered quantity at delivery approval. Leave postponed and unverified return quantity reserved.
- Make route-wise validation call `StockReservationService.reserve_allocations`.
- Point demo work at `swift_distro_demo` only. Keep `seed_all_data` off that database.
- Replace dashboard stock and expiry widgets with the report queries that already exist.
- Either wire chemist and doctor pages to their tables or remove the unused tables from the mental model of the UI.
