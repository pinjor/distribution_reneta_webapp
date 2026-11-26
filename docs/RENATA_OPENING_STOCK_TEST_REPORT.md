# RENATA — Opening Stock Test Report

**Date:** 26 November 2026  
**Live database:** `swift_distro_hub` was not migrated. `opening_stock_%` table count = **0**. Alembic revision remains `f3_export_draft`.

## Opening-stock suite (SQLite, API container)

Command:

```
docker exec -e DATABASE_URL=sqlite:///:memory: -e ENVIRONMENT=development -w /app swift_distro_api \
  python -m pytest tests/test_opening_stock.py tests/test_opening_stock_simulation.py \
  tests/test_opening_stock_alembic_isolation.py tests/test_opening_stock_pg_concurrency.py \
  -q --ignore=/app/.pytest_cache
```

**Result: 11 passed, 2 skipped**

| Test | Result |
|---|---|
| Create draft, edit lines, submit, reject with reason, no PIS/ledger writes | Passed |
| Manager cannot approve; self-approval blocked | Passed |
| Foreign depot 404 / empty list / create forbidden | Passed |
| Duplicate pending opening blocked; historical ledger (qty 0) blocked | Passed |
| Qty ≤ 0 and expired batch 400; missing expiry 422 | Passed |
| Approve is idempotent; posting_status stays `not_posted`; inventoryPosted false | Passed |
| Summary and pagination | Passed |
| Isolated simulation 0 → 500 | Passed |
| Simulation rejects duplicate batch and qty 0 | Passed |
| Production Alembic head still `f3_export_draft`; opening-stock head `os_request_workflow` | Passed |
| Env source refuses `swift_distro_hub` | Passed |
| PG concurrent approve (`OPENING_STOCK_PG_URL`) | Skipped (env not set) |
| PG concurrent placeholder | Skipped |

## Full backend pytest (same container, SQLite)

**239 passed, 35 skipped, 1 failed**

The failure is `backend/test_loading_report.py::test_report` — `sqlite3.OperationalError: no such table: orders`. That file is a standalone script collected because cwd is `/app`. It is unrelated to opening stock and was not modified.

Opening-stock tests in that run: 7 SAWarning drops only (same as other modules).

## Frontend

| Check | Result |
|---|---|
| `docker exec swift_distro_frontend npm test` | 12 files, **57 passed** (includes `menuNavigation.openingStock.test.ts`) |
| `docker exec swift_distro_frontend npm run build` | **Succeeded** (vite, 23.90s) |
| Playwright `e2e/opening-stock/opening-stock.spec.ts` | Skipped without `PLAYWRIGHT_BASE_URL` |

## Browser

Login page at `http://127.0.0.1:9080/login` loaded. Admin demo sign-in from this session did not complete (form returned to idle). Opening Stock list was not exercised against live tables. Live API has no `opening_stock_*` tables, so list/summary would return **503 SCHEMA_NOT_APPLIED** until disposable Alembic is applied — that is intended.

## Production isolation

| Check | Result |
|---|---|
| `opening_stock_%` on `swift_distro_hub` | 0 |
| Production Alembic | `f3_export_draft` |
| `main:app` mounts `/api/opening-stock` | Yes (document APIs) |
| `main:app` mounts `/api/logicollect` | No |
| API reload after model import | Startup complete (schema_guard accepted pending tables) |
| Approve writes PIS/PISD/ledger | No (asserted in tests) |

## PostgreSQL concurrency

Not executed. Requires a disposable database and `OPENING_STOCK_PG_URL`. Do not point that variable at `swift_distro_hub`.
