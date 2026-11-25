# Phase E.3 — Master-Data Finalization Report

Date: 25 November 2026  
Status: **Complete for Phase E.3 only.** Catalog writes that were still JWT-only are now admin/manager where that matches existing policy. Production master-data loaders no longer substitute demo customers, products, or depots. Customer settings persist through FastAPI. Live `swift_distro_hub` was not mutated. Phase F was not started.

This application is **not** claimed production-ready. Authenticated browser walkthrough of settings pages was **not** performed.

## 1. Master-data endpoint and frontend audit matrix

Status: **Complete** = list/detail/create/update/delete wired to PostgreSQL with auth, empty/error handling, no demo fallback. **Partial** = API exists but UI, persistence, or integrity is incomplete. **Missing** = no dedicated settings surface or no backend contract.

| Page / resource | Endpoint | Model / table | Frontend | Mock / hardcoded | localStorage business data | Auth (GET) | Writes | Depot scope | Status |
|---|---|---|---|---|---|---|---|---|---|
| Company | `/api/companies` | `Company` / `companies` | `settings/Company.tsx` | None | None | JWT (`PROTECTED`) | admin/manager | Global | Complete |
| Depot | `/api/depots` | `Depot` / `depots` | `settings/Depot.tsx` | Warehouse/zone/storage/capacity are UI-only | None (E.2 removed `depotMasterData`) | JWT + self-scope | admin/manager | `hide_foreign_depot` → 404 | Complete (UI-only fields labeled) |
| Vendor | `/api/vendors` | `Vendor` / `vendors` | `settings/Vendors.tsx` | Category/rating UI-only | None | JWT | admin/manager | Global | Complete (UI-only fields labeled) |
| Customer | `/api/customers` | `Customer` / `customers` | `settings/Customers.tsx` | Type checkboxes UI-only | None | JWT | admin/manager | Not depot-owned | Complete |
| Product | `/api/products` | `Product` / `products` | `settings/Products.tsx` | None on settings page | None | JWT | admin/manager | Global | Partial: no delete 409 for operational FKs; load failure toasts but does not always clear prior rows |
| UOM | `/api/uoms` | `UOM` / `uoms` | `settings/UOM.tsx` | None | None | JWT | admin/manager | Global | Complete (toasts on failure) |
| Primary Packaging | `/api/primary-packagings` | `PrimaryPackaging` / `primary_packagings` | `settings/PrimaryPackaging.tsx` | None | None | JWT | admin/manager | Global | Complete |
| Price Setup | `/api/price-setups` | `PriceSetup` / `price_setups` | `settings/PriceSetup.tsx` | None | None | JWT | admin/manager | Global | Complete |
| Shipping Points (physical) | `/api/shipping-points` | `ShippingPoint` / `shipping_points` | No dedicated settings CRUD page. `Masters.tsx` shipping tab lists them. `RouteShippingPoints.tsx` uses them as assignment targets | Menu **Shipping Points** is **route** CRUD | None | JWT + depot filter | admin/manager | Depot-owned 404 | Partial: API complete; settings menu name maps to routes |
| Routes | `/api/routes` (`code` = `route_id`) | `Route` / `routes` | `settings/ShippingPoints.tsx` (`/settings/shipping-points`) | None | None | JWT + depot filter | admin/manager | Depot-owned 404 | Complete (naming mismatch) |
| Route Shipping Points | `/api/route-shipping-points` | `RouteShippingPoint` / `route_shipping_points` | `settings/RouteShippingPoints.tsx` | None | None | JWT | admin/manager; foreign route 404 | Via parent route `depot_id` | Complete |
| Route Planning | GET depots/vehicles/drivers/routes | Operational UI, not a master table | `RoutePlanning.tsx` | Sample RT-001 / Chennai cards removed | None | JWT | Dispatch buttons are local toasts only | Dropdowns from APIs | Partial: no dispatch/stop-preview contract |
| Doctor | `/api/doctors` | `Doctor` / `doctors` | `settings/Doctor.tsx` | None | None | JWT | admin/manager | Global | Complete |
| Chemist Shop | `/api/chemist-shops` | `ChemistShop` / `chemist_shops` | `settings/ChemistShop.tsx` | None | None | JWT | admin/manager | Global | Complete |
| Employees | `/api/employees` | `Employee` / `employees` | `settings/Employees.tsx` | None | None | JWT + depot filter | `admin.users` (unchanged) | `hide_foreign_depot` | Complete (stronger permission preserved) |
| Role Master | `/api/role-masters` | `RoleMaster` / `role_masters` | `settings/RoleMaster.tsx` | Out of E.3 write-gate list | None | JWT | Existing permission | — | Unchanged |
| Vehicle / Driver | `/api/vehicles`, `/api/drivers` | `Vehicle` / `vehicles`, `Driver` / `drivers` | Transport screens | `src/lib/mockData.ts` still has demo vehicles/drivers; `StockReceipt.tsx` still imports mock receipts | None for these masters | JWT | `require_role("manager","transport")` (unchanged) | Vehicle depot-owned | Operational, not catalog-gated |
| Masters hub | same APIs | — | `Masters.tsx` | Demo PharmaCorp / Chennai Port rows removed | None | JWT | N/A (navigates to settings) | — | Complete for list preview |

