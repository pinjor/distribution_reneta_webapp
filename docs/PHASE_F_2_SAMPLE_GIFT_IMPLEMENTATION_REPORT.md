# Phase F.2 — Sample/Gift Draft Persistence Implementation Report

Date: 25 November 2026  
Status: **Complete for Draft persistence only.** Sample and Gift remain one module. Export was not implemented. Live `swift_distro_hub` was **not** migrated. Stock, billing, approval, picking, dispatch, and delivery confirmation were not implemented.

Draft persistence is **not** physical delivery or inventory issuance.

## 1. Files changed

| File | Change |
|---|---|
| `backend/app/models.py` | `SampleGiftDelivery`, `SampleGiftDeliveryItem` |
| `backend/alembic/versions/f2_sample_gift_draft.py` | Additive revision after `d4_baseline` |
| `backend/app/schemas.py` | Create/Update/Response item and header schemas |
| `backend/app/routers/sample_gift_deliveries.py` | New router |
| `backend/app/routers/__init__.py`, `backend/main.py` | Mount `/api/sample-gift-deliveries` |
| `backend/app/core/config.py` | `SAMPLE_GIFT_DRAFT_WRITES` |
| `backend/app/core/schema_guard.py` | Allow live to stay on `d4_baseline` while `f2_sample_gift_draft` is pending |
| `backend/tests/test_sample_gift_deliveries.py` | CRUD, auth, depot 404, stock non-mutation |
| `src/lib/api.ts` | `sampleGiftDeliveries` client |
| `src/pages/delivery/SampleGiftDeliveryList.tsx` | GET API; no mock rows |
| `src/pages/delivery/SampleGiftDeliveryForm.tsx` | POST dedicated API; document kind; depot from session |
| `src/pages/delivery/SampleGiftDeliveryDetail.tsx` | GET by id |

`d4_baseline` was not modified. `POST /api/order-deliveries` was not modified.

## 2. Database models

`sample_gift_deliveries`: id, unique `delivery_number`, `depot_id` FK `depots`, `document_kind` (`sample`/`gift`), `gift_type`, `occasion`, `status` (application default `Draft`), `delivery_date`, recipient name/type/address/phone/email, `remarks`, `created_by` FK `employees`, timestamps.

`sample_gift_delivery_items`: id, `delivery_id` FK cascade, `product_id` FK `products`, `quantity` Numeric(12,2) CHECK > 0, `gift_type`, `created_at`.

Composite index `(depot_id, status)`. Unique index on `delivery_number`. No stock allocation columns. No changes to `orders` or `delivery_orders`.

## 3. New Alembic revision

- **Revision:** `f2_sample_gift_draft`
- **Revises:** `d4_baseline`
- **Creates:** the two tables, FKs, check constraints, indexes only

**Not applied to live.** Disposable `f2_app` (copy of live): upgrade `d4_baseline` → `f2_sample_gift_draft` succeeded; application tables **78 → 80**. Autogenerate after upgrade was empty (`pass`); probe file deleted.

## 4. API endpoints

All under `/api/sample-gift-deliveries`, JWT via `PROTECTED`.

| Method | Path | Behavior |
|---|---|---|
| GET | `/` | Depot-scoped list; `q`, `status`, skip/limit |
| GET | `/{id}` | Detail with items; foreign depot **404** |
| POST | `/` | Create **Draft**; atomic header+items; 201 |
| PUT | `/{id}` | Replace header+items if still Draft; 400 otherwise |

Duplicate `delivery_number` → **409**. Invalid `product_id` → **400** and no header row. Empty items / bad kind / empty recipient / qty ≤ 0 → **422**. Admin/manager with no depot and no `depot_id` → **400** (no silent depot pick).

New documents always `Draft`. No approve/reject/dispatch/deliver/stock routes.

## 5. Authorization behavior and pending product decisions

| Rule | Implementation |
|---|---|
| Authentication | JWT on all routes |
| Reads | Any authenticated role; depot filter; unassigned non-admin sees empty list |
| Writes | `require_role("admin", "manager")` **and** `SAMPLE_GIFT_DRAFT_WRITES` |
| Production activation | Flag defaults **false** when `ENVIRONMENT` is production/prod. Development/tests default true |
| Role map | Unchanged. **No** new permission codes. **Not** using unapproved `orders.write` for PSO |
| PSO / `user` | GET 200 (scoped); POST/PUT **403** |
| Cross-depot | GET/PUT **404** |

**Pending product decisions:** whether writes should use `orders.write` (PSO create); Doctor/Chemist FKs vs free-text recipient; inventory impact (F.4). Until those are approved, production must set `SAMPLE_GIFT_DRAFT_WRITES=yes` **and** apply the migration before the module is usable.

## 6. Frontend list/form/detail integration

