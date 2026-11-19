# Step 1.2 — Product Receipt Approval Integration

Status: **COMPLETE**

Concurrent PostgreSQL row locking and live inventory behavior are **Not verified**. No live database was used.

## 1. Executive summary

`POST /api/product-receipts/{id}/approve` now posts every receipt line through `StockMovementService.receive()` in the request session. One successful approval increases batch on-hand, available quantity, the product/depot summary, and the stock ledger by the same quantity, then marks the receipt `Approved` in that same transaction.

A second approval returns HTTP 400 `Receipt already approved` and does not change inventory. If any line fails, the session rolls back: stock rows from earlier lines are not committed and the receipt stays `Draft`.

Receipt creation, listing, update, delete, and report handlers were not changed. Adjustment, delivery approval, and depot transfer endpoints were not changed.

## 2. Files modified

| File | Change |
| --- | --- |
| `backend/app/routers/product_receipts.py` | Replaced ledger-only posting with shared `receive()` |
| `backend/tests/test_product_receipt_approval.py` | New endpoint tests |
| `STEP_1_2_RECEIPT_INTEGRATION_REPORT.md` | This report |

Not modified: frontend, models, schemas, migrations, stock movement service, stock adjustment, orders, depot transfers, authentication.

## 3. Existing approval behavior

Implemented previously, confirmed in code before this change:

- Create stored a `Draft` receipt and items. It did not post stock.
- Approve loaded the receipt without a row lock.
- Status `Approved` returned 400 `Receipt already approved`.
- Empty items returned 400 `Receipt has no items`.
- `post_to_stock_ledger` added `depot_quantity` to `stock_ledger.quantity` and `available_quantity` only.
- Missing `item_code` and unknown product codes were skipped, and the receipt was still approved.
- `product_item_stock` and `product_item_stock_details` were not updated.
- Status was set to `Approved` before the single `commit`.
- Response remained `ProductReceiptApprovalResponse`: `id`, `receipt_number`, `status`, `approved_at`. `approved_at` was generated in the response and was not a stored column.

## 4. New approval behavior

Implemented:

1. Load the receipt with `SELECT … FOR UPDATE`.
2. Missing receipt: 404 `Receipt not found`.
3. Already `Approved`: 400 `Receipt already approved`.
4. Any other status: 400 `Invalid receipt status`.
5. No items: 400 `Receipt has no items`.
6. Validate every line before the first `receive()` call.
7. Call `StockMovementService.receive()` once per line.
8. Set status to `Approved` only after every call returns.
9. Commit once.
10. On failure, roll back and return the controlled error. The receipt stays `Draft`.

Validation before posting:

| Check | Response |
| --- | --- |
| Missing or blank item code | 400 `Unknown product` |
| No product, or more than one product, matches `code`, `new_code`, or `old_code` | 400 `Unknown product` |
| Missing target depot or depot id not found | 400 `Invalid depot` |
| Blank batch | 400 `Invalid batch` |
| Quantity missing, zero, or negative | 400 `Invalid quantity` |

Service errors after posting starts (duplicate rows, inconsistent balances) roll the whole approval back. They keep the service messages: `Duplicate stock records`, `Inconsistent inventory balances`, `Product not found`, `Depot not found`, `Batch not found`, `Invalid quantity`.

## 5. Shared service integration

`receive(db, product_id, depot_id, batch_no, quantity, expiry_date)` is called with the resolved product id, `target_depot_id`, trimmed batch, `depot_quantity`, and the line expiry date.

The service was not changed. It still flushes and does not commit. It increases detail `quantity` and `available_quantity`, leaves `reserved_quantity` unchanged, increases header `stock_qty` and `gross_stock_receive`, and applies the same delta to ledger `quantity` and `available_quantity`.

`FACTORY`, `DEPOT`, and `RETURN` all use this path. Source type is not a stock rule.

New ledger rows are created by the service with `status="Unrestricted"` and `reserved_quantity=0`. The old helper wrote `storage_type` from the receipt source type. That field is no longer set on rows created by approval. No model change was made.

## 6. Transaction handling

Implemented:

- The endpoint uses the existing `get_db` session.
- Validation of all lines happens before `receive()`.
- `receive()` is called in a loop on that session.
- `commit()` runs only after the status update.
- `HTTPException` and any other exception call `rollback()` before the error is returned.
- Unexpected exceptions become HTTP 500 `Receipt approval failed`. The client does not receive the SQL text.

Tested: a two-line receipt whose second line matches two existing ledger rows returns 409 `Duplicate stock records`. The first line’s flushed stock is gone and the receipt remains `Draft`.

## 7. Duplicate approval protection

Implemented and tested sequentially:

- First approval posts stock and returns 200 with the existing response body.
- Second approval returns 400 `Receipt already approved` and leaves detail, header, and ledger quantities unchanged.

The receipt row is locked with `with_for_update()` before the status check.

**Not verified:** two concurrent PostgreSQL transactions. SQLite and the in-memory test pool do not prove that the second transaction waits and then sees `Approved`.

**Limitation:** there is still no unique constraint on `(product_id, depot_id, batch)` for the ledger, `(item_code, batch_no)` for details, or `(product_id, depot_id)` for headers. The service aborts when it sees more than one matching row. That check is not a substitute for a unique index. No migration was added.

