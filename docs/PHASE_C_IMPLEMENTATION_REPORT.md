# Phase C Implementation Report

Date: 23 November 2026  
Scope: Role checks and depot isolation on the existing FastAPI API, plus sidebar visibility from `GET /api/auth/permissions`. Phases D through G were not started. No migration, schema change, password change, or data reset was run.

The permission source of truth remains `backend/app/core/permissions.py`. The empty `role_permissions` table is unused. No new permission codes were added.

A router mounted with `PROTECTED` requires a valid JWT (`require_auth`). That is authentication only. A handler is permission-checked only when it also depends on `require_permission` or `require_role`. `require_role("manager", "transport")` still allows `admin`.

## 1. Files modified

Phase C edits:

| File | Change |
|---|---|
| `backend/app/core/depot_scope.py` | Unassigned non-admins match no rows. `assign_depot_for_write`, `hide_foreign_depot`, and `hide_transfer` reject foreign or missing depot access |
| `backend/app/routers/employees.py` | Create, update, and delete require `admin.users`. Single-record reads and deletes hide other depots. Writes cannot move a record to another depot |
| `backend/app/routers/role_masters.py` | Create, update, and delete require `admin.roles`. Reads stay available to any authenticated user |
| `backend/app/routers/stock_adjustment.py` | List requires `inventory.read`. Create requires `inventory.write` and the caller's depot |
| `backend/app/routers/stock_receipt.py` | List requires `inventory.read` |
| `backend/app/routers/stock_issuance.py` | List requires `inventory.read` |
| `backend/app/routers/stock_maintenance.py` | Ledger and product stock reads require `inventory.read`. Depot query parameters are coerced |
| `backend/app/routers/product_item_stock.py` | Reads require `inventory.read`. Writes require `inventory.write`. Single records and depot changes are scoped |
| `backend/app/routers/depot_transfers.py` | Reads require `inventory.read`. Create, approve, and receive require `inventory.write`. A non-admin must belong to the source or destination depot |
| `backend/app/routers/billing.py` | Deposit and transaction writes require `billing.write`. Reads and reports require `billing.read`. Approve and receive-remaining require `billing.approve` |
| `backend/app/routers/transport.py` | Vehicle, driver, stop, trip, expense, and backfill writes require manager, transport, or admin. Reads stay JWT-only |
| `backend/app/routers/vehicles.py` | Create and update require manager, transport, or admin, and stay inside the caller's depot |
| `backend/app/routers/drivers.py` | Create requires manager, transport, or admin |
| `backend/main.py` | Validation errors are JSON-safe when a field validator raises `ValueError`. Successful response bodies are unchanged |
| `src/lib/menuNavigation.ts` | Optional `permission` on existing items. `filterSidebarMenu` and `getCockpitSections` hide only tagged items |
| `src/hooks/usePermissions.ts` | Loads `GET /api/auth/permissions` |
| `src/components/layout/AppSidebar.tsx` | Passes those permissions into the existing sidebar |
| `src/pages/orders/DistributionCockpit.tsx` | Uses the same filtered sections |
| `backend/tests/test_rbac_phase_c.py` | Isolated SQLite authorization cases |
| `docs/PHASE_C_IMPLEMENTATION_REPORT.md` | This report |

Earlier uncommitted Phase 0, A, and B files were left in place.

## 2. Endpoint authorization matrix

`JWT` means the router dependency is the only check. Those endpoints are not treated as permission-secure.

### Authentication

