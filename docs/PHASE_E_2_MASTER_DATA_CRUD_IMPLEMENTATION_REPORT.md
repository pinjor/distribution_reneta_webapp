# Phase E.2 — Master-Data CRUD Implementation Report

Date: 25 November 2026  
Status: **Complete for Phase E.2 only.** Missing depot, vendor, shipping-point, and route writes are implemented. Company writes now use the same admin/manager gate. Stock adjustment detail GET exists. Settings pages for companies, depots, vendors, and shipping routes load PostgreSQL data. Live `swift_distro_hub` was not mutated. Phase E.3 and Phase F were not started.

## 1. Existing endpoint inventory (before E.2)

| Resource | Already present | Missing |
|---|---|---|
| Companies | GET list, GET by id, POST, PUT, DELETE. JWT only (`PROTECTED`) | Write role gate, duplicate-code check, referential delete guard |
| Depots | GET list (self-scoped), GET by id (`hide_foreign_depot`), POST (any JWT) | PUT, DELETE, duplicate code, write role, delete integrity |
| Vendors | GET list, POST | GET by id, PUT, DELETE, duplicate code, write role |
| Shipping points | GET list (active default, depot-scoped) | GET by id, POST, PUT, DELETE |
| Routes | GET list (maps `route_id` → `code`, depot-scoped) | GET by id, POST, PUT, DELETE |
| Route–shipping-point links | Full CRUD already | Not duplicated |
| Stock adjustments | GET list, POST | GET `/api/stock/adjustments/{id}` (frontend already called it) |
| Doctors / chemist shops | Full CRUD from E.1 | Regression only |

Frontend before E.2:

| Page | Data source |
|---|---|
| Company, Vendors | Hardcoded arrays |
| Depot | `localStorage` key `depotMasterData` plus demo rows |
| Shipping Points (`/settings/shipping-points`) | Hardcoded depot routes; depots from `localStorage` |
| Route shipping points | Already API |
| Doctor / Chemist Shop | API (E.1) |
| Route Planning | API for depot/vehicle/driver dropdowns; hardcoded sample route cards (dispatch UI, not a master table) |

## 2. New or modified endpoints

No duplicate company router. No schema migration.

| Method | Path | Notes |
|---|---|---|
| PUT | `/api/depots/{id}` | admin/manager; 404 if outside depot scope |
| DELETE | `/api/depots/{id}` | 409 if referenced; no cascade |
| GET/PUT/DELETE | `/api/vendors/{id}` | plus duplicate-code on POST/PUT |
| GET/POST/PUT/DELETE | `/api/shipping-points/{id}` and POST list | depot FK required; writes scoped with `assign_depot_for_write` |
| GET/POST/PUT/DELETE | `/api/routes/{id}` | list contract unchanged (`code` = `route_id`) |
| GET | `/api/stock/adjustments/{id}` | `inventory.read`; 404 if missing or other depot; no quantity or approval change |
| POST/PUT/DELETE | `/api/companies/...` | same paths; added duplicate code, 409 if depots exist, admin/manager |
| POST | `/api/depots`, `/api/vendors` | existing paths now require admin/manager |

List GET contracts for order entry, inventory, delivery, billing, and transport still require only JWT (plus existing depot filters). Inactive shipping points remain hidden by default (`is_active` query defaults to true).

## 3. Authorization behavior

Master-data **writes** in this phase use `require_role("admin", "manager")` (admin is always allowed by `require_role`). No new permission codes.

| Caller | List/detail | Write |
|---|---|---|
| No JWT | 401 | 401 |
| `user` | 200 (scoped where depot-owned) | 403 |
| `manager` | own depot | own depot; 404 for foreign depot ids |
| `admin` | all | all |

Depot-owned GET/PUT/DELETE uses `hide_foreign_depot` → **404**, not 403, so foreign ids are not confirmed.

**Broader JWT-only writes still present (unchanged on purpose):** UOM, products, employees, customers, primary packaging, price setups, route-shipping-point links, vehicles/drivers POST. Recommend aligning those in Phase E.3 with the same admin/manager gate, not a new permission, unless product wants PSO write.

Company POST/PUT/DELETE previously accepted any JWT. E.2 tightened **those company and depot/vendor POST paths** because they are the master-data surfaces this phase completed. That is documented here; it is not applied to orders or billing.

## 4. Frontend integration changes

| Page | Change |
|---|---|
| `Company.tsx` | Loads `/api/companies`. Create/update/delete via API. `gstin` maps to Tax ID / Registration display. |
| `Depot.tsx` | Loads `/api/depots`. Stopped writing business rows to `localStorage`. Location maps to `city`/`address`. |
| `Vendors.tsx` | Loads `/api/vendors`. Category and rating have no DB columns; they remain on the form/table as empty/zero after reload. |
| `ShippingPoints.tsx` | This screen is depot **routes**. It now uses `/api/routes` and `/api/depots`. |
| `api.ts` | Depot/vendor/shipping-point/route write helpers; shipping-point query string. |
| Doctor / Chemist | Added `window.confirm` on delete only. |

