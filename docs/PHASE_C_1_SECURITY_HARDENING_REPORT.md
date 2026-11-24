# Phase C.1 Security Hardening Report

Date: 23 November 2026  
Scope: Close public signup and the remaining single-record depot gaps. No new permission codes, schema changes, migrations, or UI redesign. Phase D was not started.

The Python role map in `backend/app/core/permissions.py` is still the source of truth. A router `PROTECTED` dependency only proves the caller has a JWT. A handler is role-checked only where this report says so.

## 1. Files modified

| File | Change |
|---|---|
| `backend/app/routers/auth.py` | `POST /api/auth/signup` requires `admin.users` |
| `backend/app/core/depot_scope.py` | `stamp_depot_code`, `hide_order`, `restrict_orders`, `filter_orders` |
| `backend/app/routers/orders.py` | Single orders and loading-number batches are depot-checked. Create, update, delete, and submit require `orders.write`. Collection approval requires `billing.approve` |
| `backend/app/routers/validation.py` | Validation, exception approval, and rejection hide another depot's order |
| `backend/app/routers/status.py` | Status transition and history hide another depot's order |
| `backend/app/routers/invoices.py` | Get, download, create, and bulk generate stay inside the caller's depot |
| `backend/app/routers/product_receipts.py` | Get, report, create, update, delete, and approve stay inside the caller's depot |
| `backend/app/routers/order_deliveries.py` | Get, create, update, delete, advance, and tracking follow the parent order's depot |
| `backend/app/routers/picking_orders.py` | List, get, create, approve, and report follow the loading number's orders. An unassigned user no longer sees every picking order |
| `backend/app/routers/billing.py` | A deposit is visible only when the collector's depot matches the caller |
| `backend/app/routers/transport.py` | Vehicle and trip reads and writes use the vehicle depot |
| `backend/app/routers/depots.py` | `GET /api/depots/{id}` returns 404 outside the caller's depot |
| `backend/app/routers/vehicle_loading.py` | List requires `inventory.read` and the vehicle's depot |
| `backend/app/routers/mobile.py` | Assigned memos, accept, loading status, and accepted memos are limited to the caller's depot |
| `backend/tests/test_rbac_phase_c1.py` | Signup, depot isolation, and collection-approval cases on SQLite |
| `docs/PHASE_C_1_SECURITY_HARDENING_REPORT.md` | This report |

No frontend file changed. Menu visibility from Phase C is unchanged.

## 2. Security issues resolved

- Anonymous and non-admin callers can no longer register an employee. Login is unchanged. An administrator with `admin.users` can still call signup, and can still use `POST /api/employees/`.
- A non-admin cannot read or update an order, invoice, product receipt, depot, delivery, or trip that belongs to another depot. The response is 404.
- Moving an order or an invoice onto another depot returns 403. A product receipt create uses `assign_depot_for_write`, which returns 403 for another depot.
- Creating a deposit for a collector in another depot returns 404, and reading that deposit returns 404.
- A user cannot approve a collection. That call now requires `billing.approve`.
- Vehicle loading lists require `inventory.read`, which admin, manager, transport, and user already have. Billing and finance do not.
- Order create, update, delete, and submit require `orders.write`. Admin, manager, and user/PSO have it. Billing, finance, and transport do not. The sales-order menu already uses `orders.write`.

## 3. Endpoint permission matrix

Only the checks added or confirmed in this phase are listed. Phase C guards remain in force.

| Method | Path | Guard now |
|---|---|---|
| POST | `/api/auth/signup` | `admin.users`. Anonymous is 401 |
| POST, PUT, DELETE | `/api/orders` and `/api/orders/{id}` | `orders.write`, depot stamp or 404 |
| POST | `/api/orders/{id}/submit` | `orders.write`, depot 404 |
| GET | `/api/orders/{id}`, MIS detail, assigned status | JWT, depot 404 |
| GET | `/api/orders/mis-report` | JWT, depot filter |
| POST | print, assign, barcode assign, approve delivery, loading report, money receipt, remaining-cash collect | JWT, batch rejected if any order is outside the depot |
| POST | `/api/orders/route-wise/validate` | JWT, query limited to the caller's depot |
| POST | `/api/orders/{id}/approve-collection` and approve-loading | `billing.approve`, depot 404 |
| POST | mark partial and mark postponed | JWT, depot 404 |
| POST | `/api/orders/{id}/validate` and the other validation writes | Existing permission, plus depot 404 |
| POST | `/api/orders/{id}/transition-status` | Existing `orders.status`, plus depot 404 |
| GET, POST | `/api/invoices/` and `/{id}` and download | JWT, depot 404 or depot stamp |
| POST | `/api/invoices/generate-bulk/{id}` | JWT, challan must match the caller's orders |
| GET, POST, PUT, DELETE | `/api/product-receipts` | JWT, depot 404 or stamp. Approve is not a new permission |
| GET, POST, PUT, DELETE | `/api/order-deliveries` | JWT, parent order depot |
| GET, POST | `/api/picking-orders` and approve, report | JWT, loading number must belong to the caller's orders |
| GET, POST, PUT | `/api/billing/deposits` and approve, receive-remaining | Existing billing permission, plus collector depot |
| GET, POST, PUT, DELETE | `/api/transport/vehicles` and `/trips/{id}` | Existing role on writes. Depot is the vehicle depot |
| POST | `/api/transport/trips/assign` | Existing manager/transport/admin role. Vehicle depot must match |
| GET | `/api/depots/{id}` | JWT, 404 outside the caller's depot |
| GET | `/api/vehicle/loadings/` | `inventory.read`, vehicle depot |
| GET, POST | `/api/mobile/assigned-memos`, accept, loading status, accepted memos | JWT, order depot. `mobile.access` was not added |

