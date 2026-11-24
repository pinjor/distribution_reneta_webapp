# Phase D.3A Stamp Readiness Report

Date: 24 November 2026  
Scope: Prepare `swift_distro_hub` for a later Alembic baseline stamp. Take a fresh backup, restore it into a disposable database, upgrade an empty PostgreSQL 16 database to `d2_baseline`, and compare catalogs. The live database was not stamped, upgraded, or downgraded. Phase D.3B and Phase E were not started.

This phase does not register Alembic on the live database. It only answers whether a stamp of `d2_baseline` is safe to run later, with explicit approval.

## 1. Environment verification

| Item | Value |
|---|---|
| Git branch | `new-version` |
| HEAD commit | `4e492508a482c31203e1c34523df06f14a78c450` — `udpate login page and  dashboard]` |
| Uncommitted work | Preserved. Not stashed, committed, or reverted. Includes in-progress modernization (Alembic D.2 files, Phase C tests, router and frontend edits) plus existing docs. `.env` remains modified and empty of secrets in this workspace |
| Live server | Container `swift_distro_postgres`, image `postgres:16-alpine`, host port 55432 |
| PostgreSQL | 16.14 on x86_64-pc-linux-musl |
| Live database | `swift_distro_hub` |
| Login role | `swift_user` |
| API container | `swift_distro_api`, `DATABASE_URL` points at `postgresql://swift_user:***@postgres:5432/swift_distro_hub` |
| `ALLOW_LIVE_ALEMBIC` in the running API | Unset |
| Public base tables | 80 |
| `public.alembic_version` | Absent (`to_regclass` returned NULL) |

Alembic, with `DATABASE_URL` pointed at the disposable default database `postgres` so `env.py` would not treat the command as live:

```
d2_baseline (head)
<base> -> d2_baseline (head), Reconciled schema baseline for an empty PostgreSQL database.
```

`backend/alembic/versions/` contains only `d2_reconciled_baseline.py`. `001_platform` remains under `backend/alembic/historical/` and is not a head.

A probe of `alembic current` against the live URL, without `ALLOW_LIVE_ALEMBIC=yes`, raised:

```
RuntimeError: Refusing to run Alembic against the live database swift_distro_hub. Set DATABASE_URL to a disposable PostgreSQL database. A live stamp or upgrade also requires ALLOW_LIVE_ALEMBIC=yes and explicit approval. This override was not used.
```

That probe did not connect far enough to run DDL. After it, `alembic_version` was still absent.

## 2. Fresh backup location

Outside the repository:

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261124_101544.dump`

| Check | Result |
|---|---|
| Format | PostgreSQL custom (`pg_dump -Fc`), gzip, 328 KB |
| SHA-256 | `922595b8027623f62a619a636dd590fb456237087f30ed6841a7c76298a54800` |
| Archive created | 2026-11-24 10:15:54 UTC |
| Source | `swift_distro_hub`, dumped by pg_dump 16.14 from server 16.14 |
| `pg_restore -l` | Archive listed. TOC header reports 880 entries |

The Phase D.1 dump at `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261123_140435.dump` is unchanged and was not used as the restore source for this phase.

## 3. Backup restoration results

Restored into a new container `swift_d3a_pg` (`postgres:16-alpine`, host port 55501), database name **`swift_distro_hub_d3a_restore`**. That name is not `swift_distro_hub`. The live volume was not a restore target.

`pg_restore --no-owner --no-acl` exited 0.

| Check | Live | Restored |
|---|---|---|
| Application tables | 80 | 80, same names |
| Columns | 943 | 943 |
| Enum types | 16 | 16 |
| Foreign keys | 145 | 145 |
| Unique constraints | 47 | 47 |
| Check constraints (`pg_constraint` `contype='c'`) | 7 | 7 |
| Indexes | 235 | 235 |
| Sequences | 80 | 80 |
| `alembic_version` | absent | absent |

Row counts matched the live database at dump time:

| Table | Live (pre-dump) | Restored |
|---|---|---|
| employees | 6 | 6 |
| products | 14 | 14 |
| customers | 8 | 8 |
| companies | 2 | 2 |
| depots | 4 | 4 |
| stock_ledger | 88 | 88 |
| orders | 0 | 0 |
| trips | 12 | 12 |
| collection_deposits | 0 | 0 |
| login_audits | 62 | 62 |
| audit_logs | 61 | 61 |
| permissions | 30 | 30 |
| product_item_stock | 40 | 40 |
| product_item_stock_details | 88 | 88 |
| transport_expenses | 22 | 22 |
| stock_adjustment_items | 14 | 14 |
| stock_adjustments | 7 | 7 |
| validation_rule_configs | 11 | 11 |
| vehicles | 8 | 8 |
| drivers | 7 | 7 |
| routes | 5 | 5 |

`login_audits` (62) and `audit_logs` (61) are two rows above the Phase D.1/D.2 figures (60 and 59). That is application use since those reports, not a change made by this phase. The dump and the restore agree with each other.

The disposable container was removed after the comparison. The dump file remains.

## 4. Schema comparison results

A second empty database, **`d3a_baseline`**, was created on the same disposable PostgreSQL 16 instance. It had 0 public tables before the upgrade.

Command (API container, disposable URL only, `ALLOW_LIVE_ALEMBIC` not set):

```bash
docker exec -w /app \
  -e DATABASE_URL='postgresql://swift_user:swift_password@swift_d3a_pg:5432/d3a_baseline' \
  swift_distro_api alembic upgrade head
