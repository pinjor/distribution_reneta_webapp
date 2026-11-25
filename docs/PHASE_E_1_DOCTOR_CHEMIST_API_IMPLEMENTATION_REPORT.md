# Phase E.1 — Doctor and Chemist Shop API Implementation Report

Date: 25 November 2026  
Status: **Complete for Phase E.1 only.** PostgreSQL-backed Doctor and Chemist Shop CRUD is implemented in FastAPI and wired into the existing settings pages. Live `swift_distro_hub` was not migrated, reset, or used for test mutations. Phase E.2 and Phase F were not started.

## 1. Files modified

| File | Change |
|---|---|
| `backend/app/models.py` | Added `Doctor` and `ChemistShop` matching the live catalog |
| `backend/app/schemas.py` | Create / Update / Response / List schemas for both resources |
| `backend/app/routers/doctors.py` | New JWT CRUD router |
| `backend/app/routers/chemist_shops.py` | New JWT CRUD router |
| `backend/app/routers/__init__.py` | Export the new routers |
| `backend/main.py` | Mount `/api/doctors` and `/api/chemist-shops` with `PROTECTED` |
| `backend/alembic/env.py` | `LEGACY_UNMAPPED_TABLES` is empty (models now cover both tables) |
| `backend/tests/test_doctors_chemist_shops.py` | Isolated SQLite CRUD, auth, duplicate, 404, RBAC tests |
| `src/lib/api.ts` | `apiEndpoints.doctors` and `apiEndpoints.chemistShops` |
| `src/lib/api.test.ts` | Endpoint path tests |
| `src/pages/settings/Doctor.tsx` | Load / create / update / delete via FastAPI; mock array removed |
| `src/pages/settings/ChemistShop.tsx` | Same as doctors |
| `docs/PHASE_E_1_DOCTOR_CHEMIST_API_IMPLEMENTATION_REPORT.md` | This report |

Not changed: Alembic revision `d4_baseline`, order/stock/billing/transport routers, permission codes, Compose, live catalog.

## 2. SQLAlchemy model details

Source of truth: live PostgreSQL `\d` / `d4_reconciled_baseline.sql`. No `depot_id`. No invented columns.

**`doctors`**

| Column | PostgreSQL | Model |
|---|---|---|
| `id` | integer PK, sequence `doctors_id_seq`, index `ix_doctors_id` | `Integer`, PK, `index=True` |
| `name` | varchar(255) NOT NULL | `String(255)`, `nullable=False` |
| `code` | varchar(50) NOT NULL UNIQUE (`doctors_code_key`) | `String(50)`, `unique=True`, `nullable=False` |
| `specialization` | varchar(255) NOT NULL | `String(255)`, `nullable=False` |
| `registration_number` | varchar(100) NOT NULL | `String(100)`, `nullable=False` |
| `qualification` | varchar(255) NULL | `String(255)`, nullable |
| `email` | varchar(255) NULL | `String(255)`, nullable |
| `phone` | varchar(50) NULL | `String(50)`, nullable |
| `address` | text NULL | `Text`, nullable |
| `city` | varchar(100) NULL | `String(100)`, nullable |
| `is_active` | boolean NULL | `Boolean`, nullable |
| `created_at` | timestamp NULL | `DateTime`, nullable |
| `updated_at` | timestamp NULL | `DateTime`, nullable |

**`chemist_shops`**

| Column | PostgreSQL | Model |
|---|---|---|
| `id` | integer PK, sequence, `ix_chemist_shops_id` | `Integer`, PK, `index=True` |
| `name` | varchar(255) NOT NULL | `String(255)`, `nullable=False` |
| `code` | varchar(50) NOT NULL UNIQUE (`chemist_shops_code_key`) | `String(50)`, `unique=True`, `nullable=False` |
| `owner_name` | varchar(255) NOT NULL | `String(255)`, `nullable=False` |
| `license_number` | varchar(100) NULL | `String(100)`, nullable |
| `email` / `phone` / `address` / `city` | same widths as doctors | matching nullable columns |
| `is_active` | boolean NULL | `Boolean`, nullable |
| `created_at` / `updated_at` | timestamp NULL | `DateTime`, nullable |

