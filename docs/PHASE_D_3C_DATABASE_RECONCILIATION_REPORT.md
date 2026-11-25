# Phase D.3C Database Reconciliation Report

Date: 25 November 2026  
Scope: Protect the current `swift_distro_hub` catalog, explain why it no longer matches `d2_baseline`, and recommend an Alembic recovery path. No stamp, upgrade, downgrade, or restore was run against the live database. No new Alembic revision was added. Phase E and Phase F were not started.

## 1. Current backup and restore verification

Active connection (read-only checks):

| Item | Value |
|---|---|
| API `DATABASE_URL` | `postgresql://swift_user:***@postgres:5432/swift_distro_hub` |
| `current_database()` from the API engine | `swift_distro_hub` |
| Server | container `swift_distro_postgres`, PostgreSQL 16.14, host port 55432 |
| `pg_isready` | accepting connections |

New timestamped custom dump, **outside the repository**, not overwriting any previous file:

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_103235.dump`

| Check | Result |
|---|---|
| Format | `pg_dump -Fc`, gzip |
| Size | 358 783 bytes |
| Archive created | 2026-11-25 04:32:35 +06 |
| Source | `swift_distro_hub`, pg_dump 16.14 / server 16.14 |
| SHA-256 | `079737c3fe3f00c90d639d15ce9caf0ab9f0ba1fb2774381ba148c4f5d092f39` |
| `pg_restore -l` | Archive listed. TOC header 845 entries |
| TOC `delivery_allocation_outcomes` / `return_verifications` | Absent (matches live) |
| TOC `doctors` / `chemist_shops` | Present |

Previous dumps remain:

| File | Role |
|---|---|
| `swift_distro_hub_20261123.dump` | Earlier 80-table snapshot |
| `swift_distro_hub_20261123_140435.dump` | Phase D.1 |
| `swift_distro_hub_20261124_101544.dump` | Phase D.3A (SHA unchanged) |
| `swift_distro_hub_20261125_103235.dump` | This phase (current live) |

Restore target: disposable container `swift_d3c_pg` (`postgres:16-alpine`), database name **`swift_distro_hub_d3c_restore`**. That name is not `swift_distro_hub`. `pg_restore --no-owner --no-acl` exit 0.

Live versus restore:

| Object | Live | Restored |
|---|---|---|
| Application tables | 78 | 78, same names |
| Columns (`pg_attribute` and `information_schema`) | 917 | 917 |
| Foreign keys | 132 | 132 |
| Unique constraints | 45 | 45 |
| Check constraints (`contype='c'`) | 0 | 0 |
| Indexes | 225 | 225 |
| Sequences | 78 | 78 |
| Enums | 16 | 16 |
| `alembic_version` | absent | absent |

Key `COUNT(*)` values matched exactly, including orders 131, order_items 380, collection_deposits 49, trips 63, doctors 12, chemist_shops 3, employees 6, products 14, audit_logs 264.

The disposable container was removed after the comparison. The dump file remains. Live row counts after this phase: still 78 tables and 131 orders. `alembic_version` still absent.

## 2. Current database table inventory

78 public base tables. SQLAlchemy models 76 of them. Unmapped: `doctors`, `chemist_shops`.

Non-empty tables (`COUNT(*)`):

| Table | Rows | Table | Rows |
|---|---:|---|---:|
| order_items | 380 | audit_logs | 264 |
| transport_expenses | 158 | orders | 131 |
| trips | 63 | order_batch_allocations | 61 |
| collection_deposits | 49 | login_audits | 43 |
| order_validation_messages | 43 | collection_transactions | 38 |
| order_validation_runs | 38 | delivery_order_items | 33 |
| reconciliation_lines | 31 | permissions | 30 |
| product_item_stock_details | 25 | product_receipt_items | 24 |
| stock_ledger | 22 | depot_transfer_items | 21 |
| picking_order_deliveries | 15 | route_shipping_points | 15 |
| order_status_history | 14 | products | 14 |
| product_item_stock | 13 | doctors | 12 |
| delivery_orders | 12 | price_setups | 12 |
| validation_rule_configs | 11 | depot_transfers | 10 |
| companies | 9 | reconciliation_runs | 9 |
| customers | 8 | product_receipts | 8 |
| role_masters | 8 | shipping_points | 8 |
| uoms | 7 | employees | 6 |
| vehicles | 6 | drivers | 6 |
| stock_adjustments | 6 | stock_adjustment_items | 12 |
| routes | 5 | invoices | 5 |
| picking_orders | 5 | vehicle_loadings | 5 |
| primary_packagings | 5 | vendors | 5 |
| depots | 3 | chemist_shops | 3 |
| reconciliation_variances | 2 | | |

Empty tables remain in place (materials, promotions, sync, refunds, stock_receipts, stock_issuances, and others). Empty is not a reason to drop them.

## 3. Schema changes since Phase D.3A

D.3A live catalog (24 November) versus live catalog (25 November):

| Object | D.3A | Now | Delta |
|---|---:|---:|---|
| Tables | 80 | 78 | −2 |
| Columns (`information_schema` / `pg_attribute` today) | 943 (D.3A report) | 917 | −26 |
| Foreign keys | 145 | 132 | −13 |
| Unique constraints | 47 | 45 | −2 |
| Check constraints | 7 | 0 | −7 |
| Indexes | 235 | 225 | −10 |
| Sequences | 80 | 78 | −2 |

Removed tables:

- `delivery_allocation_outcomes` (15 columns, 4 checks, unique on `allocation_id`, FKs to orders / items / allocations / products / depots / employees)
- `return_verifications` (16 columns, 3 checks, unique `verification_number`, FKs including `outcome_id` → outcomes)

Those 31 columns plus the 7 checks, 2 uniques, 2 sequences, and the FK/index set on those tables explain almost all of the catalog drop.

**Column-count discrepancy from D.3B (943 vs 917, not 912):** not a counting-method error. `pg_attribute` and `information_schema.columns` both return **917** on the live database.

```
D.3A columns 943
  − 31 columns on the two missing tables
  +  5 columns added after D.3A
  = 917