| Method | Path | Guard |
|---|---|---|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/signup` | Public |
| GET | `/api/auth/me` | JWT |
| GET | `/api/auth/permissions` | JWT |
| POST | `/api/auth/refresh` | JWT |
| POST | `/api/auth/logout` | JWT |

### Employees and role masters

| Method | Path | Guard |
|---|---|---|
| GET | `/api/employees/` | JWT, list filtered by depot. Unassigned users get no rows |
| GET | `/api/employees/{id}` | JWT, 404 outside the caller's depot |
| POST | `/api/employees/` | `admin.users`. Depot is forced to the caller's depot |
| PUT | `/api/employees/{id}` | `admin.users`. Foreign record 404. Depot cannot be changed to another depot |
| DELETE | `/api/employees/{id}` | `admin.users`. Foreign record 404 |
| GET | `/api/role-masters/` and hierarchy, path, subordinates, by-employee, by-type | JWT only. Left open for hierarchy screens |
| POST, PUT, DELETE | `/api/role-masters/` | `admin.roles` |

### Inventory

| Method | Path | Guard |
|---|---|---|
| GET | `/api/stock/adjustments/` | `inventory.read`, depot filter |
| POST | `/api/stock/adjustments/` | `inventory.write`, depot write check |
| GET | `/api/stock/receipts/` | `inventory.read` |
| GET | `/api/stock/issuances/` | `inventory.read` |
| GET | `/api/stock/maintenance/` and product batch, validation, current-stock | `inventory.read`. Depot query parameter coerced |
| GET | `/api/product-item-stock/` and `/{id}`, details, product summary | `inventory.read`, depot filter or 404 |
| POST, PUT | `/api/product-item-stock/` and details | `inventory.write`, depot write check |
| POST | `/api/depot-transfers/` | `inventory.write`. Non-admin must be source or destination |
| GET | `/api/depot-transfers/` and `/{id}` | `inventory.read`. Single transfer 404 if neither depot is the caller's |
| POST | `/api/depot-transfers/{id}/approve` and `/receive` | `inventory.write`, same transfer hide |

Receipt and issuance routers expose lists only. There is no write route there to guard.

### Billing, refunds, reconciliation

| Method | Path | Guard |
|---|---|---|
| POST | `/api/billing/deposits`, `/transactions` | `billing.write` |
| PUT | `/api/billing/deposits/{id}` | `billing.write` |
| GET | deposits, transactions, both collection reports | `billing.read` |
| POST | `/api/billing/deposits/{id}/approve` and `/receive-remaining` | `billing.approve` |
| GET | `/api/refunds/liabilities`, credit balance, settlements | `billing.read` |
| POST | `/api/refunds/liabilities` | `billing.write` |
| POST | `/api/refunds/liabilities/{id}/settle` | `billing.approve` |
| Reconciliation create, verify, day-end create | `reconciliation.write` | Already present |
| Reconciliation approve, reject, day-end approve | `reconciliation.approve` | Already present |
| Reconciliation reads | `reconciliation.read` | Already present |

Deposit list filtering uses the collector's employee depot. A deposit row itself has no depot column, so a single deposit id is not depot-hidden. That gap is listed below.

### Transport

| Method | Path | Guard |
|---|---|---|
| POST, PUT, DELETE | `/api/transport/vehicles`, `/drivers` | manager, transport, or admin |
| POST, DELETE | route stops | manager, transport, or admin |
| POST | `/api/transport/trips/backfill-from-orders`, `/trips/assign` | manager, transport, or admin |
| PUT, DELETE | `/api/transport/trips/{id}` | manager, transport, or admin |
| POST, PUT, DELETE | expenses | manager, transport, or admin |
| GET | vehicles list and trips list | JWT, depot filter on the vehicle |
| GET | one vehicle, one trip, drivers, stops, distance, expenses, transport reports | JWT only |
| GET, POST, PUT | `/api/vehicles/` | List is JWT plus depot filter. Create and update are manager, transport, or admin, with depot checks |
| GET, POST | `/api/drivers/` | List is JWT. Create is manager, transport, or admin |

### Orders and warehouse workflow

These already had a specific permission and were not loosened:

| Area | Guard |
|---|---|
| POST `/api/orders/validate` | `orders.validate` |
| POST `/api/orders/{id}/validate`, `/batch-validate`, `/reject-validation` | `orders.validate` |
| POST `/api/orders/{id}/approve-exception` | `orders.approve_exception` |
| PUT `/api/orders/validation-rules/{code}` | admin or manager |
| GET validation result, pending, rules | `orders.read` |
| POST `/api/orders/{id}/transition-status` | `orders.status` |
| GET status history | `orders.read` |
| Promotions | `promotions.read`, `.write`, `.approve` as already coded |
| Reports | `reports.read`, export `reports.export` |
| Audit logs | `audit.read` |
| Devices | `devices.read`, `devices.manage` |
| Integrations | `integrations.read`, `integrations.write` |
| Sync | `sync.read`, `sync.write` |

Order list, assigned list, route-wise list, and delivery list already filter by depot for the authenticated user. Dashboard KPIs use the same order filter.

### Still JWT only

These require a token because of the router dependency. They do not check a permission code, and several single-record handlers do not apply a depot hide. They are not claimed as permission-secure:

- Companies, customers, vendors, products, materials, UOMs, primary packagings, price setups, route shipping points: full CRUD or the routes that exist
- Depots: `GET /{id}` and `POST /` (the list is depot-filtered)
- Shipping points and routes: lists are depot-filtered; there is no extra write permission
- Orders: create, update, delete, submit, route-wise print and assign, assigned status, approve-delivery, route-wise validate, remaining-cash collect, collection approval, mark partial, mark postponed, MIS report, loading report, money receipt, and `GET /{id}`
- Order deliveries except the filtered list: get, create, update, delete, advance, tracking
- Picking orders except the list: get, create, approve, report
- Product receipts except the filtered list: get, create, update, delete, approve, report
- Invoices except the filtered list: get, create, bulk generate, download
- Vehicle loadings
- Mobile assigned memos, accept, loading status, accepted memos
- Transport reads listed above

`POST /api/auth/signup` remains public.

## 3. Permissions added

No permission codes were added. Enforcement uses the existing map:

| Role | Relevant codes |
|---|---|
| admin | All 30 codes, including `admin.users` and `admin.roles` |
| manager | All operational codes. No `admin.users` or `admin.roles` |
| billing | Orders read, validate, and exception approval. Billing read, write, and approve. Reconciliation read and write. Promotions read. Reports and audit |
| finance | Orders read. Billing read and approve. Full reconciliation. Reports and audit |
| transport | Orders read, assign, print, and status. `inventory.read`. Reports read. `mobile.access` |
| user / PSO | Orders read and write. Inventory read. Billing read. Reports read |

Transport writes use `require_role("manager", "transport")` because there is no `transport.write` code. Admin passes that check. Billing, finance, and user do not.

## 4. Depot-security improvements

- Admin list and write helpers do not restrict depot.
- A non-admin with a depot can read and write only that depot. Transfers allow source or destination.
- A non-admin with `depot_id` null matches no list rows. `assign_depot_for_write` returns 403. `hide_foreign_depot` returns 404.
- Create and update of employees, stock adjustments, vehicles, and product-item stock cannot store another depot id.
- Query parameters on stock maintenance and product-item stock are coerced to the caller's depot. An unknown depot id is not echoed back as data.
- Single employee, vehicle, product-item stock, and transfer records return 404 rather than the foreign payload.

Checked in SQLite: a manager cannot adjust another depot, can adjust their own, a foreign vehicle update is 404, and an unassigned user receives an empty depot list. Checked on the running API: the depot-1 user list contains only depot 1, `GET /api/employees/4` is 404, `POST /api/stock/adjustments/` for depot 2 as that manager is 403, admin `GET /api/depots/` returns 4 depots, and the user receives 1.

## 5. Frontend permission integration

`usePermissions` reads `permissions` from `GET /api/auth/permissions`. Menu entries without a `permission` field stay visible. Tagged entries hide when the code is absent.

| Menu | Code | Who still sees it |
|---|---|---|
| Inventory, stock receive, adjustment request | `inventory.read` | admin, manager, transport, user |
| New adjustment | `inventory.write` | admin, manager |
| Sales order | `orders.write` | admin, manager, user |
| Delivery, route, assigned, remaining cash, tracking | `orders.read` or `billing.read` as tagged | roles that hold that code |
| Approval for collection | `billing.approve` | admin, manager, billing, finance |
| MIS and report center | `reports.read` | admin, manager, billing, finance, transport, user |
| Depot transfer | `inventory.read` | admin, manager, transport, user |
| Transport section | `orders.assign` | admin, manager, transport. Used because no `transport.read` code exists |
| Billing deposits and reports | `billing.read` | admin, manager, billing, finance, user |
| Reconciliation | `reconciliation.read` | admin, manager, billing, finance |
| Audit logs | `audit.read` | admin, manager, billing, finance |
| Employees | `admin.users` | admin |
| Role master | `admin.roles` | admin |

Sample and gift, export, and most master pages have no code, so they stay in the menu. Hiding a menu item does not protect the API.

Browser check on `http://127.0.0.1:9080`: Sarah Johnson (user, Dhaka) sees inventory, orders, billing, and master data, and does not see Transport, Employees, Role Master, or Approval for Collection. Admin sees Transport, Employees, Role Master, and Approval for Collection. Dashboard layout is unchanged. `npm run build` completed (`vite build`, 3381 modules).

