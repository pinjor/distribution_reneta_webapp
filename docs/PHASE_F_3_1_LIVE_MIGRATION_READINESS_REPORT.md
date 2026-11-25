# Phase F.3.1 — Sample/Gift and Export Live Migration Readiness

Date: 25 November 2026  
Status: **APPROVED AND EXECUTED (Phase F.3.2).** Live `swift_distro_hub` is at `f3_export_draft` with 82 application tables. Draft writes remain disabled.

This report is an approval gate. It is not authorization to change `swift_distro_hub`.

Target chain:

`d4_baseline` → `f2_sample_gift_draft` → `f3_export_draft`

## 1. Current Git and Docker state

| Item | Value |
|---|---|
| Branch | `new-version` |
| HEAD | `33c782c7413f728ee0fd84c73576f0a36c4279b7` (same as D.5 stamp) |
| Working tree | Uncommitted D.4–F.3 work (models, Alembic F.2/F.3, routers, frontend, reports). Not committed. |
| Alembic files on disk | `d4_reconciled_baseline.py`, `f2_sample_gift_draft.py`, `f3_export_draft.py` only |
| Head | exactly one: `f3_export_draft` |

Containers: `swift_distro_postgres` healthy (`postgres:16-alpine`), `swift_distro_api` running, Redis/frontend/nginx up. Volume `distribution_reneta_webapp_postgres_data`.

`ALLOW_LIVE_ALEMBIC` is **not** in `docker-compose.yml` and is unset on the API process. `alembic current` against live without the override **refuses** as designed.

## 2. Live PostgreSQL preflight

Read-only. No stamp, upgrade, or restore onto live.

| Check | Result |
|---|---|
| Server | PostgreSQL **16.14** (Alpine), `pg_isready` accepting |
| Database | **`swift_distro_hub`** |
| API `DATABASE_URL` | `postgresql://swift_user:***@postgres:5432/swift_distro_hub` |
| Alembic revision | **`d4_baseline`** |
| Script head | **`f3_export_draft`** |
| Chain | `d4_baseline` (base) → `f2_sample_gift_draft` → `f3_export_draft` |
| Application tables | **78** (79 including `alembic_version`) |
| Columns / FKs / uniques / checks / indexes / sequences | **917 / 132 / 45 / 0 / 225 / 78** |
| `sample_gift_*` / `export_*` | **absent** |
| `GET /health` | `{"status":"healthy"}` |
| `schema_guard` vs live engine | **ok** (pending F.2+F.3 allowlisted) |

Row counts match the D.5 post-stamp snapshot:

| Table | D.5 / this preflight |
|---:|---:|
| orders | 131 |
| order_items | 380 |
| collection_deposits | 49 |
| trips | 63 |
| doctors | 12 |
| chemist_shops | 3 |
| audit_logs | 264 |
| employees | 6 |
| products | 14 |
| permissions | 30 |
| stock_ledger | 22 |
| login_audits | 43 |
| invoices | 5 |
| product_item_stock_details | 25 |

Ledger available **13000.00**, PISD available **10635.00**.

**Schema drift vs D.5 baseline: none.** Preflight continues.

## 3. Fresh backup verification

Previous D.5 dump was **not** overwritten (`104750.dump` SHA still `646b38f2…eead`).