Order-entry dropdowns (`OrderEntry`, `OrderListPage`, `PickingOrderCreate`) use `masterData.ts` / existing APIs. Failed loads leave empty lists and toast; they do not inject demo customers or products.

## 2. Files changed (Phase E.3-relevant)

Backend:

- `backend/app/routers/customers.py` — WRITE_ROLES; GET by id; list limit 10000; 409 delete guards
- `backend/app/routers/products.py`, `uoms.py`, `primary_packagings.py`, `price_setups.py` — WRITE_ROLES on POST/PUT/DELETE
- `backend/app/routers/route_shipping_points.py` — WRITE_ROLES plus `hide_foreign_depot` on writes
- `backend/tests/test_customers_settings.py` (new)
- `backend/tests/test_master_data_write_auth.py` (new)
- `backend/tests/test_doctors_chemist_shops.py` — PUT duplicate-code for doctor and chemist

Frontend:

- `src/lib/masterData.ts` — `MasterDataLoadError`; empty array is valid; no demo fallback
- `src/lib/masterData.test.ts` (new)
- `src/lib/api.ts` — customer getById / getByCode / update / delete
- `src/pages/settings/Customers.tsx` — FastAPI list/create/update/delete, retry, confirm, 409 toasts
- `src/pages/settings/Company.tsx`, `Depot.tsx`, `Vendors.tsx` — non-persisted field labels
- `src/pages/Masters.tsx` — live APIs; empty/error/retry
- `src/pages/RoutePlanning.tsx` — real routes; no invented dispatch metrics
- `src/pages/orders/OrderEntry.tsx`, `OrderListPage.tsx`, `PickingOrderCreate.tsx` — no demo dropdown options

E.1/E.2 files remain in the working tree (doctors, depots, vendors, shipping points, routes, company gates, Alembic `d4_baseline`, schema_guard). Those were not reverted. The autogenerate probe `b6754af257f0_e3_probe.py` was created against disposable `e3_app` and **deleted**; head remains `d4_baseline`.

## 3. Authorization improvements

Ordinary catalog writes now use existing `require_role("admin", "manager")` (`require_role` always allows admin). No new permission codes.

| Resource | Decision |
|---|---|
| Customers, products, UOM, primary packaging, price setups | Catalog master-data → admin/manager |
| Route–shipping-point links | Catalog assignment → admin/manager; foreign depot route id → 404 |
| Employees | Left on `admin.users`. Manager is **not** granted employee administration |
| Vehicles / drivers | Left on `manager` + `transport` (operational fleet, not catalog) |
| Company, depot, vendor, shipping point, route, doctor, chemist | Unchanged from E.1/E.2 (already admin/manager) |

Negative tests: unauthenticated 401; `user` 403 on catalog writes; GET still 200 for `user`; manager POST `/api/employees` 403.

## 4. Authorization decisions left unresolved

1. **Product / UOM / packaging / price-setup delete integrity.** Writes are role-gated, but DELETE does not yet 409 when operational rows reference the product. Tightening that needs an explicit FK inventory, not assumed in E.3.
2. **Customer `type` versus UI checkboxes.** `type` is persisted (settings “company” select maps to `type`). Multi-select chemist/institution/corporate/hospital/others has no column. Whether that should become a future enum or junction table is undecided.
3. **Physical shipping-point settings page.** CRUD exists on `/api/shipping-points`, but `/settings/shipping-points` is route master. Renaming the menu or adding a dedicated page is a product/UX decision, not done here beyond pointing the Masters hub shipping tab at physical points and `/settings/route-shipping-points`.
4. **PSO/user write of customers.** Denied (admin/manager only). If field sales must create customers, that needs an approved permission or workflow, not a silent reopen.
5. **Vehicle/driver as catalog.** Left operational. Do not apply admin/manager-only without confirming transport clerks still can register fleet.

