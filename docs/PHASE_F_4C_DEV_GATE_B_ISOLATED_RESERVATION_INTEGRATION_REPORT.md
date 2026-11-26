# F.4C-DEV Gate B — Isolated Reservation Integration Report

**Status: PROVISIONAL / TEST-ONLY — NOT BUSINESS APPROVED**

Date: 26 November 2026  
Official F.4 file: `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` remains **unsigned**. A1–C8 remain **Pending**. F.4B Gate B remains **BLOCKED**. W1–W15 remain **Pending**.

Option 1 (isolated development/testing) only. Dummy identities are not warehouse owners. This report does not authorize live reservation, issuance, ledger correction, F.4C production, F.4D, or F.4E.

---

## 1. Files reviewed and changed

Reviewed (not exhaustive): Gate A architecture report; warehouse policy register; F.4B.2/F.4B.3-DEV reports; F.4 business policy approval; `isolated_inventory_simulation.py`; Gate A unit/PG tests; `isolated_workflow_app.py`; `api_app.py`; `isolated_runtime.py`; `draft_workflow_execution.py`; `draft_workflow.py`; Sample/Gift and Export models/schemas; `StockReservationService` (untouched); PISD / PIS / StockLedger / OrderBatchAllocation; JWT, depot scope, audit; isolated E2E runner and seed.

Changed:

| Path | Role |
|---|---|
| `backend/app/services/isolated_inventory_simulation.py` | Lines, audit, header extras; disposable allowlist (`f4c*`, `f4b2*`, `reneta_e2e`, sqlite). Still no FastAPI import. |
| `backend/app/services/isolated_document_reservation.py` | **New.** Document adapter: lock, FEFO, reserve/release, integrity. |
| `backend/app/routers/isolated_inventory.py` | **New.** Isolated-only HTTP routes. |
| `backend/app/api_app.py` | Mount reservation router **only** when `isolated_workflow=True`. |
| `backend/isolated_workflow_app.py` | Allow `f4c*` DBs; create isolated schema via adapter (does not import the simulator module by name). |
| `backend/app/schemas.py` | Isolated reserve request/response models. |
| `backend/tests/test_f4c_dev_isolated_reservation_api.py` | **New.** HTTP auth, FEFO, lifecycle, integrity. |
| `backend/tests/test_f4c_dev_pg_reservation_concurrency.py` | **New.** Disposable PG 16 races. |
| `e2e/draft-modules/seed_isolated.py` | Synthetic lots on `reneta_e2e` only. |
| `e2e/isolated-workflow/reservation.spec.ts` | **New.** Isolated API Playwright. |
| `docs/PHASE_F_4C_WAREHOUSE_POLICY_DECISION_REGISTER.md` | Gate B test-assumption note. **Pending decisions unchanged.** |

Uncommitted prior work was preserved. Production Compose, Alembic, and `main:app` process were not restarted or migrated.

---

## 2. Isolated architecture

Reservation is a second isolated FastAPI surface on the existing `create_api_app(isolated_workflow=True)` entrypoint (`isolated_workflow_app:app`).

- Core simulator stays independently testable (no FastAPI in `isolated_inventory_simulation.py`).
- Adapter `isolated_document_reservation.py` talks to Iso tables + draft documents.
- Routes register only when `app.state.isolated_workflow` is true.
- Startup / schema create refuse `swift_distro_hub` and non-allowlisted names (`reneta_e2e`, `f4b1b_iso`, prefixes `f4c`, `f4b2`, `reneta_e2e`; sqlite for pytest).
- Positive checks: disposable database allowlist **and** isolated app factory (not a frontend flag).
- `main:app` does not mount `/api/isolated-inventory/*`. Live POST remains **404**.

---

## 3. Synthetic reservation data model

IsoBase `MetaData` only (not `app.database.Base`, not Alembic):

