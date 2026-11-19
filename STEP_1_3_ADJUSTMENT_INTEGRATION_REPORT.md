# Step 1.3 — Stock Adjustment Approval Integration

Status: **COMPLETE**

PostgreSQL row-lock concurrency and live inventory behavior are **NOT VERIFIED**. No production database was used.

## 1. Executive summary

`POST /api/stock/adjustments/{id}/approve` now posts every pending line through `StockMovementService.adjust()` in the request session. A positive `quantity_change` increases batch on-hand, available quantity, the product/depot summary, and the ledger. A negative `quantity_change` decreases those same quantities and cannot consume reserved stock. The adjustment is marked `Approved` only after every line succeeds, in the same commit.

A second approval returns the existing HTTP 400 `Only pending adjustments can be approved` and does not change inventory. Any line failure rolls the transaction back and leaves the adjustment `Pending`.

Create, list, get, and delete were not redesigned. The frontend was not changed.

## 2. Previous adjustment behavior

Confirmed in `backend/app/routers/stock_adjustment.py` before this change:

- Create stores a document, normally `Pending`, and does not post stock. **IMPLEMENTED** previously.
- Lines store `product_id`, `batch`, and signed `quantity_change`. **IMPLEMENTED** previously.
- `adjustment_type` is a label (`Write off`, `Found`, `Damaged`, `Expired`, `Correction`). It does not change the sign. The stored `quantity_change` is the stock delta. **IMPLEMENTED** previously.
- Approve was allowed only when status text, ignoring case, is `pending`. Any other status, including `Approved`, returned 400 `Only pending adjustments can be approved`. **IMPLEMENTED** previously.
- Approval wrote only `stock_ledger.quantity` and `available_quantity`. It did not update `product_item_stock` or `product_item_stock_details`. **Replaced.**
- A positive change with no ledger row created a ledger row. A negative change with no ledger row returned 400 `Cannot approve a stock reduction without an existing batch in the ledger`. **Replaced by the service rule below.**
- Approval did not look at reserved quantity and could drive the ledger negative. **Replaced.**
- There was no row lock. **Replaced.**
- Success set `status` to `Approved` and `approved_by` to the current user, then returned the stock adjustment schema. **Preserved.**
- There is no reject endpoint. Delete is allowed only while pending. **Preserved.**
- The router requires an authenticated user. It does not add a separate permission check. **Preserved.**
- Reserved quantity was not changed by approval. **Preserved, and now enforced.**

The new-adjustment screen sends `quantity_change` as the typed adjusted quantity and stores the line type only in the header label and reason text. That screen was not changed. A write-off saved from that screen as a positive number still increases stock, which matches the previous backend rule.

## 3. New adjustment behavior

**IMPLEMENTED**

1. Load the adjustment with `SELECT … FOR UPDATE`, still limited by the existing depot scope.
2. Missing or out-of-scope adjustment: 404 `Adjustment not found`.
3. Status other than pending: 400 `Only pending adjustments can be approved`.
4. Validate every line before the first `adjust()` call.
5. Call `StockMovementService.adjust()` once per line. The service does not commit.
6. Set `Approved` and `approved_by` only after every call returns.
7. Commit once.
8. On failure, roll back and return the controlled error. Status stays `Pending`.

## 4. Files modified

| File | Change |
| --- | --- |
| `backend/app/routers/stock_adjustment.py` | Approval calls `StockMovementService.adjust()` |
| `backend/tests/test_stock_adjustment_approval.py` | New HTTP approval tests |
| `STEP_1_3_ADJUSTMENT_INTEGRATION_REPORT.md` | This report |

Not modified: frontend, models, schemas, the stock movement service, receipts, orders, depot transfers, authentication, and migrations.

## 5. API compatibility assessment

**TESTED** against the existing response schema and the frontend caller `apiEndpoints.stockAdjustments.approve(id)`, which posts `{}`.

| Contract | Result |
| --- | --- |
| `POST /api/stock/adjustments/{id}/approve` | Kept |
| 200 body remains the stock adjustment schema | Kept |
| `status` value `Approved` | Kept |
| `approved_by` set to the current user | Kept |
| Repeat approval 400 `Only pending adjustments can be approved` | Kept |
| Create, list, get, pending delete, approved delete block | **TESTED** |
| Auth still required | Kept. Existing auth tests passed |

