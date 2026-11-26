# F.4D-DEV Gate B — Isolated Fulfillment API Integration Report

**Status: PROVISIONAL / TEST-ONLY — NOT BUSINESS APPROVED**

Date: 26 November 2026  
Official F.4 file: `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` remains **unsigned**. A1–C8 remain **Pending**. F.4B Gate B remains **BLOCKED**. W1–W15 remain **Pending**. D1–D18 remain **Pending**.

Option 1 (isolated development/testing) only. Dummy identities are not warehouse owners. This report does not authorize live picking, issuance, dispatch, delivery, returns, invoices, RBAC, F.4D production, F.4E, or Phase G. F.4C-DEV Gate C (reservation frontend) remains skipped.

---

## 1. Files reviewed

Gate A architecture and simulator reports; F.4D decision register; F.4C Gate A/B inventory reports and warehouse register; F.4B.2/F.4B.3 isolated workflow reports; F.4 business policy approval; `isolated_fulfillment_simulation.py`; `isolated_inventory_simulation.py`; `isolated_document_reservation.py`; `isolated_inventory.py`; `draft_workflow.py`; `isolated_workflow_app.py`; `api_app.py`; `isolated_runtime.py`; `database.py`; Sample/Gift and Export models; JWT / `require_role` / depot hide; commercial stock issuance (untouched); existing pytest, Vitest, isolated Playwright.

---

## 2. Files added or modified

| Path | Role |
|---|---|
| `backend/app/services/isolated_document_fulfillment.py` | **New.** Document adapter: start pick, confirm, issue, dispatch, deliver/fail, history. |
| `backend/app/routers/isolated_fulfillment.py` | **New.** Isolated-only HTTP routes. |
| `backend/app/schemas.py` | Isolated fulfillment request/response models. |
| `backend/app/api_app.py` | Mount fulfillment router **only** when `isolated_workflow=True`. |
| `backend/isolated_workflow_app.py` | Allow `f4d*` disposable database names. |
| `backend/app/services/isolated_fulfillment_simulation.py` | Payload-aware idempotency hashes; delivery fields; lock fulfillment before reservation on start pick. |
| `backend/app/services/isolated_document_reservation.py` | Isolated-only: document → fulfillment → reservation → lots; block release during active fulfillment; refresh locked reservation after peek. |
| `backend/tests/test_f4d_dev_isolated_fulfillment_api.py` | **New.** HTTP lifecycle, auth, production 404. |
| `backend/tests/test_f4d_dev_pg_fulfillment_api_concurrency.py` | **New.** Disposable PG adapter races. |
| `backend/tests/test_f4d_dev_isolated_fulfillment_simulation.py` | Isolation assertion: simulator still not imported by `main.py`; prefix only inside isolated factory. |
| `e2e/isolated-workflow/fulfillment-api.spec.ts` | **New.** Isolated API Playwright (no UI). |
| `e2e/run-isolated.sh` | Start E2E API processes sequentially so permission seed does not collide. |
| `docs/PHASE_F_4D_WAREHOUSE_FULFILLMENT_DECISION_REGISTER.md` | Gate B lock-hierarchy note. **Pending unchanged.** |

Uncommitted prior work was preserved. Production Compose, Alembic, and `main:app` were not restarted or migrated.

---

## 3. Isolated FastAPI architecture

Fulfillment is a third isolated FastAPI surface on `create_api_app(isolated_workflow=True)` (`isolated_workflow_app:app`).

- Core simulator remains independently testable.
- Adapter talks to Iso tables plus Approved draft documents.
- Routes register only inside `if isolated_workflow`.
- Startup refuses `swift_distro_hub` and non-allowlisted names (`reneta_e2e`, `f4b1b_iso`, prefixes `f4b2` / `f4c` / `f4d`, sqlite pytest).
- Isolation is the empty production slot plus the isolated factory, not a frontend flag and not a production runtime toggle.
- `uvicorn main:app` does not mount `/api/isolated-fulfillment/*`. Live POST remains **404**.

---

## 4. Fulfillment API routes

Prefix `/api/isolated-fulfillment` (isolated app only):

| Method | Path |
|---|---|
| POST | `/sample-gift-deliveries/{id}/picking/start` |
| POST | `/export-deliveries/{id}/picking/start` |
| GET | `/sample-gift-deliveries/{id}/fulfillment` |
| GET | `/export-deliveries/{id}/fulfillment` |
| POST | `/{fulfillment_id}/picking/confirm` |
| POST | `/{fulfillment_id}/issue` |
| POST | `/{fulfillment_id}/dispatch` |
| POST | `/{fulfillment_id}/delivery/confirm` |
| POST | `/{fulfillment_id}/delivery/fail` |
| GET | `/{fulfillment_id}/history` |