## 5. Mock-data fallback cleanup

Removed production substitution of fake customers, products, depots, and employees from `src/lib/masterData.ts`. Empty JSON array returns `[]`. Non-array or failed HTTP throws `MasterDataLoadError`. `getProducts` no longer injects default free-goods 100/5 when the list is empty.

Order entry, order list filters, and picking-order create no longer seed Parvez Baksa / Van 4045 / TURAG / demo customers.

Masters hub no longer shows PharmaCorp / Chennai Port / invented capacity.

**Intentionally left:**

- `src/lib/mockData.ts` plus `StockReceipt.tsx` recent-receipts demo (warehouse receipt UI, not settings).
- `StockIssuance.tsx` still displays the static label “Route A (North)”.
- Theme/auth tokens in localStorage.

Vitest `src/lib/masterData.test.ts` asserts empty arrays stay empty and failed APIs throw rather than returning “Global Retail Inc”.

## 6. Customer settings integration status

`Customers.tsx` loads `/api/customers`, maps `type` → company, `ship_to_party`, `sold_to_party`, priority, delivery/credit flags, and `payment_days`. Create/update/delete call FastAPI. Search/filter/pagination of `MasterDataTable` is unchanged. Delete uses `window.confirm`. API 401/403/404/409/422 surface through existing toasts (`formatApiError`). Retry reloads the list. Failed load sets an empty table plus Retry.

Delete 409 if invoices, stock issuances, route stops, customer credit balances, or orders (`customer_id` string equals numeric id or code) exist. Related rows are not cascade-deleted. Customer codes cannot be changed on PUT.

## 7. Shipping Point and Route consistency review

| Concept | Source of truth | UI |
|---|---|---|
| Physical shipping point | `shipping_points` / `/api/shipping-points` | Masters shipping tab; assignment picker on Route Shipping Points |
| Route master | `routes.route_id` exposed as `code` / `/api/routes` | `/settings/shipping-points` (page title is historical “Shipping Points”) |
| Route-to-point assignment | `route_shipping_points` | `/settings/route-shipping-points` |
| Route Planning | Operational visualization | Depot/vehicle/driver/route dropdowns from APIs. Stop preview and distance/order totals **have no dispatch API**. Cards show `—` rather than invented km/order counts. Generate Delivery Slip remains a local toast (existing, not rewritten) |

Order entry still stores selected **route** codes in a `shippingPoints` React state name for compatibility; values come from `/api/routes`, not shipping-point addresses.

**Missing contract:** live dispatch plan (assigned stops, distance, order totals, send-to-driver). Documented; not invented.

## 8. Non-persistent UI field assessment

| UI field | DB equivalent | Needed for workflow? | Incorrectly looks saved? | E.3 treatment | Future schema |
|---|---|---|---|---|---|
| Depot warehouse | None | Unclear | Previously unlabeled | Helper: not stored | Additive column only with approved Alembic |
| Depot zone | None | Unclear | Same | Helper | Same |
| Depot storage type | None | Unclear | Same | Helper; required asterisk removed | Same |
| Depot capacity | None | Display-only on Masters | Masters previously showed “50000 units” | Masters shows `—`; form helper | `Numeric` capacity if product wants it |
| Vendor category | None | Optional classification | Yes after reload | Helper | Optional `String` |
| Vendor rating | None | Optional | Form defaulted 0 | Helper | Optional |
| Company registration number | Distinct from `gstin` | Tax ID is GSTIN | Previously mapped GSTIN into both | Registration left empty on load; helper says Tax ID saves as GSTIN | Separate `registration_number` if finance requires it |
| Customer type checkboxes | No; `customers.type` is a single string | Industry flags | Yes | Helper; `type` still saved from company select | Enum or flags table |
| Customer assigned depot (Masters column) | No `depot_id` on `customers` | Depot isolation of customers | Invented Chennai depot | Column shows `—` | FK only with approved design |
| Vendor contract info (Masters) | None | Contract dates | Invented “Valid till …” | Column shows `—` | Optional |

No columns were added.

## 9. Doctor / Chemist regression findings

- List/create/update/delete still use `apiEndpoints.doctors` / `chemistShops`.
- Codes `DOC-NNNN` / `CHEM-NNNN` skip existing unique values; POST duplicate 400; PUT duplicate 400 (SQLite tests).
- Writes remain admin/manager; `user` 403.
- Frontend delete confirmation from E.1 retained.
- Required-field 422 and missing-id 404 tests remain.
- Live rows were **not** created or deleted (12 doctors, 3 chemist shops unchanged).