## 4. Depot isolation improvements

- Orders store `depot_code`. A non-admin write is pinned to that user's depot code. A missing assignment is 403. A foreign single record is 404. A batch that contains one foreign order is rejected before any row is changed.
- Invoices and product receipts use `depot_id` / `target_depot_id`.
- Deliveries and tracking follow `order_id`.
- Picking follows `loading_no` to orders. An unassigned non-admin list is empty.
- Deposits follow the collector's `employees.depot_id`.
- Trips and transport vehicles follow `vehicles.depot_id`.
- Mobile memo lists drop other depots instead of returning them.
- Admin bypasses every one of these checks.

SQLite tests verified: foreign order, invoice, receipt, depot, deposit, and trip reads; own-record reads; admin read of a foreign order and trip; order depot move 403; invoice depot move 403; deposit create for another collector 404.

## 5. Outstanding role-policy decisions

These stayed JWT-only, with depot checks where a depot column exists. A tighter permission would block a role that still uses the screen.

| Operation | Proposed mapping when policy is set | Why it was not applied |
|---|---|---|
| Company, customer, product, price, UOM, packaging, vendor writes | New master-data permission for admin and manager | No such code exists. `admin.users` is employee management only |
| Route-wise assign, barcode assign, trip is separate | `orders.assign` | User/PSO does not have it and still opens route-wise and assigned lists |
| Route-wise validate | `orders.validate` | User/PSO does not have it |
| Memo print | `orders.print` | User/PSO does not have it |
| Assigned status and approve delivery | `orders.status` | User/PSO does not have it |
| Remaining-cash collect, mark partial, mark postponed | `billing.write` | User/PSO has `billing.read` only and the remaining-cash screen stays visible |
| Product receipt create and approve | `inventory.write` | User/PSO and transport have `inventory.read` only. Receive screens stay available to them |
| Invoice create and bulk generate | `billing.write` for finance, or `inventory.write` for the warehouse | The depot user who can open deliveries does not have `billing.write` |
| Picking approve | `inventory.write` | Same receive/picking operators do not have it |
| Mobile accept | `mobile.access` | User/PSO does not have `mobile.access`. Granting it is a role-map change, not this phase |
| `POST /api/depots/` | Admin only | No depot-administration permission exists |
| Transport driver lists, expense lists, and transport report GETs | A future `transport.read` | Reads were left available to any authenticated depot where a depot column exists. Several of these GETs still have no depot column |

## 6. Backend test results

`docker exec -w /app swift_distro_api python -m pytest tests -q --tb=line -p no:cacheprovider`

**46 passed** in 20.59s. The database is the in-memory SQLite fixture. `swift_distro_hub` was not used by pytest.

New cases in `tests/test_rbac_phase_c1.py`:

- Signup without a token is 401. A user is 403. An admin receives 200.
- A depot user gets 404 for another depot's order, invoice, receipt, and depot, and 200 for their own. Admin gets 200 for the foreign order and depot.
- Putting another `depot_code` on an order is 403. Posting an invoice for another depot is 403.
- Billing cannot create or read a deposit for a collector in another depot. Their own collector's deposit returns 200.
- Transport gets 404 for a trip whose vehicle is in another depot. Admin gets 200.
- A user gets 403 on collection approval.

Existing order lifecycle, stock reservation, stock issue, validation, and Phase C tests passed in the same run.

## 7. Frontend build results

`npm run build` completed. Vite transformed 3381 modules and wrote `dist/`. No page, menu, or layout file was edited. The signup screen still posts to `/api/auth/signup` and already shows the API error message. Anonymous use of that screen now fails with 401, which is the intended lock. Login and the administrator employee screen are unchanged.

## 8. Docker verification

The API process reloaded the mounted code. `GET /health` on port 8088 returned 200. Admin login returned 200. `GET /api/auth/permissions` returned role `admin` and 30 permissions. Anonymous signup returned 401.

An administrator signup was then called once against the running API and returned 200. That row was deleted before this report was written. See section 10.

## 9. Remaining security gaps

These were not given a new permission, or were not covered by a test, so they are not claimed as permission-secure:

- Master-data writes listed in section 5.
- Order assign, print, route-wise validate, assigned status, and delivery approval. Depot scope is in place. The role is still any authenticated user.
- Receipt approve and invoice create. Depot scope is in place. The role is still any authenticated user.
- Mobile does not require `mobile.access`.
- `POST /api/depots/` is still any authenticated user.
- A picking order whose loading number matches no order can still be opened by a non-admin who has a depot. There is no depot column on `picking_orders`.
- Transport driver, stop, distance, and report GETs were not depot-filtered in this phase.
- `GET /api/billing/reports/collection-person/{id}` was already permission-checked. It was not given a new single-person depot test in this phase.
- Signup remains available to every admin token. That is the supported registration path.

## 10. Database preservation verification

No Alembic revision, schema edit, or SQL reset was run. After the live signup row was removed:

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

`login_audits` is 60 and `audit_logs` is 59. The increase is the verification login. Employee passwords were not changed. The temporary employee `nocreate@example.com` no longer exists.
