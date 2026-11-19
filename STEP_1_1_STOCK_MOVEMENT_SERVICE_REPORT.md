# Step 1.1 — Stock movement service

**Status:** Complete  
**Date:** 2026-11-19

The shared stock movement service is in place. Existing API endpoints, models, and the live PostgreSQL database were not changed. Supabase was not introduced.

## 1. Objective

Add one service that can receive stock, adjust stock, issue reserved order allocations, and move stock out of or into a depot. The caller keeps the database transaction.

## 2. Architecture

`product_item_stock_details` is the batch balance the service updates.

- `quantity` is physical on-hand.
- `available_quantity` is stock that can be reserved or consumed.
- `reserved_quantity` is stock held for orders.
- After each successful movement in this service, `quantity = available_quantity + reserved_quantity`. This is checked in code. It is not a database constraint.

`product_item_stock` is the product/depot summary (`stock_qty` and the existing receive, issue, and adjustment counters).

`stock_ledger` receives the same on-hand delta, matched on product, depot, and trimmed batch. Ledger `reserved_quantity` is not used for order reservations.

`StockReservationService` is unchanged. It still performs reserve and release. This service performs physical movement only.

## 3. Files created

- `backend/app/services/stock_movement_service.py`
- `backend/tests/test_stock_movement.py`
- `STEP_1_1_STOCK_MOVEMENT_SERVICE_REPORT.md`

## 4. Files modified

None. Routers, models, frontend, deployment, and `.env` were not edited in this step.

## 5. Methods implemented

`StockMovementService` in `backend/app/services/stock_movement_service.py`:

| Method | Effect |
|---|---|
| `receive` | Increases batch on-hand and available, header `stock_qty` and `gross_stock_receive`, and the ledger. Reserved quantity stays as it is. |
| `adjust` | Positive: increases on-hand, available, `stock_qty`, and `adjusted_stock_in_qty`. Negative: decreases on-hand and available only up to available quantity, and increases `adjusted_stock_out_qty`. |
| `issue_reserved_allocations` | For one order, issues every `RESERVED` allocation once. On-hand and reserved decrease. Available does not decrease again. Header `issue` increases. Allocations become `ISSUED` only after that movement. |
| `transfer_out` | Decreases source on-hand and available. Reserved stock is not consumed. Header `issue` increases. |
| `transfer_in` | Increases destination on-hand and available, and `gross_stock_receive`. |

None of these methods commit or roll back. None of them change a transfer or delivery status.

## 6. Quantity calculation rules

- Receive, transfer in, and a positive adjustment add the same amount to `quantity` and `available_quantity`.
- A negative adjustment and transfer out subtract that amount from `quantity` and `available_quantity` only when `available_quantity` covers it.
- Delivery issue subtracts from `quantity` and `reserved_quantity` and leaves `available_quantity` unchanged.
- A missing batch is created only by `receive` and `transfer_in`. Adjust, transfer out, and delivery issue fail when the batch is missing.
- A blank batch is rejected.
- Quantity must be positive for receive and both transfer methods. An adjustment of zero is rejected.

## 7. Error handling

Failures raise `fastapi.HTTPException`, the same type `StockReservationService` already uses. Messages are fixed phrases, not SQL or row dumps.

| Condition | Status | Detail |
|---|---|---|
| Unknown product | 404 | Product not found |
| Unknown depot | 404 | Depot not found |
| Unknown or blank batch | 404 or 400 | Batch not found |
| Non-positive quantity | 400 | Invalid quantity |
| Not enough on-hand or ledger quantity | 400 | Insufficient stock |
| Not enough available quantity | 400 | Insufficient available stock |
| Not enough reserved quantity | 400 | Insufficient reserved stock |
| More than one header, batch, or ledger row for the same key | 409 | Duplicate stock records |
| No allocation, or an allocation with no stock source | 400 | Missing allocation |
| Allocation not `RESERVED` and not already `ISSUED` | 400 | Invalid allocation status |
| On-hand does not equal available plus reserved, or a negative component | 400 | Inconsistent inventory balances |

A second issue of an order whose allocations are already `ISSUED` returns `0` and does not change balances.

## 8. Transaction management

The service uses the `Session` argument. It calls `flush` so the caller can read generated ids. It never calls `commit` or `rollback`. If a later check fails, earlier object changes stay in that transaction until the caller rolls it back.

## 9. Concurrency considerations

Lock order for a normal movement is product, depot, product/depot header, batch detail, then ledger, each ordered by primary key. Delivery issue locks allocation rows by id, then the header, then the batch rows, then the ledger.

More than one row for the same product/depot, batch, or ledger key aborts the movement. That check is not a unique index. Two concurrent inserts can still create a duplicate until Step 3 adds unique indexes. SQLite tests do not prove PostgreSQL row locks or that race.

## 10. Tests created

`backend/tests/test_stock_movement.py` covers receive, invalid quantity, unknown product, blank batch, positive and negative adjustment, reserved-stock protection, one-time delivery issue, missing allocation, invalid allocation status, insufficient reserved quantity, transfer out, transfer in, and a duplicate ledger row whose failure rolls back the batch change.

## 11. Tests executed

The API container was not running. It was not started. Tests ran on the host with a temporary virtualenv and the existing SQLite fixture in `backend/tests/conftest.py`.

```text
cd backend && DATABASE_URL=sqlite:///:memory: python -m pytest \
  tests/test_stock_movement.py \
  tests/test_stock_reservation.py \
  tests/test_stock_issue.py \
  tests/test_auth_rbac.py -q --tb=short
```

## 12. Passed tests

**24 passed** in 8.25s.

That includes the new stock-movement tests, the existing reservation and stock-issue tests, and the auth/RBAC tests.

## 13. Failed tests

None in the command above.

## 14. Known limitations

- Endpoints still use their previous stock writes. Behavior of the running application is unchanged.
- Receive, adjust, and transfer are not idempotent by themselves. The future endpoint must keep using document status so the same approval cannot post twice. Delivery issue is idempotent because `ISSUED` allocations are skipped.
- The 3-unit ledger gap for product `M04000123` at depot 107 was not corrected.
- No unique indexes were added and no migration was run.
- SQLite does not verify `SELECT FOR UPDATE` or two-session races.
- Returned and postponed quantities are not made available. This service does not interpret them.
- Export and sample/gift deliveries are not handled.

## 15. Future endpoint integration

Step 1.2 and later should call this service from the existing routers without changing the public paths:

- `approve_receipt` → `receive` inside the current transaction
- `approve_stock_adjustment` → `adjust`
- `approve_delivery` → `issue_reserved_allocations`, only after the allocation check, and only then set collection fields
- transfer approve → `transfer_out`, then set `In Transit`
- transfer receive → `transfer_in`, then set `Received`
- remove `commit_for_order` from loading once delivery issue is connected
- point the dashboard total at detail on-hand

The caller must `commit` on success and `rollback` on `HTTPException`.

## 16. Recommended next step

Stop here. The next instruction should be the endpoint integration step, still without a live data correction or a unique-index migration unless that step explicitly includes them.
