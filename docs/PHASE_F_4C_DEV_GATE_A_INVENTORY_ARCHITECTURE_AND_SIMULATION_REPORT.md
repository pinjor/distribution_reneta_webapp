# Phase F.4C-DEV Gate A — Inventory architecture and isolated simulation

Date: 26 November 2026  
Scope: Read-only live analysis + isolated allocation simulator. **Not production F.4C.** **PROPOSED — WAREHOUSE OWNER APPROVAL REQUIRED.**

Official policy A1–C8: **Pending**. F.4B Gate B: **BLOCKED**. Draft write flags remain **no**. No live stock mutation, no Alembic, no production reservation endpoints, no invoice posting.

---

## 1. Files reviewed and modified

Reviewed: `docs/PHASE_F_3_4_INVENTORY_RECONCILIATION_AND_DECISION_REPORT.md`, `docs/PHASE_F_3_3_DRAFT_ACTIVATION_AND_F4_SPECIFICATION_REPORT.md`, F.4B.2-DEV / F.4B.3-DEV reports, `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md`; models `StockLedger`, `ProductItemStock`, `ProductItemStockDetail`, `OrderBatchAllocation`; `stock_reservation_service.py`; `order_validation_service.py` `_allocate_fefo`; `order_deliveries.allocate_fefo_batches`; `depot_transfers` approve/receive; `stock_maintenance` FEFO GET; `stock_issuance` (GET-only); `db/inventory_rules.py`; audit service.

**Added (isolated only)**

| Path | Role |
|---|---|
| `backend/app/services/isolated_inventory_simulation.py` | In-memory + disposable-PG simulator; **not** imported by `main.py`, `api_app.py`, or `isolated_workflow_app.py` |
| `backend/tests/test_f4c_dev_isolated_inventory_simulation.py` | FEFO / expiry / depot / idempotency / rollback |
| `backend/tests/test_f4c_dev_pg_inventory_concurrency.py` | Disposable PostgreSQL 16 races |
| `docs/PHASE_F_4C_WAREHOUSE_POLICY_DECISION_REGISTER.md` | W1–W15 all **Pending** |

No production routers, flags, or live schema changes.

---

## 2. Existing inventory architecture

Three quantity stores plus an allocation document table:

| Store | Grain | On-hand | Available | Reserved | Issued |
|---|---|---|---|---|---|
| `product_item_stock_details` (PISD) | batch via `item_code` → PIS (product+depot) | `quantity` | `available_quantity` | `reserved_quantity` | not a column; implied by `order_batch_allocations.ISSUED` |
| `product_item_stock` (PIS) | product + depot | `stock_qty` | none | none | accumulator `issue` (live **0**) |
| `stock_ledger` | product + depot + `batch` | `quantity` | `available_quantity` | `reserved_quantity` | none |
| `order_batch_allocations` | order line + batch | n/a | n/a | status `RESERVED` | status `ISSUED` |

**Writers (from code, confirmed F.3.4):**

- Commercial **validation / reserve / release / commit**: PISD only (`StockReservationService`, `SELECT FOR UPDATE` on reserve only).
- Commercial **order delivery FEFO**: ledger only, **no** row lock.
- **Product receipt approve**: ledger quantity/available up.
- **Batch POST** and **depot transfer**: PIS + PISD, not ledger. Transfer approve checks `stock_qty` / PISD `quantity`, **not** `available_quantity`.
- **Stock issuance router**: GET-only; not a quantity writer.
- **Stock adjustment**: document only.
- **Draft Sample/Gift / Export**: no stock writes.

`order_batch_allocations.stock_source_id` stores PISD `id` **without a foreign key**. `ALLOCATED` does not hold stock. Do **not** reuse `order_id` for Sample/Gift or Export.

---

## 3. Source-of-truth analysis

1. Physical on-hand used by warehouse UI: PISD `quantity` (stock maintenance GET reads PISD, not ledger).
2. Available for commercial reserve: PISD `available_quantity`.
3. Reserved commercial holds: PISD `reserved_quantity` = sum of `RESERVED` allocations.
4. Issued: allocation status only; PISD `quantity` is **not** reduced by `commit_for_order`.
5. Batch: PISD `batch_no` + ledger `batch`.
6. Depot: PIS `depot_id`; ledger `depot_id`.
7. Ledger values are a **parallel store**, not a SQL view of PISD.
8. Commercial reservations **do not** update ledger or PIS `issue`.
9. Order delivery create can reserve ledger independently of PISD; delivery advance does not issue on-hand.
10. Transfers can reduce PISD `quantity` and `available` together and **ignore reserved**, so reserved units can leave the depot on paper.

