# Phase F.3.4 — Inventory Reconciliation, Stock Architecture Audit, and F.4 Decision Readiness

Date: 25 November 2026  
Status: **Investigation complete. Live inventory was not modified. Phase F.4 was not implemented. Draft write flags remain disabled.**

This report does not authorize live stock corrections, Draft write activation, or F.4 coding.

---

## 1. Current inventory snapshot

Read-only against live `swift_distro_hub`. Isolation: `REPEATABLE READ`. Comparisons used two snapshots in the same session window; both confirmed the published totals.

| Field | Value |
|---|---|
| Snapshot A | 2026-11-25 06:45:45.110947+00, `txid_current()` **8719** |
| Snapshot B (detail) | 2026-11-25 06:46:07.199999+00, `txid_current()` **8720** |
| Isolation | `repeatable read` |
| Alembic | **`f3_export_draft`** (single head). Live `alembic current` is refused by `env.py` unless `ALLOW_LIVE_ALEMBIC` (unset). |
| Application tables | **82** |
| Sample/Gift Drafts | 0 |
| Export Drafts | 0 |
| Compose flags | `SAMPLE_GIFT_DRAFT_WRITES=no`, `EXPORT_DRAFT_WRITES=no` |
| `/health` | `{"status":"healthy"}` |

| Entity | Count |
|---|---:|
| products | 14 |
| depots | 3 |
| stock_ledger | 22 |
| product_item_stock | 13 |
| product_item_stock_details | 25 |
| order_batch_allocations | 61 |
| stock_receipts | 0 |
| stock_issuances | 0 |
| stock_adjustments | 6 |
| depot_transfers | 10 |
| delivery_orders | 12 |
| product_receipts | 8 |
| orders | 131 |
| invoices | 5 |

Depots: id 1 Kushtia (`120`), id 2 Khulna (`107`), id 3 Dhaka Central (`115`).

### Store totals (snapshot B)

| Store | quantity / stock_qty | available | reserved / issue |
|---|---:|---:|---:|
| `stock_ledger` | 13000 | **13000** | reserved **0** |
| `product_item_stock_details` | **13275** | **10635** | reserved **2640** |
| `product_item_stock` | stock_qty **13275** | gross_stock_receive 13275 | issue **0** |

`product_item_stock.stock_qty` equals the PISD `quantity` total. Ledger `quantity` equals ledger `available` and is **275** below PISD `quantity`.

### Documents (not quantity stores)

| Table | Status mix |
|---|---|
| delivery_orders | DRAFT 3, PACKING 3, LOADING 2, SHIPPED 2, DELIVERED 2 |
| depot_transfers | PENDING 4, IN_TRANSIT 4, RECEIVED 2 |
| product_receipts | DRAFT 3, APPROVED 5 |
| stock_adjustments | Pending 3, Approved 2, Rejected 1 |

Autogenerate against disposable copy `f34_sim` at `f3_export_draft` produced an empty `pass` revision. Probe file `6bd6ac9b72cf_f34_drift_probe.py` was deleted. No unexpected schema drift.

---

## 2. Per-product / depot / batch stock comparison

### Column meanings (from application code, not names)

**`stock_ledger`** (`backend/app/models.py` `StockLedger`)

| Column | Meaning in live writers |
|---|---|
| `quantity` | On-hand as posted by `product_receipts.post_to_stock_ledger` (increments quantity and available). Delivery create does **not** reduce `quantity`. |
| `available_quantity` | Sellable float used by `order_deliveries.allocate_fefo_batches`. Create delivery subtracts available and adds reserved. Delete delivery reverses that. |
| `reserved_quantity` | Delivery-side hold only. Live total is **0**, so current commercial deliveries did not leave a ledger reservation. |
| Grain | `product_id` + `depot_id` + `batch` |

**`product_item_stock`**

| Column | Meaning |
|---|---|
| `stock_qty` | Header on-hand. Increased by `product_item_stock` batch POST and depot-transfer receive; decreased by transfer approve. **Not** updated by `StockReservationService`. |
| `gross_stock_receive` / `issue` | Receive/issue accumulators. Live `issue` is 0 despite reserved commercial orders. |

