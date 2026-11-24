# Phase D.2 Alembic Baseline Implementation Report

Date: 23 November 2026  
Scope: Add one Alembic root revision that builds the current 80-table public schema on an empty PostgreSQL 16 database. `swift_distro_hub` was not upgraded, stamped, or altered. It is not Alembic-managed.

## 1. Files modified

| File | Change |
|---|---|
| `backend/alembic/versions/d2_reconciled_baseline.py` | New root revision `d2_baseline` |
| `backend/alembic/sql/d2_reconciled_baseline.sql` | Schema-only DDL taken from the live catalog |
| `backend/alembic/env.py` | Loads the application database URL, blocks the live database, and keeps the four unmapped tables out of autogenerate drops |
| `backend/alembic.ini` | Removes the hardcoded live URL and password. The value left there is an unused placeholder |
| `backend/alembic/historical/001_platform_baseline.py` | Moved out of `versions/` so Alembic does not load it |
| `backend/alembic/historical/README.md` | States why that revision is archived |
| `docs/PHASE_D_2_ALEMBIC_BASELINE_IMPLEMENTATION_REPORT.md` | This report |

`backend/main.py`, the SQLAlchemy models, API routes, permissions, and the frontend were not changed.

## 2. New baseline revision

Revision id: `d2_baseline`  
Down revision: none  
Head: `d2_baseline` only

`alembic heads` on a disposable database printed `d2_baseline (head)`.

The upgrade reads `backend/alembic/sql/d2_reconciled_baseline.sql` and executes it. That script was produced with `pg_dump --schema-only --no-owner --no-acl --no-comments` from `swift_distro_hub`, then edited only to:

- remove the psql `\restrict` / `\unrestrict` commands
- skip `CREATE SCHEMA public`, because a new database already has it
- set `search_path` back to `public` at the end, so Alembic can insert into `alembic_version`

The script contains 80 `CREATE TABLE`, 16 `CREATE TYPE`, 80 sequences, 7 `CHECK` constraints, and the foreign keys, unique constraints, and indexes from the catalog. It contains no `INSERT`, `UPDATE`, `DELETE`, `COPY`, `DROP TABLE`, or `DROP COLUMN`. It does not set sequence counters from the live database.

Downgrade raises `RuntimeError`. It does not drop the schema.

## 3. Historical migration handling

The previous chain was a single root, `001_platform`, in `backend/alembic/versions/001_platform_baseline.py`. Its upgrade executes `backend/db/migrations/001_platform_hardening.sql`. That file adds columns with `IF NOT EXISTS` and then runs two `UPDATE` statements on `orders.delivery_status`. It assumes `employees` and `orders` already exist, so it cannot create an empty database, and it is not safe to upgrade onto the live database.

That file now lives in `backend/alembic/historical/`. Alembic's script location is `alembic/versions`, so the archived file is not a revision and does not create a second head. The original SQL file under `backend/db/migrations/` is unchanged and is still not part of Alembic. Do not move `001_platform` back into `versions/`.

## 4. Alembic configuration changes

`env.py` sets the SQLAlchemy URL from `get_settings().database_url`. In Docker that is the container `DATABASE_URL`. On a machine where that variable is unset, it is the development default already used by the API. `alembic.ini` no longer contains the live user, password, host, or database name.

Before any online or offline migration, `env.py` refuses a URL whose database name is `swift_distro_hub` unless `ALLOW_LIVE_ALEMBIC=yes`. A probe from the API container, which points at the live database, stopped with that error and did not connect far enough to run DDL. The override was not used for any successful command in this phase.

`include_object` returns false for `doctors`, `chemist_shops`, `delivery_allocation_outcomes`, and `return_verifications` when they are reflected from the database and are absent from model metadata. That is the autogenerate drop case. `alembic_version` is also ignored.

An autogenerate probe was run only against a disposable database already at `d2_baseline`. The generated revision's `upgrade()` and `downgrade()` were both `pass`. It did not emit a drop of the four legacy tables. That probe file was deleted so it would not become a second head. `alembic heads` again reported only `d2_baseline`.

Migrations are not run on API startup.

## 5. Complete schema comparison results

The disposable database `d2_baseline` was compared with `swift_distro_hub` after `alembic upgrade head`. `alembic_version` was excluded from the table and column lists and checked on its own.

| Object | Live | Disposable | Result |
|---|---|---|---|
| Application tables | 80 | 80 | Same names |
| Columns, `format_type`, nullability, defaults | 943 | 943 | Match |
| Enum labels, in order | 66 | 66 | Match. 16 enum types |
| Primary keys | 80 | 80 | Match |
| Foreign keys | 145 | 145 | Match, including `ON DELETE` |
| Unique constraints | 47 | 47 | Match |
| Check constraints | 7 | 7 | Match, including the four quantity checks on `delivery_allocation_outcomes` and the three on `return_verifications` |
| Indexes | 235 | 235 | Match |
| Sequence definitions | 80 | 80 | Match on type, start, increment, min, max, cycle, and owning column |
| `alembic_version` | absent | `d2_baseline` | Expected |

JSON and JSONB columns are included in the column-type comparison. The disposable catalog has the same 10 JSON/JSONB columns as the live catalog.

The only difference outside `alembic_version` is sequence `last_value`. Twenty live sequences have been advanced by existing rows. The disposable sequences have not been called, so `last_value` is null. Examples: `employees_id_seq` is 7 on the live database and unused on the empty one; `stock_ledger_id_seq` is 88 versus unused. Those counters were left behind on purpose. Copying them would encode live identity state into a schema baseline. This is not an unexplained structural difference.

