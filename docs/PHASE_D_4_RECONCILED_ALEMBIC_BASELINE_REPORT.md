# Phase D.4 Reconciled Alembic Baseline Report

Date: 25 November 2026  
Scope: Replace the retired `d2_baseline` (80 tables) with a new root `d4_baseline` that matches the live `swift_distro_hub` catalog (78 tables plus five rejection columns). Live PostgreSQL was not stamped, upgraded, downgraded, or altered. Phase E and Phase F were not started.

The live database is **not** Alembic-managed until a later approved stamp of `d4_baseline` is executed and verified.

## 1. Files modified

| File | Change |
|---|---|
| `backend/alembic/versions/d4_reconciled_baseline.py` | New root revision `d4_baseline` |
| `backend/alembic/sql/d4_reconciled_baseline.sql` | Schema-only DDL from the live catalog |
| `backend/alembic/env.py` | Unmapped-table list is now `doctors` and `chemist_shops` only. Narrow `UNMAPPED_COLUMNS` exclusion for the five rejection columns. Live-database refuse unchanged |
| `backend/alembic/historical/d2_reconciled_baseline.py` | Moved out of `versions/`. Docstring marks it archived. SQL path points at the sibling historical file |
| `backend/alembic/historical/d2_reconciled_baseline.sql` | Moved with the revision. Content unchanged |
| `backend/alembic/historical/001_platform_baseline.py` | Comment updated: active root is `d4_baseline` |
| `backend/alembic/historical/README.md` | Records why `d2_baseline` was retired |
| `docs/PHASE_D_4_RECONCILED_ALEMBIC_BASELINE_REPORT.md` | This report |

`backend/main.py`, SQLAlchemy models, routers, permissions, Compose, and the frontend were not changed. `ALLOW_LIVE_ALEMBIC` is not in `docker-compose.yml`.

A throwaway autogenerate probe (`dd55fafd1bd8`) was created against a disposable database, confirmed empty (`pass` / `pass`), and **deleted** so it is not a second head.

Existing uncommitted docs (`PHASE_D_3B`, `PHASE_D_3C`) were not reverted.

## 2. Current database backup verification

Live target confirmed: API `DATABASE_URL` is `postgresql://swift_user:***@postgres:5432/swift_distro_hub`. `current_database()` is `swift_distro_hub`. PostgreSQL 16.14. `alembic_version` absent.

Catalog at the start of D.4 matched D.3C: 78 tables, 917 columns, 16 enums, 132 FKs, 45 uniques, 0 checks, 225 indexes, 78 sequences. `delivery_allocation_outcomes` and `return_verifications` absent. The five rejection columns present. Row counts unchanged from D.3C (orders 131, order_items 380, collection_deposits 49, trips 63, doctors 12, chemist_shops 3, audit_logs 264).

D.3C dump still present and checksum-verified:

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_103235.dump`  
SHA-256 `079737c3fe3f00c90d639d15ce9caf0ab9f0ba1fb2774381ba148c4f5d092f39`

A new dump was taken immediately before generating the baseline (schema unchanged; not an overwrite):

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_104030.dump`

| Check | Result |
|---|---|
| `pg_restore -l` | Archive listed. TOC 845 entries |
| SHA-256 | `186d22f94ba63fa2b20cf23647bec1faa63c0cfa3decfe344910f9fa1fa741fe` |
| Earlier dumps (23–24 Nov, D.3C) | Untouched |

## 3. Archived baseline details

`d2_baseline` described 80 tables, including two unused custody tables that are gone, and it omitted five live rejection columns. Stamping it would have been a false registration.

| Item | Location |
|---|---|
| Revision file | `backend/alembic/historical/d2_reconciled_baseline.py` |
| SQL | `backend/alembic/historical/d2_reconciled_baseline.sql` |
| Upgrade / downgrade | Not executed |
| Alembic path | Not loaded. `versions/` contains only `d4_reconciled_baseline.py` |

`001_platform` remains archived. Two historical roots plus one active root; Alembic sees **one** head.

## 4. New revision identifier

| Item | Value |
|---|---|
| Revision id | `d4_baseline` |
| Down revision | none (root) |
| Head | `d4_baseline` only |
| `alembic heads` (disposable URL) | `d4_baseline (head)` |
| `alembic history` | `<base> -> d4_baseline (head)` |
| `alembic current` against live URL without override | Refused by `env.py` (expected) |

## 5. New schema baseline contents

