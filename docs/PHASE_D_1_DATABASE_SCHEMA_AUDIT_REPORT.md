# Phase D.1 Database Schema Audit Report

Date: 23 November 2026  
Scope: Read-only audit of `swift_distro_hub`, a verified backup, and a comparison of SQLAlchemy metadata with the PostgreSQL catalog. No migration was generated, stamped, or applied. Models, routes, permissions, and the frontend were not changed. Phase E and Phase F were not started.

The database is not migration-ready. The 76 modeled tables match the catalog closely, but there is no `alembic_version` row, the only Alembic revision is not a safe baseline, and four live tables have no model. An autogenerate or an upgrade of `001_platform` against this database is still unsafe.

## 1. Database and backup information

| Item | Value |
|---|---|
| Server | Container `swift_distro_postgres`, image `postgres:16-alpine`, host port 55432 |
| Database | `swift_distro_hub` |
| Login role used for the audit | `swift_user` |
| Version | PostgreSQL 16.14 on x86_64-pc-linux-musl |
| Public base tables | 80 |
| `public.alembic_version` | Absent |

The API container reaches this same database through its configured `DATABASE_URL`. This audit used read-only catalog queries and `pg_dump`. It did not open a write transaction against `swift_distro_hub`.

Backup, outside the repository:

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261123_140435.dump`

| Check | Result |
|---|---|
| Format | PostgreSQL custom (`pg_dump -Fc`), gzip, 327 KB |
| Archive created | 2026-11-23 08:04:35 UTC |
| Source | `swift_distro_hub`, dumped by pg_dump 16.14 from server 16.14 |
| `pg_restore -l` | Archive listed. TOC header reports 880 entries |
| Restore test | Restored into a new container `swift_d1_restore` on `127.0.0.1:55499`, database `swift_distro_hub_restore` |
| Restored tables | 80 |
| Restored counts | employees 6, products 14, stock_ledger 88, orders 0, trips 12 |
| Cleanup | That container was removed. `swift_distro_hub` was not a restore target |

`pg_restore` exited 0. The backup is usable.

## 2. Complete table inventory

80 public tables. Nineteen hold rows. The other 61 are empty. Empty is not a reason to drop a table.

Non-empty tables:

| Table | Rows |
|---|---|
| product_item_stock_details | 88 |
| stock_ledger | 88 |
| login_audits | 60 |
| audit_logs | 59 |
| product_item_stock | 40 |
| permissions | 30 |
| transport_expenses | 22 |
| products | 14 |
| stock_adjustment_items | 14 |
| trips | 12 |
| validation_rule_configs | 11 |
| customers | 8 |
| vehicles | 8 |
| drivers | 7 |
| stock_adjustments | 7 |
| employees | 6 |
| routes | 5 |
| depots | 4 |
| companies | 2 |

### Core master data (12)

`companies`, `depots`, `customers`, `vendors`, `products`, `materials`, `shipping_points`, `uoms`, `primary_packagings`, `price_setups`, `routes`, `route_shipping_points`

### Employees and authentication (5)

`employees`, `login_audits`, `role_masters`, `role_permissions`, `permissions`

`role_masters` and `role_permissions` are empty. Login still uses the Python role map, not these tables.

### Orders and sales (9)

`orders`, `order_items`, `order_status_history`, `order_validation_runs`, `order_validation_messages`, `order_batch_allocations`, `validation_rule_configs`, `picking_orders`, `picking_order_deliveries`

`orders` and its child tables are empty. `validation_rule_configs` has 11 rows, seeded by API startup.

### Inventory and stock (11)

`stock_ledger`, `stock_receipts`, `stock_receipt_items`, `stock_issuances`, `stock_issuance_items`, `stock_adjustments`, `stock_adjustment_items`, `product_item_stock`, `product_item_stock_details`, `depot_transfers`, `depot_transfer_items`

### Receiving and deliveries (6)

`product_receipts`, `product_receipt_items`, `delivery_orders`, `delivery_order_items`, `vehicle_loadings`, `vehicle_loading_items`

`delivery_orders` is the physical name of the SQLAlchemy `OrderDelivery` model.

### Billing and finance (16)

`collection_deposits`, `collection_transactions`, `invoices`, `customer_credit_balances`, `refund_liabilities`, `refund_settlements`, `reconciliation_runs`, `reconciliation_lines`, `reconciliation_variances`, `day_end_closings`, `promotions`, `promotion_rules`, `promotion_products`, `promotion_customers`, `promotion_depots`, `promotion_usage_logs`

### Transport (5)

`vehicles`, `drivers`, `trips`, `transport_expenses`, `route_stops`

### Audit (1)

`audit_logs`

### Integrations (5)

`integration_systems`, `integration_jobs`, `integration_job_logs`, `integration_failures`, `external_order_refs`

### Mobile and synchronization (6)

`mobile_devices`, `device_login_attempts`, `sync_events`, `sync_queue`, `sync_checkpoints`, `sync_conflicts`

### Unmapped or legacy (4)

These tables are in PostgreSQL and are not in `Base.metadata`. All four are empty. They were not dropped.

`doctors` — 13 columns, no foreign keys. Required fields: `name`, `code` (unique), `specialization`, `registration_number`. Optional: `qualification`, `email`, `phone`, `address`, `city`, `is_active`, timestamps. No `depot_id`. This is the table Phase E should model without adding a depot column.

`chemist_shops` — 12 columns, no foreign keys. Required: `name`, `code` (unique), `owner_name`. Optional: `license_number`, `email`, `phone`, `address`, `city`, `is_active`, timestamps. No `depot_id`. Same Phase E rule.

`delivery_allocation_outcomes` — 15 columns. Foreign keys to `orders`, `order_items`, `order_batch_allocations`, `products`, `depots`, and `employees`. Unique on `allocation_id`. Check constraints require non-negative quantities and `delivered_quantity + undelivered_quantity = reserved_quantity`. This is a custody table, not a sample or export delivery table. Leave it until a design says it is still the custody model. Do not invent a Phase F replacement by dropping it.

`return_verifications` — 16 columns. Foreign keys to `delivery_allocation_outcomes`, `orders`, `order_batch_allocations`, `products`, `depots`, and `employees` (`verified_by` and `created_by`). Unique `verification_number`. Checks require non-negative quantities and `received_quantity <= expected_return_quantity`.

## 3. SQLAlchemy versus PostgreSQL schema differences

Compared `Base.metadata` from `app.models` and `app.models_platform` with the live catalog. The script only reflected metadata. It did not call `create_all` or emit DDL.

| Comparison | Result |
|---|---|
| Model tables | 76 |
| Database tables | 80 |
| Tables only in the database | `doctors`, `chemist_shops`, `delivery_allocation_outcomes`, `return_verifications` |
| Tables only in the models | None |
| Columns missing from the database, on shared tables | None |
| Columns present only in the database, on shared tables | None |
| Nullability mismatches | None |
| Primary-key mismatches | None |
| Foreign-key mismatches | None |
| Unique-constraint mismatches | None |
| Check constraints on modeled tables | None on either side |
| Non-unique indexes missing from the database | None |

What looks like drift, and is not a column defect:

- SQLAlchemy's inspector rendered the 16 native enum columns as `VARCHAR(n)`. `format_type` in `pg_catalog` shows they are the enum types named by the models (`orderstatusenum`, `priorityenum`, and the other 14). No enum label list differed. `orders.collection_type`, `orders.risk_level`, and `orders.validation_status` are genuine `varchar` columns, and the models treat them as strings. Do not convert those three to enums as part of a baseline.
- Seventy-six primary-key defaults differ only as text: PostgreSQL uses `nextval` on a sequence, and the models use an integer primary key without `server_default`. That is the normal serial mapping. It is not a missing column.
- Forty-three unique indexes appear in PostgreSQL and not in `Table.indexes`. They implement `unique=True` constraints that already match on both sides. There is no extra uniqueness rule.

The real structural gap is the four unmapped tables and the seven check constraints that exist only on `delivery_allocation_outcomes` and `return_verifications`.

`backend/db/init.sql` creates 21 tables. It is an older subset. It is not the schema of this database. Replaying it would not reproduce the 80-table catalog, and it must not be used as a restore tool.

## 4. Existing migration history

Alembic has one revision file: `backend/alembic/versions/001_platform_baseline.py`.

| Item | Finding |
|---|---|
| Revision id | `001_platform` |
| Down revision | None. It is the root |
| What upgrade does | Reads `backend/db/migrations/001_platform_hardening.sql` and executes each statement |
| Downgrade | Empty |
| `alembic_version` | Not present, so this revision has not been stamped and was not applied by Alembic |

The SQL file is additive DDL plus two data updates. It adds `employees.is_blocked` and several `orders` columns with `IF NOT EXISTS`, creates six indexes with `IF NOT EXISTS`, then runs:

- `UPDATE orders SET delivery_status = 'VALIDATED' ...`
- `UPDATE orders SET delivery_status = 'PLANNED_FOR_DELIVERY' ...`

Those columns and indexes already exist. The `UPDATE` statements would still run. `001_platform` is not a no-op and is not safe to upgrade onto `swift_distro_hub`.

`backend/db/migrations/` also contains one-off scripts that are not Alembic revisions. There is no history table that records which of them ran. Presence of the resulting objects is the evidence, not a claim that a particular file was executed:

- Order, loading, memo, postponed, and free-goods columns exist.
- `trips`, `product_item_stock`, and `route_shipping_points` exist.
- `employees.is_blocked` exists.
- `001_platform_hardening.sql` was not applied through Alembic.

Scripts that delete or replace data, including `clear_all_orders.sql` and `remove_old_products.sql`, must never be copied into a revision.

`alembic/env.py` points `target_metadata` at `Base.metadata` and overrides `sqlalchemy.url` when `DATABASE_URL` is set. `alembic.ini` still contains a hardcoded URL. The environment variable is the one the API uses. A later change should stop storing a database URL in `alembic.ini`. That file was not edited in this phase.

`backend/main.py` still calls `Base.metadata.create_all` on startup, then `ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_blocked`, then seeds `permissions` and validation rules. `create_all` does not alter existing tables and does not drop the four unmapped tables. It remains a second schema writer beside Alembic. Startup seeding writes rows when codes are missing. It was not triggered by this audit because the API was not restarted.

## 5. Risks in the current Alembic configuration

- Upgrading `001_platform` updates `orders.delivery_status` even though the columns already exist.
- `alembic revision --autogenerate` against this database would treat the four unmapped tables, their foreign keys, unique indexes, and check constraints as removals. The inspector's enum-as-varchar rendering can also propose false type changes.
- Stamping `001_platform` would record a revision that cannot build a fresh database. Its SQL assumes `employees` and `orders` already exist.
- `create_all` on startup can create a new table the moment a model is added, outside Alembic. That is acceptable only until a baseline is trusted.
- SQLite tests call `create_all` and `drop_all`. They do not prove a PostgreSQL migration. The foreign-key cycle warning between `employees` and `role_masters` is a SQLite teardown limitation, not a live-catalog error.
- A fresh empty database cannot be created from the current Alembic chain.

## 6. Proposed baseline architecture

Use a reconciled schema, not models alone and not an unreviewed autogenerate.

| Source | What it gets right | What it gets wrong |
|---|---|---|
| SQLAlchemy models alone | The 76 tables, columns, nullability, keys, and uniques | Omits four tables and seven check constraints. A later autogenerate drops them |
| Live catalog alone | Exact current DDL, including legacy checks | Does not tell Alembic which objects are intentional. Future autogenerate still drops anything the models do not own |
| Reconciled baseline | Catalog DDL for all 80 tables, checked against the 76 models | Requires a reviewed revision and a disposable-database proof before any stamp |

The baseline revision should create every current public table, enum, index, foreign key, unique constraint, and check constraint. The four unmapped tables stay in that revision as legacy objects, with comments naming them. Future autogenerate must ignore those four until Phase E or a custody design maps them. Ignoring them is an explicit filter, not a drop.

Do not put `001_platform_hardening.sql` or any historical seed, update, or delete script in the baseline. Do not include `DROP TABLE` or `DROP COLUMN`.

Phase E adds SQLAlchemy models for `doctors` and `chemist_shops` that match the columns already listed. It does not add `depot_id`. If the baseline already created those tables, the Phase E revision should be empty or limited to a proven missing piece. Phase F adds new delivery resources in a later additive revision. It does not replace `delivery_allocation_outcomes` or `return_verifications`.

Separate the two uses:

- Baseline revision: build an empty database from nothing.
- Stamp, without upgrade: attach that revision to `swift_distro_hub` only after the empty-database result matches the live catalog. The live database is not migrated by replaying the baseline.

## 7. Safe migration implementation sequence

This sequence is the design. It was not executed.

1. Keep the custom dump from section 1 as the rollback copy.
2. Take a schema-only dump and review it beside the model diff in section 3.
3. Write one new root revision whose upgrade is that reviewed DDL and whose downgrade is intentionally unsupported. Do not chain it after `001_platform`. Retire `001_platform` from the head so it cannot be upgraded by accident, without deleting the file's history from review.
4. Create a disposable PostgreSQL 16 database. Run only that baseline upgrade there.
5. Diff the disposable catalog with the live catalog: tables, columns, types, nullability, keys, checks, and indexes. The diff must show no missing live object and no extra drop.
6. Only if step 5 is clean, `alembic stamp` the baseline on `swift_distro_hub`. Do not `upgrade` it there.
7. Confirm `alembic_version` is the new revision and that row counts are unchanged.
8. After a second empty database can be built by Alembic alone, stop calling `create_all` on API startup. Move the `is_blocked` alter and the permission seed out of startup, or make the seed stay data-only and idempotent.
9. Later revisions are additive. Apply each one to a disposable copy of the live dump before considering the live database.

## 8. Backup and rollback strategy

Rollback of a bad future migration is a restore from `swift_distro_hub_20261123_140435.dump` into a new database or a restored volume. It is not a replay of `init.sql`, and it is not `alembic downgrade`.

Rules for that restore:

- Never run `pg_restore` with `swift_distro_hub` as the target while it is the live database.
- Restore into a new database name or a replacement cluster, verify table count 80 and the row counts in section 10, then switch the application only after that check.
- Code rollback is a git revert of the unapplied revision. No data rollback is required for Phase D.1 because this phase did not change schema or business rows.

Take a new custom dump immediately before any future stamp or upgrade. The 23 November dump remains the Phase D.1 baseline copy.

## 9. Test results

| Check | Result |
|---|---|
| `GET /health` on port 8088 | 200 `healthy` |
| PostgreSQL connectivity | `current_database()` returned `swift_distro_hub` |
| Table count | 80 before and after the audit |
| `alembic_version` | Still absent |
| SQLAlchemy metadata load | 76 tables imported from `app.models` and `app.models_platform` |
| Backend tests | `pytest tests` — **49 passed** in 23.62s on in-memory SQLite |
| Backup restore | 80 tables and the key row counts above, in a disposable database that was then removed |

No login was sent to the live API. Pytest did not use `swift_distro_hub`.

## 10. Final database preservation verification

No `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, or `DELETE` was issued against `swift_distro_hub`. `alembic upgrade`, `stamp`, `downgrade`, and `revision --autogenerate` were not run. `create_all` was not invoked against PostgreSQL by this audit.