A second disposable database, `d2_app`, was upgraded with the same revision and then used for FastAPI startup. After `create_all` and the startup `is_blocked` alter, the same comparison against the live catalog still matched on every item above.

## 6. Disposable PostgreSQL test results

Container `swift_d2_pg`, image `postgres:16-alpine`, joined only to the application Docker network. It was not `swift_distro_postgres`. It was removed at the end of the phase.

| Step | Result |
|---|---|
| `alembic upgrade head` on empty `d2_baseline` | Exit 0. Revision recorded as `d2_baseline`. 81 public tables, which is the 80 application tables plus `alembic_version` |
| Second `alembic upgrade head` on that database | No further revision ran |
| `alembic upgrade head` on empty `d2_app` | Exit 0 |
| Direct `alembic upgrade head` using the API container's live URL | Refused before migration. Live `alembic_version` is still absent |

The first upgrade attempt failed because the dumped script cleared `search_path`, so the later insert into `alembic_version` could not see the table. The script now restores `search_path` to `public`. The database was dropped and the upgrade was repeated. The successful comparison is from that corrected run.

## 7. Application compatibility results

On `d2_app`, after the baseline and with `DATABASE_URL` pointed only at that database:

- `TestClient` startup returned `GET /health` 200 `{"status": "healthy"}`.
- SQLAlchemy queried all 76 modeled tables.
- The four unmapped tables were also queried.
- Startup seeding inserted 30 `permissions` and 11 `validation_rule_configs`. `employees` stayed 0. No live seed script was pointed at `swift_distro_hub`.
- Native enums and the JSON/JSONB columns survived both the upgrade and application startup. The post-startup catalog diff was clean.

The existing backend suite does not use this PostgreSQL. It still uses in-memory SQLite. That result is in section 9.

## 8. Startup schema management recommendation

Leave the current startup behavior in place.

`backend/main.py` still calls `Base.metadata.create_all`, then `ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_blocked`, then seeds permissions and validation rules. On the disposable database those schema statements did not change the catalog the baseline had just created. On the live database, `create_all` still cannot add missing columns to existing tables and cannot build the four unmapped tables on a brand-new server.

Recommended transition, after the live stamp in section 12 is approved and a fresh empty database has been built by Alembic in deployment:

1. Run Alembic before the API process. Do not call `upgrade` from `lifespan`.
2. Remove `create_all` and the `is_blocked` alter from startup. Schema ownership is then only Alembic.
3. Keep permission seeding and `OrderValidationService.ensure_default_rules` as data initialization. They are idempotent inserts, not schema changes.

Removing `create_all` now would change a fresh install that starts the API without Alembic. That removal was not made.

## 9. Backend regression results

| Check | Result |
|---|---|
| `pytest tests` in the API container | **49 passed** in 25.78s, in-memory SQLite |
| Disposable baseline comparison | Match, section 5 |
| Disposable application startup | Health 200, models queried, seed counts 30 and 11 |
| `npm run build` | Succeeded. Vite transformed 3380 modules |
| `GET /health` on port 8088 | 200 `healthy` |
| Live `alembic_version` | Absent |

No frontend source file was edited. The production build confirms the current frontend still compiles.

## 10. Live database preservation verification

No `upgrade`, `stamp`, `downgrade`, `DROP`, or `create_all` was run against `swift_distro_hub`. Counts after this phase:

| Item | Count |
|---|---|
| public tables | 80 |
| employees | 6 |
| products | 14 |
| customers | 8 |
| companies | 2 |
| depots | 4 |
| stock_ledger | 88 |
| orders | 0 |
| trips | 12 |
| login_audits | 60 |
| audit_logs | 59 |
| permissions | 30 |
| `alembic_version` | absent |

These match the Phase D.1 counts. The Phase D.1 custom dump remains at `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261123_140435.dump`.

## 11. Remaining blockers

- `swift_distro_hub` has no `alembic_version` row. It is not Alembic-managed.
- A live stamp has not been approved. The guard will keep refusing it until `ALLOW_LIVE_ALEMBIC=yes` is set deliberately.
- `create_all` is still a second schema path on startup. It is harmless against the baseline and insufficient as a replacement for it.
- `001_platform_hardening.sql` can still be executed by hand. It is not on the Alembic path.
- Autogenerate against the disposable baseline was empty, but future autogenerate output still has to be read. The employees / `role_masters` foreign-key cycle makes Alembic warn that it may ignore those constraints when sorting tables. The baseline SQL itself includes both foreign keys; the catalog comparison confirmed them.
- Sequence counters are not part of the baseline. A restored or stamped live database keeps its own counters. An empty database starts at 1.

## 12. Proposed live-stamping procedure requiring explicit approval

Do not run this as part of Phase D.2. It was not run.

1. Take a new `pg_dump -Fc` of `swift_distro_hub` and verify it with `pg_restore -l`, then restore that dump into a disposable database that is not `swift_distro_hub`.
2. On another empty PostgreSQL 16 database, run `alembic upgrade head` and repeat the catalog comparison in section 5. Stop if any structural difference appears.
3. Confirm `alembic heads` is only `d2_baseline`.
4. With explicit approval, stamp the live database. Do not upgrade it. From the API container, whose `DATABASE_URL` already names `swift_distro_hub`:

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic stamp d2_baseline
```

5. Read back `SELECT version_num FROM alembic_version` and the row counts in section 10. The stamp should add one `alembic_version` row and change no business table.
6. If the stamp is wrong, restore the backup from step 1. Do not repair it with `downgrade`.

`alembic upgrade head` against `swift_distro_hub` would try to create tables that already exist. That command is the wrong one for the live database.