`backend/alembic/sql/d4_reconciled_baseline.sql` was produced with `pg_dump --schema-only --no-owner --no-acl --no-comments` from live `swift_distro_hub`, then edited only to:

- remove psql `\restrict` / `\unrestrict`
- restore `search_path` to `public` at the end so Alembic can insert into `alembic_version`

The dump had no `CREATE SCHEMA public` and no `setval`. The file contains no `INSERT`, `UPDATE`, `DELETE`, `COPY`, `DROP TABLE`, `DROP COLUMN`, or credentials.

| Object | Count in SQL / live |
|---|---|
| `CREATE TABLE` | 78, including `doctors` and `chemist_shops` |
| `CREATE TYPE` (enums) | 16 |
| `CREATE SEQUENCE` | 78 |
| `delivery_allocation_outcomes` / `return_verifications` | Absent |
| Rejection columns | Present with live types: `boolean DEFAULT false` (nullable), `timestamp without time zone` (nullable), `text` (nullable) |

## 6. SQLAlchemy drift handling

Models still omit the five rejection columns and the two master tables. Values stay in PostgreSQL. Models were not edited (no Phase E, no API change).

`include_object` in `env.py`:

- Tables `doctors`, `chemist_shops`: if reflected and missing from metadata, exclude (no autogenerate `DROP TABLE`).
- Columns in `UNMAPPED_COLUMNS`: if reflected and missing from metadata, exclude (no autogenerate `DROP COLUMN`). Once a later reviewed model change adds the `Column()`, `compare_to` is set and the pair should be removed from the set so Alembic tracks them normally.
- All other column add/type/null diffs still participate in autogenerate.
- Retired custody tables are **not** in the ignore set. If they reappear without models, autogenerate will flag them.

Autogenerate against disposable `d4_baseline` produced `upgrade()` / `downgrade()` of `pass`. The probe revision was deleted.

**Later model work (not this phase):** add nullable `delivery_rejected`, `delivery_rejected_at`, `delivery_rejected_reason` on `Order`, and `rejected`, `rejected_at` on `CollectionDeposit`, matching PostgreSQL (`Boolean` default false, `DateTime`, `Text`). Then remove those five tuples from `UNMAPPED_COLUMNS`. Doctor/chemist models remain Phase E.

## 7. Disposable PostgreSQL schema comparisons

Container `swift_d4_pg` (`postgres:16-alpine`) on the application Docker network. Databases `d4_baseline` and `d4_app`. Not `swift_distro_hub`. `ALLOW_LIVE_ALEMBIC` unset.

```
DATABASE_URL=postgresql://swift_user:***@swift_d4_pg:5432/d4_baseline
alembic upgrade head
```

Exit 0. `alembic current` → `d4_baseline (head)`. A second `upgrade head` applied no further revision. The same upgrade succeeded on `d4_app`.

Fingerprint of live vs `d4_baseline` after upgrade, excluding `alembic_version` and sequence `last_value`:

| Object | Live | Disposable | Diff |
|---|---:|---:|---|
| Tables | 78 | 78 | none |
| Columns (`format_type`, nullability, defaults) | 917 | 917 | none |
| Enums (name + label order) | 16 | 16 | none |
| Primary keys | 78 | 78 | none |
| Foreign keys | 132 | 132 | none |
| Unique constraints | 45 | 45 | none |
| Check constraints | 0 | 0 | none |
| Indexes | 225 | 225 | none |
| Sequence definitions (type, start, increment, min, max, cycle) | 78 | 78 | none |
| JSON/JSONB columns | 10 | 10 | none |

`alembic_version` on disposable: one row, `d4_baseline`. Live: table absent.

Unexplained structural differences: **zero**.

The disposable container was removed after verification.

## 8. FastAPI compatibility results

`d4_app` after `alembic upgrade head`, with `DATABASE_URL` pointed only at that database:

| Check | Result |
|---|---|
| `TestClient` `GET /health` | 200 `{"status": "healthy"}` |
| `GET /` | 200, version 2.0.0 |
| Modeled tables (76) | All present; `SELECT COUNT(*)` succeeded on each |
| `doctors` / `chemist_shops` | Present |
| Custody tables | Absent |
| Five rejection columns | Present; not attributes on the ORM classes |
| Startup `create_all` + `is_blocked` alter | Catalog still 78 application tables + `alembic_version` (79 `relkind=r`). Column fingerprint vs live still 917 / 917, empty symmetric diff |
| Permission seed | 30 rows |
| Validation-rule seed | 11 rows |
| `employees` | 0 (no live seed) |

