# Phase F.3.3 — Draft Activation Readiness and F.4 Business Workflow Specification

Date: 25 November 2026  
Status: **Specification complete. Live Draft writes were not enabled. Phase F.4 was not implemented.**

This report does not authorize production Draft creation or inventory transactions.

## 1. Current deployment verification

Read-only against live `swift_distro_hub`. JWT minted in-process (no extra `login_audits`).

| Check | Result |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | **`f3_export_draft`** (single head) |
| Application tables | **82** |
| New tables | `sample_gift_deliveries`, `sample_gift_delivery_items`, `export_deliveries`, `export_delivery_items` — all present, **0 rows** |
| Catalog vs D.5 | 917→968 columns, 132→140 FKs, 0→4 checks — accounted for by F.2/F.3 tables only. Autogenerate on a live copy was empty. |
| `/health` | 200 `{"status":"healthy"}` |
| GET Sample/Gift | 200 `[]` (real empty list) |
| GET Export | 200 `[]` |
| Flags | Compose `SAMPLE_GIFT_DRAFT_WRITES=no`, `EXPORT_DRAFT_WRITES=no`; process **False** |
| Admin POST both | **403** (write flag message) |
| `ALLOW_LIVE_ALEMBIC` | unset |
| orders / order_items | 131 / 380 |
| stock_ledger available | 13000 |
| PISD available | 10635 |
| invoices / collections | 5 / 49 |

No live Draft documents. No live schema or flag changes in this phase besides a pytest isolation fix in `backend/tests/conftest.py`.

## 2. Draft module readiness

**Implemented today (F.2/F.3):** JWT list/detail; Draft POST/PUT; depot scoping; 409 duplicate numbers; 400 invalid products; 422 validation; atomic header+items; Decimal export totals; Print disabled in UI; empty sample/export product pickers; 503 if tables missing.

| Area | Sample/Gift | Export |
|---|---|---|
| List | GET, search, retry, empty, 503 message | same |
| Detail | GET real fields, 404/error | same + backend `total_value` |
| Create | POST dedicated API; depot from session only | same |
| Update | PUT while status is Draft | same |
| Status | always starts Draft; no submit | same |
| Depot | missing `depot_id` → 400; foreign → 404 | same |
| Roles | read any JWT; write admin/manager **and** flag | same |
| Products | UI filters `product_type_sample` only | UI filters `product_type_export` only |
| Empty catalog | toast + empty picker (live: 0 flags) | same |

**Not implemented:** submit, approve, reject, reserve, pick, dispatch, deliver, cancel, print/PDF, Doctor/Chemist pickers, consignee, commercial invoice posting.

**Isolated PostgreSQL** (`f33_app` restored from live dump `…123200.dump`, dropped after): flags off → POST 403; flags on → Sample Gift create/list/detail/update 201/200, duplicate 409, Export create total `25.625`, orders 131 and ledger 13000 unchanged. Live remained 0 Draft rows.

## 3. Product eligibility analysis

All 14 live products have **false** for `product_type_sample`, `product_type_export`, `product_type_commercial`, and `product_type_institutional`. The empty Draft catalogs are the real catalog, not a UI bug.

| Flag | Used by |
|---|---|
| `product_type_sample` | Sample/Gift form picker only. Not enforced on the API. |
| `product_type_export` | Export form picker only. Not enforced on the API. |
| `product_type_commercial` | Product master checkboxes; not used by Draft APIs. |
| `product_type_institutional` | Product master checkboxes; not used by Draft APIs. |

Admin/manager can set flags in Settings → Products (`POST`/`PUT /api/products`). That is the intended classification path.

**Gift:** there is **no** `product_type_gift`. Gift uses the same module and the sample picker. **Product decision:** keep Gift on `product_type_sample`; add `product_type_gift`; or allow any SKU for Gift. Default recommendation until approved: **Gift shares `product_type_sample`**. Do not add a column without a signed decision.

**API gap:** backend accepts any `product_id`. If eligibility must be mandatory, F.4 (or a small follow-up) should reject non-matching flags with 400. Until then, a caller who bypasses the UI can attach any product.

Do not auto-flag or seed products.

## 4. Authorization decision matrix