| Table | Contents |
|---|---|
| `f4c_iso_lots` | Synthetic batch balances (quantity / available / reserved). |
| `f4c_iso_reservations` | Header: kind, document id, depot, status, idempotency key, actors, timestamps, remarks. Unique `(document_kind, document_id, idempotency_key)`. |
| `f4c_iso_reservation_lines` | Document item, product, requested/reserved qty. |
| `f4c_iso_reservation_slices` | Lot, batch, expiry, allocated qty, depot, product, item. |
| `f4c_iso_reservation_audit` | Action, actor, from/to status, timestamp. |

Live catalog has **zero** `f4c_iso*` tables. Commercial `order_batch_allocations` is unused.

---

## 4. Reservation APIs

Mounted only on the isolated app, prefix `/api/isolated-inventory`:

- `POST /sample-gift-deliveries/{id}/reserve`
- `POST /export-deliveries/{id}/reserve`
- `GET /sample-gift-deliveries/{id}/reservations`
- `GET /export-deliveries/{id}/reservations`

Body: `idempotency_key` (required), optional `remarks`.

Response: reservation id, document kind/id, status, depot, lines, FEFO slices, timestamps. No invoice or dispatch fields.

---

## 5. Release API

`POST /api/isolated-inventory/reservations/{reservation_id}/release`

- Admin/Manager only (same isolated warehouse actor as reserve).
- Depot hide: foreign depot **404**.
- `RESERVED` → restore available, single RELEASE audit, commit.
- Already `RELEASED` → same payload (idempotent, no second restore, no second audit).
- `ISSUED` → **409**.
- No automatic release on Draft edit or workflow Reject.

---

## 6. Sample/Gift integration

Same adapter `document_kind="sample_gift"`. Approved documents created through isolated Submit/Approve. Reserve is a later explicit POST. Approve does not create Iso reservations (HTTP test). Eligibility uses proposed sample/gift product flags via `require_eligible_products`.

---

## 7. Export integration

Same service with `document_kind="export"`. Separate HTTP paths. FEFO on export-eligible synthetic lots (`EX-EARLY` before `EX-LATE`; `EX-EXPIRED` skipped).

---

## 8. Eligibility and permissions

| Caller | Result |
|---|---|
| Missing JWT | **401** (or 403 if auth middleware treats empty) |
| PSO (`user`) | **403** |
| Billing / finance / transport | **403** |
| Foreign-depot manager | **404** (no recipient/inventory leak) |
| Unknown document | **404** |
| Draft / Submitted / Rejected | **409** |
| Insufficient stock | **409**, no header |
| Empty idempotency key | **422** |
| Admin/Manager, home depot, Approved | **200** |

Backend is authoritative. No production reservation buttons.

---

## 9. FEFO behavior

Decimal-safe `plan_fefo`: expiry ascending, then batch id. Duplicate product lines are one stock demand, then slice assignment per document item. Eligible: document depot, active product, `Unrestricted`, available > 0.

---

## 10. Expiry handling

Test assumptions W3/W4: skip `expiry < as_of`; reject null expiry. Restricted lots excluded. Live expired PISD is **not** quarantined.

---

## 11. All-or-nothing behavior

Any line shortfall raises 409 before commit. Multi-product PG test: second product available 0 → no header, first lot reserved stays 0. Duplicate lines 8+12 against 20 units succeed as one 20-unit hold.

---

## 12. Idempotency and duplicate prevention

- Same document + same key while `RESERVED` → previous reservation.
- Same document + different key while `RESERVED` → **409**.
- Unique constraint on `(kind, document_id, key)`; IntegrityError recovers the winner.
- After release, re-reserve is **fail-closed** (`RERESERVE_AFTER_RELEASE = False`) until W9 is signed.

---

## 13. PostgreSQL concurrency

Disposable PostgreSQL 16 (`f4c_dev`, never `swift_distro_hub`). Lock order: document `FOR UPDATE`, then reservation headers by id, then lots by id. Release: header then lots.

Covered: two documents vs last units; same key concurrent; different keys concurrent; double release (one audit); multi-product rollback; reserve vs available transfer; audit `before_insert` failure rolls back lots.

---

## 14. Audit behavior

`RESERVE` and `RELEASE` rows in `f4c_iso_reservation_audit` in the same transaction as stock math. Audit insert failure rolls back the reservation. Duplicate release does not write a second RELEASE row.

