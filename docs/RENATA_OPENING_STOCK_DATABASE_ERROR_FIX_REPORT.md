# RENATA — Opening Stock Database Error Fix Report

**Date:** 26 November 2026  
**Production database:** `swift_distro_hub` was not migrated, not truncated, and not written.

## 1. Root cause

The Opening Stock page on the existing website (`http://127.0.0.1:9080`, `VITE_API_URL=/api`) calls production FastAPI (`swift_distro_api`). That process uses `DATABASE_URL` → **`swift_distro_hub`**.

Opening Stock tables were never applied there on purpose. The router/service checks for `opening_stock_requests` and returns **503 SCHEMA_NOT_APPLIED** with the Alembic message you saw. The migration did not fail. It was never run against the API the page was using.

`alembic_opening_stock.ini` targets a disposable URL (`opening_stock_dev` / `alembic_disposable`) and **refuses** `swift_distro_hub`. Production Alembic head remains `f3_export_draft` (separate version table).

## 2. Connected API database (the page that showed the error)

| Piece | Value |
|---|---|
| Frontend (existing) | `swift_distro_frontend` :9080, `VITE_API_URL=/api` |
| Proxy | nginx `/api` → `swift_distro_api` |
| API database | **`swift_distro_hub`** |
| Commercial Alembic | `f3_export_draft` |
| `opening_stock_%` tables | **0** |

## 3. Migration database (fix)

| Piece | Value |
|---|---|
| Compose file | `docker-compose.opening-stock.yml` (not production compose) |
| Container | `opening_stock_dev_pg` |
| Database | **`opening_stock_dev`** |
| User | `os_dev` |
| Host bind | `127.0.0.1:15550` |
| API | `opening_stock_dev_api` → `http://127.0.0.1:18050` |
| Dev UI | `opening_stock_dev_frontend` → `http://127.0.0.1:9180` with `VITE_API_URL=http://127.0.0.1:18050/api` |

Passwords are not listed in this report.

## 4. Missing tables (on production)

Entire migration was missing on `swift_distro_hub`. Expected names from `app/models_opening_stock.py`:

- `opening_stock_requests`
- `opening_stock_request_items`
- `opening_stock_approval_history`
- `opening_stock_posting_references`

On `opening_stock_dev` all four exist, with unique request numbers, unique `(request_id, product_id, batch_number)`, and FKs to `depots`, `employees`, `products`.

## 5. Alembic revision analysis

| Tree | Head | Version table |
|---|---|---|
| Production / commercial | `d4_baseline` → `f2_sample_gift_draft` → **`f3_export_draft`** | `alembic_version` |
| Opening Stock | **`os_request_workflow`** (`down_revision=None`, branch label `opening_stock`) | `alembic_version_opening_stock` |

No shared head. Opening Stock env requires commercial tables (`employees`, `products`, `depots`) first, then applies `os_request_workflow`. That is safe on a **fresh disposable** database after `alembic upgrade f3_export_draft`.

## 6. Fix applied

1. Added disposable stack `docker-compose.opening-stock.yml`.
2. Applied commercial `f3_export_draft` on `opening_stock_dev`.
3. Applied `alembic -c alembic_opening_stock.ini upgrade head`.
4. Seeded synthetic depots/product/users (`backend/db/seed_opening_stock_dev.py`; refuses live).
5. Started `opening_stock_dev_api` using hostname `opening_stock_dev_pg` (not Compose service name `postgres`, which collided with live Postgres DNS when a shared network was tried).
6. Started a **separate** frontend on port **9180** pointed at that API.

Production `docker-compose.yml` was not edited.

## 7. Migration result (`opening_stock_dev`)

```
current_database  | commercial       | opening
opening_stock_dev | f3_export_draft  | os_request_workflow
```

Tables: `opening_stock_requests`, `opening_stock_request_items`, `opening_stock_approval_history`, `opening_stock_posting_references`.

## 8. Backend API verification (http://127.0.0.1:18050)

| Call | Result |
|---|---|
| GET `/api/opening-stock/summary` (empty then after reject) | 200 `total:0` then `total:1, rejected:1` |
| GET `/api/opening-stock` | 200 empty list, then one real request |
| POST create Draft (Sarah / user, DHK) | 201 `OS-20261126-0001`, `not_posted` |
| PATCH Draft | 200 |
| POST submit | 200 `Pending Approval` |
| POST approve as manager | **403 APPROVAL_FORBIDDEN** |
| POST reject as second admin, with reason | 200 `Rejected` |
| GET detail | 200 `inventoryPosted: false` |
| GET `/api/product-receipts` | 200 |
| PIS / PISD / StockLedger row counts | **0 / 0 / 0** |

## 9. Frontend verification

- Disposable UI: `http://127.0.0.1:9180` (Vite 200).
- That UI’s API is `http://127.0.0.1:18050/api`. Browser preflight `OPTIONS /api/auth/login` and `POST /api/auth/login` returned 200 against the disposable API.
- **Existing :9080 site still talks to `swift_distro_hub` and will still show the missing-table toast.** That is correct isolation, not a remaining schema bug.

Use **http://127.0.0.1:9180/receive/opening-stock** for Opening Stock development. Demo login: `admin@swiftdistro.com` / the same demo password as the chips.

## 10. Regression results

- Opening-stock pytest: **11 passed**
- Disposable API startup: complete
- Live `swift_distro_hub` opening tables: **0**
- Live Alembic: **`f3_export_draft`**
- Product receipts GET on disposable API: 200
- No inventory posting enabled

## 11. Production database preservation

No Alembic, seed, or INSERT/UPDATE/DELETE ran against `swift_distro_hub`. Production compose and nginx were not changed.

## 12. Remaining blocker

Physical stock posting remains **disabled** until inventory source-of-truth policy is signed. Approval still does not change on-hand quantities.

**Opening Stock page vs disposable PostgreSQL:** **Yes — the API on `opening_stock_dev` loads list/summary without SCHEMA_NOT_APPLIED.** Open the **9180** frontend. Port **9080** is still production and must not be migrated.

## Follow-up 26 Nov 2026 (page still showed 503 on the main website)

The main UI (`:9080` Vite and `:9081` nginx) still called production `/api`, which has no tables. Opening-stock requests are now **proxied** to `opening_stock_dev_api` / `opening_stock_dev`. Live `swift_distro_hub` is unchanged (0 opening tables).

Verified: `GET http://127.0.0.1:9081/api/opening-stock/summary` with a production admin JWT returns **200** and real counts (`rejected: 1`). Refresh the Opening Stock page (hard refresh).
