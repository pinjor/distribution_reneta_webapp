# F.4D-DEV Gate A — Fulfillment Architecture and Isolated Simulation Report

**Status: PROVISIONAL / TEST-ONLY — NOT BUSINESS APPROVED**

Date: 26 November 2026  
Official F.4 file remains **unsigned**. A1–C8 **Pending**. F.4B Gate B **BLOCKED**. W1–W15 **Pending**. F.4D D1–D18 **Pending**.

F.4C-DEV Gate C (reservation frontend) was **explicitly skipped** and is not implemented here.

This phase does not authorize production picking, issuance, dispatch, delivery confirmation, live inventory writes, Alembic, Compose changes, or new RBAC codes.

---

## 1. Files reviewed and changed

Reviewed: F.4C-DEV Gate A/B reports; warehouse W1–W15 register; F.4B.2/F.4B.3-DEV reports; F.4 business policy; Sample/Gift and Export models (`sample_gift_deliveries`, `export_deliveries`); isolated workflow and reservation; Iso lots/headers/slices; `ProductItemStock` / `ProductItemStockDetail` / `StockLedger`; `StockReservationService`; `OrderValidationService._allocate_fefo`; `order_deliveries.allocate_fefo_batches`; `picking_orders`; `stock_issuance`; `vehicle_loadings`; `depot_transfers`; invoices; audit; depot scope; `permissions.py`.

Changed / added:

| Path | Role |
|---|---|
| `backend/app/services/isolated_fulfillment_simulation.py` | **New.** Isolated pick/issue/dispatch/delivery state machine + synthetic tables on IsoBase. No FastAPI. |
| `backend/app/services/isolated_inventory_simulation.py` | Disposable prefix `f4d*`; `create_isolated_schema` registers fulfillment tables. |
| `backend/tests/test_f4d_dev_isolated_fulfillment_simulation.py` | **New.** Transition, permission, integrity tests. |
| `backend/tests/test_f4d_dev_pg_fulfillment_concurrency.py` | **New.** Disposable PG races. |
| `docs/PHASE_F_4D_WAREHOUSE_FULFILLMENT_DECISION_REGISTER.md` | **New.** D1–D18 all **Pending**. |
| `docs/PHASE_F_4D_DEV_GATE_A_FULFILLMENT_ARCHITECTURE_AND_SIMULATION_REPORT.md` | This file. |

No production routers, no `main:app` mounts, no Compose edits, no live Alembic.

---

## 2. Existing commercial fulfillment flow

Working vs incomplete, using **actual** routes and tables. An enum is not a workflow.

| Step | Status | API | Tables | State | Inventory | Permissions | Audit | Known issues |
|---|---|---|---|---|---|---|---|---|
| 1. Order create | **Working** | `POST /api/orders/` | `orders`, `order_items` | Draft-like / created | none | `orders.write`, depot | order CREATE | — |
| 2. Order submit | **Working (status only)** | `POST /api/orders/{id}/submit` | `orders` | `SUBMITTED` | none | `orders.write` | none on this handler | No stock |
| 3. Stock validation + reserve | **Working on PISD** | `POST /api/orders/validate` via `OrderValidationService` | `order_validation_runs`, `order_batch_allocations`, `product_item_stock_details` | `APPROVED` / `PARTIALLY_APPROVED` if validated | PISD `available−` `reserved+`; **ledger not reserved here** | `orders.validate` | `VALIDATE`, `STOCK_RESERVE` | FEFO on PISD **does not skip expired**. Release has **no** `FOR UPDATE`. |
| 4. Reservation | **Same as 3** | (inside validate) | `order_batch_allocations.allocation_status=RESERVED` | — | PISD only | — | `STOCK_RESERVE` | Dual store: delivery FEFO uses **ledger**, not PISD. |
| 5. Picking | **Partial / documentary** | `POST /api/picking-orders`, `POST /{id}/approve` | `picking_orders`, `picking_order_deliveries` | Delivery `PACKING` then `LOADING` | **none** | JWT + loading-number depot check | none in router | Not a batch pick list. No picker, no picked qty vs reserved qty. Approving a pick does not issue PISD. |
| 6. Stock issuance | **Incomplete / inconsistent** | `GET /api/stock-issuances/` list only | `stock_issuances`, `stock_issuance_items` | header `Pending` default | **no write path in router** | `inventory.read` on GET | none | Standalone issuance UI table is not the order load path. |
| 7. Delivery create | **Working on ledger** | `POST /api/order-deliveries` | `delivery_orders`, `delivery_order_items` | `Draft` | Ledger `available−` `reserved+` (unlocked FEFO, expired allowed) | JWT + order depot | none | Second reservation writer. Does not read `order_batch_allocations`. |
| 8. Dispatch / load | **Partial** | `POST /api/orders/...` assign/load (`commit_for_order`); vehicle loading exists | `orders.loaded`, `vehicle_loadings` | loaded flag | `commit_for_order`: PISD **reserved− only**; **quantity (on-hand) unchanged** | `orders.assign` / status | `STOCK_ISSUE` | W12 gap: reports still show full on-hand. No lock on PISD at issue. |
| 9. Delivery confirmation | **Status only** | `POST /api/order-deliveries/{id}/advance` | `delivery_orders.status` | `SHIPPED` → `DELIVERED` | **none** (ledger reserved may linger) | JWT | remarks append | No POD, no shortage. |
| 10. Invoice / billing | **Working separately** | `POST /api/invoices/`, `POST /api/invoices/generate-bulk/{challan_id}` | `invoices` | — | none | JWT; bulk requires approved picking challan | none in create | Not tied to Sample/Gift or Export. |

