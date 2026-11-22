# Page Data Coverage Report

Scope: routes in `src/App.tsx`. "API-backed" means the page calls `src/lib/api.ts` or `masterData`. "Mock" means the list the user sees is local data.

The running API reads `swift_distro_hub`. That database has master data and batch stock, and it has zero orders, receipts, deposits, and transfers. Seeding was not executed because `swift_distro_demo` is not configured. Nothing below is claimed as populated demo data.

## Auth and shell

| Route | Page | Data source | Demo seed |
| --- | --- | --- | --- |
| `/login` | Login | `POST /api/auth/login` | Test users from existing `seed_test_users` when the demo script runs. Not run. |
| `/signup` | Signup | auth register | No extra seed. |
| `/profile` | Profile | current user | Same login user. |
| `/` | Dashboard | `GET /api/dashboard/kpis` for cards and pipeline | KPI numbers would come from seeded orders and ledger. |
| `/` charts | `StockChart`, `ExpiryAlerts` | Hardcoded arrays in the components | Seed does not change these charts. Report center near-expiry is a separate API. |
| `/distribution/cockpit`, `/orders/distribution-cockpit` | Distribution cockpit | Static menu from `menuNavigation` | No records required. |
| `*` | Not found | none | n/a |
| `src/pages/Index.tsx` | Not mounted | Placeholder copy | n/a |
| `/masters` | Masters | Hardcoded arrays in the page | Seed does not drive this page. Settings pages do. |

## Orders and distribution

| Route | Page | API | Tables | Hub now | Seed design |
| --- | --- | --- | --- | --- | --- |
| `/orders` | Order list | `/api/orders` | `orders`, `order_items` | 0 orders | Memo `88001001` draft, plus other workflow memos |
| `/orders/new` | Order entry | customers, products, depots, orders | master + `orders` | master present, orders empty | Uses existing master rows |
| `/orders/route-wise` | Route wise orders | `/api/orders` route-wise | `orders`, `routes` | 0 | Validated memos `88001002`, `88001008` with reservations |
| `/orders/assigned` | Assigned orders | assigned orders, vehicles, employees | `orders`, `vehicles`, `employees` | 0 | Loaded memo `88001003` still reserved, not issued |
| `/orders/delivery`, `/orders/delivery/:id` | Order delivery | `/api/order-deliveries` | `delivery_orders` | 0 | `DEMO-DLV-LOAD` (Loading), `DEMO-DLV-DONE` (Delivered, stock already deducted for `88001004`) |
| `/orders/tracking` | Tracking | orders | `orders`, status history | 0 | `order_status_history` rows for the demo memos |
| `/orders/picking` | Packing board | picking / orders | `picking_orders` | 0 | `DEMO-PICK-001` draft. Not an approved pick. |
| `/orders/picking/report` | Packing report | picking report API | picking tables | 0 | One draft pick only |
| `/orders/loading-request` and `:id`, print, new | Picking orders | `/api/picking-orders` | `picking_orders`, `picking_order_deliveries` | 0 | `DEMO-PICK-001` linked to memo `88001003` |
| `/orders/loading-list`, `/warehouse/issuance/loading` | Vehicle loading | `/api/vehicle/loadings` | `vehicle_loadings`, `stock_issuances` | 0 | `DEMO-LD-001` pending, issuance `DEMO-ISS-001` pending. Pending issuance does not deduct stock. |
| `/orders/collection-approval` | Collection approval | orders collection-approval | `orders` | 0 | `88001004` Pending, `88001005` partial, `88001006` postponed. None of these release reserved stock. |
| `/orders/remaining-cash-list` | Remaining cash | remaining cash | `orders` | 0 | Same collection statuses. `88001007` is fully collected and approved. |
| `/orders/mis-report` | MIS | orders / memos | `orders`, `order_items` | 0 | Demo memos and item quantities |
| `/warehouse/issuance` | Stock issuance | deliveries, vehicles, routes | `delivery_orders`, `vehicles`, `routes` | deliveries 0; vehicles and routes exist on hub | Demo deliveries plus existing vehicle/route seeds |

## Warehouse and receive

| Route | Page | API | Tables | Coverage |
| --- | --- | --- | --- | --- |
| `/warehouse/receipt` | Stock receipt | Products from API. Recent rows from `src/lib/mockData.ts` | `products`, mock list | Products can show. The receipt table will not show database receipts. |
| `/warehouse/maintenance` | Stock maintenance | `/api/stock/maintenance` | `product_item_stock`, `product_item_stock_details` | Hub already has 88 batches. Demo script adds receipt, low, and near-expiry batches only on `swift_distro_demo`. |
| `/warehouse/adjustment`, `/new`, `/request` | Adjustments | `/api/stock/adjustments`, products, ledger | `stock_adjustments`, `stock_adjustment_items` | Hub has 7 adjustment documents and 0 orders. Demo script adds pending, rejected, and two approved rows that post quantity. Live create API still does not post. |
| `/receive/factory` `/receive/depot` `/receive/return` `/receive/list` `/receive/:form` `/receive/report/:id` | Product receipts | `/api/product-receipts` | `product_receipts`, `product_receipt_items` | Hub has 0. Demo script plans 7 receipts. Approved ones post ledger and item stock. Draft return `DEMO-REC-RET-DRAFT` does not post and does not release stock. |

