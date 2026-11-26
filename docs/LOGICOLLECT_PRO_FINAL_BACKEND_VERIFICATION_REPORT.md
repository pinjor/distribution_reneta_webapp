# LogiCollect Pro — Final backend verification report

**Date:** 26 November 2026  
**Scope:** isolated `logicollect_app` only. No Flutter, no new web UI, no live writes, no production mount.

---

## 1. Implemented modules

| Area | Location |
|---|---|
| Isolated FastAPI entry | `backend/logicollect_app.py` — `create_logicollect_app()` |
| Router prefix `/api/logicollect/v1` | `backend/app/routers/logicollect.py` |
| Auth / JWT sessions | `backend/app/services/logicollect/auth.py` |
| Memos, money, returns, chemists | `backend/app/services/logicollect/ops.py` |
| ORM | `backend/app/models_logicollect.py` (`lc_*`) |
| Commercial Alembic | `backend/alembic/` head **`f3_export_draft` only** |
| LogiCollect Alembic | `backend/alembic_logicollect.ini` + `backend/alembic_logicollect/versions/lc_field_api.py` |
| Seed | `backend/db/seed_logicollect_dev.py` (refuses `swift_distro_hub`, repeatable) |
| Tests | `backend/tests/logicollect/` |
| Bootstrap | `backend/scripts/logicollect_dev_bootstrap.sh` |

`lc_field_api` was **removed** from `backend/alembic/versions/` because it created a second Alembic head. `alembic upgrade head` on the production tree would otherwise have been able to apply `lc_*` tables.

---

## 2. Actual runtime and database

| Item | Value |
|---|---|
| Process | Docker `logicollect_dev_api`, image `distribution_reneta_webapp-backend` |
| Bind | `127.0.0.1:18040` → container `:18040` |
| App | `uvicorn logicollect_app:app` |
| Database | disposable PostgreSQL container `logicollect_dev_pg`, DB **`logicollect_dev`**, user `lc_dev` |
| Host Postgres port | `127.0.0.1:15540` |
| Live hub | **not** used; startup refuses `swift_distro_hub` |
| Health (HTTP) | `{"status":"healthy","logicollect":true,"production":false}` |
| Swagger | `http://127.0.0.1:18040/docs` HTTP 200 |
| OpenAPI | 34 path keys (telemetry absent) exported to `docs/logicollect-openapi.json` |

Reachability: loopback only. Flutter on another machine needs an SSH tunnel or an explicit LAN bind. No public hostname exists.

---

## 3. Schema / migration verification

On a **fresh** `logicollect_dev`:

1. `alembic upgrade f3_export_draft` created the commercial catalog (83 public tables).  
2. First `alembic -c alembic_logicollect.ini upgrade head` **appeared** to run `lc_field_api` but **rolled back**, because `inspect(connection)` left an open transaction. That is a real bug; it was fixed by inspecting on a **separate** connection.  
3. After the fix: `lc_field_api (head)` in `alembic_version_logicollect`, 14 `lc_*` tables, 21 foreign keys to `employees` / `orders` / `order_items` / `customers`.  
4. Seed executed twice without duplicating memo `2500001`.  
5. LogiCollect Alembic **always refuses** `swift_distro_hub` (tested; no `ALLOW_LIVE_ALEMBIC` override).  
6. PostgreSQL lifespan does **not** call `create_all`. SQLite pytest still does, for in-memory tests only.

**Do not** document `alembic upgrade logicollect@head` against the main ini — that branch label is gone from production versions.

---

## 4. Contract verification

See `docs/LOGICOLLECT_PRO_FINAL_API_CONTRACT_COMPLIANCE_MATRIX.md`.

- **34 EXACT** — HTTP pytest (and live smoke for login/memos/docs/credit-clear/telemetry).  
- **1 PARTIAL** — `POST /credit-chemists/{id}/clear` blocked; no Finance approval exists.  
- **1 DEFERRED** — `POST /telemetry/location` HTTP 404 by design.

Live smoke (running API): login D001, `GET /memos` includes `2500001`, DSR credit-clear `CREDIT_CLEAR_FORBIDDEN`, telemetry 404.

---

## 5. Authentication / security results

| Case | Result |
|---|---|
| Code + phone login | Pass |
| Bad password | 401 `INVALID_CREDENTIALS` |
| Inactive employee | 403 `ACCOUNT_INACTIVE` |
| JWT + logout revoke | Pass |
| Refresh rotation | Old access 401; new access 200 |
| Refresh replay | 401 |
| Profile name/phone then login | Pass |
| JPEG photo upload / PNG reject / delete | Pass |
| Password change | Pass |
| Same-depot memo isolation | Pass |
| Foreign-depot memo isolation | Pass |
| Chemist list isolated by employee | Pass |
| Forged / missing JWT | 401 |
| Malformed login body | 422 `VALIDATION_ERROR` |
| Credit clear DSR | 403 |
| Credit clear finance | 409 `CREDIT_CLEAR_POLICY_PENDING` (no ledger change) |

---

## 6. Memo / delivery tests

Full and partial delivery HTTP tests pass, including:

