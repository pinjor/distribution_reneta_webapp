# Step 1.4A — Partial Delivery and Verified Return Foundation

Status: **COMPLETE as a foundation. Partial approval and stock release remain BLOCKED.**

The new migration was not executed. PostgreSQL constraints and row locking are **NOT VERIFIED**. No production database was used.

## 1. Executive summary

The application can now store a batch-level delivery outcome and a separate return-verification record. Those records identify the order, line, allocation, product, depot, and batch. They do not change inventory.

Full-delivery approval is unchanged. Partial and postponed approval still return 400 and post no stock. A verified return does not make quantity available. That posting is left for Step 1.4B.

## 2. Existing delivery model analysis

There is no delivery table. A loading is `orders.loading_number` plus `loaded`.

| Record | What it stores |
| --- | --- |
| `orders` | Memo, depot code, loading number, loaded flag, collection status |
| `order_items` | Product code, quantity, total quantity, optional batch text |
| `order_batch_allocations` | Order, line, product, batch, allocated quantity, stock detail id, status `RESERVED` or `ISSUED` |
| Delivery approval request | One delivered integer and one returned integer per memo |

The approval integers are not stored. They cannot say which batch was delivered.

Allocation status is not custody. `RESERVED` means sellable stock was held. `ISSUED` was also written by `commit_for_order()` without removing on-hand, so it does not prove dispatch or delivery.

## 3. Existing return model analysis

Receive Return is `product_receipts.source_type = RETURN`. It has its own receipt number, depot, and lines. It has no order id, allocation id, or delivery reference.

Approving a return receipt adds stock through `StockMovementService.receive()`. Nothing stops two receipt numbers from adding the same goods. That path was not changed.

## 4. Missing data and relationships

Before this step the database could not store:

- Delivered and undelivered quantity for one allocation
- Whether reserved stock was still in the depot, dispatched, delivered, returned but unverified, or return-verified
- A verification number, verifier, and verification time
- How much of one allocation was already claimed by earlier return requests

Order, line, allocation, product, depot, and batch identifiers already existed and are reused. No second stock-balance table was added.

## 5. Proposed and implemented schema

**IMPLEMENTED** in models and in `backend/alembic/versions/002_delivery_return_foundation.py`.

`delivery_allocation_outcomes` has one row per allocation:

- Order, order line, allocation, product, depot, batch
- `reserved_quantity`, `delivered_quantity`, `undelivered_quantity`
- `delivery_reference` (the loading number; there is no delivery table to point at)
- `custody_status`
- Creating user and timestamps

The quantity rule is `delivered_quantity + undelivered_quantity = reserved_quantity`. Undelivered does not mean returned.

`return_verifications` stores a request or a completed verification:

- Outcome, order, allocation, product, depot, batch
- Expected quantity, received quantity, status `REQUESTED` or `VERIFIED`
- `verification_number`, `verified_by`, `verified_at`, remarks

A request is not verification. `verified_by` stays empty until `verify_return()`.

Custody values:

| Status | Meaning |
| --- | --- |
| `RESERVED_IN_DEPOT` | Nothing delivered, and the goods are recorded as never dispatched |
| `DISPATCHED` | Goods left the depot and return is not yet requested |
| `DELIVERED` | The whole allocation was delivered |
| `RETURN_UNVERIFIED` | A return was requested or only partly verified |
| `RETURN_VERIFIED` | Verified received quantity covers the undelivered quantity and nothing was delivered |

A status string alone is not accepted as proof. The service checks it against the quantities and the allocation's stock detail.

## 6. New model definitions

**IMPLEMENTED** in `backend/app/models_platform.py`:

- `DeliveryAllocationOutcome`
- `ReturnVerification`

Checks in the model and migration: non-negative quantities, delivered plus undelivered equals reserved, received quantity not above expected. Unique allocation on an outcome. Unique verification number.

The migration also adds a PostgreSQL partial unique index so only one `REQUESTED` row can exist per allocation. That index is **NOT VERIFIED** because the migration was not applied. The service rejects a second open request in application code, and that rule is **TESTED** on SQLite.

## 7. New validation services

**IMPLEMENTED** in `backend/app/services/delivery_outcome_service.py`.

`record_outcome()` checks the allocation, product, depot, batch, and quantities, then inserts the outcome. It does not change stock or allocation status.

`request_return()` rejects goods still in `RESERVED_IN_DEPOT`, rejects a quantity above the undelivered remainder, and rejects a second open request. It does not change stock.

`verify_return()` requires an active authenticated user, sets `VERIFIED`, `verified_by`, and `verified_at`, and still does not change stock.

Pydantic shapes `DeliveryAllocationOutcomeCreate`, `DeliveryAllocationOutcomeRead`, `ReturnVerificationCreate`, and `ReturnVerificationRead` are in `backend/app/schemas.py`. No router exposes them.

## 8. Migration files created

