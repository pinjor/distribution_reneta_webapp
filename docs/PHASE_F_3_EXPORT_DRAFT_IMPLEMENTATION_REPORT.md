# Phase F.3 — Export Draft Persistence Implementation Report

Date: 25 November 2026  
Status: **Complete for Draft persistence and frontend integration only.** Sample/Gift F.2 remains unimplemented on live. Export is not physical shipment, customs clearance, stock issuance, or invoice posting.

Draft persistence is **not** operational Export Delivery.

## 1. Files modified

| File | Change |
|---|---|
| `backend/app/models.py` | `ExportDelivery`, `ExportDeliveryItem` |
| `backend/alembic/versions/f3_export_draft.py` | Additive revision after `f2_sample_gift_draft` |
| `backend/app/schemas.py` | Export create/update/list/detail/item schemas |
| `backend/app/routers/export_deliveries.py` | New router |
| `backend/app/routers/sample_gift_deliveries.py` | 503 when F.2 tables are missing |
| `backend/app/routers/__init__.py`, `backend/main.py` | Mount `/api/export-deliveries` |
| `backend/app/core/config.py` | `EXPORT_DRAFT_WRITES` |
| `backend/app/core/schema_guard.py` | Pending live revisions include `f3_export_draft` |
| `backend/app/core/draft_modules.py` | Table-existence gates for F.2 and F.3 |
| `backend/tests/test_export_deliveries.py` | CRUD, auth, Decimal totals, non-mutation |
| `backend/tests/test_draft_module_availability.py` | 503 when tables missing; commercial orders still list |
| `src/lib/api.ts` | `exportDeliveries` client |
| `src/pages/delivery/ExportDeliveryList.tsx` | GET API; empty/error/503; no mocks |
| `src/pages/delivery/ExportDeliveryForm.tsx` | POST dedicated API; depot from session |
| `src/pages/delivery/ExportDeliveryDetail.tsx` | GET by id; Print disabled |

`d4_baseline` and `f2_sample_gift_draft` were not rewritten. `POST /api/order-deliveries` was not modified.

## 2. Export models and schema

`export_deliveries`: id, unique `delivery_number`, `depot_id` FK `depots`, `status` default `Draft`, `delivery_date`, destination country, ports, shipping line, container, B/L, **invoice_number as free text (not an `invoices` FK)**, L/C, Incoterms, payment terms, remarks, `created_by` FK `employees`, timestamps. No `order_id`.

`export_delivery_items`: id, `delivery_id` FK cascade, `product_id` FK `products`, optional `batch_number` and `expiry_date`, `quantity` Numeric(12,2) CHECK > 0, `unit_price` Numeric(14,4) CHECK >= 0, `hsn_code`, `created_at`.

Composite index `(depot_id, status)`. Unique index on `delivery_number`.

## 3. Alembic revision and dependency chain

Single head:

`d4_baseline` → `f2_sample_gift_draft` → **`f3_export_draft`**

Creates only Export tables, FKs, check constraints, and indexes.

**Not applied to live.** Disposable `f3_chain` (copy of live): upgrade through F.2 then F.3 succeeded; application tables **78 → 80 → 82**. Autogenerate after head was empty (`pass`); probe file deleted.

## 4. API endpoints

`/api/export-deliveries`, JWT via `PROTECTED`.

| Method | Path | Behavior |
|---|---|---|
| GET | `/` | Depot-scoped list; `q`, `status`, skip/limit |
| GET | `/{id}` | Detail with items; foreign depot **404** |
| POST | `/` | Create **Draft**; atomic header+items; 201 |
| PUT | `/{id}` | Replace header+items if still Draft; 400 otherwise |

Duplicate `delivery_number` → **409**. Invalid `product_id` → **400** (no header row). Empty items / missing ports or country / qty ≤ 0 / negative price / invalid Incoterms → **422**. Admin/manager with no depot and no `depot_id` → **400**. Admin list/detail is not depot-filtered.

No submit, approval, customs, dispatch, deliver, cancel, or invoice posting.

## 5. Authorization policy

| Rule | Implementation |
|---|---|
| Authentication | JWT on all routes |
| Reads | Any authenticated role; depot filter; unassigned non-admin sees empty list |
| Writes | `require_role("admin", "manager")` **and** `EXPORT_DRAFT_WRITES` |
| Role map | Unchanged. No new permission codes. PSO/`user` POST/PUT **403** |
| Cross-depot | GET/PUT **404** for non-admin |

**Pending product decisions:** whether PSO should create Export Drafts (`orders.write` is not approved); whether `invoice_number` should later become a commercial invoice FK; customs and Incoterms policy beyond the current UI options.

## 6. Feature flag behavior

`EXPORT_DRAFT_WRITES` defaults **true** off-production and **false** when `ENVIRONMENT` is production/prod, unless set to `yes`/`true`/`1`/`on`.

This phase does **not** enable production writes. Writes remain denied in production until the flag is set **and** `f3_export_draft` is applied.

## 7. Pending-migration endpoint protection

Live may stay on `d4_baseline` while source head is `f3_export_draft`. `schema_guard` treats `f2_sample_gift_draft` and `f3_export_draft` as pending live revisions and does not require the new tables until current equals head.