| Table | Count |
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
| login_audits | 60 |
| audit_logs | 59 |
| `alembic_version` | absent |

These match the counts recorded at the end of Phase C.2.

## 11. Recommended Phase D.2 implementation steps

Phase D.2 should implement the baseline. It should not start Doctor, Chemist, sample, or export features.

1. Add a reviewed baseline revision from the reconciled catalog, including the four legacy tables and their check constraints, with no drops and no data updates.
2. Remove `001_platform` from the upgrade path so its `UPDATE orders` statements cannot run. Keep the file in the tree until the replacement revision is reviewed.
3. Upgrade the baseline only in a disposable PostgreSQL 16 database. Diff that catalog against `swift_distro_hub`.
4. Stamp the live database only after that diff is clean. Do not upgrade the live database with the baseline.
5. Re-check the row counts in section 10 before and after the stamp.
6. Leave `create_all` in place until a second empty database builds from Alembic alone. Removing it is the last step of D.2, not the first.
7. Add an autogenerate exclusion for the four unmapped tables until Phase E maps `doctors` and `chemist_shops` and a later design accepts the custody tables.
8. Do not add `masters.write`, new routes, or Phase E models in that revision.

Until those steps are done and the disposable diff is clean, do not describe `swift_distro_hub` as managed by Alembic.