```

Exit 0. `alembic current` reported `d2_baseline (head)`. A second `upgrade head` applied no further revision.

Catalog objects excluding `alembic_version`:

| Object | Live | Disposable after upgrade | Result |
|---|---|---|---|
| Application tables | 80 | 80 | Same names |
| Columns (`format_type`, nullability, defaults) | 943 | 943 | Match |
| Enum types | 16 | 16 | Match, including label order |
| Foreign keys | 145 | 145 | Match |
| Unique constraints | 47 | 47 | Match |
| Check constraints | 7 | 7 | Match. Four quantity checks on `delivery_allocation_outcomes`, three on `return_verifications` |
| Indexes | 235 | 235 | Match |
| Sequence definitions | 80 | 80 | Match on type, start, increment, min, max, cycle, and owning column |
| JSON/JSONB columns | 10 | 10 | Same names and types |
| `alembic_version` | absent | one row, `d2_baseline` | Expected |

A sorted CSV of tables, columns, enums, primary keys, foreign keys, unique constraints, check constraints, indexes, and sequence definitions differed by **one line only**: the primary key on `alembic_version` in the disposable database. After excluding that object, the files were identical.

`information_schema.table_constraints` lists 300 `CHECK` rows on both catalogs because PostgreSQL also exposes `NOT NULL` there. The D.2 figure of 7 is `pg_constraint` where `contype = 'c'`. That is the comparison used here.

The only other expected difference is sequence `last_value`. Live sequences that have issued identities are advanced (`stock_ledger_id_seq` and `product_item_stock_details_id_seq` are 88; `employees_id_seq` is 7). Disposable sequences have `last_value` null. Those counters are not part of the schema baseline. Copying them into the revision would encode live identity state. This is not an unexplained structural difference.

No missing live object. No extra drop. No extra application table.

## 5. Alembic revision verification

| Item | Result |
|---|---|
| Heads | Exactly one: `d2_baseline` |
| Down revision | None. Root revision |
| Upgrade target used | Disposable `d3a_baseline` only |
| Live `alembic_version` after this phase | Still absent |
| Historical `001_platform` | Not on the path |
| Live stamp | Not executed |
| Live upgrade / downgrade | Not executed |

`alembic upgrade head` against `swift_distro_hub` remains the wrong command. It would try to `CREATE` objects that already exist.

## 6. Backend test results

| Check | Result |
|---|---|
| `pytest tests` in `swift_distro_api` with `PYTHONPATH=/app` | **49 passed**, 89 warnings, 28.83s, in-memory SQLite |
| SQLite FK-cycle warning on `employees` / `role_masters` | Same teardown limitation recorded in D.1/D.2. Not a live-catalog error |
| `GET /health` via nginx `:8088/health` | 200, body `healthy` |
| FastAPI `GET /health` inside the compose network | 200 `{"status": "healthy"}` |
| API → PostgreSQL | `current_database()` = `swift_distro_hub`; version 16.14 |

Pytest used SQLite from `tests/conftest.py`. It did not use `swift_distro_hub`.

## 7. Frontend build results

`npm run build` in `swift_distro_frontend`:

```
vite v5.4.19 building for production...
✓ 3397 modules transformed.
✓ built in 16.46s
```

Exit 0. Chunk-size warning on the 2.8 MB JS bundle is existing, not a failure. No frontend source was edited in this phase. Nginx continued to serve the Vite dev app on port 8088.

## 8. Live database row counts

No `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, or `DELETE` was issued against `swift_distro_hub` by this phase. Counts after the work:

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
| collection_deposits | 0 |
| login_audits | 62 |
| audit_logs | 61 |
| permissions | 30 |
| `alembic_version` | absent |

These match the pre-dump counts in section 3. They match Phase D.2 on every business table except `login_audits` and `audit_logs`, which gained two rows from ordinary API use before this phase started.

## 9. Remaining risks

- The live database is still not Alembic-managed. A stamp is a metadata insert into a new `alembic_version` table. It should not rewrite business rows, but it is still a write.
- `alembic upgrade head` on the live database would fail or conflict because the 80 tables already exist. Stamp is the only acceptable live command, and only with approval.
- `ALLOW_LIVE_ALEMBIC=yes` must be set only on that one `docker exec`. It must not be added to `docker-compose.yml` or the running API environment.
- `Base.metadata.create_all` and the `is_blocked` `ALTER` still run on API startup. They did not change this catalog. Removing them is not part of D.3A.
- `001_platform_hardening.sql` can still be executed by hand. It is not on the Alembic path.
- Sequence counters stay with the live database. An empty database built from the baseline starts at 1. That is intended.
- Autogenerate output still has to be read after the stamp. The four unmapped tables remain filtered in `env.py`.
- Rollback of a bad stamp is restore from the 24 November dump into a **new** database or cluster, then switch the application. It is not `alembic downgrade`. Downgrade of `d2_baseline` raises `RuntimeError`.

## 10. GO / NO-GO recommendation for baseline registration

**GO** for Phase D.3B stamp of `d2_baseline` on `swift_distro_hub`, subject to explicit approval.

Grounds:

1. Fresh custom dump exists, lists, and restores 80 tables with matching business counts.
2. Empty PostgreSQL 16 + `alembic upgrade head` reproduces the live application schema. The only extras are `alembic_version` and unused sequence counters.
3. There is exactly one Alembic head.
4. Backend tests, health checks, PostgreSQL connectivity, and the frontend production build succeeded.
5. Live `alembic_version` is still absent. Row counts are unchanged by this phase.

Do not treat this GO as permission to run the stamp in this report. Phase D.3B is a separate, approved write.

### Command prepared for D.3B (not executed)

From the API container, whose `DATABASE_URL` already names `swift_distro_hub`:

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic stamp d2_baseline
```

After a future approved stamp, read back:

```sql
SELECT version_num FROM alembic_version;
```

and the row counts in section 8. The stamp should add one `alembic_version` row and change no business table.

Do not run:

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade head
```

against `swift_distro_hub`.