Message change, required by the shared service and not by a new rule:

| Case | Before | Now |
| --- | --- | --- |
| Missing batch, positive or negative | Positive created a ledger row. Negative returned 400 with the old ledger message | 404 `Batch not found`. No stock row is created |
| Zero quantity | Could approve with no quantity effect | 400 `Invalid quantity` |

The frontend shows `error.message` from a failed approve. These details still surface as the approval toast.

## 6. How StockMovementService.adjust() was integrated

**IMPLEMENTED.** The service was not rewritten.

Signature used:

`adjust(db, product_id, depot_id, batch_no, quantity_change) -> ProductItemStockDetail`

`quantity_change` is passed through unchanged. Positive and negative values follow the service. Zero is rejected before the call. The service flushes and does not commit or roll back.

The service refuses a missing product, depot, header, or batch. A positive adjustment does not create a missing batch. That is the service rule, so approval does not create one either.

## 7. Positive adjustment calculation

**IMPLEMENTED** and **TESTED** with `+4` on on-hand 100:

| Store | After |
| --- | --- |
| Detail quantity | 104 |
| Detail available | 104 |
| Detail reserved | 0 |
| Header `stock_qty` | 104 |
| Header `adjusted_stock_in_qty` | 4 |
| Ledger quantity and available | 104 |

A decimal create of `1.50` was accepted and then approved.

## 8. Negative adjustment calculation

**IMPLEMENTED** and **TESTED** with on-hand 100, available 70, reserved 30, and change `-20`:

| Store | After |
| --- | --- |
| Detail quantity | 80 |
| Detail available | 50 |
| Detail reserved | 30 |
| Header `stock_qty` | 80 |
| Header `adjusted_stock_out_qty` | 20 |
| Ledger quantity | 80 |

The ledger `reserved_quantity` column is still not used by reservations. The service changes ledger quantity and available by the same physical delta.

## 9. Reserved inventory protection

**IMPLEMENTED** by `adjust()`, which decreases available quantity only when available stock covers the reduction.

**TESTED:** a further `-80` after the example above returns 400 `Insufficient available stock`. On-hand stays 80, available stays 50, reserved stays 30, and the adjustment stays `Pending`.

## 10. Transaction and rollback behavior

**IMPLEMENTED**

- One request session.
- No commit inside the service.
- Status is set only after all lines return.
- `HTTPException` and any other exception call `rollback()`.
- Unexpected errors become HTTP 500 `Adjustment approval failed` without the SQL text.

**TESTED:** a two-line adjustment whose second line matches two ledger rows returns 409 `Duplicate stock records`. The first line’s flushed increase is gone, header adjusted-in stays 0, and status stays `Pending`.

A second two-line approval, after the duplicate row was removed in the test database only, posted `+5` and `-2` together. Header stock moved from 140 to 143.

## 11. Duplicate approval prevention

**IMPLEMENTED** and **TESTED** sequentially. The first call posts once and returns 200. The second returns 400 `Only pending adjustments can be approved`. Quantities stay at the first posting.

The adjustment row is locked with `with_for_update()` before the status check. Depot scope still applies, so another depot’s user still receives 404.

**NOT VERIFIED:** two concurrent PostgreSQL transactions. SQLite does not prove that the second transaction waits and then sees `Approved`.

No new unique constraint or migration was added.

## 12. Validation rules

**IMPLEMENTED**

| Check | Response |
| --- | --- |
| Adjustment missing | 404 `Adjustment not found` |
| Status not pending, including already approved | 400 `Only pending adjustments can be approved` |
| No lines | 400 `At least one adjustment item is required` |
| Unknown product id | 404 `Product not found` |
| Unknown depot id | 404 `Depot not found` |
| Blank batch | 400 `Batch not found` |
| Batch with no stock header or detail | 404 `Batch not found` |
| Zero quantity | 400 `Invalid quantity` |
| Negative change above available | 400 `Insufficient available stock` |
| More than one matching stock row | 409 `Duplicate stock records` |
| Detail `quantity` is not `available + reserved` | 400 `Inconsistent inventory balances` |
| Ledger result would be negative | 400 `Insufficient stock` |

