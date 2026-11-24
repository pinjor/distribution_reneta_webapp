# Phase C.2 Security Review Report

Date: 23 November 2026  
Scope: Close confirmed depot-isolation holes, record a permission proposal, and remove public signup navigation. No new permission codes, schema changes, migrations, or role-map edits. Phase D was not started.

## 1. Files changed

| File | Change |
|---|---|
| `backend/app/routers/picking_orders.py` | A picking order is reachable only when its loading number matches orders in the caller's depot. A missing or foreign loading number is 404. Administrators are not restricted |
| `backend/app/routers/transport.py` | Route stops, route distance, expense reads and writes, and transport reports follow a route depot or a trip's vehicle depot |
| `backend/app/routers/billing.py` | `GET /api/billing/reports/collection-person/{id}` and the all-persons report hide collectors outside the caller's depot |
| `src/App.tsx` | The `/signup` route is removed |
| `src/components/ui/sign-in-card-2.tsx` | The login-page link to signup is removed. The rest of the card is unchanged |
| `backend/tests/test_rbac_phase_c2.py` | SQLite cases for picking ownership, transport reads, and collection reports |
| `docs/PHASE_C_2_SECURITY_REVIEW_REPORT.md` | This report |

`src/pages/Signup.tsx` is still in the tree and is no longer mounted. Administrator employee creation remains `POST /api/employees/` and the Employees screen, both already gated by `admin.users`. `POST /api/auth/signup` still requires `admin.users`.

## 2. Confirmed security vulnerabilities fixed

- A picking order whose loading number matches no order was visible to any non-admin who had a depot. It is now 404. Creating one with an unknown or foreign loading number is also 404. A delivery attached to the create must belong to an order the caller can see.
- Route stops and route distance were returned for any authenticated user. They now follow `routes.depot_id`. A route in another depot, or a route with no depot, is 404 for a non-admin.
- Transport expense lists included every depot. They now follow the trip's vehicle depot, or the route depot when no trip can be resolved. An expense with neither link is omitted for a non-admin. Creating, updating, or deleting an expense outside the caller's depot returns 404. Same-depot transport users and administrators still pass.
- Transport summary reports queried every trip. Trip selection now joins `vehicles.depot_id`, the same ownership already used for trip lists.
- `GET /api/billing/reports/collection-person/{id}` returned another depot's collector, including transaction amounts. It now returns 404 unless the collector's `employees.depot_id` matches the caller. `GET /api/billing/reports/all` skips those collectors instead of failing the whole report. Administrators still see every collector.

## 3. Depot-isolation test results

`tests/test_rbac_phase_c2.py` on the in-memory SQLite fixture:

- Picking: unknown loading number 404. Own loading number 201 and 200. Another depot's loading number 404. An orphan picking row is 404 for the depot user, 200 for admin, and absent from the depot user's list.
- Transport: foreign route stops, distance, and trip are 404. Own route distance and trip are 200. Expense list contains only the caller's trip. Vehicle-expense report contains `VH-A` and not `VH-B`. Posting an expense for the foreign trip is 404. Admin can read the foreign trip.
- Collection report: billing user in depot A gets 404 for a collector in depot B and 200 for a collector in depot A, with `total_collected` 8. Admin gets 200 for the foreign collector. The all-persons report includes only depot A.

The general transport report and the PDF report use the same trip query. They were not called in SQLite because the general report uses `date_trunc`, which this fixture does not provide. Driver lists were called only to confirm they still respond. They are not depot-filtered. See section 9.

## 4. Endpoint permission proposal matrix

These rows are proposals. None of them were applied. Existing authentication and depot checks stay as they were after Phase C.1, plus the depot fixes in section 2.