**`product_item_stock_details` (PISD)**

| Column | Meaning |
|---|---|
| `quantity` | Batch on-hand. Transfer approve/receive mutates it. Reservation and `commit_for_order` do **not**. |
| `available_quantity` | Sellable. Reservation subtracts; release adds back; transfer approve subtracts with `quantity`. |
| `reserved_quantity` | Hold from `StockReservationService.reserve_allocations`. `commit_for_order` subtracts reserved only. |
| Grain | `item_code` → `product_item_stock` (product + depot) + `batch_no` |

**`order_batch_allocations`**

| Status | Meaning |
|---|---|
| `ALLOCATED` | Validation proposed a batch. **Does not** change PISD unless later reserved. |
| `RESERVED` | PISD available→reserved. Live sum **2640** matches PISD reserved. |
| `ISSUED` | Load/dispatch commit. Live count **0**. |
| `RELEASED` | After release. Live count **0**. |
| `stock_source_id` | PISD `id` (not a FK constraint). Live: 0 missing sources. |

`ALLOCATED` is **not** reserved stock. Treating it as reserved would double-count.

### Exception report (live, no repairs)

| Check | Result |
|---|---|
| Duplicate ledger keys `(product, depot, batch)` | **0** |
| Duplicate PISD keys `(product, depot, batch_no)` | **0** |
| Negative quantity / available / reserved | **0** ledger, **0** PISD |
| PISD `quantity = available + reserved` | **0** violations (all 25 rows) |
| Ledger `quantity = available + reserved` | **0** violations (all 22; reserved always 0) |
| Ledger rows with no matching PISD | **0** |
| PISD rows with no matching ledger | **3** (Khulna depot id 2 / code 107) |
| Orphan PISD / PIS / ledger product or depot | **0** |
| RESERVED allocations without PISD source | **0** |
| Any allocation without PISD source | **0** |
| ISSUED still RESERVED | **none** (ISSUED = 0) |
| Expired (`expiry_date < CURRENT_DATE`) still available | PISD **19** rows / **9160**; ledger **20** rows / **11800** |

PISD-only batches (Khulna, not on ledger):

| depot_id | product | batch | quantity | available | reserved | expiry |
|---|---|---|---:|---:|---:|---|
| 2 | 1 `M01000676` | BATCH-007 | 120 | 120 | 0 | 2027-09-28 |
| 2 | 2 `M03000079` | BATCH-008 | 90 | 90 | 0 | 2027-08-19 |
| 2 | 3 `M04000123` | BATCH-009 | 65 | 65 | 0 | 2027-09-18 |
| **Sum** | | | **275** | **275** | **0** | |

Kushtia overlap (22 batches, depot_id 1 / code 120): **quantity matches 13000 on both stores.** Available differs only where PISD has reserved:

| Overlap | PISD | Ledger |
|---|---:|---:|
| quantity | 13000 | 13000 |
| available | 10360 | 13000 |
| reserved | 2640 | 0 |

Ten overlap batches have available/reserved mismatch; the rest match because reserved is 0. Example:

| product_id | batch | PISD avail | ledger avail | PISD reserved |
|---|---|---:|---:|---:|
| 11 | 2024015 | 0 | 700 | 700 |
| 7 | 2024006 | 117 | 400 | 283 |
| 13 | 2024020 | 43 | 200 | 157 |

No stock rows lack depot or product.

---

## 3. Explanation of the 2365 available-stock difference

Published gap: ledger available **13000** − PISD available **10635** = **2365**.

This is **not** lost inventory. Explicit identity:

```
2365  =  2640  −  275
      =  PISD reserved on shared Kushtia batches
      −  PISD-only Khulna available (no ledger row)
```

Check:

- Overlap PISD available 10360 + Khulna 275 = **10635**.
- Overlap ledger available 13000 − overlap PISD available 10360 = **2640** = PISD reserved = sum of `order_batch_allocations` where `allocation_status = 'RESERVED'`.
- 13000 − 10635 = 2640 − 275 = **2365**.