Typed Pydantic bodies. Responses are committed store state. Optimistic success is not used.

---

## 5. Sample/Gift integration

Same adapter `document_kind="sample_gift"` for both `document_kind=sample` and `document_kind=gift` rows. HTTP tests create an Approved Sample and an Approved Gift, reserve synthetic lots, then start picking. Document status stays **Approved**. Eligibility flags are not enabled live.

---

## 6. Export integration

`document_kind="export"` on `/export-deliveries/...` routes. HTTP lifecycle: reserve → pick → issue → dispatch → **FAILED_DELIVERY**. Commercial transport tables are not written.

---

## 7. Picking start

Authenticate → `admin` / `manager` / test-only `warehouse` role string → lock document → lock existing fulfillments for the document → lock active `RESERVED` reservation → reject expired/null batches (provisional D6) → create fulfillment + pick slices from reserved slices only → `START_PICK` audit → commit.

Physical stock is unchanged. Foreign depot **404**. Draft/unreserved **409**. Second start with a different key **409**. Same key returns the existing fulfillment.

---

## 8. Picking confirmation

`PICKING` → `PICKED`. Picked quantity must equal reserved quantity per lot (partial picking fail-closed). Batch substitution is not accepted. Stock is not deducted. Duplicate confirm with the same key and payload is idempotent; same key with a different payload is **409**.

---

## 9. Issuance and inventory arithmetic

Only `PICKED` fulfillments issue. Locks: document → fulfillment → reservation → lots by id. Reservation must remain `RESERVED` until issue. Unique issue key.

Provisional math on synthetic lots only:

- Before issue: `quantity = available + reserved`
- On issue: `quantity−`, `reserved−`, `available` unchanged
- After issue: `quantity = available + reserved`; reservation status `ISSUED`

PISD, PIS, ledger, and commercial issuance tables are not updated. HTTP tests snap commercial inventory before/after.

---

## 10. Dispatch

`ISSUED` → `DISPATCHED`. Optional `transport_ref`. No second stock deduction. No production transport or delivery-order row. Unique dispatch key; retry with the same payload returns the committed dispatch.

---

## 11. Delivery confirmation

`DISPATCHED` → `DELIVERED`. Optional receiver, confirmation date, POD reference, remarks. Delivered quantity must equal issued quantity (omit means issued qty). No invoice, no stock restore. Duplicate confirm is idempotent; a later fail is **409**.

---

## 12. Failed-delivery handling

`DISPATCHED` → `FAILED_DELIVERY`. Reason required. Terminal in this provisional model. Issued stock is not restored. No return transaction. Concurrent deliver vs fail: exactly one terminal status, the other **409**.

---

## 13. Authorization and depot isolation

Test assumptions (Gate A matrix), not production RBAC:

| Caller | Result |
|---|---|
| Missing JWT | **401** / **403** |
| PSO (`user`) | **403** |
| Billing / finance | **403** |
| Foreign-depot manager | **404** |
| Admin / Manager / test `warehouse` string | allowed on home depot |
| Unknown document | **404** |

No `PERMISSIONS` codes and no real warehouse-operator role were added. Foreign-depot error bodies do not leak batch quantities.

---

## 14. Idempotency

Every mutating action takes `idempotency_key`. SHA-256 payload hash is stored on the fulfillment header.

- Same action, same key, same payload → committed result, no second audit/stock write
- Same key, different payload → **409**
- Conflicting terminal delivery vs fail → **409**
- Unique constraints on pick/issue/dispatch/delivery keys recover concurrent inserts

---

## 15. Global lock hierarchy

Shared isolated resources use one order (document-first, compatible with F.4C Gate B reserve):

1. Draft document `FOR UPDATE`
2. Fulfillment header(s) for that document/reservation `FOR UPDATE` (no-op if none yet)
3. Reservation header `FOR UPDATE`
4. Synthetic lots by `lot_id` ascending

Gate A’s fulfillment-first order is preserved **after** the document lock. Start pick now locks any existing fulfillment for the reservation **before** the reservation row, so issue (fulfillment → reservation) cannot deadlock with a retry of start pick.

Isolated release was reversed from reservation-first to this hierarchy and refuses release while fulfillment status is not `CANCELLED` (D17 fail-closed). Peek-then-lock now expires/refreshes the reservation row so concurrent double-release stays idempotent (one RELEASE audit).

Production reservation/issuance services were not modified.

---

## 16. PostgreSQL concurrency results

Disposable PostgreSQL 16 (`f4c_dev`, never `swift_distro_hub`).