New custom-format dump (outside the repo):

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_121426.dump`

| Check | Result |
|---|---|
| Size | 359 648 bytes |
| SHA-256 | `1365af47c76084b4b7eb6045f0be0c0b4f09daf0950adc7249747d9af8ad39c1` |
| `pg_restore -l` | success |
| TABLE DATA entries | 79 (78 application + `alembic_version`) |

## 4. Disposable restoration

Restored into `f31_r1` and (second rehearsal) `f31_r2` on the same PostgreSQL 16 instance. **Not** `swift_distro_hub`.

Both restores: Alembic `d4_baseline`, 78 application tables, orders 131, order_items 380, stock_ledger 22, invoices 5, doctors 12.

Databases were dropped after rehearsal.

## 5. Migration rehearsal results

### Rehearsal 1 (`f31_r1`)

| Step | Result |
|---|---|
| d4: Sample/Gift tables | absent |
| d4: Export tables | absent |
| `alembic upgrade f2_sample_gift_draft` | success → 80 tables |
| `alembic upgrade f3_export_draft` | success → **82** tables, revision **`f3_export_draft`** |
| Original 78 tables | still present |
| New tables | four only |
| Business counts | orders 131, invoices 5, collections 49, ledger 13000, PISD 10635 unchanged |
| Unique indexes | `ix_sample_gift_deliveries_delivery_number`, `ix_export_deliveries_delivery_number` |
| FKs | depot, employee, product; item `ON DELETE CASCADE` **only** to the new headers |
| CHECK qty 0 | rejected (`ck_export_item_quantity_positive`) |
| CHECK unit_price −0.01 | rejected (`ck_export_item_unit_price_non_negative`) |
| Autogenerate | empty `pass`; probe deleted; head remains `f3_export_draft` |

### Rehearsal 2 (`f31_r2`, fresh restore)

Same upgrade order. Final revision `f3_export_draft`, 82 tables, orders still 131. Repeatable.

## 6. Schema comparison

F.2 and F.3 revisions contain only `create_table` / `create_index` / named check constraints. No `drop_table`, `alter_table`, `drop_column`, or DML. They do not touch `orders`, `stock_ledger`, `invoices`, or `collection_deposits`.

Item cascade deletes apply only if a **new** Sample/Gift or Export header is deleted. Existing commercial rows have no FK to these tables.

`d4_baseline.upgrade()` still creates the original 78 tables and must **not** be replayed on live. Live is already at `d4_baseline`; the approved path is `upgrade f2` then `upgrade f3` only.

## 7. API compatibility results

Authenticated TestClient against **disposable** databases (JWT minted in-process; **no live login**, no live `login_audits`). Admin: `admin@swiftdistro.com`.

| DB state | Sample/Gift GET | Export GET | Orders GET | Unauthenticated draft GET |
|---|---|---|---|---|
| `d4_baseline` | **503** (mentions `f2_sample_gift_draft`) | **503** | **200** | **401** |
| `f2_sample_gift_draft` | **200**, `[]` | **503** (mentions `f3_export_draft`) | **200** | — |
| `f3_export_draft` | **200**, `[]` | **200**, `[]` | **200** | — |

Empty lists after F.3: no fabricated documents. Order list length 21 is the existing default page size; table count remains 131.

Live API (current process, still `d4_baseline`): `/health` healthy. Unauthenticated draft routes **401**. Alembic is not invoked from FastAPI startup (`assert_schema_ready` only).

`PENDING_LIVE_REVISIONS` is an explicit allowlist of `f2_sample_gift_draft` and `f3_export_draft`. An unexpected extra revision would fail startup rather than being masked.

## 8. Backend/frontend regression tests

| Suite | Result |
|---|---|
| `pytest /app/tests` isolated SQLite | **106 passed** |
| Sample/Gift + Export CRUD, depot 404, 401/403, missing-table 503, stock/billing non-mutation | included in the 106 |
| `npm test` | **9 passed** |
| `npm run build` | exit 0 |

No documents inserted into live PostgreSQL.

## 9. Authorization and feature flag review

| Control | Current live API process | Required for live schema cutover |
|---|---|---|
| `ENVIRONMENT` | `development` (Compose) | leave as-is unless a production cutover is planned separately |
| `SAMPLE_GIFT_DRAFT_WRITES` | **unset → True** (dev default) | set **`no`** before/with the upgrade, then restart API |
| `EXPORT_DRAFT_WRITES` | **unset → True** (dev default) | set **`no`** before/with the upgrade, then restart API |
| Role map | six roles unchanged | do not change |
| PSO / `user` writes | 403 | keep |

Disposable smoke with flags forced `no` and admin JWT: POST Sample/Gift and Export returned **403** (feature flag), not a database error.

Do not enable production writes in this migration. Do not create test drafts, flip product flags, reserve stock, or post invoices.

## 10. Exact proposed live migration commands

**Do not run until the operator replies with explicit approval for live `swift_distro_hub`.**

Pre-steps (recommended, still not executed):

1. Recheck live revision is `d4_baseline` and table count is 78.
2. Confirm backup `…121426.dump` still hashes `1365af47…39c1`.
3. Confirm Alembic head is still only `f3_export_draft`.
4. Restart API with `SAMPLE_GIFT_DRAFT_WRITES=no` and `EXPORT_DRAFT_WRITES=no` (one-shot env or Compose; **do not** add `ALLOW_LIVE_ALEMBIC` to Compose).

Migration (API container, live URL already in process env):

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade f2_sample_gift_draft
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade f3_export_draft
```

`ALLOW_LIVE_ALEMBIC` must exist only on those `docker exec` processes.

Post-checks:

- `alembic_version` = `f3_export_draft`
- application tables = 82
- four new tables present; original 78 still present
- orders/stock/invoices/collections counts (allowing concurrent legitimate app writes)
- `/health`
- authenticated GET Sample/Gift and Export return `[]`
- write flags still false; POST remains 403 until product approval

## 11. Failure-handling plan

PostgreSQL + Alembic use transactional DDL. A failed **single** revision should roll back that revision.

