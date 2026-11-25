# Phase D.3B Alembic Registration Report

Date: 25 November 2026  
Status: **NOT EXECUTED.** Pre-execution verification failed. Live stamp was not requested and was not run.

This is not a registration of `d2_baseline`. Do not treat this file as completion of Phase D.3B.

## 1. Approval received

None. Step 2 was not opened as a GO. The D.3A GO applied to a different catalog (80 public tables, `alembic_version` absent, row counts recorded on 24 November 2026). This prompt is not execution approval.

## 2. Target database

| Item | Value |
|---|---|
| Container | `swift_distro_postgres` (healthy, `pg_isready` accepting connections) |
| Image / version | `postgres:16-alpine`, PostgreSQL 16.14 |
| Host port | `55432` |
| API `DATABASE_URL` | `postgresql://swift_user:***@postgres:5432/swift_distro_hub` |
| `current_database()` | `swift_distro_hub` |
| `ALLOW_LIVE_ALEMBIC` on API process | unset |
| Alembic heads (script dir, disposable URL `postgres`) | exactly one: `d2_baseline` |
| `alembic current` against live URL without override | refused by `env.py` (expected) |
| `public.alembic_version` | absent (`to_regclass` NULL) |

Git: branch `new-version`, HEAD `33c782c` (`udpate in backend`, 2026-11-24 16:51 +0600). D.3A recorded HEAD `4e49250`. Alembic files were committed after D.3A; working tree for `backend/alembic` is clean.

## 3. Verified backup

D.3A dump still exists and lists:

`/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261124_101544.dump`

| Check | Result |
|---|---|
| `pg_restore -l` | Archive listed. TOC header 880 entries |
| SHA-256 | `922595b8027623f62a619a636dd590fb456237087f30ed6841a7c76298a54800` (matches D.3A) |
| TOC still contains | `doctors`, `chemist_shops`, `delivery_allocation_outcomes`, `return_verifications` |

That dump is a 24 November snapshot of the **80-table** catalog. It is not a snapshot of the database observed today. A new dump of the current catalog was **not** taken, because verification already failed and a dump is not a substitute for a matching baseline.

## 4. Exact command executed

None. This command was **not** run:

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic stamp d2_baseline
```

`alembic upgrade head` was not run against `swift_distro_hub`.

## 5. Alembic version before and after

| When | `alembic_version` |
|---|---|
| Before | table absent |
| After | unchanged; stamp not executed |

## 6. Database schema verification (failure)

Live catalog versus Phase D.3A (and versus `d2_reconciled_baseline.sql`):

| Object | D.3A live / baseline | Live 25 Nov 2026 | Result |
|---|---|---|---|
| Application tables (`pg_class` `relkind=r`) | 80 | **78** | Fail |
| Columns (`information_schema.columns`, public) | 943 | **917** | Fail |
| Foreign keys | 145 | **132** | Fail |
| Unique constraints | 47 | **45** | Fail |
| Check constraints (`contype='c'`) | 7 | **0** | Fail |
| Indexes | 235 | **225** | Fail |
| Sequences | 80 | **78** | Fail |
| Enum types | 16 | 16 | Match |
| `alembic_version` | absent | absent | Match |
| `doctors` | present | present | Match |
| `chemist_shops` | present | present | Match |
| `delivery_allocation_outcomes` | present (empty, 7 checks live on this pair) | **absent** | Fail |
| `return_verifications` | present | **absent** | Fail |

The two missing tables are the unmapped custody tables that D.1/D.3A required the baseline to keep. `d2_reconciled_baseline.sql` still `CREATE`s both. Stamping `d2_baseline` would tell Alembic the live database already has that 80-table schema. It does not.

The 78-table set matches modeled tables plus `doctors` and `chemist_shops`, without the two custody tables. Column, FK, unique, check, index, and sequence deltas are consistent with those two tables being gone, with a possible extra column-count gap versus the D.3A methodology (943 − 917 = 26; D.1 described 15 + 16 = 31 columns on those tables). That gap is another reason not to stamp until a full catalog diff is redone.

## 7. Business row-count comparison

`COUNT(*)` on 25 November versus D.3A section 8. This is not `n_live_tup`.

| Table | D.3A (24 Nov) | Live (25 Nov) |
|---|---:|---:|
| employees | 6 | 6 |
| products | 14 | 14 |
| customers | 8 | 8 |
| companies | 2 | **9** |
| depots | 4 | **3** |
| stock_ledger | 88 | **22** |
| orders | 0 | **131** |
| trips | 12 | **63** |
| collection_deposits | 0 | **49** |
| login_audits | 62 | **43** |
| audit_logs | 61 | **264** |
| permissions | 30 | 30 |
| product_item_stock | 40 | **13** |
| product_item_stock_details | 88 | **25** |
| transport_expenses | 22 | **158** |
| stock_adjustments | 7 | **6** |
| stock_adjustment_items | 14 | **12** |
| validation_rule_configs | 11 | 11 |
| vehicles | 8 | **6** |
| drivers | 7 | **6** |
| routes | 5 | 5 |
| doctors | 0 | **12** |
| chemist_shops | 0 | **3** |
| order_items | 0 | **380** |
| order_batch_allocations | 0 | **61** |

Schema and data both moved. This is not the database D.3A certified.

## 8. Backend test results

Not run. Stamp did not happen. Isolated pytest would not repair the catalog mismatch.

## 9. Frontend build results

Not run. No frontend change in this phase.

## 10. Remaining risks

- Stamping `d2_baseline` on this catalog would register a lie: Alembic would believe 80 tables and 7 checks exist.
- `alembic upgrade head` on live remains forbidden; it would attempt `CREATE` of objects that still exist and of two tables that do not.
- The D.3A dump is still valid as a restore source for the **previous** 80-table database. Restoring it over live `swift_distro_hub` would destroy the current 131 orders and related rows. Do not restore over live without a separate, explicit decision.
- `create_all` is still the startup schema path. It cannot recreate `delivery_allocation_outcomes` / `return_verifications`.
- `ALLOW_LIVE_ALEMBIC` must stay off in Compose.

## 11. Readiness for the next modernization phase

**Not ready for a live stamp of `d2_baseline`.** Phase E/F must not start on the assumption that Alembic owns this database.

Required before any later D.3B retry:

1. Decide whether live `swift_distro_hub` is still the system of record (current data) or whether the 24 November dump is the system of record (80-table schema).
2. If current data must stay: produce a **new** reconciled baseline from today’s catalog (78 tables), compare it on a disposable empty PostgreSQL 16 database, then seek a new stamp approval for that revision. Do not stamp `d2_baseline`.
3. If the 80-table catalog must be restored: restore the D.3A dump into a **new** database or cluster, switch the app, re-run D.3A-style comparison, then seek stamp approval. Do not restore onto live without explicit approval.
4. Find how `delivery_allocation_outcomes` and `return_verifications` disappeared (manual drop, recreate of volume, or restore of a different dump).

## Pre-execution checklist (Step 1)

| Check | Result |
|---|---|
| PostgreSQL healthy | Pass |
| `DATABASE_URL` is `swift_distro_hub` | Pass |
| Exactly one Alembic head `d2_baseline` | Pass |
| `alembic_version` does not exist | Pass |
| Previous backup exists and `pg_restore -l` succeeds | Pass (80-table dump) |
| No schema change since D.3A | **Fail** |
| Row counts match D.3A business tables | **Fail** |

**Stop.** No live Alembic write.
