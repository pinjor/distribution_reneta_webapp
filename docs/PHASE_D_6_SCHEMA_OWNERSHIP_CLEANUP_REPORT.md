# Phase D.6 Schema Ownership Cleanup Report

Date: 25 November 2026  
Status: **Complete.** FastAPI startup no longer issues schema DDL. Alembic revision `d4_baseline` is the schema source. SQLAlchemy models include the five live rejection columns. Live `swift_distro_hub` was not upgraded, downgraded, or reset. Phase E was not started.

## 1. Files modified

| File | Change |
|---|---|
| `backend/main.py` | Removed `create_all` and the `is_blocked` ALTER. Startup runs `assert_schema_ready`, then idempotent permission and validation-rule inserts. SQLite skips both schema check and data seed |
| `backend/app/core/schema_guard.py` | New. PostgreSQL-only connection, Alembic-head, and modeled-table checks. Never runs migrations |
| `backend/app/models.py` | `Order`: `delivery_rejected`, `delivery_rejected_at`, `delivery_rejected_reason`. `CollectionDeposit`: `rejected`, `rejected_at`. Types/nullability/server defaults match the live catalog |
| `backend/alembic/env.py` | Removed `UNMAPPED_COLUMNS`. `LEGACY_UNMAPPED_TABLES` still `doctors` and `chemist_shops` |
| `docs/PHASE_D_6_SCHEMA_OWNERSHIP_CLEANUP_REPORT.md` | This report |

Not changed: routers, Pydantic schemas, RBAC map, passwords, Compose, frontend, Alembic revision files. `tests/conftest.py` still uses `create_all` / `drop_all` on isolated SQLite. Seed scripts that call `create_all` were not used.

## 2. Startup schema operations removed

Removed from `lifespan`:

- `Base.metadata.create_all(bind=engine)`
- `ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE`

`is_blocked` already exists in `d4_baseline`. The API does not run `alembic upgrade`.

Kept: Redis ping (failure is non-fatal), production settings validation, permission insert-if-missing, `OrderValidationService.ensure_default_rules` (insert-if-missing).

## 3. SQLAlchemy model changes

Live catalog (unchanged):

| Table | Column | PostgreSQL | Model |
|---|---|---|---|
| `orders` | `delivery_rejected` | `boolean` NULL, default `false` | `Boolean`, `nullable=True`, `server_default=text("false")` |
| `orders` | `delivery_rejected_at` | `timestamp` NULL | `DateTime`, `nullable=True` |
| `orders` | `delivery_rejected_reason` | `text` NULL | `Text`, `nullable=True` |
| `collection_deposits` | `rejected` | `boolean` NULL, default `false` | `Boolean`, `nullable=True`, `server_default=text("false")` |
| `collection_deposits` | `rejected_at` | `timestamp` NULL | `DateTime`, `nullable=True` |

No `ALTER TABLE`. No value updates. No new rejection endpoints or workflow. Request/response schemas were not expanded.

## 4. Alembic drift verification

Autogenerate against disposable `d6_app` (already at `d4_baseline`) produced `upgrade()` / `downgrade()` of `pass`. Probe revision `dc444b6358f5` was deleted. Active head remains exactly `d4_baseline`.

`doctors` and `chemist_shops` stay in `LEGACY_UNMAPPED_TABLES` until Phase E. Other column/table diffs are still visible to autogenerate.

## 5. Disposable database initialization results

Container `swift_d6_pg`, database `d6_app` (not live):

| Step | Result |
|---|---|
| `alembic upgrade head` | Exit 0, current `d4_baseline (head)` |
| Application tables | 78 |
| Rejection columns | all 5 present |
| Public tables including `alembic_version` | 79 |

## 6. FastAPI startup results

`TestClient` against `d6_app` only:

| Check | First start | Second start |
|---|---|---|
| `GET /health` | 200 | 200 |
| `permissions` | 30 | 30 |
| `validation_rule_configs` | 11 | 11 |
| `CREATE`/`ALTER`/`DROP` in engine listener | none | none |

Modeled tables queryable. Employees remained 0 (no auto users). Disposable container removed.

Live API bind-mount reload: `GET /health` 200 after `schema_guard` + seed path. No volume recreate.

## 7. Backend test results

`pytest /app/tests` in the API container, SQLite, `-p no:cacheprovider`: **49 passed**, 89 warnings, 43.77s. Schema guard skipped SQLite. Fixture `create_all` still builds the test schema, including the five new columns.

## 8. Frontend build results

`npm run build` in `swift_distro_frontend`: exit 0, Vite 5.4.19, ~38s. Existing 2.8 MB chunk warning. No frontend edits.

## 9. Production database role recommendations

Live role `swift_user` is a **superuser** (`rolsuper`, create role, create DB, replication, bypass RLS). That is too wide for the API.

Do **not** change this now. After a disposable rehearsal:

1. Create `swift_migrator` with `CONNECT`, `CREATE` on database, `USAGE`/`CREATE` on `public`, and rights to create/alter/drop objects owned by the app schema. Use it only for `alembic upgrade` in CI or a one-shot exec.
2. Create `swift_app` with `CONNECT`, `USAGE` on `public`, `SELECT`/`INSERT`/`UPDATE`/`DELETE` on application tables, `USAGE`/`SELECT` on sequences (`nextval`). No `CREATE`/`ALTER`/`DROP`.
3. Reassign table ownership to `swift_migrator` (or a dedicated owner), grant DML to `swift_app`.
4. Point Compose `DATABASE_URL` for the API at `swift_app`. Point Alembic jobs at `swift_migrator`. Keep `env.py` refuse of `swift_distro_hub` unless `ALLOW_LIVE_ALEMBIC=yes`.
5. Prove the split on a restored disposable copy first. Then a separate approval for live.

## 10. Live database preservation verification

| Check | After D.6 code deploy |
|---|---|
| `alembic_version` | `d4_baseline` (one row) |
| Application tables | 78 |
| orders | 131 |
| collection_deposits | 49 |
| `orders.delivery_rejected IS TRUE` | 3 |
| `collection_deposits.rejected IS TRUE` | 5 |
| FastAPI `/health` | 200 |

No live Alembic upgrade/downgrade. D.5 backup still present:

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_104750.dump`  
SHA-256 `646b38f2534cff6c20cb35e8296afc40f84a286f981645b995d2e7a42712eead`

## 11. Remaining risks

- Seed scripts under `backend/db/` may still call `create_all`. They must not be pointed at live.
- `swift_user` remains superuser until the role split is approved.
- Unmapped `doctors` / `chemist_shops` still have no models (Phase E).
- Dual stock stores and unused rejection *workflow* (columns exist; APIs do not drive them) are unchanged.
- SQLite tests do not exercise `schema_guard` or Alembic. A CI job on disposable PostgreSQL should run `upgrade head` + API startup.

## 12. Phase E readiness recommendation

**Ready for Phase E** (doctor and chemist-shop models + APIs), with these constraints:

- Schema changes go through a new Alembic revision, never `create_all`.
- Live stamp is already `d4_baseline`; additive revisions only.
- Do not drop or recreate `doctors` / `chemist_shops`; model the existing columns.
- Keep `LEGACY_UNMAPPED_TABLES` until those models exist, then remove the names so autogenerate tracks them.

Migration-only schema management for the API process is in effect: startup DDL is gone, disposable `upgrade head` + FastAPI startup passed.