| Failure | Action |
|---|---|
| `upgrade f2` fails | Stop. Live should remain `d4_baseline` / 78 tables. Do **not** stamp, retry in a loop, or restore unless separately approved. |
| `f2` succeeds, `f3` fails | Stop. Report revision (`f2_sample_gift_draft` expected) and table count (80 expected). Sample/Gift reads would work; Export stays 503. Do **not** downgrade. Do **not** restore automatically. Fix `f3` on disposable, then apply **only** `upgrade f3_export_draft` after a new approval. |
| Unexpected extra objects or row-count collapse | Stop. Treat as incident. Restore is a **separate** operator decision using `…121426.dump`. |

Do not run `alembic downgrade` on live. Do not `stamp` to “fix” a failed upgrade.

## 12. Approval status

**APPROVED.** Operator message (25 November 2026, 12:27 +06):

> I approve the controlled Phase F.3.2 live Alembic migration for PostgreSQL database `swift_distro_hub`, from `d4_baseline` to `f3_export_draft`, through the two existing additive revisions.

Conditional on safety checks. Write flags required disabled. No stamp, no auto-retry, no F.4.

Pre-execution recheck (passed): live `swift_distro_hub` at `d4_baseline`, 78 tables, no Sample/Gift or Export tables, schema still 917 columns / 132 FKs, backup SHA-256 unchanged, single Alembic head `f3_export_draft`. Git commit `863a801` stored `d4_reconciled_baseline.py`, `f2_sample_gift_draft.py`, `f3_export_draft.py` only (no credentials).

## 13. Final execution status

**EXECUTED.** See also `docs/PHASE_F_3_2_LIVE_MIGRATION_EXECUTION_REPORT.md`.

### Feature flags (persistent)

`docker-compose.yml` backend environment:

- `SAMPLE_GIFT_DRAFT_WRITES=no`
- `EXPORT_DRAFT_WRITES=no`

API recreated (`docker compose up -d --no-deps --force-recreate backend`). PostgreSQL and Redis volumes were not recreated. Running process: both flags **False**. `ALLOW_LIVE_ALEMBIC` unset on the API process. `alembic current` without the override still refuses live.

### Commands and logs

```text
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade f2_sample_gift_draft
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade d4_baseline -> f2_sample_gift_draft, F.2 sample/gift draft document tables.
```

After F.2: revision `f2_sample_gift_draft`, **80** application tables, `sample_gift_deliveries` present, `export_deliveries` absent, orders 131.

```text
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade f3_export_draft
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade f2_sample_gift_draft -> f3_export_draft, F.3 export draft document tables.
```

After F.3: revision **`f3_export_draft`**, **82** application tables.

### Before / after

| Metric | Before | After |
|---|---:|---:|
| Alembic | `d4_baseline` | `f3_export_draft` |
| Application tables | 78 | 82 |
| Original 78 tables | present | present |
| sample_gift_deliveries / items | absent | present, 0 rows |
| export_deliveries / items | absent | present, 0 rows |
| orders | 131 | 131 |
| order_items | 380 | 380 |
| stock_ledger rows / available | 22 / 13000 | 22 / 13000 |
| product_item_stock_details available | 10635 | 10635 |
| invoices | 5 | 5 |
| collection_deposits | 49 | 49 |
| doctors / chemist_shops / employees / products / permissions | 12 / 3 / 6 / 14 / 30 | same |
| login_audits | 43 | 43 (JWT minted in-process; no live login) |

### Post-migration API (uvicorn after restart at `f3_export_draft`)

| Check | Result |
|---|---|
| `GET /health` | 200 `{"status":"healthy"}` |
| Authenticated `GET /api/sample-gift-deliveries` | 200 `[]` |
| Authenticated `GET /api/export-deliveries` | 200 `[]` |
| Authenticated `GET /api/orders` | 200 |
| Unauthenticated draft GET | 401 |
| Admin POST Sample/Gift | 403 write flag |
| Admin POST Export | 403 write flag |
| Draft rows created | none |

Draft creation remains off. Phase F.4 was not implemented.

---

### Approval gate (summary, historical)

| Field | Value |
|---|---|
| Target database | `swift_distro_hub` |
| Current revision (at gate) | `d4_baseline` |
| Target revision | `f3_export_draft` |
| Backup | `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_121426.dump` |
| SHA-256 | `1365af47c76084b4b7eb6045f0be0c0b4f09daf0950adc7249747d9af8ad39c1` |
| Restore | verified on `f31_r1` / `f31_r2` (dropped) |
| Rehearsals | two successful F.2 then F.3 upgrades; 82 tables; autogenerate empty |
| Live writes in this phase | schema only; no draft documents |
