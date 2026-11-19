# Step 1.4 — Delivery Approval Inventory Integration

Status: **COMPLETE for full delivery. Partial delivery and postponed return are BLOCKED and fail closed.**

PostgreSQL concurrency is **NOT VERIFIED**. No production database was used.

## 1. Executive summary

A fully delivered, loaded order now issues its `RESERVED` allocations once through `StockMovementService.issue_reserved_allocations()`. Batch on-hand, reserved quantity, the product/depot summary, and the ledger move together. The approval then sets the existing collection fields and commits once.

Loading and "Out for Delivery" no longer call `commit_for_order()`, which had marked allocations `ISSUED` and dropped reserved quantity without removing physical stock. That false marker would have made the shared service skip the real deduction.

Partial delivery and a postponed delivery with zero delivered quantity do not change stock. The current payload has one delivered integer and one returned integer per memo. It does not record which batch was delivered, whether goods left the depot, or a verified return. Those approvals now return HTTP 400 and roll back. No return module was added.

## 2. Existing delivery lifecycle

Confirmed in code before this change:

1. Order validation calls `StockReservationService.reserve_allocations()`. Available quantity falls, reserved quantity rises, on-hand stays the same.
2. Route assignment and barcode assignment set `loaded` and then called `commit_for_order()`.
3. `PUT /api/orders/assigned/{id}/status` with `Out for Delivery` also called `commit_for_order()`.
4. `commit_for_order()` set allocations to `ISSUED` and reduced `reserved_quantity`. It did not reduce on-hand, summary stock, or the ledger.
5. `POST /api/orders/assigned/approve-delivery` updated collection amounts only. It did not move stock. A repeat rewrote `collection_approved` to false.
6. Reject delivery sets `delivery_rejected`. It does not move stock.
7. There is no custody flag for "still in depot" versus "left the depot".
8. `delivered_quantity` and `returned_quantity` are request fields only. They are not stored on order lines.
9. Receive Return is a separate product-receipt type. It is not linked to an order or a delivery approval.

## 3. Current reservation behavior

**TESTED** in this step and in the existing reservation tests.

Validation of a 10-unit order moved available from 100 to 90 and reserved from 0 to 10. On-hand stayed 100.

## 4. Current physical stock issue behavior

Before this step, no delivery path reduced on-hand. `commit_for_order()` only cleared the reservation and marked the allocation issued.

Those three call sites are removed. The service method remains for its existing unit test. New loading and dispatch leave the reservation in place.

**TESTED:** `Out for Delivery` leaves on-hand at 100 and reserved at 10.

## 5. Existing delivery approval behavior

The endpoint returned 200 and set collection status from the memo integers:

- Returned 0 and delivered greater than 0: `collection_status = Pending`, full collected amount.
- Delivered 0: `collection_status = Postponed`.
- Otherwise: `collection_status = Partially Collected` and a money ratio.

It did not check allocations, batches, or stock. It did not lock the order. Orders on the loading that were absent from the payload were skipped.

## 6. New delivery approval behavior

**IMPLEMENTED** for a full delivery:

1. Lock the loading's orders.
2. Reject a rejected loading with the existing 400 message.
3. Match memos by memo number or order id. No match returns 404 `Order not found`.
4. Require `loaded`. Otherwise 400 `Invalid delivery status`.
5. Require delivered plus returned to equal the order line total.
6. Delivered 0 returns 400 `Postponed delivery cannot release stock without a verified depot return`. Stock is unchanged.
7. Any returned quantity, or a delivered quantity below the line total, returns 400 `Partial delivery cannot be posted until delivered quantity is recorded by batch`. Stock is unchanged.
8. Require every allocation to be `RESERVED`, to match the order line product, the stock-detail batch, and the order depot, and to sum to the line total.
9. Call `issue_reserved_allocations()` once per matched order.
10. Set the existing full-delivery collection fields.
11. Commit once.