Depot transfers (`/api/depot-transfers`) can move `quantity` / `stock_qty` without requiring `available` (W11). Out of scope to fix here.

---

## 3. Proposed fulfillment lifecycle

Documentary workflow **unchanged**:

```
Draft → Submitted → Approved
Submitted → Rejected (terminal)
```

Fulfillment **starts after Approved** and **after** an explicit reservation (W5). Candidate machine (unsigned):

```
[Approved document] + [RESERVED hold]
        │
        ▼
     PICKING ──confirm──► PICKED ──issue──► ISSUED ──dispatch──► DISPATCHED ──confirm──► DELIVERED
        │                                              │
        │                                              └──fail──► FAILED_DELIVERY
        └──release forbidden by default (D17)
```

**Recommendation: Option B — separate fulfillment entity.**

Why not extend `sample_gift_deliveries.status` / `export_deliveries.status`:

- Existing audit actions (`SAMPLE_GIFT_APPROVED`, etc.) would be mixed with warehouse events.
- Isolated reservation already has `RESERVED` / `RELEASED` / `ISSUED` on `f4c_iso_reservations`, not on the document.
- An Approved document can be `PICKING` in fulfillment while remaining `Approved` on the delivery row.

How that looks:

| Document.status | Reservation.status | Fulfillment.status |
|---|---|---|
| Approved | (none) | (none) — cannot pick |
| Approved | RESERVED | PICKING / PICKED |
| Approved | ISSUED | ISSUED / DISPATCHED / DELIVERED |
| Approved | RELEASED | CANCELLED or absent |
| Rejected | — | no fulfillment |

Do **not** add Reserved/Picking to the Draft status enum in production until D1 is signed.

---

## 4. Picking architecture

Proposed (test-only) fields: pick list id, fulfillment id, reservation id, document kind/id, depot, optional assigned picker, started/completed timestamps, notes.

Lines come **only** from reservation batch slices: product, batch, expiry, reserved qty, picked qty, short qty (= reserved − picked).

Proposed rules (D4–D6, unsigned):

- Cannot pick without `RESERVED`.
- Cannot choose unreserved lots.
- Partial pick **fail closed**.
- Expired or null expiry at pick time **reject**.
- Damaged/missing batch: fail pick; no silent substitute.
- Two pickers: one active pick list per reservation (unique reservation_id).
- Release during pick: **denied** until D17.

No live picking endpoint in this phase.

---

## 5. Stock issuance architecture

Production `StockReservationService.commit_for_order` (called from order load in `orders.py` ~1715, ~1954, ~2629):

```
reserved_quantity -= qty
quantity unchanged
available unchanged
```

After issue, `quantity ≠ available + reserved`. Seed helpers that deduct `quantity` diverge. `stock_issuances` GET does not post those rows onto PISD.

**Proposed issue math (W12 / D8, test assumption):**

| | quantity | available | reserved |
|---|---|---|---|
| Before reserve | 100 | 100 | 0 |
| After reserve 30 | 100 | 70 | 30 |
| After issue 30 | 70 | 70 | 0 |

- PISD: `quantity−`, `reserved−`, `available` unchanged; then identity holds.
- PIS header: `stock_qty−`, `issue+`.
- Ledger: **do not overwrite** in this phase (W14). A later projection job may mirror issued qty.

Issuance once: unique `issue_key` + fulfillment status `ISSUED` + reservation `ISSUED`. Isolated prototype issues only after `PICKED`.

---

## 6. Dispatch architecture

Proposed dispatch record: dispatch id, document type/id, depot, pick ref, issue ref, dispatch date, warehouse actor, optional transport ref, remarks, status, audit.