Layouts, tables, dialogs, search, and pagination are unchanged. Loading, empty, API error, 403, and 409 messages surface through existing toasts. Delete uses browser confirm plus backend 409 text.

Warehouse / zone / storage type / capacity on the depot form, vendor category/rating, and company registration-number-as-distinct-from-`gstin` are **UI fields without PostgreSQL columns**. They were not added to the catalog.

`src/lib/masterData.ts` still may fall back to `depotMasterData` if the depot API fails; Depot settings no longer populate that key.

## 5. Doctor and Chemist Shop regression findings

Code review of E.1 wiring:

- List still calls `apiEndpoints.doctors.getAll` / `chemistShops.getAll`.
- View model still maps `registration_number`, `owner_name`, `is_active` → `status`.
- Writes remain admin/manager; `user` 403 covered by `test_doctors_chemist_shops.py` (still in the suite).
- Delete now asks for confirmation; 403/409/validation still toast `detail`.
- Frontend requires name/specialization/registration (doctors) and name/owner (shops); backend `Field(min_length=1)` on those. Email/phone stay UI-required, API-optional (catalog).
- Codes `DOC-NNNN` / `CHEM-NNNN` skip existing unique values.

SQLite tests for those modules passed as part of the 76-test run. **Authenticated browser walkthrough of live Doctor/Chemist pages was not performed** (no logged-in UI session in this environment). Live row counts remain 12 doctors and 3 chemist shops; those rows were not written.

## 6. Validation and deletion safeguards

- Duplicate `code` / `route_id` → 400.
- Missing required body → 422.
- Missing id → 404.
- Invalid shipping-point/route `depot_id` → 400.
- Depot delete 409 if employees, routes, shipping points, vehicles, stock ledger, receipts, issuances, adjustments, invoices, depot transfers, or orders (`depot_code`) exist.
- Company delete 409 if depots reference it.
- Vendor delete 409 if stock receipts reference it.
- Shipping point / route delete 409 if route assignments, trips, expenses, vehicle loadings, orders (`route_code`), or route stops exist. Related operational rows are **not** cascade-deleted.

## 7. Alembic revision and schema-drift results

Live and disposable head: **`d4_baseline`**.

Disposable `e2_app`: `alembic upgrade head` succeeded. Autogenerate probe `7a882c86cdee` had `upgrade()` / `downgrade()` of `pass`. Probe file deleted. No CREATE/DROP. No live stamp or upgrade.

Backup unchanged: `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_104750.dump` SHA-256 `646b38f2534cff6c20cb35e8296afc40f84a286f981645b995d2e7a42712eead`.

## 8. Backend test results

`pytest /app/tests -p no:cacheprovider` in the API container, SQLite: **76 passed**, 119 warnings, 54.79s.

Includes prior RBAC, order lifecycle, stock reservation, billing, doctor/chemist, and new `test_master_data_crud.py` (CRUD, 401/403, duplicates, 404, depot isolation 404, FK 409, persistence).

## 9. Frontend test and build results

| Command | Result |
|---|---|
| `npm test` | **6 passed** (`src/lib/api.test.ts`) |
| `npm run build` | Exit 0, 20.82s |

## 10. Disposable PostgreSQL persistence results

`e2_app` TestClient (not live): health 200; company, depot, vendor, shipping point, and route POST 201; list counts 1; ORM counts 1 each. Database dropped afterward.

## 11. Live database preservation verification

Before and after E.2 (read-only):

| Metric | Count |
|---|---|
| Alembic | `d4_baseline` |
| Application tables | 78 |
| companies | 9 |
| depots | 3 |
| vendors | 5 |
| shipping_points | 8 |
| routes | 5 |
| doctors | 12 |
| chemist_shops | 3 |
| orders | 131 |
| stock_ledger | 22 |

Live `GET /health`: `{"status":"healthy"}`. No live inserts/updates/deletes. Startup does not run `create_all`.

## 12. Remaining master-data gaps

- Customers, employees, products, UOM, packaging, and price-setup **writes remain JWT-only**.
- Route Planning still shows hardcoded sample route cards for dispatch visualization.
- Depot warehouse/zone/storage/capacity and vendor category/rating are not persisted (no columns).
- Shipping-point **address** master is API-complete; there is no dedicated settings page besides route alignment (`RouteShippingPoints`) and the route list page.
- `masterData.ts` demo fallbacks for customers/products remain if APIs fail.
- Browser E2E of settings pages against live JWT was not run.

## 13. Recommended scope for Phase E.3

1. Logged-in UI check of Company, Depot, Vendor, Shipping Routes, Doctor, and Chemist Shop against live data (read-only first).
2. Align remaining master writes (UOM, products, customers, employees, route-shipping-point) with admin/manager **after** product confirmation; do not invent `masters.write`.
3. Customers settings page if it still uses mocks.
4. Optional additive columns for depot capacity/warehouse/zone and vendor category **only with a reviewed Alembic revision**.
5. Do not start sample/gift/export (Phase F) until E.3 is approved.

Phase E.2 did not change order processing, billing calculations, transport trip math, inventory ledger posting, or authentication providers.