A later failure rolls back earlier issues and status changes.

## 7. Files modified

| File | Change |
| --- | --- |
| `backend/app/routers/orders.py` | Full-delivery issue; loading no longer false-issues reservations |
| `backend/tests/test_delivery_approval.py` | New API tests |
| `STEP_1_4_DELIVERY_APPROVAL_INTEGRATION_REPORT.md` | This report |

Not modified: stock movement service, reservation service method, frontend, models, schemas, receipts, adjustments, transfers.

## 8. Service integration details

**IMPLEMENTED.** `issue_reserved_allocations(db, order_id)` was not rewritten. It locks `RESERVED` rows, reduces detail on-hand and reserved, leaves available unchanged, reduces header `stock_qty`, increases header `issue`, applies the same negative delta to the ledger, and sets the allocation to `ISSUED`. It flushes and does not commit.

A repeat sees `ISSUED` rows and the endpoint returns 400 `Delivery already approved` before calling the service again.

## 9. Full delivery calculation

**IMPLEMENTED** and **TESTED** for reserved 10, on-hand 100, available 90:

| Store | After approval |
| --- | --- |
| Detail quantity | 90 |
| Detail available | 90 |
| Detail reserved | 0 |
| Header `stock_qty` | 90 |
| Header `issue` | 10 |
| Ledger quantity and available | 90 |
| Allocation | `ISSUED` |
| `collection_status` | `Pending` |
| `collection_approved` | false |

Two reserved batches of 4 and 6 on one order were issued together. Header stock moved from 106 to 96.

## 10. Partial delivery calculation

**BLOCKED.**

The request can say delivered 70 and returned 30, but those integers are not stored on lines or batches. `issue_reserved_allocations()` issues every reserved unit. Using it would treat the undelivered 30 as delivered. Splitting 70 across batches would be a guess.

The endpoint rejects this case and changes nothing. **TESTED.**

The previous partial path updated collection money and returned 200. That success response is no longer returned. The screen `handleApprovePartialDelivery` will show its existing error toast. The full-delivery button, which sends the whole quantity and returned 0, still matches the success contract.

## 11. Postponement and custody handling

**BLOCKED** for automatic stock movement.

There is no field that proves the goods never left the depot or that they have been counted back. A delivered quantity of 0 therefore does not release the reservation and does not increase available stock. **TESTED.**

Orders on the same loading that are omitted from the payload are still not updated and not issued. That skip was **NOT VERIFIED** by a new test.

## 12. Zero-delivered stock return verification

**BLOCKED.**

No approval field identifies a verified return receipt, a returned batch, or a verified quantity. Receive Return remains a separate receipt and was not connected. Unverified returns do not increase available inventory. **TESTED** by the postponed case. A positive verified-return posting was not implemented.

## 13. Duplicate approval prevention

**IMPLEMENTED** and **TESTED** sequentially.

The durable marker is `order_batch_allocations.allocation_status = ISSUED`, written by the stock service in the same transaction as the stock movement. The second request returns 400 `Delivery already approved` and leaves on-hand unchanged.

Historical rows that `commit_for_order()` already marked `ISSUED` without a physical deduction are not repaired. A later approval of those rows returns the same 400 and does not deduct. That limitation is intentional.

No unique constraint was added. Concurrent PostgreSQL approvals were not run.

## 14. Transaction and rollback behavior

**IMPLEMENTED** and **TESTED.**

Validation of every matched order happens before the first issue. A two-order request whose second order has no allocation returns 400 `Missing allocation`. The first order's stock and `collection_status` stay unchanged.

`HTTPException` and any other exception call `rollback()`. Unexpected failures return 500 `Delivery approval failed`.

## 15. API compatibility assessment