| Method and path | Existing authentication | Existing permission | Proposed permission | Authorized roles | Frontend impact if applied now | New code required |
|---|---|---|---|---|---|---|
| GET, POST, PUT, DELETE `/api/companies/` | JWT | None | `masters.write` on POST, PUT, DELETE. GET stays JWT | Admin, manager | Company settings has no permission tag, so every signed-in role can open it. Applying `masters.write` without granting it would hide or fail that screen for PSO, billing, finance, and transport | Yes |
| GET, POST, PUT, DELETE `/api/products/` | JWT | None | `masters.write` on writes. GET stays JWT | Admin, manager | Products settings is untagged and is used while entering orders. A write lock is safe only after the screen is confirmed to be admin and manager. Reads must stay open | Yes |
| GET, POST, PUT, DELETE `/api/customers/` | JWT | None | `masters.write` on writes. GET stays JWT | Admin, manager | Customers settings is untagged. Order entry reads customers. Do not put `masters.write` on GET | Yes |
| GET, POST, PUT, DELETE `/api/price-setups/` | JWT | None | `masters.write` on writes. GET stays JWT | Admin, manager | Price Setup is untagged. Billing and PSO may need to read prices. Writes can wait for the new code | Yes |
| POST `/api/orders/route-wise/assign` and POST `/api/orders/assigned/from-barcodes` | JWT plus depot batch check | None on these two paths. `orders.assign` already exists | `orders.assign` | Admin, manager, transport | Route Wise Memo List and Assigned Order List are tagged `orders.read`. User/PSO can open them and does not have `orders.assign`. Applying it now blocks PSO assignment from those screens | No. The code exists. The role grant does not |
| POST `/api/orders/route-wise/validate` | JWT plus depot filter | None. POST `/api/orders/{id}/validate` already requires `orders.validate` | `orders.validate` | Admin, manager, billing | Route-wise screen is `orders.read`. User/PSO does not have `orders.validate` | No |
| POST, PUT, DELETE `/api/product-receipts` and POST `/{id}/approve` | JWT plus depot stamp or 404 | None. List and get are also JWT plus depot | Keep JWT plus depot until a warehouse-receive role is defined. Do not use `inventory.write` | Whoever may receive stock, including the current user/PSO screens | Receive screens are tagged `inventory.read`. User/PSO and transport have `inventory.read` only. `inventory.write` would block factory, depot, and return receive | No new code, but the existing code is the wrong one for these screens |
| POST `/api/picking-orders/{id}/approve` | JWT plus the loading-number depot check added in this phase | None | Same as product-receipt approval. Do not use `inventory.write` | Same receive and picking operators | Picking is opened from order and receive flows that user/PSO can already see | No |
| POST `/api/invoices/` and POST `/api/invoices/generate-bulk/{id}` | JWT plus depot stamp or challan check | None. GET is JWT plus depot | A later warehouse or billing decision. `billing.write` is the closest existing code and is the wrong one today | Admin and manager for certain. Billing and finance have `billing.write` or `billing.read`. The depot user who generates a challan invoice does not | Delivery and invoice actions are available from `orders.read` screens. User/PSO has `billing.read` only | No, if `billing.write` is chosen. That choice is not approved |
| GET `/api/mobile/assigned-memos`, POST `/api/mobile/accept-memo`, GET loading status, GET `/api/mobile/my-accepted-memos` | JWT plus order depot filter | None. `mobile.access` exists and is not granted to `user` | Grant `mobile.access` to `user` first, then require it | Admin, manager, transport, and PSO once the grant is approved | There is no separate mobile menu. Enforcing `mobile.access` before the grant locks PSO out of memo accept | No new code. A role-map change is required before enforcement |
| POST `/api/depots/` | JWT | None. GET `/{id}` is already 404 outside the caller's depot | `admin.users` is a poor fit. Prefer a future `masters.write`, limited to admin | Admin | Depot settings is untagged. Creating a depot is not a PSO or billing task, but the screen is still visible to them | Yes, unless admin-only is accepted without a new code |

`masters.write` is one proposed code for company, product, customer, price, and depot creation. It was not added to `PERMISSIONS` or `ROLE_PERMISSIONS`.