### Causes that **do** explain the gap

| Cause | Evidence |
|---|---|
| Dual writers | `StockReservationService` mutates PISD only; `order_deliveries` mutates ledger only. |
| Reservations posted only to PISD | Live ledger `reserved_quantity` sum is 0 while PISD reserved is 2640. |
| Extra PISD location | Khulna 275 never copied to ledger. |
| Header vs batch | `product_item_stock.stock_qty` 13275 = PISD quantity, not ledger 13000. |

### Causes that **do not** fully explain 2365

| Hypothesis | Finding |
|---|---|
| Reserved 2640 alone | Over-explains by 275. |
| `ALLOCATED` 2336 | Not deducted from PISD. Current-run ALLOCATED 21 / 1892 plus superseded 6 / 444. |
| `stock_receipts` / `stock_issuances` | 0 rows; issuance router is GET-only. |
| Unposted product receipts | 3 DRAFT receipts exist; approve writes **ledger only**. Does not explain current PISD-high quantity. |
| ISSUED still reserved | ISSUED count 0. |
| Lost units | Shared-batch **quantity** agrees at 13000. |

### Unresolved (not needed to explain 2365, still open)

1. **Why Khulna PISD exists without ledger** — likely transfer receive or manual `product_item_stock` batch POST (`stock_qty`/`available` up, no ledger write). No live UPDATE was run to prove origin timestamps beyond code paths.
2. **Why 9 non-DRAFT `delivery_orders` left ledger reserved at 0** — `advance_delivery_status` never issues ledger quantity; create-delivery would leave reserved > 0. Those deliveries likely never used `allocate_fefo_batches`, or stock was restored another way. **Do not treat ledger reserved=0 as proof that physical stock was issued.**
3. **Expired-but-available 9160 (PISD) / 11800 (ledger)** — FEFO helpers do not skip expired dates (see §6 sim 8). Business must decide whether that stock is sellable.
4. **`product_item_stock.issue` = 0** while 2640 is reserved — issue accumulator is not wired to reservation/commit.

---

## 4. Inventory writer matrix

Callers share the FastAPI request session unless noted. Rollback is the request transaction unless a method `db.commit()`s mid-flow.

| Operation | Endpoint / service | Tables | Columns | TX / lock | FEFO | Reservation rows | Idempotency | Double-update risk | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| Validate order | `OrderValidationService.validate_order` | PISD; `order_batch_allocations`; validation runs | PISD available−, reserved+; alloc status RESERVED | One commit; **`with_for_update` on PISD** in reserve | PISD expiry ASC, **no expiry skip** | Yes | Re-validate releases then re-reserves | Does not touch ledger | HTTPException before commit rolls session |
| Approve exception | `approve_exception` | same | same | commit; FOR UPDATE on reserve | same | Yes | Can re-reserve ALLOCATED rows | Ledger untouched | same |
| Release | `release_for_order` via DELETE order, re-validate, `validation.py` | PISD; allocations | available+, reserved−; status RELEASED | **No FOR UPDATE** | n/a | Yes | Only RESERVED rows | Ledger untouched | request TX |
| Issue / commit | `commit_for_order` on load (orders.py ~1715, ~1954) and assigned status “Out for Delivery” (~2629) | PISD; allocations | **reserved− only**; status ISSUED; **quantity unchanged** | **No FOR UPDATE** | n/a | Yes | Second call issues 0 (filters RESERVED) | Ledger, PIS `stock_qty`/`issue` unchanged | after first load `commit()`, second commit is a new TX |
| Delivery FEFO create | `order_deliveries.build_delivery_items` | **ledger** | available−, reserved+; quantity unchanged | **No FOR UPDATE** | ledger expiry ASC, **no expiry skip** | No `order_batch_allocations` | None | Can hold same SKU already reserved on PISD | request TX |
| Delivery delete | `DELETE /order-deliveries/{id}` | ledger | reverse available/reserved | no lock | n/a | n/a | none | PISD unchanged | request TX |
| Delivery advance | `POST .../advance` | `delivery_orders` status only | none on stock | — | — | — | — | Never issues on-hand | — |
| Product receipt approve | `post_to_stock_ledger` | **ledger** | quantity+, available+ | no lock | n/a | n/a | Second approve 400 | PISD unchanged | request TX |
| Batch POST | `product_item_stock` details POST | PISD + PIS | PISD insert; `stock_qty`+, `gross_stock_receive`+ | no lock | n/a | n/a | duplicate batch 400 | Ledger unchanged | request TX |
| Transfer approve | `depot_transfers` | PIS + PISD source | `stock_qty`−, `issue`+; PISD quantity−, available− | no FOR UPDATE; checks `stock_qty` not PISD available | n/a | n/a | status gate | Ledger unchanged; can ignore reserved | request TX |
| Transfer receive | same router | PIS + PISD dest | stock_qty+, receive+; PISD qty+ avail+ | no lock | n/a | n/a | status IN_TRANSIT | Ledger unchanged — **Khulna-only batches** | request TX |
| Stock adjustment | `stock_adjustment.py` | `stock_adjustments` + items | **document only** | — | — | — | — | Does not change inventory | — |
| Stock issuance | `stock_issuance.py` | GET `stock_issuances` | none | — | — | — | — | Dead as a quantity writer | — |
| Stock receipt (old) | `stock_receipt.py` | documents | none found on PISD/ledger | — | — | — | — | — | — |
| Stock maintenance GET | `stock_maintenance.py` | reads **PISD** as “ledger” API | none | — | lists FEFO by PISD expiry | n/a | n/a | UI may believe it is ledger | n/a |
| Draft Sample/Gift / Export | draft routers | draft tables | none on stock | flags off | n/a | n/a | n/a | n/a | n/a |