---

## 15. Inventory integrity assertions

`assert_synthetic_inventory_integrity` after reserve/release:

- Non-negative quantity / available / reserved.
- Unissued lots: `quantity = available + reserved`.
- Active slice totals match lot reserved.
- Header lines match slice totals.
- Failures name lot id / batch / reservation id.

Commercial snap (`StockLedger`, PISD, PIS, `OrderBatchAllocation`, orders, invoices, issuances) unchanged on SQLite HTTP tests.

---

## 16. Synthetic test fixtures

Isolated pytest: depots A/B, admin/manager/PSO/billing/finance/transport/foreign manager, sample and export SKUs, expired/early/late/null/restricted lots. Approved documents via isolated workflow HTTP.

E2E seed (`reneta_e2e` only): same lot batch numbers (`SG-EARLY`, `SG-EXPIRED`, `EX-EARLY`, …). Refuses `swift_distro_hub`.

---

## 17. Backend tests

`pytest /app/tests` in `swift_distro_api` with `F4B2_DEV_DATABASE_URL` + `F4C_DEV_DATABASE_URL` (disposable `f4b2_dev` / `f4c_dev` only):

**202 passed**, 218 warnings, 239.35s.

Includes prior commercial reservation, issue, billing, RBAC, order lifecycle, F.4B.2 workflow HTTP, Gate A simulator, new Gate B HTTP (5) and PG reservation races (6). Assertions were not weakened. Docker-in-container skip path remains for hosts without docker CLI; this run used disposable URLs so PG tests executed.

---

## 18. Frontend tests and build

- Vitest: **43 passed** (10 files)
- `npm run build`: **successful** (28.32s, 3394 modules)
- Production `dist/` grep: no `isolated-inventory`, no `IsolatedWorkflowBar`, no isolated test emails

No production reservation UI.

---

## 19. Playwright tests

`npm run test:e2e:isolated`: **26 passed** (3.6m).

Prior 25 plus `e2e/isolated-workflow/reservation.spec.ts`: Approved Sample/Gift and Export reserve; Draft/Submitted 409; expired skipped; FEFO `SG-EARLY` / `EX-EARLY`; insufficient leaves empty history; release restores; retry same key; foreign depot 404; production API 404.

---

## 20. Production isolation evidence

Read-only, Compose API **not** restarted, no live Alembic:

| Check | After Gate B tests |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| public tables | 83 (82 application + `alembic_version`) |
| `f4c_iso*` tables | **0** |
| Sample/Gift / Export rows | 0 / 0 |
| products / sample flag / export flag | 14 / 0 / 0 |
| orders / invoices | 131 / 5 |
| ledger available | 13000 |
| PISD available / reserved | 10635 / 2640 |
| PIS stock_qty | 13275 |
| flags | `SAMPLE_GIFT_DRAFT_WRITES=no`, `EXPORT_DRAFT_WRITES=no` |
| `main:app` POST isolated reserve | **404** |
| `main:app` POST workflow submit | **404** |
| `/health` (API process) | `{"status":"healthy"}` |

---

## 21. Remaining technical gaps

- No isolated frontend reservation UI (deferred).
- Re-reserve after release unsigned (fail-closed).
- Production FEFO still allocates expired stock.
- Production transfer can move reserved units.
- Production issue math still diverges from proposed W12.
- Dual ledger/PISD writers remain (live gap 2365 unexplained by this phase; not “missing stock”).
- No production Sample/Gift or Export allocation tables.

---

## 22. Business approval blockers

- F.4 A1–C8 **Pending**
- F.4B Gate B **BLOCKED**
- W1–W15 **Pending**
- No Warehouse Owner signature; no fabricated approval records

---

## 23. GO / NO-GO recommendation

**NO-GO** for production F.4C, live reservation endpoints, physical issuance, ledger correction, Draft write activation, invoice posting, dispatch, or F.4D/F.4E.

**GO** only to continue Option 1 isolated work (next: optional reservation UI against disposable data). Do not treat this integration as warehouse policy.