- **List:** `GET /api/sample-gift-deliveries`. Empty array is a real empty state. Failures toast + Retry. No SG-2026-00x mocks. Print disabled.
- **Form:** `POST /api/sample-gift-deliveries`. Document kind Sample/Gift. Depot from `useAuth().depot_id` only — no invented depot. Products still filtered to `product_type_sample`; live catalog has **zero** such products, so the picker stays empty with a message. Success toast only after 201, then navigate to list.
- **Detail:** `GET /api/sample-gift-deliveries/{id}`. Real number, recipient, kind, gift type, date, remarks, lines, Draft status. 404/error shown. Print disabled (no print endpoint).

## 7. Form validation

Client: recipient name and type required; at least one line; quantity > 0; depot_id present on the user.  
Server: same plus `document_kind` ∈ {sample, gift}, recipient_type enum (Doctor, Pharmacy, Hospital, Distributor, Partner, Other), product existence, unique number, depot assignment.

## 8. SQLite test results

`pytest /app/tests -p no:cacheprovider`: **94 passed**.

New file `test_sample_gift_deliveries.py` (8 tests): create/list/get/update, duplicate 409, invalid product/qty/recipient/items/kind, missing depot, 401/403, foreign depot 404, failed item does not persist header, writes flag 403, commercial `orders` count unchanged, stock snapshot unchanged.

RBAC, order lifecycle, and stock reservation suites still passed.

## 9. Disposable PostgreSQL persistence tests

Database `f2_app` restored from live dump (read-only copy), upgraded to `f2_sample_gift_draft`. Inserted `SG-F2-DISP` + one item, verified, deleted. `stock_ledger` available **13000**, `product_item_stock_details` available **10635**, orders **131**, invoices **5** unchanged. Database dropped.

## 10. Alembic migration verification

Upgrade on `f2_app` only. Autogenerate after upgrade: empty. Live Alembic still **`d4_baseline`**. `sample_gift_deliveries` **does not exist** on live (`to_regclass` null).

`schema_guard` treats `f2_sample_gift_draft` as a **pending live revision** so the running API can stay on `d4_baseline` without failing startup. After an approved live upgrade, current will equal head and the new tables become required.

## 11. Inventory and billing non-mutation verification

SQLite snapshots of ledger available qty, item-stock available qty, `order_batch_allocations`, `orders`, `invoices`, `stock_issuances` were equal before and after Draft create/update. Disposable PG snapshot matched. `StockReservationService` is not imported by the new router.

## 12. Frontend tests and build

| Command | Result |
|---|---|
| `npm test` | **9 passed** |
| `npm run build` | Exit 0 |

No authenticated browser walkthrough.

## 13. Live database preservation

Before and after (read-only):

| Metric | Value |
|---|---|
| Alembic | `d4_baseline` |
| Application tables | 78 |
| sample_gift_* tables | absent |
| orders | 131 |
| order_items | 380 |
| stock_ledger | 22 |
| product_item_stock_details | 25 |
| invoices | 5 |
| doctors | 12 |
| chemist_shops | 3 |

`GET /health`: `{"status":"healthy"}`.

## 14. Remaining functional gaps

- No stock reservation/issuance
- No approval, picking, dispatch, POD
- No print/PDF
- No Doctor/Chemist master pickers (free text)
- Empty sample product catalog until flags are set in master data (not done here)
- Users without `depot_id` cannot create from the form
- Production writes off until env + migration
- Export Delivery still mock (F.3)

## 15. Live migration deployment plan (separate approval)

Do **not** run this without written approval.

1. Take a new logical dump of `swift_distro_hub`.
2. Restore to a disposable database; `alembic upgrade head`; confirm 80 tables, FKs, unique `delivery_number`, autogenerate empty.
3. Set `ALLOW_LIVE_ALEMBIC=yes` and `DATABASE_URL` for live **only for this upgrade**.
4. `alembic upgrade f2_sample_gift_draft` (or `upgrade head` if still the only pending revision).
5. Confirm `alembic_version` = `f2_sample_gift_draft` and 80 tables.
6. Unset `ALLOW_LIVE_ALEMBIC`.
7. Enable `SAMPLE_GIFT_DRAFT_WRITES=yes` only after authorization policy is confirmed.
8. Restart API; `GET /health`; `GET /api/sample-gift-deliveries` returns `[]`, not mocks.

No stamp-without-upgrade. No `create_all` on live.

## 16. GO / NO-GO for Phase F.3

**GO for F.3 Export Draft persistence** using the same pattern: dedicated tables, no stock, no commercial `delivery_orders`, disposable Alembic first, production writes gated.

**NO-GO** for treating Sample/Gift as operational warehouse flow, and **NO-GO** for live `f2_sample_gift_draft` until section 15 is approved.

Phase F.3 should not start stock/approval (F.4) in the same change.