| Race | Result |
|---|---|
| Two start-picking keys | one `ok`, one **409**; one fulfillment |
| Concurrent issue | one `ISSUED`; `quantity = available`; reserved 0 |
| Delivery vs fail | one terminal, one **409** |
| Release vs start picking | one winner; no negative stock |
| Same confirm key, different qty | **409** |
| Audit `before_insert` failure on issue | rollback; reserved unchanged; status stays `PICKED` |
| Gate A PG fulfillment races | still **4 passed** |
| F.4C double-release | both callers succeed; one audit |

No negative stock, no double issue, no orphan Iso headers in these tests.

---

## 17. Audit behavior

`f4d_iso_fulfillment_audit` in the same transaction as the action: `START_PICK`, `CONFIRM_PICK`, `ISSUE`, `DISPATCH`, `CONFIRM_DELIVERY`, `FAIL_DELIVERY`. History GET returns stored rows only. Failed issue with a broken audit listener left no ISSUED row and no stock change.

---

## 18. Synthetic test fixtures

SQLite isolated pytest: Depot A/B, admin/manager/PSO/billing/finance/warehouse/foreign manager, sample and export SKUs, Approved Sample/Gift/Export, reserved FEFO lots (expired skipped at reserve). E2E seed on `reneta_e2e` only. Live product flags remain off.

---

## 19. Backend test results

`pytest /app/tests` in `swift_distro_api` with disposable `F4B2_DEV_DATABASE_URL` + `F4C_DEV_DATABASE_URL` / `F4D_DEV_DATABASE_URL` (`f4b2_dev` / `f4c_dev` only):

**233 passed**, 222 warnings, 234.99s. **0 skipped** in this run.

Includes commercial orders, stock reservation, billing, F.4B workflow HTTP, F.4C simulator + reservation, F.4D simulator (19), F.4D PG simulator (4), new HTTP (3), new PG adapter races (5). Assertions were not weakened.

---

## 20. Frontend test/build results

- Vitest: **43 passed** (10 files)
- `npm run build`: **successful** (15.97s, 3394 modules)
- No fulfillment UI pages or buttons

---

## 21. Playwright results

`npm run test:e2e:isolated`: **27 passed** (5.1m). Prior 26 plus `fulfillment-api.spec.ts`: Approved Sample reserve → pick → confirm → issue → dispatch → deliver; fail after deliver **409**; history actions; production API **404**. No fulfillment UI. F.4C-DEV Gate C was not reintroduced.

E2E APIs are started sequentially so two `main:app` processes do not race permission inserts on `reneta_e2e`.

---

## 22. Production isolation verification

Read-only, Compose API **not** restarted, no live Alembic:

| Check | After Gate B tests |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| public tables | 83 (82 application + `alembic_version`) |
| `f4c_iso*` / `f4d_iso*` | **0** / **0** |
| Sample/Gift / Export rows | 0 / 0 |
| products / sample flag / export flag | 14 / 0 / 0 |
| orders / invoices | 131 / 5 |
| PISD qty / available / reserved | 13275 / 10635 / 2640 |
| PIS stock_qty | 13275 |
| ledger available | 13000 |
| flags | `SAMPLE_GIFT_DRAFT_WRITES=no`, `EXPORT_DRAFT_WRITES=no` |
| live POST isolated fulfillment | **404** |
| live POST isolated reserve | **404** |
| live POST workflow submit | **404** |
| `/health` | `{"status":"healthy"}` |

---

## 23. Outstanding business approvals

- F.4 A1–C8 **Pending**
- F.4B Gate B **BLOCKED**
- W1–W15 **Pending**
- D1–D18 **Pending**
- No warehouse-owner signature; no fabricated approval records

---

## 24. Technical limitations

- No isolated or production fulfillment UI (out of scope).
- Warehouse operator is a test `Employee.role` string only.
- Partial pick, substitution, returns, mandatory POD, customs states remain unsigned/fail-closed.
- Issue and dispatch are separate steps until W12 is signed as one atomic load event.
- Failed delivery does not restore stock until D13/D14 are signed.
- Commercial pick/issue/delivery dual-write and W12 inconsistency are unchanged.
- F.4C-DEV Gate C remains skipped.

---

## 25. GO / NO-GO recommendation

**GO for continued Option 1 isolated work only.** Isolated picking, issue, dispatch, and delivery HTTP exist on `isolated_workflow_app:app`, reuse the Gate A state machine, keep document status Approved, and leave live stock, Alembic, Compose, and `main:app` untouched.

**NO-GO for production F.4D**, live issuance, ledger correction, commercial fulfillment tables, production RBAC, billing, reservation frontend Gate C, F.4E, and Phase G until the unsigned registers are decided by real owners.