No foreign keys from other business tables to these rows. Hard delete does not cascade into orders, stock, or billing.

## 3. FastAPI endpoints implemented

Mounted with `dependencies=PROTECTED` (`require_auth`). Writes add `require_role("admin", "manager")`. `require_role` already allows `admin` even if omitted; both names are listed for clarity.

**Doctors** (`/api/doctors`)

| Method | Path | Auth |
|---|---|---|
| GET | `/api/doctors` | JWT. Query: `skip`, `limit`, `q`, `is_active`. Inactive rows are included unless filtered |
| GET | `/api/doctors/{id}` | JWT |
| POST | `/api/doctors` | admin or manager. Auto-code `DOC-NNNN` if `code` omitted. Duplicate code → 400 |
| PUT | `/api/doctors/{id}` | admin or manager |
| DELETE | `/api/doctors/{id}` | admin or manager. Hard delete of the doctor row only |

**Chemist shops** (`/api/chemist-shops`)

Same shape. Auto-code `CHEM-NNNN`. Duplicate code → 400. Missing row → 404. Invalid body → 422.

List responses are JSON arrays (same convention as UOMs), not wrapped objects. `DoctorList` / `ChemistShopList` schemas exist for typed collections if a later phase wants a wrapper.

## 4. Frontend integration changes

`Doctor.tsx` and `ChemistShop.tsx` no longer keep hardcoded arrays. On mount they call `apiEndpoints.doctors.getAll()` / `apiEndpoints.chemistShops.getAll()`. Create, update, and delete go through FastAPI. After a successful mutation the list is reloaded. Backend `detail` (string or 422 array) is shown in toasts. Loading uses the existing empty-message slot; API failures show a destructive line above the table. Search, filters, dialogs, table columns, pagination, and code preview (`generateCode`) are unchanged. The UI does not seed demo rows.

Snake_case API fields are mapped to the existing camelCase view model (`registrationNumber`, `ownerName`, `status` from `is_active`).

Browser click-through of the settings pages against live PostgreSQL was **not** performed in this phase (no authenticated UI session in the agent environment). Frontend proof is: production build, vitest client tests, and API persistence on disposable PostgreSQL.

## 5. Authorization behavior

Existing six-role map was not changed. There is still no `masters.write` permission code.

| Action | Policy used |
|---|---|
| List / detail | Any authenticated, active, non-blocked user (`PROTECTED`) |
| Create / update / delete | `require_role("admin", "manager")` |

Verified in SQLite tests: unauthenticated → 401; `user` role can GET and cannot POST (403); `manager` can POST; `admin` can full CRUD.

This is a **documented product choice**, not a new RBAC code. It matches other master writes that use role gates rather than inventing permissions. If PSO / `user` must maintain doctors, that needs an approved permission or role change in a later phase.

## 6. Alembic schema drift results

Disposable database `e1_app` on the same Postgres 16 instance (not `swift_distro_hub`):

| Step | Result |
|---|---|
| `alembic upgrade head` | Exit 0, `d4_baseline` |
| `alembic revision --autogenerate -m e1_drift_probe` | Probe `80eadbec414d` with `upgrade()` / `downgrade()` of `pass`. No `CREATE TABLE` for doctors or chemist_shops |
| Probe file | Deleted. Head is again exactly `d4_baseline` |
| Live Alembic | Unchanged. No stamp, upgrade, or downgrade |

`LEGACY_UNMAPPED_TABLES` no longer hides these tables. Autogenerate compared modeled metadata to `d4_baseline` and reported no-op.

`e1_app` was dropped after verification.