Existing six roles. **No new permission codes in this phase.** Draft writes today: `require_role("admin","manager")` + env flag. Reads: any authenticated user, depot-scoped.

Proposed mapping (not granted):

| Action | Conservative default | Needs business approval |
|---|---|---|
| View | JWT + depot (current) | Whether billing/finance/transport see all depots |
| Create Draft | admin, manager (current) | PSO/`user` via `orders.write` |
| Update Draft | same as create, Draft only | same |
| Submit | **not built**; propose admin/manager | Whether PSO can submit |
| Approve / Reject | **not built**; propose manager/admin; not PSO | Whether billing must approve Export value |
| Reserve stock | **not built**; inventory.write + manager/admin | Whether warehouse-only |
| Pick / Dispatch | **not built**; transport + `orders.status` analogue | New codes vs reuse `orders.status` |
| Confirm delivery | **not built** | Field vs depot clerk |
| Cancel | **not built**; creator or manager while not issued | After stock issued |
| Print | **not built**; `orders.print` analogue | Finance watermark rules |

**Recommended default until approval:** keep **admin/manager writes**, JWT reads, flags off in production. Do **not** give PSO Draft create. Do **not** add `sample_gift.*` / `export.*` codes until the matrix is signed.

## 5. Sample/Gift proposed workflow

Keep **one module** (`document_kind` sample|gift).

**Existing:** Draft persist only.

**Proposed** (F.4, not implemented):

`Draft → Submitted → Approved → Reserved → Picked → Dispatched → Delivered`

Also: `Submitted/Approved → Rejected` (back to Draft or terminal Rejected — **decide**); `any pre-issue → Cancelled`; `Delivered → Returned` (stock return — **decide**).

| Transition | Actor (proposed) | Permission (proposed) | Validations | DB | Stock | Audit | Failure | Idempotency |
|---|---|---|---|---|---|---|---|---|
| Create Draft | admin/manager | current write flag | recipient, ≥1 item, qty>0, depot | insert header+items, status Draft | none | optional DOCUMENT_CREATE | 4xx, no row | unique `delivery_number` |
| Update Draft | same | same | status==Draft | replace header+items | none | DOCUMENT_UPDATE | 400 if not Draft | last-write-wins on Draft only |
| Submit | same or PSO if approved | TBD | lines, depot, products eligible | status Submitted | none | SUBMIT | 409 if already Submitted | if status==Submitted return 200 |
| Approve | manager/admin | TBD | status Submitted | status Approved | none | APPROVE | 400 wrong status | same |
| Reject | manager/admin | TBD | Submitted | Rejected or Draft | none | REJECT | 400 | same |
| Reserve | warehouse/manager | inventory.write TBD | Approved; FEFO on **chosen store** | status Reserved; allocation rows | available→reserved on PISD (`with_for_update`) | STOCK_RESERVE | 400 insufficient; **no partial silent** | if Reserved, no second reserve |
| Pick | warehouse | TBD | Reserved | Picked | none extra or move to pick bin — **decide** | PICK | 400 | same |
| Dispatch | transport | TBD | Picked | Dispatched | reserved→issued (PISD); do **not** also subtract ledger unless ledger is synced in same TX | DISPATCH | 400 | same |
| Deliver | field/depot | TBD | Dispatched | Delivered | none if already issued | DELIVER | 400 | same |
| Cancel pre-reserve | creator/manager | TBD | not issued | Cancelled | none | CANCEL | 400 | same |
| Cancel reserved | manager | TBD | Reserved/Picked | Cancelled | reserved→available | STOCK_RELEASE | 400 if issued | release once |
| Return | warehouse | TBD | Delivered | Returned | issued→available on original batch | RETURN | 400 | same |

UI today has no submit/approve buttons. Adding them is a product UX change.

## 6. Export proposed workflow

Form fields today: destination country*, ports*, date*, shipping line, container, B/L, invoice **reference** (string, not `invoices` FK), L/C, Incoterms (FOB/CIF/CFR/EXW/DDP), payment terms (LC/TT/DP/DA/Advance), remarks, lines (product, optional batch/expiry, qty*, unit price, HSN). **No consignee name/address.** No automatic invoice.

**Existing:** Draft persist; Decimal `qty × unit_price`.