Sample/Gift optional: recipient already on the document; no vehicle required (D10).

Export optional: reuse `destination_country`, `port_of_loading`, `port_of_discharge`, `shipping_line`, `container_number`, `bl_number` on `export_deliveries`. Do not duplicate as required dispatch columns.

**Dispatch does not deduct stock** in the prototype if issue already ran. Combined issue-at-dispatch is a later signed W12 implementation (one transaction, one deduction).

No carrier APIs.

---

## 7. Delivery confirmation architecture

Lookup by fulfillment/dispatch id. Fields: confirmation date, delivered qty (default = issued), receiver name, optional POD ref, shortage/damage notes, actor, audit.

States: `DISPATCHED` → `DELIVERED` or `FAILED_DELIVERY`. `In Transit` and `Returned` are **not** initial required states (D13–D15).

Failed delivery does **not** reverse issue. Returns unsigned.

No invoice posting. No customer-facing confirmation.

---

## 8. Export-specific requirements

Preserve existing Export columns (`destination_country`, ports, `shipping_line`, `container_number`, `bl_number`, `invoice_number`, `lc_number`, `incoterms`, `payment_terms`, line `batch_number`/`expiry_date`/`unit_price`/`hsn_code`, `total_value` on the response). Fulfillment FKs the export id; it does not rewrite shipping fields.

Optional later: customs status, sailing date, AWB — **not** required to pick or issue.

---

## 9. Sample/Gift-specific requirements

Shared pick/issue/dispatch/delivery. `document_kind` sample vs gift remains on the delivery row. Eligibility still `product_type_sample` (A2). **No** `product_type_gift`. **No** sales invoice on fulfillment (D16). Costing/FOC is Finance Pending.

---

## 10. Security and permissions

Live roles: `admin`, `manager`, `user` (PSO), `billing`, `finance`, `transport` (`permissions.py`). There is **no** warehouse-operator role today.

Proposed matrix (not granted, not coded into production RBAC):

| Action | Admin | Manager | Warehouse op (future) | PSO | Billing/Finance | Transport |
|---|---|---|---|---|---|---|
| View pick list / history | yes | yes | yes | own depot later | no stock batches | view dispatch later |
| Start pick / confirm pick | yes | yes | yes | no | no | no |
| Approve discrepancies | yes | yes | no until signed | no | no | no |
| Issue stock | yes | yes | yes | no | no | no |
| Create dispatch | yes | yes | yes | no | no | proposed later |
| Confirm delivery | yes | yes | yes | no | no | no |
| Release reservation | yes | yes | no | no | no | no |

Do not map `orders.write` or `inventory.write` onto fulfillment. Foreign depot **404**. Isolated simulator enforces write roles `{admin, manager, warehouse}` and depot match.

---

## 11. Concurrency and idempotency

Lock order (deterministic):

1. Fulfillment header `FOR UPDATE` (or reservation header if no fulfillment yet)
2. Reservation header `FOR UPDATE`
3. Lots by `lot_id` ascending

| Race | Outcome |
|---|---|
| Two pickers, same reservation | one PICKING, other conflict |
| Duplicate pick confirm | idempotent if already PICKED |
| Two issue requests | one ISSUED, other conflict; same issue_key returns existing |
| Release vs pick | pick holds reservation; default D17 denies release during PICKING |
| Release vs issue | issue requires PICKED; reservation already held |
| Dispatch vs issue | dispatch requires ISSUED; no second deduction |
| Two delivery confirms | one wins; other conflict; same key idempotent |
| Batch change after reserve | pick uses slice list, not a new FEFO |
| Audit insert failure | transaction rollback; lots unchanged |
| Partial rollback | all-or-nothing per action |

Unique: one fulfillment per reservation; pick/issue/dispatch/delivery idempotency keys.

---

## 12. Isolated fulfillment state machine

Module: `backend/app/services/isolated_fulfillment_simulation.py`.

- No FastAPI; not imported by `main:app` / `api_app.py`.
- Synthetic Iso lots + Gate A/B reservations.
- `assert_disposable_bind` refuses `swift_distro_hub`.
- Tables `f4d_iso_*` on IsoBase only.
- In-memory store for unit tests; Postgres store for row locks.
- Transitions as in §3. Invalid transitions raise `SimulationError`.
- Issue math keeps `quantity = available + reserved`.
- Labeled **provisional**.

---

## 13. Synthetic test scenarios

Covered in pytest (in-memory + PG):