### Ledger without PISD

- Product receipt approve
- Order delivery create / delete
- (Not) reservation, transfer, batch POST

### PISD without ledger

- `StockReservationService` reserve / release / commit
- Depot transfer approve / receive
- Product item stock batch POST
- Order validation FEFO (`_allocate_fefo`)

That split is the architecture that produced 2365, not a one-off data error.

---

## 5. Confirmed invariant definitions and violations

Seed helper `backend/db/inventory_rules.py` defines `on_hand = available + reserved` and `deduct_delivered` which **reduces quantity**. Production `commit_for_order` does **not** implement `deduct_delivered`. Tests (`test_stock_issue.py`) only assert reserved→0 and status ISSUED.

### Valid **today** (live data, ISSUED = 0)

| Invariant | Live |
|---|---|
| PISD `quantity = available + reserved` | Holds (0 breaks) |
| Ledger `quantity = available + reserved` | Holds (reserved 0) |
| available ≥ 0, reserved ≥ 0 | Holds |
| Reserved allocation has a PISD row | Holds |
| ISSUED cannot be reserved again | Holds by `commit_for_order` filter; live unused |

### Valid in **code**, broken after first issue (simulated)

After `commit_for_order`: available already reduced at reserve, reserved returns to 0, **quantity stays**. Then `quantity ≠ available + reserved`. That is the **correct production equation until F.4 changes commit**:

```
quantity  =  available  +  reserved  +  issued_but_not_deducted
```

Issued is stored only as allocation status, not a PISD column. Live has no such rows yet.

### Not enforced

| Claim | Reality |
|---|---|
| Expired batch cannot be newly reserved | **False.** `_allocate_fefo` and `allocate_fefo_batches` only require `available_quantity > 0`. Sim 8 reserved expired `F34-EXP`. |
| One business event cannot be issued twice | **Partially true** for `commit_for_order` (RESERVED filter). Delivery create has **no** idempotency key. Load + “Out for Delivery” can both call commit; second is a no-op if already ISSUED. |
| Transfer cannot over-issue reserved stock | **False.** Transfer approve checks `stock.stock_qty` and `stock_detail.quantity`, not `available_quantity`. Reserved units can be transferred. |
| Ledger and PISD available stay equal | **False** by design of dual writers. |