## 7. Backend test results

`docker exec -e PYTHONPATH=/app -w /tmp swift_distro_api pytest /app/tests -p no:cacheprovider`

**64 passed**, 106 warnings, 41.64s.

Includes the previous regression pack (order lifecycle, stock reservation, billing, RBAC) plus `test_doctors_chemist_shops.py` (list/detail, CRUD, duplicate codes, invalid input, 404, 401, user 403, manager write, SQLite persistence).

Isolated SQLite via `conftest` `create_all` / `drop_all`. No live rows were inserted or deleted.

## 8. Frontend build results

| Command | Result |
|---|---|
| `npm test` (`vitest run`) | **5 passed** (`src/lib/api.test.ts`, including doctor and chemist-shop endpoint calls) |
| `npm run build` (`vite build`) | Exit 0, 18.69s, `dist/` produced. Existing chunk-size warning only |

## 9. API persistence verification

On disposable PostgreSQL `e1_app` (schema from `alembic upgrade head`, TestClient, not live):

| Check | Result |
|---|---|
| FastAPI `GET /health` | 200 |
| Login | 200 |
| `POST /api/doctors` | 201, code `DOC-E1P1` |
| `GET /api/doctors` | 200, 1 row |
| `POST /api/chemist-shops` | 201, code `CHEM-E1P1` |
| `GET /api/chemist-shops` | 200, 1 row |
| ORM count after commit | `doctors=1`, `chemist_shops=1` |

Those rows existed only in `e1_app`, which was dropped. Live doctor/chemist counts were not used as a write target.

## 10. Live database preservation results

**Before**

| Item | Value |
|---|---|
| Backup | `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_104750.dump` SHA-256 `646b38f2534cff6c20cb35e8296afc40f84a286f981645b995d2e7a42712eead` |
| Alembic | `d4_baseline` |
| Application tables (excluding `alembic_version`) | 78 |
| `doctors` | 12 |
| `chemist_shops` | 3 |
| `orders` | 131 |

**After**

Same backup hash, same revision, 78 tables, 12 doctors, 3 chemist shops, 131 orders.

Live `GET /health` through the running API process: `{"status":"healthy"}`.

No `CREATE TABLE` / `DROP TABLE` against live. No test records created or deleted on live.

## 11. Outstanding issues

- Settings pages were not exercised in a real browser session against live JWT. UI load of the 12/3 existing rows is expected from the GET handlers but not screenshot-verified here.
- `DoctorList` / `ChemistShopList` wrappers are unused by the routers (arrays match existing UOM style).
- Write access is role-based (`admin`/`manager`), not a dedicated master-data permission. `user` / PSO cannot mutate these records.
- SQLite pytest still uses `create_all`; it does not prove Alembic on CI by itself. Disposable Postgres autogenerate and TestClient were used for that gap in this phase.
- Frontend email/phone remain UI-required with asterisks; the API leaves them optional to match the catalog.

## 12. Recommendations for Phase E.2

Phase E in `docs/BACKEND_MODERNIZATION_PLAN.md` still includes other master gaps. Suggested E.2 scope (do not start until approved):

1. Confirm in the running UI that Doctor and Chemist Shop lists show the live 12 and 3 rows, then create/update/delete one disposable row **only if product allows**, or keep mutations on a disposable copy.
2. Complete remaining master APIs named in the plan: depot PUT/DELETE, vendor PUT/DELETE, shipping-point write, route write, `GET /api/stock/adjustments/{id}` — without changing order/stock/billing logic.
3. Wire remaining mock master pages (vendors, company, shipping points) the same way as E.1, no redesign.
4. If operators who are not manager/admin must edit doctors or chemist shops, approve a permission code or role change first. Do not silently open writes.
5. Keep `d4_baseline` as head unless a real catalog change is approved; E.1 did not need a new revision.

Phase F (sample/gift/export) remains out of scope.