**Proposed states (not implemented):** Draft → Submitted → Approved → Prepared → Dispatched → InTransit → Delivered. Do **not** invent customs-clearance states.

Needs approval:

| Topic | Flag |
|---|---|
| Consignee master vs free text | product/logistics |
| Whether invoice_number may post to `invoices` | **finance — default no** |
| L/C and Incoterms mandatory vs optional | finance |
| Batch required at Draft vs at Reserve | warehouse |
| Priced lines vs zero-value samples on export | finance |
| Who approves high-value Export | finance/product |
| Customs documents | **out of scope** unless compliance writes a brief |

Stock path same as Sample/Gift once source of truth is chosen. Export unit price is documentary; it must not create receivables in F.4 unless finance signs off.

## 7. Stock and FEFO architecture findings

| Store | Role in code today |
|---|---|
| `product_item_stock_details` (PISD) | **Order validation reservation** (`StockReservationService`, `with_for_update`). Available/reserved/issued via `order_batch_allocations`. |
| `product_item_stock` | Aggregates receive/issue/stock_qty; not locked in reservation. |
| `stock_ledger` | **Commercial `order_deliveries` FEFO** (`allocate_fefo_batches` orders by `expiry_date`). Subtracts `available_quantity` on delivery create. |
| `stock_issuances` | Warehouse issue documents; separate from Draft modules. |

`commit_for_order` reduces PISD **reserved** and marks ISSUED; it does **not** reduce PISD `quantity` or update `stock_ledger`. Delivery FEFO mutates **ledger** without `order_batch_allocations`. That is the dual-store split.

**Source of truth (recommendation for F.4, not applied):** treat **PISD `available_quantity` + `reserved_quantity`** as sellable truth for reservation/issue, matching `StockReservationService`. Sync ledger in the **same transaction** or stop using ledger for new issue paths. Do not add a third quantity table.

F.4 Draft stock should:

- Allocate with `SELECT … FOR UPDATE` on PISD rows.
- FEFO: `expiry_date ASC`, skip expired, depot-scoped.
- Write `*_batch_allocations` FK to Draft header (mirroring `order_batch_allocations`), not `order_id`.
- Never call reservation and ledger FEFO independently.

## 8. Inventory reconciliation concerns

Live: ledger available **13000**, PISD available **10635**. The gap is pre-existing, not caused by Draft tables.

Before F.4 stock:

1. Disposable report: per product+batch+depot, ledger vs PISD vs `product_item_stock.stock_qty`.
2. Decide which side is corrected; do not silently average.
3. Add a balance invariant test: `quantity ≈ available + reserved` on PISD after reserve/release/issue.
4. Cover: double allocate (second reserve 400), concurrent two documents (row lock), negative stock impossible, rollback on mid-loop failure, no silent partial fill (all-or-nothing TX), cancel releases reserved, returns restore original batch, expired batches skipped, status transitions idempotent.

Do not change live quantities in F.3.3.

## 9. Controlled activation procedure

**Do not run now.** After written approval:

1. **Eligibility:** admin/manager set `product_type_sample` / `product_type_export` on agreed SKUs in master data. Confirm counts > 0. No demo SKUs.
2. **Authorization:** confirm admin/manager-only writes; PSO still 403.
3. **Flags:** set `SAMPLE_GIFT_DRAFT_WRITES=yes` and/or `EXPORT_DRAFT_WRITES=yes` in Compose (keep `ENVIRONMENT` policy). Do not set `ALLOW_LIVE_ALEMBIC`.
4. **Restart:** `docker compose up -d --no-deps --force-recreate backend` only.
5. **Process check:** flags True; GET lists `[]` or existing drafts; POST 403 for `user`.
6. **Approved test document:** one Sample/Gift Draft and/or one Export Draft on a **non-operational** SKU/depot, numbered `SG-TEST-…` / `EX-TEST-…`. Confirm list/detail. **No stock, no invoice.**
7. **Retention:** keep the test Draft as Draft or delete via a documented SQL/API cleanup on the test number only. Do not delete commercial rows.
8. **Counts:** orders, ledger, PISD, invoices unchanged except documented Draft tables.
9. **Rollback:** flags back to `no`, recreate API. Existing Draft rows remain readable; POST 403.
10. **Monitor:** `audit_logs` if create logging is added; otherwise application logs and table counts.