Live expired-available: 19 PISD rows (9160), 20 ledger rows (11800). Not a numeric “violation” of a coded rule; they violate the **desired** FEFO rule if expired stock is unsellable.

---

## 6. Disposable PostgreSQL simulations

Database `f34_sim` restored from verified post-F.3.2 dump `20261125_123200.dump`, PostgreSQL 16, revision `f3_export_draft`. **Not live.** Dropped after the run.

Baseline on restore matched live: ledger available 13000, PISD 10635 / reserved 2640 / qty 13275, 34 RESERVED, 0 ISSUED.

Synthetic SKU `F34SIM` was inserted only on `f34_sim`. Existing commercial rows were not used as mutation targets except as the unchanged baseline.

| # | Scenario | Result |
|---|---|---|
| 1 | Reserve 10 | PISD 100→90 available, 0→10 reserved, status RESERVED. Ledger unchanged. |
| 2 | Release | 1 row released; 100 / 0. |
| 3 | Issue (`commit_for_order`) | reserved 0, **available stays 90**, **quantity stays 100**, status ISSUED. |
| 4 | Repeat issue | **n=0**, status remains ISSUED. |
| 5 | Insufficient 999 vs 90 | HTTP 400; available remains 90. |
| 6 | Concurrent FOR UPDATE 50+50 on 90 | One `ok` (40 left), one `short` (40). **No oversell.** |
| 7 | Multi-item reserve then missing `stock_source_id` | HTTP 400; available unchanged (40). Session rollback. |
| 8 | Validation FEFO vs expired batch | Selected **`F34-EXP` (expiry 2020-01-01)** first. |
| 9 | Cancel after reserve | Covered by sim 2 (`release_for_order`). |
| 10 | Commercial delivery FEFO helper | Allocated ledger `F34-LED`; available 80→70, reserved 0→10, quantity 80. **PISD rows for that batch: 0.** |

End snapshot (sim DB only): ledger available 13070 / reserved 10; PISD 10725 / 2690 / 13425; ISSUED 1. Expected from inserted 80 ledger + 150 PISD (100+50) minus issued/reserved effects.

---

## 7. Concurrency and idempotency findings

| Topic | Finding |
|---|---|
| PISD reserve | `SELECT … FOR UPDATE` serializes. Concurrent extra demand fails 400 instead of going negative. |
| PISD release / commit | **Unlocked.** A transfer or second session can mutate the same batch between read and write. |
| Ledger FEFO | **Unlocked.** Two delivery creates can oversell the same `available_quantity`. |
| Commit idempotency | Safe for a second `commit_for_order` on the same order. |
| Reserve idempotency | Re-validate releases first. Exception-approve on already RESERVED rows would attempt to reserve again (would 400 if available already reduced). |
| Delivery create | No document-level idempotency key. |
| Partial fill | Validation records shortfall; reserve is all-or-nothing inside one call (failed item raises, earlier items in the same flush roll back if the request rolls back). |
| Double-deduction across stores | **Yes, structural:** validated order (PISD reserved) + `order_deliveries` create (ledger reserved) for the same SKU **without a shared allocation**. Live ledger reserved is 0 so this has not currently reduced both availables for the same event, but the paths still exist. |
| Quantity after issue | Physical on-hand (`quantity`) is **not** reduced. A later reserve can only see `available`, so it will not re-sell issued units **until/unless** something adds available back without restoring quantity. Transfer using `quantity` can still move issued-but-undeducted units. |

---

## 8. Source-of-truth recommendation

### Option A — PISD as reservation and issuance authority

Matches `StockReservationService`, order validation, stock maintenance UI reads, and live reserved 2640.

**Pros:** locking already exists on reserve; allocation `stock_source_id` already points at PISD; commercial order path already depends on it.  
**Cons:** receipts and delivery FEFO still write ledger; reporting that reads ledger will ignore reservations and Khulna batches; `commit_for_order` must be extended to deduct `quantity` (and PIS `stock_qty`/`issue`) or issued stock will break `quantity = available + reserved`.

### Option B — `stock_ledger` as authority

Matches receipt approve and delivery FEFO.

