# Phase 0 and Phase A Implementation Report

Date: 23 November 2026  
Scope: safety baseline and Supabase removal only. Phases B through G were not started.

## 1. Initial Git and Docker status

| Item | Value |
|---|---|
| Branch | `new-version` |
| Commit | `4e492508a482c31203e1c34523df06f14a78c450` |
| Commit subject | `udpate login page and  dashboard]` |

Uncommitted work present before this phase, left untouched:

- Modified: `.dockerignore`
- Untracked: `docs/AKSML_GAP_ANALYSIS_REPORT.html`, `docs/AKSML_GAP_ANALYSIS_REPORT.pdf`, `docs/API_AND_ROLES_REPORT.md`, `docs/BACKEND_AND_DATABASE_REPORT.md`, `docs/BACKEND_MODERNIZATION_PLAN.md`

`git status` also warned that `backend/.pytest_cache/` is not readable (owned by root). Nothing in that directory was deleted or changed.

Docker Compose file: `docker-compose.yml`, plus the existing port override at `/tmp/swift-distro-compose.override.yml` because host ports 80 and 6379 were already taken. All five services were up:

| Container | Status | Published port |
|---|---|---|
| `swift_distro_api` | Up | 8000 inside the network only |
| `swift_distro_frontend` | Up | 9080 |
| `swift_distro_nginx` | Up | 8088 |
| `swift_distro_postgres` | Up (healthy) | 55432 |
| `swift_distro_redis` | Up (healthy) | 6380 |

## 2. Connectivity and database target

Executed checks:

| Check | Result |
|---|---|
| FastAPI `GET /health` inside `swift_distro_api` | `{"status":"healthy"}` |
| PostgreSQL | Connected as `swift_user` to database `swift_distro_hub`. Server is PostgreSQL 16.14 |
| API database target | Host `postgres`, port `5432`, database `swift_distro_hub` (password not recorded) |
| Host publishing | `localhost:55432` maps to that Postgres container |
| Redis | `PONG` from `redis-cli ping` in `swift_distro_redis` |
| API Redis target | `redis://redis:6379/0` |

A cold restart of the API process was not performed. The already-running process answered `/health`.

## 3. PostgreSQL backup verification

Backup path (outside this repository):

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261123.dump`

| Check | Result |
|---|---|
| Tool | `pg_dump` 16.14 inside the Postgres container, custom format (`-Fc`) |
| File size | 327 KB |
| `pg_restore -l` | Succeeded |
| Archive header | `dbname: swift_distro_hub`, dumped from PostgreSQL 16.14, gzip custom format |
| TOC entries | 880 |
| `TABLE DATA` entries | 80, matching the 80 public tables |

No restore was run against the live database. No SQL was executed except `SELECT` counts and the server identity query.

## 4. Existing database row counts

Taken before the login check in section 7. Eighty public tables. Non-zero counts:

| Table | Rows |
|---|---:|
| audit_logs | 41 |
| companies | 2 |
| customers | 8 |
| depots | 4 |
| drivers | 7 |
| employees | 6 |
| login_audits | 42 |
| permissions | 30 |
| product_item_stock | 40 |
| product_item_stock_details | 88 |
| products | 14 |
| routes | 5 |
| stock_adjustment_items | 14 |
| stock_adjustments | 7 |
| stock_ledger | 88 |
| transport_expenses | 22 |
| trips | 12 |
| validation_rule_configs | 11 |
| vehicles | 8 |

These tables were at 0 rows: `chemist_shops`, `collection_deposits`, `collection_transactions`, `customer_credit_balances`, `day_end_closings`, `delivery_allocation_outcomes`, `delivery_order_items`, `delivery_orders`, `depot_transfer_items`, `depot_transfers`, `device_login_attempts`, `doctors`, `external_order_refs`, `integration_failures`, `integration_job_logs`, `integration_jobs`, `integration_systems`, `invoices`, `materials`, `mobile_devices`, `order_batch_allocations`, `order_items`, `order_status_history`, `order_validation_messages`, `order_validation_runs`, `orders`, `picking_order_deliveries`, `picking_orders`, `price_setups`, `primary_packagings`, `product_receipt_items`, `product_receipts`, `promotion_customers`, `promotion_depots`, `promotion_products`, `promotion_rules`, `promotion_usage_logs`, `promotions`, `reconciliation_lines`, `reconciliation_runs`, `reconciliation_variances`, `refund_liabilities`, `refund_settlements`, `return_verifications`, `role_masters`, `role_permissions`, `route_shipping_points`, `route_stops`, `shipping_points`, `stock_issuance_items`, `stock_issuances`, `stock_receipt_items`, `stock_receipts`, `sync_checkpoints`, `sync_conflicts`, `sync_events`, `sync_queue`, `uoms`, `vehicle_loading_items`, `vehicle_loadings`, `vendors`.

## 5. Initial backend test results

Host `pytest` is not installed. Tests ran inside `swift_distro_api` with `python -m pytest tests -q --tb=line -p no:cacheprovider`. `backend/tests/conftest.py` forces `DATABASE_URL` to in-memory SQLite before the app engine is created, so this run did not use `swift_distro_hub`. Row counts after the suite and before the login check were unchanged, which matches that.

| Result | Count |
|---|---:|
| Passed | 26 |
| Failed | 0 |
| Skipped | 0 |
| Time | 8.92s |

Warnings only: pytest-asyncio loop-scope deprecation, Starlette/anyio deprecation, SQLAlchemy `declarative_base` deprecation, Pydantic v1 validators, Redis `close()` deprecation, and an SQLite drop-order cycle between `employees` and `role_masters`. No test failed.

## 6. Frontend build before the env edit

`npm run build` (`vite build`) completed in 11.98s. Output: `dist/index.html`, `dist/assets/index-DMlYcXQG.css` (142.08 kB), `dist/assets/index-1zjEiLGX.js` (1,854.62 kB). Vite warned that the JS chunk is over 500 kB and that browserslist data is 17 months old. `dist/` is gitignored. No source file was edited for the build.

## 7. Supabase dependencies removed

Repository search before the edit found Supabase only in:

- `.env` (the three `VITE_SUPABASE_*` variables)
- Historical or analysis markdown: `PROJECT_SUMMARY.md`, `MIGRATION_COMPLETE.md`, `CHECKLIST.md`, `APPLICATION_RUNNING.md`, `FULL_BACKEND_ANALYSIS_REPORT.md`, `docs/SWIFT_DISTRIBUTION_HUB_CLIENT_DOCUMENTATION.md`, `docs/BACKEND_AND_DATABASE_REPORT.md`, `docs/BACKEND_MODERNIZATION_PLAN.md`

`package.json` and `backend/requirements.txt` do not depend on Supabase. No `createClient`, Supabase auth, or Supabase storage call exists under `src/` or `backend/`.

Change made: deleted `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` from the root `.env`. Those were the only lines in the file, so `.env` is now empty. No other package or source file was removed. Historical markdown was not edited.

Confirmed in source after the edit:

- `src/lib/api.ts` is the frontend HTTP client. Base URL is `VITE_API_URL` or `http://localhost/api`, with a Bearer token.
- `backend/app/auth.py` issues JWTs with `jwt.encode` and algorithm `HS256`.
- `backend/app/database.py` uses `DATABASE_URL` and a PostgreSQL URL. No second application database is configured.
- Rescan of `.py`, `.ts`, `.tsx`, `.js`, `package.json`, `package-lock.json`, `requirements.txt`, and `.env`, excluding `node_modules`, `dist`, and markdown, found no `supabase` string.
- A second `npm run build` after emptying `.env` succeeded in 10.50s with the same output sizes. The rebuilt `dist/` does not contain `supabase`.