## 6. Test results

`docker exec -w /app swift_distro_api python -m pytest tests -q --tb=line -p no:cacheprovider`

**42 passed** in 16.32s. The database is the in-memory SQLite fixture. `swift_distro_hub` was not used.

`tests/test_rbac_phase_c.py` covers:

- Unauthenticated employee create and the other guarded calls return 401
- User cannot create, update, or delete an employee
- User cannot create, update, or delete a role master
- User cannot create a stock adjustment, billing deposit, or trip assignment
- Admin can perform those writes with valid payloads
- Billing cannot assign a trip
- Transport cannot approve a deposit
- Manager cannot adjust another depot and can adjust their own
- Foreign vehicle update returns 404
- Unassigned user receives an empty depot list
- Admin adjustment list still returns rows

## 7. Existing workflow regression results

The same 42-test run includes the existing order lifecycle, stock reservation, stock issue, validation, depot-scope, auth, and status tests. All passed.

Workflows left on JWT plus the depot filters they already had, because a new permission would block a current role:

| Workflow | Decision |
|---|---|
| Route-wise assign, assigned status, approve delivery | User and PSO do not have `orders.assign`. Transport does, but PSO field assignment would start returning 403. Left as JWT |
| Order validate on `/api/orders/validate` already uses `orders.validate`. Route-wise validate does not | PSO has `orders.write` and not `orders.validate`. Left as JWT |
| Remaining cash collect, collection approval, partial and postponed collection | PSO has `billing.read` only. Approval menu is hidden. The API was not newly blocked |
| Mobile memo accept and loading status | User and PSO do not have `mobile.access`. Left as JWT |
| Picking, deliveries, receipts, invoices, vehicle loading | No matching code distinguishes warehouse operators from billing without blocking PSO or transport reads. Left as JWT |
| Master-data CRUD other than employees and role masters | No admin-only code exists for companies, products, or customers. Left as JWT |
| Transport GET reports and single trip or vehicle | Operational reads stay available to any authenticated user. Writes are role-gated |