**Pros:** fewer rows (22), used by product receipts.  
**Cons:** no row locks; reserved always 0 in live; validation would have to be rewritten; Khulna 275 would disappear from sellable stock if ledger is copied over PISD; **unsafe as a silent overwrite.**

### Option C — Synchronized transaction model on existing tables

Every quantity event updates PISD (authority) and ledger (projection) in **one transaction**, same batch key.

**Pros:** reporting and delivery helper stay consistent.  
**Cons:** migration of 3 PISD-only rows and 2640 reserved onto ledger; delivery helper must switch to PISD locks or both writes; more failure surface.

### Recommendation

**Option A for operational reservation/issue, with Option C as a follow-on projection** — not an automatic live cutover.

- **Authority:** `product_item_stock_details.available_quantity` + `reserved_quantity`, depot via `product_item_stock`.
- **Issued:** allocation status plus a future deduction of `quantity` (and header `stock_qty`/`issue`) in the same TX as ISSUED.
- **Ledger:** stop using it as a second sellable balance for new Sample/Gift, Export, and commercial issue. Either (1) update it as a projection in the same TX, or (2) freeze it for receipts-only until a dedicated reporting rebuild. **Do not** `UPDATE` live ledger from PISD without the §9 process.
- **Do not** add a third quantity store.
- **Do not** reuse `order_batch_allocations.order_id` for Draft documents.

Business must still approve whether Khulna 275 is real stock and whether expired 9160 is sellable.

---

## 9. Non-destructive reconciliation strategy

No live `UPDATE` scripts are provided.

1. **Freeze / snapshot** — maintenance window; `REPEATABLE READ` or `pg_dump` custom format; record `now()`, `txid_current()`, Alembic revision, and the three store totals.
2. **Backup verification** — restore dump to a disposable cluster; checksum; confirm 82 tables and `f3_export_draft`; confirm 13000 / 10635 / 2640 before any dry-run.
3. **Source-of-truth approval** — written acceptance of Option A (and whether ledger becomes projection or is retired from FEFO).
4. **Per-batch review** — worksheet: 22 overlap rows (qty match; 10 reserved diffs), 3 Khulna-only, expired-available list, ALLOCATED-but-unreserved 2336 (do **not** add to reserved).
5. **Business sign-off** — especially Khulna 275, expired 9160, and whether ISSUED should reduce on-hand going forward.
6. **Idempotent adjustment records** — if corrections proceed later, insert `stock_adjustments` (or a dedicated reconciliation document) **and** then post through **one** writer. Do not overwrite one store with the other in a single `UPDATE … FROM`.
7. **Dry-run** — on a disposable restore only: preview row-level before/after; no live apply.
8. **Before/after validation** — PISD qty = avail + reserved (or + issued if that column is added); PIS `stock_qty` = sum of PISD qty; reserved = sum RESERVED allocations; ledger projection matches if Option C is chosen.
9. **Rollback** — restore the dump taken in step 1; do not reverse by copying the other store.
10. **Audit** — `audit_logs` per document; retain the signed worksheet; forbid `ALLOW_LIVE_ALEMBIC` for data fixes.

Eventual live corrections require a **separate approval**. This phase did not apply any.

---

## 10. Sample/Gift stock architecture proposal

Prerequisite: Option A approved; eligibility flags set; Draft writes still off until F.4B/C.

Do **not** attach Draft lines to `order_batch_allocations.order_id`. When F.4C is authorized, add **dedicated** tables (names illustrative, not created now): `sample_gift_batch_allocations` with `delivery_id`, `delivery_item_id`, `product_id`, `batch_no`, `expiry_date`, `qty`, `stock_source_id` → PISD id, `status`, `idempotency_key`.

| Stage | Stock effect |
|---|---|
| Draft / Submit / Approve | none |
| Reserve | FOR UPDATE PISD; FEFO `expiry_date ASC` **skip expired and status not Unrestricted/Sellable**; depot of the document only; available→reserved; allocation RESERVED. All-or-nothing. |
| Pick | status only unless a bin field is added later |
| Dispatch / issue | reserved→; **quantity−**; PIS `stock_qty`− `issue`+; allocation ISSUED; optional ledger projection in same TX |
| Delivery confirm | status only if already issued |
| Cancel before reserve | status only |
| Cancel reserved | release like `release_for_order` with FOR UPDATE |
| Cancel issued | **forbidden** unless returns |
| Return | restore original `stock_source_id` batch: quantity+, available+ |

