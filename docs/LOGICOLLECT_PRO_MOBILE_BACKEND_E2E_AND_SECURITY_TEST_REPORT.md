# LogiCollect Pro — E2E and security test report

**Date:** 26 November 2026

## LogiCollect isolated pytest

Command: `pytest /app/tests/logicollect --rootdir=/app/tests` in `swift_distro_api` (in-memory SQLite via existing `tests/conftest.py`).

**16 passed**, 0 failed, 0 skipped.

| Area | Tests |
|---|---|
| Login code/phone, 401, me, logout revoke, refresh rotate, password+phone | `test_auth_and_memos.py` |
| Assignee isolation, accept, batch skip foreign, missing JWT | same |
| Partial deliver 70×50=3500, cash 1000, due 2500, deposit 600→400, over-cash 400 | `test_delivery_finance.py` |
| Credit collect does not increase cash | same |
| Check-in required; idempotent deliver; key+different payload 409 | same |
| Returns remaining 30 → return memo, warehouseReceipt false | same |
| Chemist CRUD/active; DSR 403 / finance 409 credit clear | `test_chemists_security.py` |
| Same-depot and foreign-depot 404 | same |
| Exceptions, route today, performance, activity | same |
| Production app has no `/api/logicollect` routes | `test_main_app_does_not_mount_logicollect` |

Not executed in this pass (SQLite): two-worker PostgreSQL races (accept/collect/deposit). Required lock order is wallet → memo → order. Run those against `logicollect_dev` PG before production review.

Photo JPEG magic-byte validation exists in `save_photo`; no dedicated pytest file.

## Existing RENATA regression

Full `pytest /app/tests --rootdir=/app/tests`: **219 passed**, **30 skipped**, 0 failed, 186.63s.

The 16 LogiCollect tests are included in the 219. Skips are existing PG concurrency tests that require `F4B2_DEV_DATABASE_URL` / `F4C_DEV_DATABASE_URL` / `F4D_DEV_DATABASE_URL` (unset in this container). No assertions were weakened.

Frontend Vitest: **56 passed** (11 files). Playwright isolated suite was **not re-run** in this backend-only change (no production frontend LogiCollect UI). Last recorded isolated Playwright: 28 passed.

## Production safety

Read-only after implementation: Alembic `f3_export_draft`, 83 public tables, 0 `lc_*` tables, orders 131, invoices 5, PISD qty 13275, production LogiCollect prefix absent.
