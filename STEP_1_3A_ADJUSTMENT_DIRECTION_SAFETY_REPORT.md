# Step 1.3A — Stock Adjustment Direction Safety

Status: **COMPLETE**

The rendered adjustment screen was **NOT VERIFIED** in a browser. The production database was not used. PostgreSQL concurrency remains **NOT VERIFIED**.

## 1. Root cause

**IMPLEMENTED** fix for the risk found in Step 1.3.

The adjustment screen asked for a positive quantity and sent that number as `quantity_change`. The backend treats `quantity_change` as the signed stock delta and does not look at the adjustment type. A Write off of 10 was stored as `+10`. Approval increased stock.

The type lived only on the adjustment header. Line types were copied into the reason text. Approval never compared the type with the sign.

No stored rule for the five screen types conflicted with the directions below. The test seed already stores Write off, Damaged, Expired, and one Correction as negative, and Found as positive. Those rows were not modified.

## 2. Existing adjustment types

The screen offers five types: **Write off**, **Found**, **Damaged**, **Expired**, and **Correction**.

Older demo seed data also uses the header type `Quantity` with a signed `quantity_change`. That label is not on the screen. It was not given a new meaning.

`adjustment_type` is one value for the whole document. Lines do not have their own type column. A chalan with mixed types cannot be represented safely, so the screen now refuses to save mixed types.

## 3. Confirmed direction rules

These match the existing signed-quantity model. The sign is not reversed during approval.

| Type | Direction | Stored `quantity_change` |
| --- | --- | --- |
| Found | Increase | Positive |
| Write off | Decrease | Negative |
| Damaged | Decrease | Negative |
| Expired | Decrease | Negative |
| Correction | Increase or decrease, chosen explicitly | Positive or negative, never zero |

**IMPLEMENTED** and **TESTED**.

## 4. Frontend changes

**IMPLEMENTED** in `src/pages/NewAdjustment.tsx` and `src/lib/adjustmentDirection.ts`.

- The quantity field stays a positive magnitude.
- Write off, Damaged, and Expired are sent as negative `quantity_change`.
- Found is sent as positive `quantity_change`.
- Correction shows an Increase/Decrease select in the existing field style. The save is blocked until one is chosen.
- The sign is applied once, in `signedAdjustmentQuantity`, at submit time.
- A negative typed magnitude is rejected instead of being flipped again.
- All lines in one chalan must use the same type, because the API stores one type.
- The screen layout, routes, and other fields are unchanged.

**TESTED** by `src/lib/adjustmentDirection.test.ts`: 4 passed.

**NOT VERIFIED** in the browser. The app stack was not started.

## 5. Backend validation changes

**IMPLEMENTED** in `backend/app/routers/stock_adjustment.py`.

Create and approval both check the header type against every stored line sign:

- Found must be positive.
- Write off, Damaged, and Expired must be negative.
- Correction may be either non-zero sign.
- Any other type, including blank and `Quantity`, returns 400 `Invalid adjustment type`.
- A known type with the wrong sign returns 400 `Invalid adjustment direction`.
- Zero still returns 400 `Invalid quantity`.

Approval still passes the stored `quantity_change` unchanged to `StockMovementService.adjust()`. The service was not modified. A failed check does not update the adjustment row or inventory.

## 6. API compatibility

No request or response field was added or renamed.

| Call | Result |
| --- | --- |
| `POST /api/stock/adjustments` with a matching type and sign | 201, same response schema |
| `POST /api/stock/adjustments/{id}/approve` | Same 200 adjustment schema |
| Repeat approval | 400 `Only pending adjustments can be approved` |
| Wrong sign for a known type | 400 `Invalid adjustment direction` |
| Unknown type | 400 `Invalid adjustment type` |

**TESTED** on the isolated API. The list and detail screens already display the signed `quantity_change`, including a leading `+` for increases.

## 7. Handling of existing pending adjustments

**IMPLEMENTED** and **TESTED**.

A pending Write off stored as `+10` is not rewritten. Approval returns 400 `Invalid adjustment direction`. Status stays `Pending`, the line stays `+10`, and stock does not change.

A pending document whose type is `Quantity` is also left unchanged. Approval returns 400 `Invalid adjustment type`. It can still be deleted while pending. It is not auto-corrected.

## 8. Handling of existing approved adjustments

**IMPLEMENTED** and **TESTED**.

An already approved Damaged row stored as `+10` is not opened for direction repair. A second approval returns 400 `Only pending adjustments can be approved`. Status, quantity, and stock stay as they were. No historical row is updated by this step.

## 9. Tests added

| Case | Test |
| --- | --- |
| Found +10, Write off -10, Damaged -10, Expired -10, Correction +10, Correction -10 | `test_adjustment_types_apply_the_confirmed_direction` |
| Create rejects Write off +10 | `test_invalid_direction_is_rejected_and_pending_rows_stay_unchanged` |
| Pending contradictory row cannot be approved | same test |
| Approved contradictory row is unchanged | same test |
| Unknown type is rejected and unchanged | same test |
| Expired reduction cannot consume reserved stock | same test |
| Frontend sign conversion | `src/lib/adjustmentDirection.test.ts` |

Duplicate approval, multi-line rollback, and the earlier reserved-stock case remain in `test_stock_adjustment_approval.py` and passed again. Correction still allows both signs, so those older tests stayed valid.

## 10. Test results

Isolated SQLite, `DATABASE_URL=sqlite:///:memory:` forced by `backend/tests/conftest.py`:

```text
pytest tests/test_stock_adjustment_approval.py \
  tests/test_stock_movement.py \
  tests/test_product_receipt_approval.py \
  tests/test_stock_reservation.py \
  tests/test_stock_issue.py \
  tests/test_auth_rbac.py
```

**42 passed, 0 failed.**

```text
pytest tests/test_depot_scope.py tests/test_order_lifecycle.py \
  tests/test_status.py tests/test_validation.py
```

**9 passed, 0 failed.**

```text
npx vitest run src/lib/adjustmentDirection.test.ts
```

**4 passed, 0 failed.**

## 11. Remaining limitations

- One adjustment type applies to every line. Mixed types must be separate chalans.
- Pending rows with type `Quantity`, or with a known type and the wrong sign, stay pending until someone deletes them or replaces them. This step does not edit them.
- Create can still store `status: "Approved"` without posting stock. That was already true and was not changed.
- The screen change was not exercised in a browser.
- Ledger `reserved_quantity` is still unused. Reserved protection remains on the batch detail row.

## 12. PostgreSQL concurrency verification status

**NOT VERIFIED.** Tests ran on SQLite. Row locking behavior under two PostgreSQL approvals was not proven.

## 13. Production database safety confirmation

Confirmed:

- No production connection was opened.
- No migration was written or run.
- No production adjustment or inventory row was changed.
- No container was started or restarted.
- No Supabase dependency was added.

Step 1.4 has not been started.