## 8. Stock calculation verification

Tested on isolated SQLite for a new approval of quantity 10:

| Store | Result |
| --- | --- |
| Detail `quantity` | 10 |
| Detail `available_quantity` | 10 |
| Detail `reserved_quantity` | 0 |
| Header `stock_qty` | 10 |
| Header `gross_stock_receive` | 10 |
| Ledger `quantity` | 10 |
| Ledger `available_quantity` | 10 |

A two-line receipt posted 4 and 6 on separate products. Three source types posted 2 each into the same product/depot and the header total was 6. Reserved quantity stayed 0.

Historical ledger gaps were not read or repaired. Adjustment records were not modified.

## 9. API compatibility

Implemented and checked against `src/lib/api.ts`, `ReceiveList.tsx`, and `ReceiveFormPage.tsx`. Frontend code was not changed.

| Contract | Kept |
| --- | --- |
| `POST /api/product-receipts/{id}/approve` with body `{}` | Yes |
| 200 body `id`, `receipt_number`, `status`, `approved_at` | Yes |
| Status value `Approved` | Yes |
| Repeat approval 400 `Receipt already approved` | Yes |
| Create `POST /api/product-receipts` | Unchanged |
| List `GET /api/product-receipts` | Unchanged |
| Auth dependency on the router | Unchanged |

`ReceiveList` and `ReceiveFormPage` call `apiEndpoints.productReceipts.approve(id)` and surface a failed response as an error toast. The 400 repeat response still follows that path.

Receipt number, date, product fields, batch, expiry, quantity, depot, remarks, and source type remain on the existing create and response schemas.

## 10. Test cases created

`backend/tests/test_product_receipt_approval.py` calls the HTTP endpoints with the existing SQLite `TestClient` fixture.

| Case | Test |
| --- | --- |
| Single-item approval | `test_approve_single_item_updates_all_stock_tables` |
| Multiple items | `test_approve_multiple_items` |
| Detail, available, reserved, header, ledger | both tests above |
| Second approval and unchanged stock | `test_repeat_approval_does_not_change_stock` |
| Unknown product | `test_unknown_product_does_not_approve` |
| Invalid depot, zero quantity, negative quantity, blank batch | `test_invalid_depot_quantity_and_batch` |
| One invalid line in a multi-line receipt | `test_invalid_item_rolls_back_entire_receipt` |
| Rollback after a later line fails inside the service | `test_duplicate_ledger_rolls_back_earlier_item` |
| Status remains `Draft` after failure | the failure tests |
| Response fields | single-item and source-type tests |
| Factory, Depot, Return | `test_factory_depot_and_return_sources` |
| Missing receipt | `test_receipt_not_found` |

Create and list are exercised by those tests. `GET /api/product-receipts/{id}` was not called. That handler was not modified.

## 11. Tests executed

Isolated command, from `backend/`:

```text
DATABASE_URL=sqlite:///:memory: python -m pytest \
  tests/test_product_receipt_approval.py \
  tests/test_stock_movement.py \
  tests/test_stock_reservation.py \
  tests/test_stock_issue.py \
  tests/test_auth_rbac.py \
  -q --tb=short -p no:cacheprovider
```

The interpreter was `/tmp/stock-test-venv/bin/python`. The API container was not started. The project PostgreSQL database was not opened.

## 12. Passed tests

- `test_product_receipt_approval.py`: 9 passed
- `test_stock_movement.py`: 12 passed
- `test_stock_reservation.py`, `test_stock_issue.py`, `test_auth_rbac.py`: 12 passed

Total: **33 passed**, 0 failed.

## 13. Failed tests

None.

## 14. Known limitations

- **Not verified:** PostgreSQL `FOR UPDATE` under two concurrent approvals. SQLite does not prove it.
- **Not verified:** live approval, live stock totals, or a running API container.
- **Not verified:** `GET /api/product-receipts/{id}` and the PDF report endpoint in this run. Those functions were not edited.
- **Limitation:** duplicate stock keys are rejected in application code only. Unique indexes remain a later migration.
- **Limitation:** a product code that matches more than one of `code`, `new_code`, and `old_code` now fails the approval. The old helper used the first row and could post the wrong product.
- **Limitation:** new ledger rows no longer copy the receipt source into `storage_type`.
- **Limitation:** `approved_at` is still only in the HTTP response. That matches the previous contract.
- Inconsistent historical balances are not repaired. `receive()` will reject a later movement on a batch that already breaks `quantity = available + reserved`.

## 15. Database safety confirmation

Confirmed for this step:

- No migration was written or run.
- No production receipt was created or approved.
- No inventory quantity was updated in the existing PostgreSQL database.
- No container was started or restarted.
- Tests used `sqlite:///:memory:` through `backend/tests/conftest.py`.

## 16. Recommended next step

Stop here.

Step 1.3 should not start until you approve it. The next stock integration, when approved, is stock adjustment approval calling `StockMovementService.adjust()` with the same single-commit rules. Depot transfer and delivery approval stay out of that step unless you explicitly include them.