`backend/alembic/versions/002_delivery_return_foundation.py`

Revision `002_delivery_return` revises `001_platform`.

## 9. Confirmation migrations were NOT run against production

**Confirmed.** Alembic was not executed.

`backend/alembic.ini` points at `postgresql://swift_user@localhost:55432/swift_distro_hub`. That is the application database published by Docker. Running Alembic from this tree would target it, so it was not run against that database or any other database.

Tests created the tables through the isolated SQLite `create_all` fixture.

## 10. API compatibility

**IMPLEMENTED** and **TESTED** for the existing full-delivery endpoint.

No route, request, or response was added or changed. `POST /api/orders/assigned/approve-delivery` still issues a full delivery and still rejects partial and postponed deliveries. The new schemas are not wired to HTTP.

## 11. Legacy commit_for_order audit

Call sites found:

| Location | Active workflow |
| --- | --- |
| `StockReservationService.commit_for_order()` | Definition. Marks `ISSUED` and reduces reserved quantity. Does not reduce on-hand |
| `tests/test_stock_issue.py` | Test only |

No router calls it after Step 1.4. It is not an active production path. It remains a hazard if a later caller uses it. Recommendation: keep the method until Step 1.4B replaces any remaining need, then remove it. Do not delete it in this step because the stock-issue test still documents the old behavior. Do not rewrite historical `ISSUED` rows.

## 12. Historical ISSUED allocation risks

Rows already marked `ISSUED` may never have reduced on-hand. This step does not detect or repair them.

A later read-only check, not run here, can list candidates:

```sql
SELECT a.id, a.order_id, a.batch_no, a.allocated_qty, a.allocation_status, a.created_at
FROM order_batch_allocations a
WHERE a.allocation_status = 'ISSUED'
ORDER BY a.id;
```

Compare each `stock_source_id` with `product_item_stock_details` and `stock_ledger` manually. The ledger has no allocation id, so a SQL query alone cannot prove a missing physical issue. Do not run this against production until a read-only check is approved. `ADJ-TEST-007` was not touched.

## 13. Test cases

`backend/tests/test_delivery_outcome_foundation.py`:

| Case | Result |
| --- | --- |
| Outcome links order, line, and allocation | **TESTED** |
| Two batches on one order | **TESTED** |
| Delivered plus undelivered must equal the allocation | **TESTED** |
| Negative quantity, unknown allocation, wrong depot, product, and batch | **TESTED** |
| In-depot goods cannot get a physical return | **TESTED** |
| Open duplicate return request rejected | **TESTED** |
| Received quantity above the remainder rejected | **TESTED** |
| Request and verification leave stock unchanged | **TESTED** |
| Full delivery approval, reservations, issue, receipts, adjustments, auth | **TESTED** by the existing suite |

PostgreSQL partial-unique-index behavior is **NOT VERIFIED**.

## 14. Exact test commands

From `backend/`, using `/tmp/stock-test-venv/bin/python`. `conftest.py` forces `sqlite:///:memory:` before the app loads.

```text
DATABASE_URL=sqlite:///:memory: python -m pytest tests -q --tb=line -p no:cacheprovider
```

## 15. Passed and failed tests

**62 passed, 0 failed.**

One earlier foundation assertion failed because a second verification was not counted before the custody update. The service now flushes before that count. The suite above passed after that correction.

## 16. Remaining blockers

| Item | State |
| --- | --- |
| Partial delivery approval | **BLOCKED** until Step 1.4B writes these outcome rows and issues only the delivered batch quantity |
| Postponed release | **BLOCKED.** In-depot goods must use reservation release, not a fake return. Dispatched goods must be verified first |
| Making verified returns available | **BLOCKED.** `verify_return()` does not call the stock service |
| Duplicate return receipts on `product_receipts` | **BLOCKED.** The new verification number does not yet stop a second Receive Return receipt |
| Historical `ISSUED` rows | Not repaired |

## 17. PostgreSQL concurrency status

**NOT VERIFIED.** SQLite does not prove the partial unique index or row locks. The migration contains the open-request unique index for PostgreSQL. It has not been applied.

## 18. Production database safety confirmation

Confirmed:

- No production connection was opened.
- `002_delivery_return` was not applied to `swift_distro_hub` or any other database.
- No production stock, order, or allocation row was changed.
- No container was started or restarted.
- No environment file was changed.
- No Supabase dependency was added.

## 19. Recommendation for Step 1.4B

Stop here.

When approved, Step 1.4B should connect full, partial, and postponed approval to `DeliveryOutcomeService` without guessing batch quantities. Issue stock only for the delivered quantity on each allocation. For `RESERVED_IN_DEPOT`, release the reservation through the existing release path and do not create a return. For `DISPATCHED`, require `verify_return()` before any stock increase, and increase stock only by the verified received quantity. Apply `002_delivery_return` only to a disposable database first, never to `swift_distro_hub`, until that application is explicitly approved.