## Delivery documents

| Route | Page | Data source | Coverage |
| --- | --- | --- | --- |
| `/delivery/depot`, `/new`, `/:id` | Depot transfer | `/api/depot-transfers` | Hub has 0 transfers. Demo script plans pending `DEMO-DT-PENDING`, in transit `DEMO-DT-TRANSIT`, received `DEMO-DT-RECEIVED`, using the approve and receive router functions. |
| `/delivery/sample-gift`, `/:id` | Sample gift list/detail | Inline mock array. API call is commented out. | Seed cannot make this list functional. |
| `/delivery/sample-gift/new` | Sample gift form | Posts through order-delivery create | Creates a generic delivery if the user submits. No dedicated sample-gift table was found. |
| `/delivery/export`, `/:id` | Export list/detail | Inline mock, same pattern as sample gift | Mock only. |
| `/delivery/export/new` | Export form | order-delivery create plus products | API create only. Not a separate export workflow. |

## Billing, transport, platform

| Route | Page | API | Tables | Coverage |
| --- | --- | --- | --- | --- |
| `/billing/deposits` | Collection deposits | `/api/billing` | `collection_deposits` | Hub 0. Demo plans pending, approved, and a notes-marked rejected row. |
| `/billing/deposits/remaining-cash` | Remaining cash deposit | billing + employees | deposits, employees | Same deposits. |
| `/billing/reports` | Collection reports | billing reports | deposits, `collection_transactions`, orders | One transaction tied to memo `88001007` and the approved deposit. |
| `/distribution/vehicles`, `/transport/vehicles` | Vehicles | `/api/vehicles` | `vehicles` | Existing `seed_vehicles` (8 on hub). |
| `/distribution/drivers`, `/transport/drivers` | Drivers | `/api/drivers` | `drivers` | Existing `seed_drivers` (7 on hub). |
| `/distribution/routes` | Route planning | `/api/routes` | `routes` | Existing `seed_simple_routes` (5 on hub). |
| `/transport/trips` | Trip assignment | `/api/transport` | `trips` | Hub has 12. Demo transport seed adds deterministic trip numbers when run. |
| `/transport/expenses` | Expenses | transport expenses | `transport_expenses` | Hub has expense rows (stats showed 22). |
| `/transport/reports` | Transport reports | transport report endpoints | trips, expenses, vehicles, drivers | Real queries. Charts are not hardcoded in the page; they use the report payload. |
| `/distribution/reconciliation` | Reconciliation | `/api/reconciliation` | `reconciliation_runs`, lines | Demo plans `DEMO-REC-001` pending approval. Not executed. |
| `/platform/audit-logs` | Audit logs | `/api/audit-logs` | `audit_logs` | Hub has 40. Demo adds a `DEMO_SEED` row plus reservation audit from `StockReservationService`. |
| `/platform/reports` | Report center | `/api/reports` | orders, batches, audit, promotions, sync queue | Queries are real. Sync-failure and promotion-utilization stay empty unless those tables have rows. Demo adds one promotion, not usage logs. Unfulfilled-gap report stays empty because no validation-run short-stock rows are seeded. |

## Settings

These pages call the matching `/api/*` master endpoints. They are API-backed. Hub already has companies (2), depots (4), employees (6), customers (8), and products (14). Vendors, UOM, packaging, price setup, role master, and shipping points were 0 in planner stats at audit time. `seed_settings_master` fills those when the demo script runs.

| Route | Page | Mock? |
| --- | --- | --- |
| `/settings/company` | Company | API |
| `/settings/depot` | Depot | API |
| `/settings/employees` | Employees | API |
| `/settings/customers` | Customers | API |
| `/settings/vendors` | Vendors | API |
| `/settings/products` | Products | API |
| `/settings/shipping-points` | Shipping points | API |
| `/settings/route-shipping-points` | Route shipping points | API. Demo script does not add links unless settings seed already created both sides and a later manual link is made. Not covered by the workflow seed. |
| `/settings/uom` | UOM | API |
| `/settings/primary-packaging` | Primary packaging | API |
| `/settings/price-setup` | Price setup | API |
| `/settings/role-master` | Role master | API |
| `/settings/chemist-shop` | Chemist shop | Component state only. Database table is unused by the page. |
| `/settings/doctor` | Doctor | Component state only. Database table is unused by the page. |

## Mock-only or not demonstrable from seed

- `/masters`
- Dashboard depot stock chart and expiry alert list
- `/warehouse/receipt` recent-receipt table
- `/delivery/sample-gift` and `/delivery/sample-gift/:id`
- `/delivery/export` and `/delivery/export/:id`
- `/settings/chemist-shop`
- `/settings/doctor`
- Report center reports that read empty platform tables: sync failures, promotion utilization, unfulfilled order gap, zero-discrepancy day end

Seeding `swift_distro_demo` would fill the API-backed pages listed above. It would not turn the mock pages into live pages.