```

The five extra columns exist on live PostgreSQL and **not** in SQLAlchemy models, `api.ts`, or any `.sql`/`.py` file in this repository:

| Table | Column | Type | Live use (`COUNT` where set) |
|---|---|---|---:|
| `orders` | `delivery_rejected` | boolean | 3 |
| `orders` | `delivery_rejected_at` | timestamp | 3 |
| `orders` | `delivery_rejected_reason` | text | 3 |
| `collection_deposits` | `rejected` | boolean | 5 |
| `collection_deposits` | `rejected_at` | timestamp | 5 |

`create_all` cannot add columns to existing tables. These ALTER-like columns were applied outside the tracked application code.

Shared modeled tables: 76/76 present. Primary keys match. Foreign-key count matches models (132). Nullability matches. No modeled column is missing from PostgreSQL.

`doctors` (13 columns) and `chemist_shops` (12 columns) match the D.2 dump DDL in `d2_reconciled_baseline.sql`.

## 4. Investigation of the missing tables

### Confirmed

1. **The Docker volume was not recreated.** `distribution_reneta_webapp_postgres_data` `CreatedAt` is 2026-11-12T08:17:57Z. Data directory `PG_VERSION` is dated 12 November. The postmaster start on 25 November 04:21 UTC is a container restart, not a new cluster.
2. **`init.sql` is not mounted.** Compose still comments out `backend/db/init.sql`. That file never defined the two missing tables.
3. **No application DROP.** Repository Python and SQL under `backend/` contain no `DROP TABLE` for these names. Pytest `Base.metadata.drop_all` runs only against in-memory SQLite in `tests/conftest.py`.
4. **Alembic did not run on live.** `alembic_version` is absent. `env.py` still refuses the live URL without `ALLOW_LIVE_ALEMBIC=yes`. That override is unset on the API process.
5. **The two tables are unused by application code.** No SQLAlchemy model, router, or service references `delivery_allocation_outcomes` or `return_verifications`. Reservation writes `order_batch_allocations`. Delivery uses `delivery_orders` / `delivery_order_items`.
6. **`doctors` and `chemist_shops` were dropped and recreated after the D.3A dump.** D.3A dump TOC oids: doctors `18031`, chemist_shops `18019`. Live `pg_class.oid`: doctors `24591`, chemist_shops `24579`. Core tables kept original oids (`employees` `16562`, `orders` `17345`, `stock_ledger` `17012`). This is not a full schema rebuild.
7. **Business data grew in place** on those original oids (orders 0 → 131, deposits 0 → 49, trips 12 → 63). That is not a restore of the empty D.3A dump over live.
8. **Statement logging cannot show the DROP.** `logging_collector=off`, `log_statement=none`. Docker postgres logs since this morning’s start contain only the original volume `CREATE DATABASE`. No log file under `PGDATA/log`.
9. **All historical dumps through 24 November still contain the two tables.** The 25 November dump does not.

### Hypotheses (not proven)

- Interactive SQL (psql, GUI, or an uncommitted script) dropped the two unused tables, recreated `doctors`/`chemist_shops`, ALTERed rejection columns, and loaded mock doctor/chemist rows. Doctor codes `DOC-0001` / name `Dr. Mohammad Rahman` match the hardcoded list in `src/pages/settings/Doctor.tsx`, which still does not call an API.
- A session outside this git history (another machine, another agent, a one-off notebook) performed that DDL. No such script is in the repo or in Compose.

### Ruled out

| Cause | Why not |
|---|---|
| Recreated Docker volume | Volume and `PG_VERSION` date 12 November; original table oids remain |
| Restore of D.3A/D.1 dump over live | Would restore the two tables and the old (empty) order counts |
| Restore of a 78-table dump from this repo | No such dump existed before today |
| Seed script in `backend/db` | No DROP; `seed_demo_environment` targets `swift_distro_demo` |
| `alembic upgrade` / `stamp` | Live still has no `alembic_version`; live commands still refused |
| SQLAlchemy `create_all` | Does not drop tables or add columns on existing tables |

## 5. Git, Docker, and database change evidence

| Source | Finding |
|---|---|
| Git HEAD | `33c782c` on `new-version`. Alembic D.2 files committed after D.3A’s recorded HEAD `4e49250`. No model change that drops those tables. |
| `git log -S delivery_allocation_outcomes` | Hits `33c782c` (adds baseline SQL) and `c629985` on `main`. Nothing deletes the tables from the database. |
| Compose | Named volume `postgres_data`. Backend bind-mounts `./backend:/app`. `ALLOW_LIVE_ALEMBIC` not in Compose. |
| Docker | Postgres container created 12 November, RestartCount 0, started 25 November 04:21 UTC. |
| `backend/db/migrations/` | Additive SQL and data scripts. None mention the two tables. `clear_all_orders.sql` exists but was not executed against live (orders are 131, not 0). |
| Startup (`main.py`) | `create_all`, `is_blocked` ALTER, permission/validation seed. None of that drops unmapped tables. |

Uncommitted work preserved: `docs/PHASE_D_3B_ALEMBIC_REGISTRATION_REPORT.md` (and this file). Alembic sources were not edited.

## 6. SQLAlchemy compatibility analysis

| Check | Result |
|---|---|
| Modeled tables | 76 |
| Live tables | 78 = 76 models + `doctors` + `chemist_shops` |
| Tables only in models | none |
| Tables only in DB | the two masters above |
| Missing modeled columns | none |
| Extra columns on modeled tables | the five rejection columns |
| PK mismatches | none |
| FK count | 132 both sides |
| Nullability mismatches | none |
| Model check constraints | 0; live check constraints 0 (the seven checks lived only on the missing tables) |
| `d2_reconciled_baseline.sql` | Still describes 80 tables including the two missing ones. It does **not** describe the five rejection columns |

`d2_baseline` is therefore not a description of today’s database: it would create two tables that are gone and omit five columns that hold live values.

Index counts differ (models list 100 `Index` objects; PostgreSQL has 225) for the same reason recorded in D.1: unique constraints appear as indexes in the catalog. That is not new drift.

## 7. Current business-data preservation results

Live data was not deleted, restored over, or migrated. After backup + disposable restore + read-only queries:

- 131 orders, 380 items, 49 deposits, 63 trips, 12 doctors, 3 chemist shops still present.
- 3 orders and 5 deposits carry rejection-column values. Restoring the 24 November dump over live would drop those columns and those rows.
- Login was **not** called against live (would insert `login_audits`). Health and SQL reads only.

## 8. Option A versus Option B analysis

**Option A — keep the 78-table database; design a revised baseline**

- Treat live `swift_distro_hub` as the system of record.
- New schema-only dump of **this** catalog (78 tables + 5 extra columns + doctors/chemist).
- Replace or supersede `d2_baseline` so an empty PostgreSQL 16 database can be built to match live. Prove it on a disposable database. Then seek a stamp of **that** revision.
- Effect on data: none. Existing orders, deposits, trips, doctors, chemist shops stay.
- Effect on future migrations: autogenerate starts from the real catalog. Phase E still adds models for doctors/chemist (tables already there). Custody tables stay out until a product design exists.
- Cost: `d2_baseline` becomes historical (same treatment as `001_platform`). Must not stamp `d2_baseline`.

**Option B — keep current rows; add only the missing schema objects**

- `CREATE TABLE` for `delivery_allocation_outcomes` and `return_verifications` from the D.2 SQL, additive, empty.
- Does **not** restore the old dump. Current business rows stay.
- After that, the catalog would be 80 tables **plus** the five extra columns, so `d2_baseline` would **still** be wrong (missing those five columns).
- Effect: empty custody tables return; future autogenerate might propose dropping them again unless models or `include_object` keep them.
- Only justified if a near-term delivery/return workflow will write those tables.

Restoring `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261124_101544.dump` onto live is **not an option**. It would replace 131 orders and related operational data with the empty D.3A snapshot.

## 9. Recommended Alembic baseline strategy

**Recommend Option A.**

Reasons:

1. Current data is valuable and already backed up.
2. The two missing tables have no application readers or writers. At D.3A they were empty. Recreating them now would not recover any rows.
3. The five rejection columns **do** hold data and are absent from `d2_baseline`. Any honest baseline must include them (and later, models/API if the UI should see them).
4. Stamping `d2_baseline` today would register a schema Alembic does not have.

**Next implementation phase (not this report):**

1. Keep `d2_reconciled_baseline.py` / `.sql` under `alembic/historical/` (or leave them unused) so they are not the live head.
2. Generate a new root (or a successor revision used only on empty databases) from a **schema-only** dump of current `swift_distro_hub`, including doctors, chemist_shops, and the five extra columns, excluding `alembic_version`.
3. `alembic upgrade head` on a disposable empty PostgreSQL 16 database. Diff catalogs excluding `alembic_version` and sequence `last_value`.
4. Separate, explicit approval to `stamp` that new revision on live. Still never `upgrade` live.

Do not create that revision in D.3C. Do not stamp.

Option B remains available later as an **additive** migration if product insists on empty custody tables. It is not required to register Alembic.

## 10. Regression test results

| Check | Result |
|---|---|
| `pytest /app/tests` in `swift_distro_api`, `PYTHONPATH=/app`, cwd `/tmp`, `-p no:cacheprovider` | **49 passed**, 89 warnings, 36.54s. In-memory SQLite from `conftest.py`. First attempt from `/app` failed to collect because `/app/.pytest_cache` is not writable (root-owned). Isolated retry did not use `swift_distro_hub`. |
| SQLite FK-cycle warning on `employees` / `role_masters` | Same teardown limitation as D.1–D.3A |
| `GET /health` inside the API container | 200 `{"status":"healthy"}` |
| `GET /` | 200, version 2.0.0 |
| Nginx `:9081/health` | 200 `healthy` |
| API → PostgreSQL | `current_database()=swift_distro_hub`, PostgreSQL 16.14 |
| `npm run build` in `swift_distro_frontend` | Exit 0, Vite 5.4.19, 3397 modules, ~26s. Existing 2.8 MB chunk warning. No frontend source edited |
| Read-only orders | 131 rows, all have `status` |
| Inventory | 25 batch detail rows, quantity sum 13275 |
| Billing | 49 deposits, 31 approved |
| Transport | 63 trips, 158 expenses |
| Doctors / chemist shops | 12 / 3 rows in PostgreSQL. UI pages still use component state; they do not read these tables |

Live login was not exercised (would write `login_audits`).

## 11. Remaining risks

- Cause of the DROP/ALTER is still not in logs or git. The same channel could change the catalog again before a new baseline is captured.
- Five rejection columns are live data without models or API. `create_all` will not create them on a fresh database until they are in a baseline SQL file or in the ORM.
- Doctor and chemist rows exist but screens ignore them. Phase E must map columns as they are (including `is_active`), not invent `depot_id`.
- `d2_baseline` remains the only Alembic head. It is unsafe to stamp or upgrade on live.
- `Base.metadata.create_all` still runs at API startup.
- Rollback of a later bad stamp is restore of **today’s** dump into a **new** database, not `alembic downgrade`.
- Dual stock stores and other functional gaps from earlier reports are unchanged.

## 12. GO / NO-GO recommendation for the next step

| Action | Verdict |
|---|---|
| Stamp `d2_baseline` on live | **NO-GO** |
| `alembic upgrade head` on live | **NO-GO** |
| Restore the 24 November dump over live | **NO-GO** |
| Option A: new reconciled baseline from the 25 November catalog, disposable proof, then a **new** stamp approval | **GO** as the next modernization step |
| Option B: additive CREATE of the two empty custody tables | **NO-GO** unless product names a workflow that will write them |
| Phase E / F | **NO-GO** until a baseline that matches live is registered |

This phase did not stamp or migrate the live database.