## 8. Files modified in this phase

| File | Change |
|---|---|
| `.env` | Removed the three unused Supabase variables. File is now empty |
| `docs/PHASE_0_A_IMPLEMENTATION_REPORT.md` | This report |

`.dockerignore` and the untracked docs listed in section 1 were already dirty and were not edited.

## 9. Final verification

| Check | Result |
|---|---|
| Frontend production build after the `.env` edit | Passed (`vite build`, 10.50s) |
| FastAPI `/health` on the running process | `{"status":"healthy"}` |
| PostgreSQL still `swift_distro_hub` as `swift_user` | Yes |
| Redis `PING` | `PONG` |
| `POST /api/auth/login` for the seeded admin through Nginx on port 8088 | HTTP 200, body contained an access token, `token_type` `bearer`. Token value was not recorded |
| `GET /api/auth/me` with that token | HTTP 200, email `admin@swiftdistro.com`, role `admin` |
| Active Supabase source or env dependency | None |

Counts after that login:

| Table | Before | After |
|---|---:|---:|
| employees | 6 | 6 |
| products | 14 | 14 |
| customers | 8 | 8 |
| companies | 2 | 2 |
| depots | 4 | 4 |
| stock_ledger | 88 | 88 |
| orders | 0 | 0 |
| login_audits | 42 | 43 |
| audit_logs | 41 | 42 |

The two extra rows are the audit trail of the login check. No other counted business table changed. No table was dropped or reset.

## 10. Outstanding issues

- `.env` is empty. Docker Compose still supplies `DATABASE_URL`, `REDIS_URL`, and `SECRET_KEY` to the API container. The frontend container does not mount `.env`.
- FastAPI was not cold-started. Only the already-running process was checked.
- Host pytest is missing. The suite was run in the API container.
- Supabase remains mentioned in the historical and analysis markdown listed in section 7. Those files were left in place on purpose.
- Phases B through G (CORS and Redis configuration, RBAC, Alembic baseline, missing APIs) were not started.
- `backend/.pytest_cache/` is still root-owned and unreadable from the host.

## 11. Preservation

Existing API routes, order logic, stock logic, and UI were not modified. PostgreSQL data is intact except for one successful login audit and one audit-log row written by that verification request. The custom-format backup in section 3 was verified with `pg_restore -l` and was not restored.