The running API reloaded from the mounted code (`uvicorn` WatchFiles) and `/health` returned 200. Login as admin, manager, and the depot user returned 200. Admin `/api/auth/permissions` returned role `admin` and 30 codes. The user payload is `billing.read`, `inventory.read`, `orders.read`, `orders.write`, `reports.read`. Live 401 and 403 checks matched the matrix for employees, role masters, adjustments, deposits, and trip assignment. No billing or transport employee exists in this database, so those two live roles were not logged in. Their denials are covered by the SQLite tests.

## 8. Remaining unprotected endpoints

Authenticated, but not permission-checked, as listed in "Still JWT only". The highest-impact ones are:

- Public signup
- Customer, product, company, price, and packaging writes for any logged-in role
- Order create, update, delete, and the collection and assignment posts
- Invoice create and download
- Picking and delivery writes
- Product receipt create and approve
- Mobile endpoints
- Transport and vehicle single-record reads
- `GET /api/depots/{id}` and `POST /api/depots/`
- `GET /api/vehicle/loadings/`

## 9. Outstanding security gaps

- JWT on a router is not a role check. The endpoints above stay callable by any active user who knows the URL.
- Several list filters do not have a matching 404 on the single-record route, so an id can still return another depot's order, invoice, receipt, trip, or depot.
- Billing deposits are filtered through the collector employee, not a depot column on the deposit.
- Transport writes are a role list, not a permission code. A future role would need a code added deliberately.
- `require_auth` still has a development bypass when `REQUIRE_AUTH` is false. Compose keeps it true. Production rejection of that flag was added in Phase B.
- `SECRET_KEY` is still the development value because this phase must not rotate tokens.
- Three PSO accounts have a null depot. Their login password is not the seeded desk password, so the live empty-depot behavior was not exercised. The SQLite test does cover an unassigned user.
- Menu entries without a permission stay visible, including master data that the API does not restrict by role.
- Frontend hiding is not authorization.

## 10. Database preservation verification

No Alembic revision, `create_all` change, or SQL reset was run. Business row counts after the checks:

| Table | Count |
|---|---|
| employees | 6 |
| products | 14 |
| customers | 8 |
| companies | 2 |
| depots | 4 |
| stock_ledger | 88 |
| orders | 0 |
| trips | 12 |
| collection_deposits | 0 |
| stock_adjustments | 7 |

`stock_adjustments` was already 7 before these checks. One verification call initially created deposit `DEP-20261123-0001` and trip `TRP-202611-0001`. Both rows, and the two HTTP audit rows for those posts, were deleted. Counts above are after that cleanup.

`login_audits` moved from 44 to 57 and `audit_logs` from 43 to 54 because verification logins write those tables. Failed PSO logins are in `login_audits` only. Employee passwords were not changed.