- Check-in required before deliver (`409`)  
- Idempotent check-in and deliver  
- Same Idempotency-Key different payload → `409`  
- Delivered qty > ordered → `400`  
- Partial 70/100 → `deliveredAmount` 3500 integer BDT  
- Postpone/cancel terminal; route stop `postponed`; deliver after postpone `409`  
- Retry adjust does not mint a second warehouse receipt  

---

## 7. Financial and wallet tests

Verified HTTP path: 100×50, deliver 70, cash 1000, due 2500, deposit 600, cash 400, deposit 401 rejected.

Credit collect leaves `cashBalance` 0 and raises `creditBalance`. Later full cash settlement zeros credit and raises cash (integer BDT).

Cash and credit stay separate. `GET /wallet/movements?kind=collect` returns the movements. Duplicate `transactionId` → `409` `DUPLICATE_TRANSACTION` (check runs **before** insert; required on PostgreSQL `autoflush=True`).

---

## 8. Deposit / concurrency tests (PostgreSQL)

`backend/tests/logicollect/test_pg_concurrency.py` with `LOGICOLLECT_PG_URL` (not SQLite):

- HTTP full cash collect on a fresh employee wallet → 5000  
- Two sessions concurrent full cash on one memo → exactly one `ok`, wallet +5000  
- Two sessions concurrent 4000 deposits on 5000 cash → exactly one `ok`, remainder 1000, `DEPOSIT_EXCEEDS_CASH` on the loser  

Lock order on memo writes: wallet → order → memo state.

---

## 9. Returns and chemists

- Remaining qty 30 after 70/100  
- Adjust issues `returnMemoNo` starting with `R`, `warehouseReceipt: false`  
- Adjusted list via `GET /returns?status=adjusted`  
- Chemist CRUD, active flag, JPEG photo, duplicate `legacyCode` `400`  
- `lc_chemists` is not a `Customer`. Create does not insert commercial customers. Credit list may *display* amounts using `legacyCode` or phone match; that is not an ownership link.

---

## 10. Full backend regression

Command: `pytest /app/tests --rootdir=/app/tests` inside `swift_distro_api` with sqlite tests + `LOGICOLLECT_PG_URL`.

**231 passed, 30 skipped, 0 failed** (162 s).

Skipped: F.4 disposable-PG suites whose env URLs were unset in this process (`f4b2` / `f4c` / `f4d` concurrency helpers). Those containers exist on the host but were not injected here. LogiCollect PG tests **were** included (28 in `tests/logicollect`, all passed).

Suites covered in the 231: auth, commercial orders/delivery/billing/deposits/inventory/mobile, F.4 isolated workflow/reservation/fulfillment tests that use sqlite, LogiCollect.

---

## 11. Frontend / build regression

| Suite | Result |
|---|---|
| Vitest (`npm test` in `swift_distro_frontend`) | **56 passed**, 11 files |
| `npm run build` | **OK** (vite 19.4 s) |
| Playwright | **Not re-run this session.** `playwright.config.ts` targets `127.0.0.1:15174` / `15175`. Those isolated Vite ports were closed. Full `e2e/run-isolated.sh` would start extra disposable API/Vite stacks (safe) but was not executed here. Official draft Playwright against live hub was **not** run (would risk live UI/session traffic). Last known isolated Playwright: 28 passed after HMR ignore fix in the prior implementation session. |

---

## 12. Production isolation (read-only, after verification)

| Check | After |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| `lc_*` tables | **0** |
| Orders | 131 |
| Invoices | 5 |
| `product_item_stock_details` qty sum | 13275.00 |
| `main:app` LogiCollect routes | **False** |
| Compose | **not** edited |
| Live migrations | **not** run |

---

## 13. Remaining gaps

1. Credit clear mutation — **blocked**. Finance must approve: who may clear, whether it writes cash/credit/wallet, audit, and that it must not erase collectible due without a settlement document. Official F.4 packet remains Pending; this work did **not** invent an approval.  
2. GPS telemetry — **deferred** (optional in the original contract).  
3. Performance targets unseeded (`targetsConfigured: false`).  
4. Collection cancel is status-only (no cash write-off) — needs Finance policy if product wants refunds.  
5. `GET /credit-chemists` display matching by phone can associate the wrong shop visually; Flutter must not treat that as a commercial Customer id.  
6. Playwright isolated stack not re-executed in this session.  
7. Production activation of LogiCollect — **not** done and **not** approved.

Fixes applied during verification (not concealing failures):

- Separate Alembic config so production head stays `f3_export_draft`  
- Alembic inspect/commit rollback bug  
- PostgreSQL deposit duplicate check (pre-insert)  
- Deterministic wallet→order→state locking  
- Chemist JPEG size/magic validation  
- Isolated app refuses `create_all` on PostgreSQL  

---

## 14. GO / NO-GO for Flutter developer handover

**GO for isolated development integration** against `http://127.0.0.1:18040/api/logicollect/v1`, with the documented PARTIAL/DEFERRED endpoints.

Not a GO for any environment that shares `swift_distro_hub` or `main:app`.

---

## 15. GO / NO-GO for production

**NO-GO.** Development tests passing is not production readiness. LogiCollect is unmounted, unmigrated on live, credit-clear unauthorized, telemetry absent, F.4 official policies still Pending, and warehouse restock is intentionally disabled.