| Contract | Result |
| --- | --- |
| `POST /api/orders/assigned/approve-delivery` | Kept |
| Request body `loading_number` and memo quantities | Kept |
| 200 body `message`, `loading_number`, `approved_count`, `orders_moved_to_collection` | Kept for a full delivery |
| Full-delivery collection fields | Kept |
| Auth on the orders router | Kept |
| Partial or postponed success | **Changed to 400.** Required because the payload cannot support a safe stock posting |
| Repeat approval | **Changed to 400.** The old 200 rewrote collection and did not post stock |

No frontend file was edited.

## 16. Tests created

`backend/tests/test_delivery_approval.py`:

| Case | Test |
| --- | --- |
| Validation reserves; on-hand unchanged | `test_validation_reserves_without_physical_issue_and_loading_keeps_it` |
| Out for Delivery does not deduct | same test |
| Full approval, all three stock stores, response fields | `test_full_delivery_issues_reserved_stock_once` |
| Reserved falls; available is not reduced again | same test |
| Repeat approval | same test |
| Missing loading, unloaded order, wrong product, depot, batch, over-reservation, missing allocation | `test_invalid_delivery_cases_do_not_change_stock` |
| Later order failure rolls back | `test_second_order_failure_rolls_back_the_first_issue` |
| Partial and postponed do not move stock | `test_partial_and_postponed_do_not_move_stock` |
| Two batches commit together | `test_two_batches_issue_together` |

## 17. Exact tests executed

From `backend/`, using `/tmp/stock-test-venv/bin/python`. `backend/tests/conftest.py` forces `DATABASE_URL=sqlite:///:memory:` before the app is imported.

```text
DATABASE_URL=sqlite:///:memory: python -m pytest \
  tests/test_delivery_approval.py \
  tests/test_stock_movement.py \
  tests/test_stock_reservation.py \
  tests/test_stock_issue.py \
  tests/test_product_receipt_approval.py \
  tests/test_stock_adjustment_approval.py \
  tests/test_auth_rbac.py \
  tests/test_order_lifecycle.py \
  tests/test_validation.py \
  tests/test_status.py \
  tests/test_depot_scope.py \
  -q --tb=line -p no:cacheprovider
```

This is the full `backend/tests` suite. The API container was not started.

## 18. Passed tests

**58 passed, 0 failed.**

## 19. Failed tests

None.

## 20. Blocked requirements

| Requirement | Why |
| --- | --- |
| Partial delivery stock posting | Memo integers are not batch quantities. The shared issue method posts the whole reservation |
| Automatic release when delivered is 0 | No custody record proves the goods remained in the depot |
| Verified physical return back into available stock | No verified return quantity, batch, or receipt link exists on this approval |
| Repair of historical `ISSUED` rows that never reduced on-hand | Explicitly left unchanged |

## 21. Known limitations

- A loading that was assigned before this change may already have `ISSUED` allocations and unchanged on-hand. Re-approval will not deduct and will not repair them.
- `commit_for_order()` still exists and still clears reserved quantity without reducing on-hand. Delivery approval no longer calls it. Its unit test still passes.
- The ledger `reserved_quantity` column is still unused.
- The known 3-unit `ADJ-TEST-007` gap was not read or repaired.
- SQLite does not prove row-lock behavior.

## 22. PostgreSQL concurrency verification

**NOT VERIFIED.** Tests used in-memory SQLite only. The order query requests `FOR UPDATE`, and the stock service locks allocation and stock rows, but this run does not prove two PostgreSQL transactions cannot both issue.

## 23. Production database safety confirmation

Confirmed:

- No production connection was opened.
- No migration was written or run.
- No production order, allocation, or inventory row was changed.
- No container was started or restarted.
- No environment file was changed.
- No Supabase dependency was added.

## 24. Recommendation for the next step

Stop here.

Do not start depot transfers, reconciliation, or a return module until you approve that work. Before partial or postponed delivery can post stock, the approval needs a stored delivered quantity per reserved batch and a verified depot-return record for goods that left custody. Those are schema and workflow additions, not a safe change to the current memo integers.
