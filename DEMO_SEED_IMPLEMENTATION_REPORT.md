# Demo Seed Implementation Report

## Result

The seed system is written and was not executed.

`swift_distro_postgres` has databases `postgres`, `template0`, `template1`, and `swift_distro_hub`. There is no `swift_distro_demo`. The running API `DATABASE_URL` points at `swift_distro_hub`. Section 7 of the task says to stop before execution when a disposable demo database is not configured.

Read-only check after the work: `orders` on `swift_distro_hub` is still 0. No truncate, seed, or schema change was run against it.

## Scripts

| File | Role |
| --- | --- |
| `backend/db/demo_safety.py` | Requires `DEMO_DATABASE_URL` and `DEMO_DATABASE_CONFIRM`. Name must contain `demo` and must not be `swift_distro_hub`, `postgres`, `template0`, or `template1`. Confirms `current_database()`. Refuses a missing `companies` table instead of calling `create_all()`. Refuses to continue if `app.database` was imported before the URL override. |
| `backend/db/inventory_rules.py` | Pure reserve, receipt, and delivery-deduction arithmetic. |
| `backend/db/seed_consistent_workflows.py` | Idempotent demo documents and stock postings. Marker prefix `DEMO-WF` / memo numbers `88001001`–`88001008`. |
| `backend/db/seed_demo_environment.py` | Orchestrator. Reuses master, vehicle, driver, route, settings, opening stock, transport, and test-user seeds. Does not call `seed_all_data`, `seed_complete_orders`, `seed_delivery_orders`, `seed_collection_data`, `seed_collection_deposits`, `seed_demo_modules`, or `seed_depot_transfers`. |
| `backend/db/validate_demo_inventory.py` | Read-only balance checks. |
| `backend/db/seed_product_stock_data.py` | Extended so a rerun does not reset a batch that already has `reserved_quantity`, and does not reset a stock header that already has issues, adjustment-outs, or reservations. |
| `backend/tests/test_demo_inventory_rules.py` | Unit tests for the arithmetic. |

## Safety checks implemented

1. Git branch at audit: `new-version`.
2. Live connection target: `swift_distro_hub`.
3. Demo name required: `swift_distro_demo` (any name containing `demo` is accepted only when `DEMO_DATABASE_CONFIRM` matches it exactly).
4. Explicit inequality with `swift_distro_hub`.
5. No production `.env` or Compose volume was edited.
6. Orchestrator never calls `Base.metadata.create_all()`.

## Designed records (not inserted)

Counts are what one successful run on an empty demo schema is written to create. They were not observed in a database.

| Area | Keys | Count |
| --- | --- | --- |
| Opening stock | existing `seed_product_stock_data` medicine list | 10 products, multiple batches, reserved 0, available = quantity |
| Ledger mirror | one row per opening batch, only if `stock_ledger` is empty | same as opening batches |
| Receipts | `DEMO-REC-FACT-001` approved, `DEMO-REC-FACT-002` draft, `DEMO-REC-DEPOT-001` approved, `DEMO-REC-DEPOT-002` draft, `DEMO-REC-RET-DRAFT` unposted return, `DEMO-REC-NEAR-EXP` approved expiry in 25 days, `DEMO-REC-LOW` approved qty 8 | 7 |
| Adjustments | `DEMO-ADJ-PEND`, `DEMO-ADJ-REJ` unposted; `DEMO-ADJ-IN` +10 and `DEMO-ADJ-OUT` -6 posted to the batch and the ledger | 4 |
| Orders | `88001001` new; `88001002` and `88001008` validated and reserved; `88001003` loaded and still reserved; `88001004` fully delivered, pending collection, on-hand reduced; `88001005` partial, 6 deducted and 4 left reserved; `88001006` postponed, reservation unchanged; `88001007` fully collected, on-hand reduced, collection transaction | 8 |
| Transfers | `DEMO-DT-PENDING`; `DEMO-DT-TRANSIT` via `approve_depot_transfer`; `DEMO-DT-RECEIVED` via approve then `receive_depot_transfer`. Ledger moved by the same quantity because that router does not update `stock_ledger`. | 3 |
| Deposits | `DEMO-DEP-PENDING`, `DEMO-DEP-APPROVED`, `DEMO-DEP-REJECTED` (`approved` false, notes start with `REJECTED`) | 3 |
| Other | picking `DEMO-PICK-001`, loading delivery, delivered delivery, pending issuance `DEMO-ISS-001`, loading `DEMO-LD-001`, invoice `DEMO-INV-88001004`, reconciliation `DEMO-REC-001`, promotion `DEMO-PROMO-10`, audit `DEMO_SEED` | one each |
| Transport and users | existing `seed_transport_data` (RNG seeded to `20261122`) and `seed_test_users` | trips/expenses vary by that script; login `admin@swiftdistro.com` / `admin123` |