Isolation: `READ COMMITTED` + row locks is enough if every stock mutation uses `FOR UPDATE` on PISD. Concurrent Drafts against one batch: second 400. Double-issue: unique `(delivery_id, stock_source_id, idempotency_key)` and ISSUED filter. Audit `STOCK_RESERVE` / `STOCK_ISSUE` / `STOCK_RELEASE` / `STOCK_RETURN`.

Partial fulfillment: **default off** (match current validation: no silent short ship) until product signs otherwise.

---

## 11. Export stock architecture proposal

Same PISD authority and dedicated `export_batch_allocations` (not `order_id`). Same FEFO, locks, issue, cancel, return rules.

Export-specific:

- Unit price and `total_value` remain **documentary**. Do not post `invoices` unless finance approves (default **no** in F.4).
- Batch may be optional on Draft and **required at Reserve**.
- Consignee is still missing; do not invent a customer FK for stock.
- Invoice print and commercial invoice numbering are F.4E, after stock issue is idempotent.

Do not create a second Export quantity table. Do not call `allocate_fefo_batches` (ledger) from Export dispatch.

---

## 12. Product eligibility and authorization decision register

Live: all 14 products have `product_type_sample/export/commercial/institutional` = **false**. No `product_type_gift`. Draft APIs accept any `product_id` if writes were on. Writes: `require_role("admin","manager")` + env flag. Reads: JWT, depot-scoped. PSO write: **not** granted.

| # | Decision | Existing | Recommended default | Alternatives | Consequences | Owner |
|---|---|---|---|---|---|---|
| 1 | Sample eligibility | UI filters `product_type_sample`; API does not | Enforce flag on API 400 | Allow any SKU | Empty picker until flags set | Product |
| 2 | Gift eligibility | Same module as Sample; no gift flag | Share `product_type_sample` | New column; any SKU | Schema vs dual use of sample stock | Product |
| 3 | Export eligibility | UI `product_type_export` only | Enforce on API | Commercial SKUs allowed | Mix of domestic/export stock | Product + export ops |
| 4 | Backend flag enforcement | None | F.4A 400 on mismatch | UI only | Bypass via API | Engineering after product |
| 5 | Who creates Drafts | admin/manager + flag | Keep | PSO via `orders.write` | Field-created stock demand | Product + HR |
| 6 | PSO write | 403 | Stay 403 | Grant create-only | More Drafts, weaker control | Product |
| 7 | Who submits | not built | admin/manager | PSO | Extra status without stock | Product |
| 8 | Who approves | not built | manager/admin, not PSO | Finance for Export value | Blocking queue | Product + finance |
| 9 | Who reserves | not built | inventory.write + warehouse/manager | Any approver | Wrong depot reservations | Warehouse |
| 10 | Who dispatches | not built | transport / `orders.status` analogue | Warehouse only | **No new RBAC code until signed** | Warehouse + transport |
| 11 | Partial fulfillment | commercial validation can be short; reserve is all-or-nothing | **No silent partial** Draft issue | Allow short with reason | Allocation complexity | Product + warehouse |
| 12 | Cancel after issue | not built | **No**; use return | Admin override | Stock holes | Warehouse + finance |
| 13 | Returns | not built | Restore original batch | Scrap / quarantine status | Need status on PISD | Warehouse |
| 14 | Export invoice posting | string reference only | **Do not** insert `invoices` | Post AR | Billing regression | Finance |
| 15 | Print | UI disabled | F.4E after issue idempotency | Print Draft watermark | Unissued paper | Compliance |

No role or flag changes in this phase.

---

## 13. Backend and frontend test results

