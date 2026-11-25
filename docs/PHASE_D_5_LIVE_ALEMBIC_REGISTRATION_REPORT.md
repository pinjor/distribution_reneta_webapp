# Phase D.5 Live Alembic Registration Report

Date: 25 November 2026  
Status: **REGISTERED.** Live `swift_distro_hub` is stamped at `d4_baseline`. Business tables and rows were not rewritten. `alembic upgrade` / `downgrade` were not run against live. `Base.metadata.create_all()` was left in place. Phase D.6 and Phase E were not started.

## 1. Explicit approval confirmation

Operator message (25 November 2026, 10:51 +06):

> I approve Phase D.5 Alembic baseline registration for the existing PostgreSQL database `swift_distro_hub`, revision `d4_baseline`.

A second preflight ran after that approval and before the stamp. Schema, row counts, Alembic head, absent `alembic_version`, and the verified backup were unchanged from the halt report. The stamp then ran.

## 2. Preflight results

Immediately before stamp:

| Check | Result |
|---|---|
| PostgreSQL | `pg_isready` accepting; 16.14 |
| API `DATABASE_URL` | `postgresql://swift_user:***@postgres:5432/swift_distro_hub` |
| Alembic heads | exactly one: `d4_baseline` |
| `alembic_version` | absent |
| Application tables / columns | 78 / 917 |
| FKs / uniques / checks / indexes / sequences / enums | 132 / 45 / 0 / 225 / 78 / 16 |
| Rejection columns | 5 present |
| Head | `33c782c` on `new-version`; D.4 files still uncommitted |

Pre-stamp `COUNT(*)`: orders 131, order_items 380, collection_deposits 49, trips 63, doctors 12, chemist_shops 3, audit_logs 264, employees 6, products 14, permissions 30, stock_ledger 22, login_audits 43.

## 3. Backup and restoration details

Verified again immediately before stamp (file not rewritten):

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_104750.dump`

| Check | Result |
|---|---|
| Present | yes, 358 783 bytes |
| SHA-256 | `646b38f2534cff6c20cb35e8296afc40f84a286f981645b995d2e7a42712eead` (unchanged) |
| `pg_restore -l` | success |
| Earlier restore test | disposable `swift_distro_hub_d5_restore` matched live schema and row counts (recorded before approval) |

Live was not a restore target.

## 4. Exact command executed

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic stamp d4_baseline
```

Exit 0. Alembic log: `Running stamp_revision  -> d4_baseline` (not `upgrade`).

`alembic upgrade head` and `alembic downgrade` were not run against `swift_distro_hub`.

`ALLOW_LIVE_ALEMBIC` was only on that `docker exec`. The running API process still has it unset. It is not in `docker-compose.yml`.

## 5. Alembic revision before and after

| When | `alembic_version` |
|---|---|
| Before | table absent |
| After | one row: `d4_baseline` |
| `alembic current` (one-shot `ALLOW_LIVE_ALEMBIC=yes`) | `d4_baseline (head)` |

## 6. Schema preservation verification

| Object | Pre-stamp | Post-stamp |
|---|---:|---:|
| Application tables (exclude `alembic_version`) | 78 | 78 |
| Public tables including `alembic_version` | 78 | **79** (expected) |
| Application columns | 917 | 917 |
| Foreign keys | 132 | 132 |
| Unique constraints | 45 | 45 |
| Check constraints | 0 | 0 |
| Indexes on application tables | 225 | 225 |
| Sequences | 78 | 78 |

Five rejection columns unchanged (`bool` default `false` nullable; `timestamp` nullable; `text` nullable). `delivery_allocation_outcomes` and `return_verifications` still absent.

The only catalog addition is `alembic_version`. Baseline DDL was not replayed.

`Base.metadata.create_all()` remains in `backend/main.py`.

## 7. Business row-count comparison

| Table | Pre-stamp | Post-stamp |
|---|---:|---:|
| orders | 131 | 131 |
| order_items | 380 | 380 |
| collection_deposits | 49 | 49 |
| trips | 63 | 63 |
| doctors | 12 | 12 |
| chemist_shops | 3 | 3 |
| audit_logs | 264 | 264 |
| employees | 6 | 6 |
| products | 14 | 14 |
| permissions | 30 | 30 |
| stock_ledger | 22 | 22 |
| login_audits | 43 | 43 |

## 8. Regression test results

| Check | Result |
|---|---|
| FastAPI `GET /health` on running API (live DB) | 200 `{"status":"healthy"}` |
| pytest `/app/tests`, SQLite, `-p no:cacheprovider` | **49 passed**, 89 warnings, 33.14s. Did not use `swift_distro_hub` |
| `npm run build` in frontend container | exit 0, Vite 5.4.19, 3397 modules, ~21s. Existing chunk-size warning |
| PostgreSQL connectivity | `pg_isready` + `current_database()=swift_distro_hub` |

Live login was not called (would insert `login_audits`).

## 9. Remaining database risks

- `create_all` still runs at API startup. Removing it is a later phase, after a fresh empty database can be built with Alembic alone.
- Application role still has DDL rights. Split migration vs runtime roles later.
- Out-of-band `ALTER`/`DROP` can still drift the catalog. Future schema changes must go through Alembic revisions, not stamp.
- `alembic upgrade head` on live remains **unsafe** until a new additive revision exists; it would try to create the 78 tables again.
- `UNMAPPED_COLUMNS` still hides autogenerate drops of the five rejection columns until models catch up.
- Dual stock stores and other functional gaps from earlier reports are unchanged.

## 10. Final registration status

**Complete.** `swift_distro_hub` is registered at Alembic revision `d4_baseline`. Business records are intact. The database is now Alembic-stamped; it is not yet under a full migration-only workflow (`create_all` remains).