## 9. Backend tests

`pytest /app/tests` in `swift_distro_api`, `PYTHONPATH=/app`, cwd `/tmp`, `-p no:cacheprovider`: **49 passed**, 89 warnings, 37.88s. In-memory SQLite. Did not use `swift_distro_hub`. Same SQLite FK-cycle teardown warning as prior phases.

## 10. Frontend build

`npm run build` in `swift_distro_frontend`: exit 0, Vite 5.4.19, 3397 modules, ~27s. Existing 2.8 MB chunk warning. No frontend source edited.

## 11. Future schema-change safeguards

Not applied to live privileges in this phase. Recommended sequence **after** an approved stamp:

1. **Alembic is the only schema writer.** Additive revisions for new columns/tables. Do not `CREATE`/`ALTER` in psql, seed scripts, or `create_all` (remove `create_all` only after a fresh empty database can be built with Alembic alone — already the D.2 rule).
2. **Split roles.** Application login: DML on business tables, no `CREATE`/`ALTER`/`DROP`. Migration login: used only by Alembic in CI or a controlled job. Do not change `swift_user` now.
3. **Review every revision.** No autogenerate merge without reading `upgrade()`. `UNMAPPED_COLUMNS` / `LEGACY_UNMAPPED_TABLES` are allowlists, not a reason to skip the diff.
4. **Backup before every schema change.** Custom `pg_dump -Fc`, `pg_restore -l`, restore test on a disposable database.
5. **CI:** empty PostgreSQL 16, `alembic upgrade head`, catalog fingerprint vs a committed snapshot of this baseline, pytest on SQLite or disposable Postgres. Never point CI Alembic at `swift_distro_hub`.
6. **Periodic catalog check:** compare live `information_schema` / `pg_constraint` to the baseline SQL (or to `Base.metadata` plus the documented unmapped objects). Alert on extra/missing columns.
7. Keep `env.py` refuse of `swift_distro_hub` unless `ALLOW_LIVE_ALEMBIC=yes` on a one-shot `docker exec`. Never put that variable in Compose.

## 12. Live database preservation checks

No Alembic command ran successfully against `swift_distro_hub`. After D.4:

| Check | Result |
|---|---|
| Public tables | 78 |
| `alembic_version` | absent |
| orders / order_items / collection_deposits | 131 / 380 / 49 |
| trips / doctors / chemist_shops / audit_logs | 63 / 12 / 3 / 264 |
| FastAPI `GET /health` (running API, live DB) | 200 healthy |

## 13. Remaining risks

- Live is still unmanaged. `create_all` still runs at API startup. It did not change `d4_app` after the baseline; it still cannot add the five rejection columns on a database built only from models.
- Out-of-band DDL that produced the D.3C drift can happen again until privileges are split.
- `UNMAPPED_COLUMNS` hides only those five drop proposals. Other drift remains visible. Forgetting to remove a tuple after modeling the column would hide legitimate autogenerate for that column.
- Stamp is a metadata write: it creates `alembic_version` and one row. It must not run `upgrade` (that would `CREATE` objects that already exist).
- Sequence `last_value` on a database built from this baseline starts at 1. Live identity counters stay on live. Intended.
- Dual stock stores and other functional gaps are unchanged.

## 14. GO / NO-GO recommendation for stamping the new baseline

**GO** to stamp **`d4_baseline`** on `swift_distro_hub`, subject to **separate explicit approval**.

Grounds:

1. Disposable `upgrade head` reproduced the live application schema with no unexplained diff.
2. FastAPI started on a second disposable database; models and the five columns are present; seeds ran; `create_all` did not reshape the catalog.
3. Exactly one Alembic head. `d2_baseline` is archived.
4. Live row counts and 78-table catalog are unchanged by this phase.
5. Backend tests and the frontend production build succeeded.

Do not treat this GO as permission to run the stamp in this report.

### Command prepared (not executed)

From the API container, whose `DATABASE_URL` already names `swift_distro_hub`:

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic stamp d4_baseline
```

Do **not** run:

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade head
```

against `swift_distro_hub`.

After a future approved stamp, read back `SELECT version_num FROM alembic_version;` (expect `d4_baseline`) and the row counts in section 12. The stamp should add `alembic_version` only.