**PROPOSED — WAREHOUSE OWNER APPROVAL REQUIRED:** Option A (PISD authority) with a later optional ledger projection (Option C). Option B (ledger authority) is unsafe as a silent cutover.

---

## 4. Reconciliation findings

Read-only live `swift_distro_hub` on 26 November 2026 **matches** the F.3.4 snapshot. The difference is **not** missing stock.

| Store | quantity / stock_qty | available | reserved |
|---|---:|---:|---:|
| ledger | 13000 | **13000** | **0** |
| PISD | **13275** | **10635** | **2640** |
| PIS | **13275** | — | issue **0** |

Identity still holds:

```
13000 − 10635 = 2365 = 2640 − 275
```

275 = three Khulna (depot 2) PISD batches with **no** ledger row. 2640 = `order_batch_allocations` `RESERVED` (34 rows). PISD `quantity = available + reserved` violations: **0**. ALLOCATED 27 / 2336 is **not** reserved. Expired-but-available: PISD **19 rows / 9160**; ledger **20 / 11800**. PISD null expiry: **0**.

---

## 5. FEFO and expiry risks

| Path | Order | Skips expired? | Skips reserved? | Skips quarantine? |
|---|---|---|---|---|
| `OrderValidationService._allocate_fefo` (PISD) | expiry ASC NULLS LAST, batch | **No** | Yes (`available > 0`) | Unrestricted / Sellable / NULL only |
| `allocate_fefo_batches` (ledger) | expiry ASC | **No** | Yes (`available > 0`) | No status filter |
| `stock_maintenance` GET batches | expiry ASC NULLS LAST | **No** | Yes | No; numeric batch_no only |
| Isolated simulator (test policy) | expiry ASC, then batch | **Yes** | Yes | Non-Unrestricted skipped |

Expired stock **can** be allocated on production FEFO today. Future-expiring is ordered first among whatever is selected (so expired wins if not skipped). Expiry is nullable on both stores. Transfers can allocate already-reserved units.

**No-expiry:** live PISD has none. Proposed test policy **reject** (W4 Pending). Alternative `last` is implemented in the simulator for comparison only.

---

## 6. Sample/Gift reservation design (proposed)

Dedicated tables later (`sample_gift_batch_allocations`), **not** `order_batch_allocations.order_id`.

| Stage | Effect |
|---|---|
| Draft / Submit / Approve | none (W5) |
| Reserve (explicit, after Approved) | FOR UPDATE PISD by `id` ascending; FEFO W3/W4; depot of document; available→reserved; idempotency key |
| Pick | status only |
| Issue / dispatch | reserved− and quantity−; PIS stock_qty− issue+ |
| Delivery confirm | status only |
| Release | reverse reserve |
| Issued cancel | forbidden without returns |

Eligibility: Approved document + sample/gift product policy (F.4 A1–A2 still Pending) + active product + Unrestricted lot. Duplicate reserve: return existing row. Partial: default off (W7). Audit: `STOCK_RESERVE` / `RELEASE` / `ISSUE` on the delivery entity.

---

## 7. Export reservation design (proposed)

Same PISD authority and dedicated `export_batch_allocations`. Same FEFO, locks, depot, release, issue. Export shipping fields stay documentary. **Do not** call ledger `allocate_fefo_batches`. **Do not** post commercial invoices or create customs states in F.4C. Reversal of issued stock is a return process, not Reject.

---

## 8. Isolated simulation architecture

`isolated_inventory_simulation.py`:

- Synthetic lots only (`InMemoryInventoryStore` or disposable tables `f4c_iso_lots` / `f4c_iso_reservations` / `f4c_iso_reservations_slices`).
- Separate SQLAlchemy `MetaData` (not production `Base`).
- Refuses `swift_distro_hub`.
- Decimal arithmetic; `quantity = available + reserved` until issue, then both quantity and reserved decrease.
- Policy object: skip expired, reject or last for null expiry, Unrestricted only, active product, all-or-nothing.
- Idempotency unique `(document_kind, document_id, idempotency_key)`.
- Transfer helper moves **available** only.
- Not reachable from FastAPI.

---

## 9. Concurrency results

Disposable PostgreSQL 16 `f4c_dev` (container `f4c_dev_pg` only).

| Scenario | Result |
|---|---|
| Two reserves 50+50 on 90 | one ok (40/50), one `insufficient` |
| Two reserves of entire 30 | one ok, one fail |
| Reserve vs transfer 25 of 40 | one succeeds; lot stays balanced |
| Reserve vs issue | issue committed; no negative reserved |
| Release vs issue | exactly one terminal status; identity holds |
| Reserve then rollback | available unchanged |
| Duplicate idempotency key | same reservation id; reserved once |
| Multi-batch 6+6 need 10 | M1=6, M2=4 FEFO |