Rerun behavior: workflow keys are looked up before insert. Opening stock is skipped once `product_item_stock` has rows, so a second run does not wipe posted deductions. Transfer approve/receive is skipped when the transfer number already exists, so stock is not moved twice.

## Inventory rules encoded

- Reserve: available down, reserved up, on-hand unchanged. `StockReservationService.reserve_allocations` updates the batch. The seed copies the resulting quantities onto the matching ledger row.
- Full delivery (`88001004`, `88001007`): on-hand and reserved decrease by the delivered quantity. Allocation status becomes `ISSUED`.
- Partial (`88001005`): only the delivered 6 leave on-hand and reserved. The allocation quantity becomes the remaining 4 and stays `RESERVED`. Available does not increase.
- Postponed (`88001006`): `deduct_delivered(..., 0)`. Reservation stays. Available does not increase.
- Draft return receipt: no stock function is called.
- `commit_for_order` is not called.

`validate_demo_inventory.py` checks batch balance, ledger balance, ledger versus matching batch, header `stock_qty` versus sum of batch quantities, and `RESERVED` allocation sums versus `reserved_quantity`. It aborts if the session database is `swift_distro_hub`.

## Tests actually run

Backend, inside `swift_distro_api`, with `DATABASE_URL=sqlite:///:memory:` so the suite uses the existing in-memory fixture and does not open `swift_distro_hub`:

```text
docker exec -w /app -e DATABASE_URL=sqlite:///:memory: -e SECRET_KEY=test-secret \
  swift_distro_api python -m pytest tests -q --tb=line
```

Result: **26 passed**, 82 warnings (Pydantic and SQLAlchemy deprecations already present).

Frontend, on the host:

```text
npx vitest run
```

Result: **3 passed** in `src/lib/api.test.ts`.

Not run, because there is no demo database:

- `python -m db.seed_demo_environment`
- a second seed run for duplicate checks
- foreign-key checks against PostgreSQL
- authenticated API reads of demo rows
- browser walkthrough of data pages against demo data

Import check that does not write:

```text
docker exec -w /app swift_distro_api python -c \
  "import db.seed_consistent_workflows, db.seed_demo_environment, db.validate_demo_inventory"
```

Result: `imports ok`.

## Unsupported or only partly represented

- Live `approve_delivery` still does not deduct stock. Demo delivered orders are consistent only if they were created by this seed, not if a user approves them through the current API.
- Adjustment approval through the API still does not post. Only the two demo adjustments named above post, and only inside the seed.
- Receipt approval through the API still updates `stock_ledger` only. The seed mirrors the same quantity into item stock for its own approved receipts.
- Depot transfer API still ignores `stock_ledger`. The seed applies the same delta to the ledger after the router returns.
- No rejected-deposit column exists.
- Chemist, doctor, masters, sample gift list, export list, stock receipt mock table, and the two dashboard charts stay mock or hardcoded.
- Sync, devices, integrations, refunds, promotion usage, and day-end closing are not seeded.
- Route shipping point links are not created by the workflow seed.
- `seed_transport_data` still uses `random` after a fixed seed. Trip attributes are stable for a given master-data shape, not hand-written business cases.
- Historical rows already in `swift_distro_hub` were not reconciled.