| Suite | Result |
|---|---|
| Full backend pytest (`swift_distro_api`, SQLite in-memory) | **106 passed**, 167 warnings, 142.29s |
| `test_stock_reservation.py` | included in 106 |
| `test_stock_issue.py` | included; does not assert `quantity` after issue |
| Order lifecycle / validation / billing / depot isolation | included in 106 |
| Sample/Gift + Export Draft tests | included; flags forced **yes** in `conftest.py` only |
| Frontend vitest | **9 passed** (2 files) |
| Frontend `vite build` | **success** (chunk-size warning only) |
| Disposable PostgreSQL | §6 simulations on `f34_sim`; dropped after |
| Alembic drift | autogenerate **empty** on `f34_sim`; probe deleted; live Alembic not executed |
| Live read-only health | `/health` healthy; revision `f3_export_draft`; 82 tables |

`backend/tests/conftest.py` sets `SAMPLE_GIFT_DRAFT_WRITES=yes` and `EXPORT_DRAFT_WRITES=yes` **after** `DATABASE_URL` so pytest does not inherit Compose `no`. Live Compose remains `no`. Flag-off tests still monkeypatch to 403.

---

## 14. Live data preservation

| Check | After F.3.4 |
|---|---|
| Alembic | `f3_export_draft` |
| Tables | 82 |
| Draft tables | 0 + 0 rows |
| stock_ledger available | **13000** |
| PISD available / reserved / quantity | **10635 / 2640 / 13275** |
| Write flags | `no` / `no` |
| `ALLOW_LIVE_ALEMBIC` | unset |
| Live migrations | **none** |
| Live stock UPDATEs | **none** |
| Disposable `f34_sim` | **dropped** |
| Uncommitted application work | preserved (this phase added this report only; autogenerate probe removed) |

---

## 15. Recommended F.4 implementation phases

Do not start a phase until its prerequisites and named approvals exist.

| Phase | Scope | Prerequisites | Independently testable |
|---|---|---|---|
| **F.4A** | Product eligibility validation; API 400 on flags; Gift = sample flag unless a column is approved | Product owner lists SKUs; no auto-flagging | pytest 400/200 on create with/without flags; UI picker still empty until flags |
| **F.4B** | Submit / approve / reject **without stock** | Decision register §12 rows 5–8 signed | State machine tests; live stock totals unchanged |
| **F.4C** | Unified reservation: PISD authority, dedicated Draft allocation tables, FOR UPDATE, skip expired, commit deducts quantity, optional ledger projection | §8 and §9 signed; F.4B statuses exist | Disposable PG: reserve/release/issue/concurrent/idempotent; **no live quantity rewrite** |
| **F.4D** | Picking, dispatch, issuance, delivery confirm, cancel/return | F.4C on disposable + warehouse sign-off of §12 rows 9–13 | End-to-end Draft on disposable restore |
| **F.4E** | Print documents, Export invoice policy, module polish | F.4D; finance sign-off of print and §12 row 14 | PDF fixtures; billing tests prove invoices unchanged if posting is off |

Commercial dual-path (PISD validation vs ledger delivery) should be folded into F.4C or a sibling **F.4C-commercial** so Draft and commercial orders cannot diverge again. That is still specification until approved.

---

## 16. GO / NO-GO assessment

| Item | Verdict |
|---|---|
| F.3.4 investigation | **GO** — complete |
| Explain 2365 | **GO** — 2640 reserved − 275 Khulna-only; not lost stock |
| Live Draft writes | **NO-GO** |
| Live stock correction | **NO-GO** (needs §9 sign-off) |
| Implement F.4C stock | **NO-GO** until Option A (+ projection choice) is approved |
| Implement F.4A (eligibility only) | **CONDITIONAL GO** after product names SKUs; still no write-flag change required to write the validators behind the existing 403 flag |
| Implement F.4B (status only) | **CONDITIONAL GO** after authorization rows signed |
| Overwrite ledger from PISD or reverse | **NO-GO** |
| New Alembic / new RBAC codes / billing change | **NO-GO** this phase |

**F.3.4 is complete.** Remaining work is decision and later implementation phases, not a live data fix.
