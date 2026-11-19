# Step 1.3B — Adjustment Approval Status Bypass

Status: **COMPLETE**

PostgreSQL concurrency and live data remain **NOT VERIFIED**. No production database was used.

## 1. Root cause

`POST /api/stock/adjustments` copied `status` from the request onto the new row and committed. It did not call `StockMovementService.adjust()`. A client could send `status: "Approved"` and receive a document that looked approved with no inventory movement.

The schema default is `Pending`, and the screen sends `Pending`. The server did not enforce that value.

## 2. All adjustment status mutation paths found

| Path | What it could write | After this step |
| --- | --- | --- |
| `POST /api/stock/adjustments` | Any string, including `Approved`, `Rejected`, and `Completed` | Only `Pending`. Anything else is HTTP 400 and nothing is inserted |
| `POST /api/stock/adjustments/{id}/approve` | `Pending` to `Approved` after stock posting | Unchanged. This is the only API transition to `Approved` |
| `PUT` or `PATCH /api/stock/adjustments/{id}` | No route | **TESTED** 405. Status is not written |
| `DELETE` | Removes a pending row. It does not approve | Unchanged |
| `backend/db/seed_stock_adjustments_test.py` and `backend/db/seed_demo_modules.py` | Insert `Pending`, `Approved`, or `Rejected` directly, without posting stock | Not changed. They are not API routes and were not executed |
| Model default | `Pending` when status is omitted in ORM code | Unchanged |

`approved_by` is not on the create schema. Extra JSON fields are ignored. Only the approval endpoint sets `approved_by`.

## 3. Files modified

| File | Change |
| --- | --- |
| `backend/app/routers/stock_adjustment.py` | Create accepts only a pending status |
| `backend/tests/test_stock_adjustment_approval.py` | Status bypass tests |
| `STEP_1_3B_ADJUSTMENT_STATUS_SAFETY_REPORT.md` | This report |

No frontend, schema, model, service, or migration change.

## 4. New creation validation

**IMPLEMENTED**

Before any insert:

- Missing, blank, `Pending`, or `pending` is stored as `Pending`.
- `Approved`, including different letter case, returns 400 `Invalid adjustment status`.
- `Rejected`, `Completed`, and any other value return the same 400.
- The status is not rewritten from `Approved` to `Pending`.
- Direction rules still run before insert. A rejected request inserts no adjustment and no lines.

## 5. Approval transition protection

**IMPLEMENTED** and already covered by Step 1.3.

The approval endpoint is still the only API writer of `Approved`. It locks the row, requires pending status, validates lines and direction, calls `StockMovementService.adjust()` for every line, sets `Approved` and `approved_by`, then commits once. A failure rolls back stock and leaves the document `Pending`. A second approval returns 400 `Only pending adjustments can be approved` and does not post again.

## 6. Existing API compatibility

**TESTED**

| Call | Result |
| --- | --- |
| Create with no status | 201, `status` is `Pending` |
| Create with `Pending` | 201, same response schema |
| Create with `Approved`, `Rejected`, or `Completed` | 400 `Invalid adjustment status` |
| Screen payload, which already sends `Pending` | Still accepted |
| List, get, delete, and approve paths | Unchanged |
| Response fields | Unchanged |

No frontend change was required.

## 7. Historical record handling

No existing adjustment or stock row was read or rewritten. `ADJ-TEST-007` was not touched.

A later read-only audit can list candidates. Do not run it until you approve a read-only check, and do not reconcile from it:

```sql
SELECT adjustment_number, adjustment_type, status, approved_by, created_at
FROM stock_adjustments
WHERE lower(status) = 'approved'
ORDER BY id;
```

`approved_by` is null on rows created through the old API bypass, because create never set that column. Seed scripts can insert `Approved` with `approved_by` filled and still never post stock. The ledger has no adjustment id, so this query cannot prove whether inventory moved. It is an identification list only.

## 8. Tests added

`test_create_cannot_bypass_approval_status` covers:

1. Omitted status starts as `Pending`.
2. Explicit `Pending` is accepted.
3. `Approved` and `APPROVED` are rejected.
4. `Rejected` and `Completed` are rejected.
5. Those failures insert no header and no lines, and stock stays unchanged.
6. Write off with a positive quantity is still 400 `Invalid adjustment direction`, with no new line.
7. Approving the pending row posts `+10` once.
8. Repeating that approval does not post again.
9. Existing rollback coverage in `test_multiple_lines_and_full_rollback` passed again.
10. `PUT /api/stock/adjustments/{id}` returns 405 and leaves the row `Pending`.
11. Existing create, list, get, and delete test passed again.

## 9. Exact test commands

From `backend/`, using `/tmp/stock-test-venv/bin/python`. `backend/tests/conftest.py` sets `DATABASE_URL` to `sqlite:///:memory:` before the app loads.

```text
DATABASE_URL=sqlite:///:memory: python -m pytest tests -q --tb=short -p no:cacheprovider
```

## 10. Passed and failed tests

**52 passed, 0 failed.** That is the full isolated backend suite, including adjustment, receipt approval, stock movement, reservation, issue, and authentication tests.

## 11. Known limitations

- Seed scripts can still insert `Approved` without posting stock if someone runs them. They were not run and were not changed.
- Historical approved rows were not classified. The ledger cannot be tied back to an adjustment id.
- SQLite does not prove PostgreSQL row locks.
- Create can still be called by any authenticated user. No new permission was added.

## 12. PostgreSQL concurrency verification status

**NOT VERIFIED.** The suite used in-memory SQLite only.

## 13. Production database safety confirmation

Confirmed:

- No production connection was opened.
- No migration was written or run.
- No production adjustment or inventory row was changed.
- No container was started or restarted.
- No environment variable file was changed.
- No Supabase dependency was added.

## 14. Recommendation for Step 1.4

Stop here.

Do not start delivery approval, depot transfers, returns, reconciliation, or unique indexes until you approve that step. Delivery approval is still the next stock posting that is outside this service.