## 10. Backend tests

`docker exec -e PYTHONPATH=/app -w /tmp swift_distro_api pytest /app/tests -p no:cacheprovider`

**86 passed**, 134 warnings, ~81s (SQLite `create_all` in `conftest`, not live PostgreSQL).

Includes: RBAC/security (`test_auth_rbac`, `test_rbac_phase_c*`, `test_config_security`, `test_depot_scope`), master-data CRUD (`test_master_data_crud`), E.3 write auth and customer settings, doctor/chemist, order lifecycle, stock reservation/issue, validation. Billing isolation remains in `test_rbac_phase_c1` / `c2`. There is no separate named “transport calculation” suite; transport routers were not changed.

Create customer returns **200** (existing FastAPI default), not 201; tests match that contract.

## 11. Frontend tests and build

| Command | Result |
|---|---|
| `npm test` (vitest) | **9 passed** (`api.test.ts` 6, `masterData.test.ts` 3) |
| `npm run build` | Exit 0, 24.31s |

## 12. Browser walkthrough results or limitation

**Not performed.** This environment has browser MCP tools but no logged-in WMS session and E.3 forbids using live business records for mutation testing. Verification used API tests, vitest, code inspection of settings pages, and disposable PostgreSQL ORM persistence.

## 13. Disposable PostgreSQL results

Database `e3_app` created as `pg_dump` of live `swift_distro_hub` (read-only copy). Not live.

- Alembic revision `d4_baseline`, 78 application tables.
- SQLAlchemy insert/update/delete of `CUST-E3-DISP` succeeded; customer count returned to 8.
- Database dropped afterward.

No live inserts/updates/deletes.

## 14. Alembic drift results

Autogenerate against `e3_app` produced `b6754af257f0` with empty `upgrade()` / `downgrade()` (`pass` only). Probe file deleted. No CREATE/DROP. Live Alembic was not stamped or upgraded. `env.py` still refuses live Alembic unless `ALLOW_LIVE_ALEMBIC=yes`. FastAPI startup runs `assert_schema_ready` only; it does not execute schema DDL (`create_all` remains SQLite pytest / seed scripts).

## 15. Live business-data preservation

Before and after E.3 (read-only):

| Metric | Count |
|---|---|
| Alembic | `d4_baseline` |
| Application tables | 78 |
| companies | 9 |
| depots | 3 |
| vendors | 5 |
| customers | 8 |
| products | 14 |
| uoms | 7 |
| primary_packagings | 5 |
| price_setups | 12 |
| shipping_points | 8 |
| routes | 5 |
| route_shipping_points | 15 |
| doctors | 12 |
| chemist_shops | 3 |
| employees | 6 |
| orders | 131 |
| stock_ledger | 22 |

Live `GET /health`: `{"status":"healthy"}`.

Backup unchanged: `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_104750.dump`  
SHA-256 `646b38f2534cff6c20cb35e8296afc40f84a286f981645b995d2e7a42712eead`.

## 16. Remaining risks and open items

- Settings menu **Shipping Points** is route master; physical shipping-point CRUD has no dedicated settings page.
- Product/UOM/packaging/price-setup delete can fail at the database if FKs exist, without a friendly 409.
- `StockReceipt.tsx` mock receipts and `StockIssuance.tsx` “Route A (North)” can still look like live operational data.
- Route Planning dispatch actions are still local toasts.
- Product settings load error does not always empty previously loaded in-memory rows (initial load is empty).
- Catalog GET remains JWT-only (any authenticated role can read), consistent with prior phases.
- No authenticated UI E2E against PostgreSQL.

## 17. GO / NO-GO recommendation for Phase F

**GO for Phase F module work** (sample / gift / export and related new business modules) **with conditions**:

- Do not treat E.3 as production cutover.
- Do not rename or migrate live schema without a separate approved phase.
- Phase F should not depend on Route Planning invented dispatch metrics or Stock Receipt mock lists as if they were live.
- Employee administration stays `admin.users`; do not invent `masters.write`.

**NO-GO for calling the WMS production-ready** until authenticated UI verification, remaining warehouse mock screens, product delete integrity, and shipping-point menu naming are resolved.

Phase E.3 did not change order processing math, billing calculations, stock reservation, transport trip math, or authentication providers.