## 5. Unresolved policy decisions

- Whether PSO should keep route-wise assign, route-wise validate, memo print, and assigned-status updates. The permission codes exist. The menu still shows those screens with `orders.read`.
- Whether product-receipt and picking approval belong to `inventory.write` or to a separate receive permission. The current menu says `inventory.read`.
- Whether invoice generation belongs to billing, warehouse, or both.
- Whether `mobile.access` should be added to the `user` role before it is enforced.
- Whether master-data writes should be admin and manager only. That needs the new code and a menu tag. Until then, those writes stay JWT-only on purpose.
- Driver records cannot be depot-scoped without a new column or a reliable foreign key. That decision belongs with a schema phase, not here.

## 6. Frontend compatibility assessment

No menu, layout, or business screen was redesigned. Sidebar permissions from Phase C are unchanged.

The login card no longer offers "Request access". Visiting `/signup` renders the existing not-found page. That was checked in the running app at `http://127.0.0.1:9080/signup`. The logged-in dashboard still shows the same navigation groups. The logged-out login card was not opened again, because the browser session was already signed in and signing out would write an audit row. The production build completed, so the card compiles without the signup link.

Employees, order entry, receive, picking, billing, and transport screens still call the same APIs. The new 404s apply when the loading number, route, trip, expense, or collector is outside the caller's depot. A user working inside their own depot follows the same success path as before.

## 7. Backend test results

`docker exec -w /app swift_distro_api python -m pytest tests -q --tb=line -p no:cacheprovider`

**49 passed** in 26.25s. The database was the in-memory SQLite fixture. `swift_distro_hub` was not used.

The run includes the previous order, stock, validation, and Phase C / C.1 tests, plus the three Phase C.2 cases.

`npm run build` completed. Vite transformed 3380 modules and wrote `dist/`.

`GET /health` on port 8088 returned 200 `healthy`. Representative login and permission checks for this phase were the SQLite tests, not additional calls against the live API.

## 8. PostgreSQL preservation verification

No Alembic revision, schema edit, SQL reset, employee password change, or live insert was run. Counts after this phase match the counts recorded at the end of Phase C.1:

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
| login_audits | 60 |
| audit_logs | 59 |

## 9. Remaining risks

These were reviewed and are not claimed as permission-secure or depot-secure:

- Company, product, customer, price, and `POST /api/depots/` remain any authenticated user. The proposal is in section 4.
- Order assign, barcode assign, route-wise validate, print, assigned status, and delivery approval remain any authenticated user, with the Phase C.1 depot batch check.
- Product receipt writes and approval, invoice creation, and picking approval remain any authenticated user. Picking approval now also requires a proven loading number.
- Mobile memo routes do not require `mobile.access`.
- `drivers` has no `depot_id`. `drivers.vehicle_id` is a free string, not a foreign key to `vehicles.id`. `GET /api/drivers/` and `GET /api/transport/drivers` still return every driver to any authenticated user. No relationship was invented.
- A route whose `depot_id` is null is hidden from non-admins. That is correct isolation, and it will also hide a route that was never assigned a depot.
- An expense with no resolvable trip and no route depot is hidden from non-admins.
- The general transport report and PDF download were code-reviewed and wired to the same trip filter. They were not executed in this test run.
- `src/pages/Signup.tsx` can still be called only if a route is added back. The API would still require `admin.users`.

## 10. Phase D readiness recommendation

Phase D can start as the planned read-only catalog diff against `swift_distro_hub`. Take a fresh logical dump first, review any revision SQL, and do not autogenerate against the live volume.

Phase C.2 does not block that diff. It also does not approve the permission proposals in section 4. Those proposals must stay out of the Alembic revision. Do not stamp `alembic_version`, add columns for driver depot ownership, or add `masters.write` as part of Phase D unless that phase is separately approved.

The backend is ready for Phase D's non-destructive catalog work. It is not ready for a claim that every endpoint is authorized.