Routers call `require_sample_gift_schema` / `require_export_schema`: if the tables are missing, **HTTP 503** with an actionable Alembic message. Commercial `/api/orders` is not gated.

Disposable checks:

| Database state | sample_gift tables | export tables | app tables |
|---|---|---|---|
| `d4_baseline` | absent | absent | 78 |
| `f2_sample_gift_draft` | present | absent | 80 |
| `f3_export_draft` | present | present | 82 |

SQLite tests: missing-table monkeypatch returns 503; `GET /api/orders` still 200.

The API does not run Alembic on startup.

## 8. Frontend list/form/detail implementation

- **List:** `GET /api/export-deliveries`. Empty array is a real empty state. Failures toast + Retry. HTTP 503 shows a migration-required message and disables New Export. No EX-2026-00x mocks. Print disabled.
- **Form:** `POST /api/export-deliveries`. Depot from `useAuth().depot_id` only. Products filtered to `product_type_export`; live catalog has **zero** such products, so the picker stays empty with a message. Quantity and unit price are sent as decimal strings. Success toast only after 201.
- **Detail:** `GET /api/export-deliveries/{id}`. Real shipping fields, invoice **reference** (not a commercial invoice), line items, Draft status, backend `total_value`. 404/error shown. Print disabled.

## 9. Decimal calculation behavior

Line total and document total are `Decimal(quantity) * Decimal(unit_price)` on the server. SQLite and disposable PostgreSQL both stored `2.50 × 10.25 = 25.625`. The UI may format numbers for display; stored totals are not JavaScript floats.

`invoice_number` is a shipping document string only. Creating a Draft does not insert into `invoices`.

## 10. SQLite tests

`pytest /app/tests -p no:cacheprovider`: **106 passed**.

New: `test_export_deliveries.py` (8 tests) and `test_draft_module_availability.py` (4 tests). Sample/Gift, RBAC, order lifecycle, and stock reservation suites still passed.

## 11. Disposable PostgreSQL tests

Database `f3_chain` restored from live dump (not live). Upgrade `d4_baseline` → `f2` → `f3`. Inserted `EX-F3-DISP` + one item (line total 25.625), deleted. Autogenerate empty. Database dropped.

## 12. Inventory and financial non-mutation evidence

SQLite snapshots of ledger available qty, item-stock available qty, `order_batch_allocations`, `orders`, `invoices`, `stock_issuances`, `collection_deposits` were equal before and after Draft create/update. Disposable PG: stock_ledger available **13000**, `product_item_stock_details` available **10635**, orders **131**, invoices **5** unchanged. `StockReservationService` is not imported by the Export router.

## 13. Frontend tests and build

| Command | Result |
|---|---|
| `npm test` | **9 passed** |
| `npm run build` | Exit 0 |

No authenticated browser walkthrough.

## 14. Live database preservation

Before and after (read-only; no live upgrade or stamp):

| Metric | Value |
|---|---|
| Alembic | `d4_baseline` |
| Application tables | 78 |
| sample_gift_* | absent |
| export_* | absent |
| orders | 131 |
| order_items | 380 |
| stock_ledger | 22 |
| invoices | 5 |
| collection_deposits | 49 |
| doctors | 12 |
| chemist_shops | 3 |

`GET /health`: `{"status":"healthy"}` after API restart to load F.3 routes. Unauthenticated draft endpoints return **401** (auth before schema). Schema guard against live engine succeeds with pending revisions.

## 15. Remaining business decisions

- Live application of F.2 then F.3
- Production write flags (`SAMPLE_GIFT_DRAFT_WRITES`, `EXPORT_DRAFT_WRITES`)
- PSO write access
- Empty export product catalog (no flags changed here)
- Print/PDF
- Whether export invoice reference should ever post to commercial invoices
- Customs, dispatch, stock issuance (F.4)

## 16. Live migration sequence requiring separate approval

Do **not** run this without written approval.

1. Take a new logical dump of `swift_distro_hub`.
2. Restore to disposable PostgreSQL; `alembic upgrade head`; confirm 82 tables, F.2 and F.3 present, autogenerate empty.
3. Set `ALLOW_LIVE_ALEMBIC=yes` only for this upgrade.
4. `alembic upgrade f2_sample_gift_draft` then `alembic upgrade f3_export_draft` (or `upgrade head` if these remain the only pending revisions).
5. Confirm `alembic_version` = `f3_export_draft` and 82 tables.
6. Unset `ALLOW_LIVE_ALEMBIC`.
7. Leave `EXPORT_DRAFT_WRITES` unset/false in production until authorization is confirmed.
8. Restart API; `GET /health`; authenticated `GET /api/export-deliveries` returns `[]`, not mocks; `GET /api/sample-gift-deliveries` returns `[]`.

No stamp-without-upgrade. No `create_all` on live.

## 17. GO / NO-GO recommendation for the next phase

**GO** for a separately approved live upgrade of F.2+F.3 (section 16) as an operations task.

**NO-GO** for Phase F.4 (stock reservation, issuance, approval, customs, dispatch, invoice posting) until:

- live schema includes `f3_export_draft`
- write flags and role mapping are product-approved
- export/sample product flags exist where the business requires them

**NO-GO** for treating Export Delivery as operationally complete. This phase is Draft persistence and UI wiring only.