## 10. Deployment security risks

| Risk | Current | Separate hardening task |
|---|---|---|
| Uncommitted D.4–F.3 application code | Large dirty tree besides Alembic/docs/Compose | Commit reviewed application slices |
| `ENVIRONMENT=development` | Compose | production profile |
| `SECRET_KEY=your-secret-key-change-in-production` | Compose | rotate; do not commit secrets |
| DB role | `swift_user` owns the database | runtime vs migrator split (D.6) |
| Alembic | live refuse unless `ALLOW_LIVE_ALEMBIC=yes` | keep Compose free of that variable |
| Backups | `…121426.dump` (pre-F.3.2), `…123200.dump` (post-F.3.2, SHA `c132c384…8bb581`) | scheduled dumps |
| Write flags | persisted `no` | leave `no` until §9 |

This phase did not rotate secrets, revoke roles, or change live credentials.

## 11. Backend test results

| Run | Result |
|---|---|
| First pytest in API container | **12 failed, 94 passed** — write tests inherited Compose `*_DRAFT_WRITES=no` |
| After `conftest.py` forces flags **yes** for pytest only | **106 passed** |
| Flag-off tests | still 403 via monkeypatch |
| Disposable PG CRUD | §2 |
| Autogenerate on live copy | empty `pass`; probe deleted |

`conftest.py` does **not** enable live writes. Live Compose remains `no`.

## 12. Frontend test results

| Command | Result |
|---|---|
| `npm test` | **9 passed** |
| `npm run build` | exit 0 |

**Limitation:** no authenticated browser walkthrough of list/form/detail. Empty catalog and Print-disabled behavior were inspected in source, not clicked in a real session.

## 13. Database preservation evidence

| Metric | Live after F.3.3 |
|---|---|
| Revision | `f3_export_draft` |
| Tables | 82 |
| Draft rows | 0 / 0 |
| orders | 131 |
| stock available ledger / PISD | 13000 / 10635 |
| invoices | 5 |
| Product flags | all false (unchanged) |

Disposable `f33_app` was dropped. Live was not written except the F.3.2 schema already in place.

## 14. Unconfirmed business decisions

1. PSO Draft create (`orders.write` vs keep admin/manager).
2. Gift eligibility vs `product_type_sample`.
3. Enforce product flags on the API.
4. Whether Draft stock uses PISD, ledger, or a synced pair.
5. Rejected vs return-to-Draft.
6. Export consignee field.
7. Export invoice reference vs commercial `invoices`.
8. Whether F.4 may post invoices or receivables (**default no**).
9. Submit/approve UI vs API-only.
10. Partial fulfillment allowed or all-or-nothing.
11. Returns for Sample/Gift.
12. Print/PDF layout.

## 15. Recommended Phase F.4 implementation sequence

Only after §14 items that affect stock and roles are written down.

1. Reconcile PISD vs ledger on disposable; pick source of truth.
2. Enforce product eligibility on POST/PUT.
3. Status column + submit/approve/reject APIs, **no stock**.
4. Allocation table + reserve/release using `StockReservationService` patterns (`FOR UPDATE`, all-or-nothing).
5. Issue on dispatch; tests that commercial reservation still passes.
6. Optional pick/dispatch/deliver if product wants UI.
7. Export documentary fields (consignee) if approved; **no auto-invoice**.
8. Print last.

Do not combine stock with the first status API if tests are not green.

## 16. GO / NO-GO

| Question | Verdict |
|---|---|
| Enable live `SAMPLE_GIFT_DRAFT_WRITES` / `EXPORT_DRAFT_WRITES` now | **NO-GO.** Zero eligible products; PSO policy unsigned; no signed test-document plan. |
| Start F.4 inventory/approval coding now | **NO-GO** until source of truth and role matrix are approved. Dual-store drift (13000 vs 10635) is a blocker for safe issue. |
| Keep schema deployed, flags off, lists empty | **GO** — current production-safe posture. |
| Activate Draft later | **GO** only via §9 after product flags + written authorization. |

Draft modules are **deployed and read-ready, write-gated**. They are not warehouse execution.
