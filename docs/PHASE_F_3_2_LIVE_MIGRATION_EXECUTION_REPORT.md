# Phase F.3.2 — Sample/Gift and Export Live Migration Execution

Date: 25 November 2026  
Status: **COMPLETE.** Live `swift_distro_hub` is at `f3_export_draft`. Draft persistence schema is deployed. **Draft creation is not enabled.** This is not operational Sample/Gift or Export delivery (no stock, approval, dispatch, or invoicing).

## 1. Approval

Operator (12:27 +06): approve controlled live Alembic upgrade of `swift_distro_hub` from `d4_baseline` to `f3_export_draft` through `f2_sample_gift_draft`, conditional on safety checks, write flags off, no stamp/retry/restore automation, no F.4.

Preflight after approval matched F.3.1: database name, revision, 78 tables, no new module tables, D.5 column/FK counts, backup checksum, single head.

## 2. Pre-steps

| Step | Result |
|---|---|
| Git preserve | Commit `863a801` — `d4_reconciled_baseline.py`, `f2_sample_gift_draft.py`, `f3_export_draft.py` only |
| Backup | `/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_121426.dump` SHA-256 `1365af47c76084b4b7eb6045f0be0c0b4f09daf0950adc7249747d9af8ad39c1` |
| Restore tests | Documented in F.3.1 (`f31_r1`, `f31_r2`) |
| Write flags | `SAMPLE_GIFT_DRAFT_WRITES=no` and `EXPORT_DRAFT_WRITES=no` in `docker-compose.yml` |
| API recreate | `docker compose up -d --no-deps --force-recreate backend` — Postgres/Redis volumes untouched |
| Effective flags | both **False**; `ALLOW_LIVE_ALEMBIC` unset |
| `/health` | healthy before upgrade |
| Schema drift | none vs D.5 |

## 3. Migration commands

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade f2_sample_gift_draft
```

Log: `Running upgrade d4_baseline -> f2_sample_gift_draft`. Revision `f2_sample_gift_draft`. Application tables **80**.

```bash
docker exec -w /app -e ALLOW_LIVE_ALEMBIC=yes swift_distro_api alembic upgrade f3_export_draft
```

Log: `Running upgrade f2_sample_gift_draft -> f3_export_draft`. Revision **`f3_export_draft`**. Application tables **82**.

`ALLOW_LIVE_ALEMBIC` was only on those `docker exec` processes. The API process still has it unset. `alembic current` without the override still refuses live.

## 4. Schema after cutover

Four new empty tables: `sample_gift_deliveries`, `sample_gift_delivery_items`, `export_deliveries`, `export_delivery_items`. Original 78 application tables remain.

## 5. Business data

| Object | Before | After |
|---:|---:|---:|
| orders | 131 | 131 |
| order_items | 380 | 380 |
| stock_ledger available | 13000 | 13000 |
| PISD available | 10635 | 10635 |
| invoices | 5 | 5 |
| collection_deposits | 49 | 49 |
| doctors / chemist shops | 12 / 3 | 12 / 3 |
| Sample/Gift / Export rows | n/a | **0 / 0** |

No product-flag, stock, billing, or RBAC map changes.

## 6. API after restart at head

API was recreated again so `schema_guard` boots against `f3_export_draft`.

| Endpoint | Result |
|---|---|
| `GET /health` | 200 healthy |
| `GET /api/sample-gift-deliveries` (admin JWT) | 200 `[]` |
| `GET /api/export-deliveries` (admin JWT) | 200 `[]` |
| `GET /api/orders` (admin JWT) | 200 |
| POST Sample/Gift (admin) | **403** flag |
| POST Export (admin) | **403** flag |

JWTs were minted in-process (`sub` = employee email). `login_audits` stayed at 43.

## 7. Unresolved issues

- **Writes remain off** until product approval and explicit `SAMPLE_GIFT_DRAFT_WRITES=yes` / `EXPORT_DRAFT_WRITES=yes`.
- **PSO / `orders.write` mapping** still not approved.
- Live catalog still has **zero** sample-flagged and **zero** export-flagged products; forms will show empty pickers.
- **Print** is still disabled.
- **F.4** (stock, approval, dispatch, customs, invoices) is not started.
- Compose `ENVIRONMENT` is still `development`; production hardening of `SECRET_KEY` is unchanged from earlier phases.
- Large uncommitted D.4–F.3 application work remains besides the Alembic commit and this compose/docs follow-up.

## 8. Recommendation

Treat Sample/Gift and Export as **schema-ready, write-gated**. Do not tell operations that those deliveries are live warehouse flows.