No invalid line is skipped. `adjustment_type` is not a second sign. There is no separate direction field.

## 13. Tests created

`backend/tests/test_stock_adjustment_approval.py` calls the HTTP API on the existing in-memory SQLite fixture.

| Requirement | Test |
| --- | --- |
| Positive adjustment | `test_positive_adjustment_updates_all_tables` |
| Negative adjustment and reserved protection | `test_negative_adjustment_protects_reserved_stock` |
| Over-available failure and unchanged status | same test |
| Multiple lines and rollback | `test_multiple_lines_and_full_rollback` |
| Duplicate ledger rows | same test |
| Repeat approval | `test_repeat_and_invalid_status_do_not_post` |
| Invalid status | same test |
| Missing adjustment, product, depot, batch, zero quantity | `test_missing_adjustment_product_depot_batch_and_quantity` |
| Missing batch is not created | same test |
| Response fields | positive test and create/list test |
| Historical gap is not repaired | `test_inconsistent_history_is_not_repaired` |
| Create, list, get, delete | `test_create_list_get_and_delete_remain_available` |

## 14. Exact tests executed

From `backend/`, using `/tmp/stock-test-venv/bin/python`. `backend/tests/conftest.py` sets `DATABASE_URL` to `sqlite:///:memory:` before the app is imported. The engine is a separate in-memory SQLite pool. The project `.env` PostgreSQL URL was not used.

```text
DATABASE_URL=sqlite:///:memory: python -m pytest \
  tests/test_stock_adjustment_approval.py \
  tests/test_stock_movement.py \
  tests/test_product_receipt_approval.py \
  tests/test_stock_reservation.py \
  tests/test_stock_issue.py \
  tests/test_auth_rbac.py \
  -q --tb=short -p no:cacheprovider
```

```text
DATABASE_URL=sqlite:///:memory: python -m pytest \
  tests/test_depot_scope.py \
  tests/test_order_lifecycle.py \
  tests/test_status.py \
  tests/test_validation.py \
  -q --tb=line -p no:cacheprovider
```

That is the full `backend/tests` suite. The API container was not started.

## 15. Passed tests

- First command: **40 passed**
- Second command: **9 passed**
- Total: **49 passed**

Receipt approval, stock movement, reservation, issue, auth, depot scope, order lifecycle, status, and validation tests passed with the adjustment tests.

## 16. Failed tests

None.

## 17. Known limitations

- **NOT VERIFIED:** PostgreSQL `FOR UPDATE` under two concurrent approvals.
- **NOT VERIFIED:** live approval of `ADJ-TEST-007` or any production stock row. Those rows were not read or written in this step.
- **Limitation:** a detail/ledger gap is not repaired. A tested shape of detail 500 and ledger 498 became 499 and 497 after a `-1` adjustment. The 2-unit gap remained. A detail that already breaks `quantity = available + reserved` is rejected and left unchanged.
- **Limitation:** duplicate stock keys are rejected in application code only.
- **Limitation:** the new-adjustment screen can save a write-off as a positive `quantity_change`. Approval follows that stored sign. The screen was not changed.
- **Limitation:** a missing batch is no longer created during approval, including for a positive adjustment.
- **Limitation:** there is still no adjustment rejection API. That was already true.
- Ledger `reserved_quantity` remains unused. Reserved protection is on `product_item_stock_details`.

## 18. PostgreSQL concurrency verification status

**NOT VERIFIED.** All tests ran on SQLite. No disposable PostgreSQL instance was used. The code requests a row lock, but this run does not prove PostgreSQL blocking behavior.

## 19. Production database safety confirmation

Confirmed for this step:

- No migration was written or run.
- No production adjustment was created or approved.
- No inventory quantity in `swift_distro_hub` was updated.
- No container was started or restarted.
- No production environment variable was changed.
- Tests used the in-memory SQLite fixture only.

## 20. Recommendation for the next step

Stop here.

Do not start delivery approval, depot transfers, reservation changes, reconciliation, unique indexes, or a frontend change until you approve that work. The next stock posting still outside this service is delivery approval, and it should stay a separate step.