- No reservation → cannot pick
- Reserved → start pick → confirm
- Foreign depot / PSO / billing denied
- Duplicate pick same key idempotent; different key conflict
- Short pick denied
- Expired at pick denied
- Release during pick denied
- Issue before pick denied; issue once; same key idempotent
- Dispatch before issue denied; dispatch once
- Delivery once; failed delivery does not reverse stock
- Terminal transition rejected
- Concurrent pick, issue, delivery
- Audit failure rolls back issue
- Integrity after issue
- Commercial PISD/ledger/order counts unchanged

---

## 14. Proposed data model

**Do not migrate live.** Synthetic tables (IsoBase):

| Table | Purpose |
|---|---|
| `f4d_iso_fulfillments` | Header: reservation_id (unique), document kind/id, depot, status, pick/issue/dispatch/delivery keys, issued_qty, actors |
| `f4d_iso_pick_slices` | Reserved vs picked qty per lot/batch/expiry |
| `f4d_iso_fulfillment_audit` | action, actor, from/to, timestamp |

Logical production proposal (unsigned, not created): `draft_fulfillment_headers`, `draft_pick_lists`, `draft_pick_lines`, `draft_stock_issues`, `draft_dispatches`, `draft_delivery_confirmations`, `draft_fulfillment_audit`. FK to `sample_gift_deliveries` / `export_deliveries` and a future allocation table — **not** `order_batch_allocations`.

Reuse: document headers, depot, employee, Iso reservation slices as the pick source. Do **not** reuse `picking_orders` (loading challan) or `stock_issuances` (orphan list API) without a signed mapping — they do not carry batch-level reserved slices.

---

## 15. Isolated simulator behavior

Happy path: reserve 10 of 50 → available 40 reserved 10 → pick 10 (stock unchanged) → issue → quantity 40 available 40 reserved 0 → dispatch/delivery no further stock change.

---

## 16. Backend tests

`pytest /app/tests` in `swift_distro_api` with disposable `F4B2_DEV_DATABASE_URL` + `F4C_DEV_DATABASE_URL`:

**225 passed**, 219 warnings, 225.23s. **0 skipped** in this run.

Includes commercial orders, stock reservation, billing, F.4B workflow HTTP, F.4C simulator + Gate B reservation, new F.4D in-memory (19) and PG fulfillment races (4). Assertions were not weakened.

---

## 17. Frontend tests and build

- Vitest: **43 passed** (10 files)
- `npm run build`: **successful** (20.98s, 3394 modules)

No fulfillment UI.

---

## 18. Playwright

`npm run test:e2e:isolated`: **26 passed** (3.6m). Existing draft-modules + isolated workflow + reservation API. No new fulfillment UI spec (F.4C-DEV Gate C skipped; this gate has no HTTP).

---

## 19. Production isolation evidence

Before (read-only):

| Check | Value |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| public tables | 83 |
| `f4c_iso*` / `f4d_iso*` | 0 |
| SG / Export | 0 / 0 |
| products / flags | 14 / 0 / 0 |
| orders / invoices | 131 / 5 |
| PISD qty / avail / reserved | 13275 / 10635 / 2640 |
| PIS stock_qty | 13275 |
| ledger available | 13000 |
| Draft flags | no / no |
| main:app reserve / submit / isolated-fulfillment | **404** |
| `/health` | `{"status":"healthy"}` |

After the same queries: **unchanged**. Compose API was not restarted. `f4d_iso*` tables were not created on live.

---

## 20. Test results

| Suite | Result |
|---|---|
| Full backend pytest | **225 passed**, 219 warnings, 225.23s, 0 skipped |
| F.4D in-memory simulator | **19 passed** |
| F.4D PG concurrency | **4 passed** (disposable `f4c_dev`) |
| Vitest | **43 passed** |
| Production Vite build | **passed** |
| Isolated Playwright | **26 passed** |

---

## 21. Remaining technical gaps

- No isolated or production fulfillment HTTP.
- Commercial pick/issue/delivery still dual-write and W12-inconsistent.
- No warehouse-operator role.
- Re-reserve, partial pick, returns, POD, customs unsigned.
- Ledger projection (W14) not designed as a live job.
- F.4C-DEV Gate C skipped.

---

## 22. Business approval blockers

A1–C8 Pending; F.4B Gate B BLOCKED; W1–W15 Pending; D1–D18 Pending. No fabricated signatures.

---

## 23. GO / NO-GO

**NO-GO** for production F.4D, live pick/issue/dispatch/delivery endpoints, PISD/PIS/ledger writes, invoices on Sample/Gift or Export, or RBAC grants.

**GO** only to continue Option 1 isolated design/tests using this register. Simulation is not warehouse approval.
