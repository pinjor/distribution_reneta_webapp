# LogiCollect Pro — Complete mobile backend implementation report

**Status: DEVELOPMENT HANDOVER READY — NOT PRODUCTION**  
**Date:** 26 November 2026  
**Entrypoint:** `backend/logicollect_app.py` (`uvicorn logicollect_app:app`)  
**Prefix:** `/api/logicollect/v1`  
**Production `main:app`:** LogiCollect routes **not mounted** (verified)

---

## 1. Executive summary

An isolated FastAPI application implements the LogiCollect Pro field contract against **commercial** `Order` / `OrderItem` records. Session, delivery state, wallet, deposits, returns, and field chemists use new `lc_*` tables. Live `swift_distro_hub` is refused at startup. Web routers and F.4 isolated Sample/Gift/Export APIs are unused.

Flutter can integrate against a disposable database. **Do not** connect to live RENATA.

Contract (36 operations): **34 implemented**, **1 policy-blocked** (credit clear), **1 deferred** (GPS telemetry). Isolated-app pytest: **16 passed**.

---

## 2. Files modified / added

Added: `logicollect_app.py`; `app/models_logicollect.py`; `app/routers/logicollect.py`; `app/services/logicollect/*`; `alembic/versions/lc_field_api.py` (Alembic **branch** `logicollect`, not on `head`); `tests/logicollect/*`; `db/seed_logicollect_dev.py`; docs listed in §28 of the prompt.

Not modified: `main.py`, `api_app.py` production route list, web auth login body, F.4 registers.

---

## 3–4. Architecture and routers

Dedicated app `create_logicollect_app()` mounts only LogiCollect + `/health`. Lock order for money writes: **wallet → memo state → order**. JWT claims `use=lc_access|lc_refresh`, `sid`, `jti`. Logout/refresh revoke `lc_sessions`.

---

## 5. Database

Additive `lc_*` tables (sessions, profiles, media, memo state/lines, route visits, wallet, movements, deposits, returns, chemists, performance targets, idempotency). Alembic: `alembic upgrade logicollect@head` on disposable DBs only. Isolated app also `create_all` at startup. Live public tables remain **83**, `lc_*` count **0**.

---

## 6–18. Feature notes

- **Auth:** employee code or phone; hashed refresh; self-service name/phone/JPEG photo/password.  
- **Memos:** assigned employee **and** loaded commercial order. Flutter id = `memo_number`.  
- **Delivery:** dedicated `lc_memo_states.status` (not `OrderStatusEnum`). Check-in required. `deliveredAmount` from delivered qty × unit price. Does **not** call `approve_delivery`.  
- **Route:** `lc_route_visits` per DSR per Dhaka business date; does not mutate TMS `route_stops`.  
- **Collect/wallet/deposit:** Decimal ledger; integer BDT at the edge; credit does not increase cash; deposit ≤ cash; methods `brac|bkash|rocket` (not mapped to Nagad).  
- **Returns:** per-line remaining; return memo number; `warehouseReceipt: false`.  
- **Chemists:** `lc_chemists` owned by the DSR; not auto-linked to `orders.customer_id`.  
- **Credit clear:** `403` DSR / `409 CREDIT_CLEAR_POLICY_PENDING` finance — no write-off.  
- **Exceptions:** `Product.cold_chain_available` → `coldChain`.  
- **Performance:** actuals from this employee; targets 0 unless `lc_performance_targets` seeded.  
- **Activity:** `GET /activity` = delivered memos.  
- **Telemetry:** deferred.

---

## 19–21. Security, idempotency, concurrency

Employee ownership on memos/wallet/chemists/returns. Same-depot DSR isolation tested. Idempotency key namespaced by employee + operation. SQLite tests do not prove PostgreSQL races; use disposable PG for that. Documented lock order: wallet, memo, order.

---

## 22. Financial example (tested)

70 of 100 units × 50 BDT → `deliveredAmount=3500`; cash 1000 → `collectibleDue=2500`, wallet cash 1000; deposit 600 → cash 400. Credit promise 5000 does not increase cash.

---

## 23. Contract coverage

See `docs/LOGICOLLECT_PRO_FINAL_API_CONTRACT_COMPLIANCE_MATRIX.md`. Isolated: **34 EXACT**, **1 PARTIAL** (credit clear), **1 DEFERRED**. Production: **0** mounted.

---

## 24–25. Tests

LogiCollect: **16 passed** (`pytest /app/tests/logicollect --rootdir=/app/tests`).  
Existing RENATA pytest / Vitest / Playwright: see test report (run after this file).

---

## 26. Production isolation

| Check | After implementation |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` (logicollect branch not applied) |
| public tables | 83 |
| `lc_%` tables | 0 |
| orders / invoices | 131 / 5 |
| PISD qty | 13275 |
| `main:app` has `/api/logicollect` | **False** |

---

## 27. Remaining blockers

- Finance policy for credit clear and collection cancel write-off  
- Warehouse restock of field returns  
- Linking field chemists to commercial customers  
- DSR performance **targets** master data  
- Production mount + live migration authorization  
- GPS telemetry (optional)

---

## 28. GO / NO-GO

**GO for Flutter development** against the isolated app and synthetic seed.  
**NO-GO for production, live stock, live collections, or Compose activation.**