**Required lock order:** `SELECT … FOR UPDATE` lots by **`lot_id` ascending**, then reservation header. Production release/commit/transfer/ledger FEFO still **unlocked** — do not copy that into F.4C.

**Idempotency:** unique key as above; second commit of issue/release is a no-op.

---

## 10. Commercial workflow compatibility

Do **not** replace `StockReservationService` in this phase.

A future unified service could share PISD + FOR UPDATE + FEFO skip rules for:

- Commercial orders (today already PISD reserve)
- Sample / Gift / Export (new allocation tables)

Compatibility tests that must keep passing: `test_stock_reservation.py`, `test_stock_issue.py`, `test_validation.py`, order lifecycle, billing. Risks if F.4C later changes FEFO to skip expired: commercial validation would stop selecting 9160 expired-available units — that is a **warehouse** change, not a silent code tweak.

Ledger delivery FEFO remains a second path until retired or projected in one transaction.

---

## 11. Proposed data model (not created)

Illustrative only. **No Alembic.**

```
sample_gift_batch_allocations
  id, delivery_id FK, delivery_item_id FK, product_id FK,
  batch_no, expiry_date, qty,
  stock_source_id  -- PISD.id (add real FK when authorized)
  status  ALLOCATED|RESERVED|ISSUED|RELEASED
  idempotency_key
  UNIQUE (delivery_id, idempotency_key)
  INDEX (stock_source_id, status)

export_batch_allocations  -- same shape, export FKs
```

Missing today: FK on `order_batch_allocations.stock_source_id`; uniqueness for draft allocations; issued quantity column (prefer deducting PISD `quantity` instead of a fourth number).

---

## 12. Migration requirements

**None in this phase.** Future live F.4C would need warehouse-signed W1–W15, then a migration for dedicated allocation tables only. Do not migrate live quantities between ledger and PISD without W14/W15.

---

## 13. Backend test results

`pytest /app/tests` with `F4B2_DEV_DATABASE_URL` + `F4C_DEV_DATABASE_URL`: **190 passed**, 213 warnings, 147.50s.

Includes prior 162 plus 28 F.4C-DEV simulator/concurrency tests. Commercial reservation, issue, billing, RBAC, order lifecycle: included. Assertions not weakened.

---

## 14. Frontend test/build results

- Vitest: **43 passed**
- `npm run build`: **successful** (15.78s, 3394 modules)

No production UI for reservation.

---

## 15. Playwright results

`npm run test:e2e:isolated`: **25 passed** (3.5m). Existing draft-modules (21) plus isolated workflow UI (4). This phase did not change frontend workflow code.

---

## 16. Live database preservation

Before and after isolated tests (read-only; Compose API not restarted):

| Check | After |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| public tables | 83 (82 application tables + `alembic_version`) |
| Sample/Gift / Export rows | 0 / 0 |
| products | 14 |
| orders / invoices | 131 / 5 |
| ledger available | 13000 |
| PISD available / reserved | 10635 / 2640 |
| PIS stock_qty | 13275 |
| flags | `SAMPLE_GIFT_DRAFT_WRITES=no`, `EXPORT_DRAFT_WRITES=no` |
| `main:app` POST `.../submit` | **404** |
| `/health` | `{"status":"healthy"}` |

---

## 17. Warehouse decision register

See `docs/PHASE_F_4C_WAREHOUSE_POLICY_DECISION_REGISTER.md`. W1–W15 **Pending**. Proposed defaults are engineering recommendations only.

Technical recommendation for W1: **Option A (PISD)**, Option C later for ledger projection. **PROPOSED — WAREHOUSE OWNER APPROVAL REQUIRED.**

---

## 18. Remaining blockers

- Official F.4 A1–C8 unsigned; Gate B blocked.
- W1–W15 unsigned.
- Production FEFO still allocates expired stock.
- Production transfer can move reserved units.
- Production issue does not deduct on-hand.
- Dual ledger/PISD writers remain.
- No production Sample/Gift or Export allocation tables.
- Live SKUs still unclassified; Draft writes off.

---

## 19. GO / NO-GO

**NO-GO** for production F.4C, live reservation endpoints, stock deduction, ledger correction, F.4D, or F.4E.

**GO** only to continue Option 1 isolated/test design using the simulator and this register. Do not treat simulation as warehouse approval.
