# Phase F.4B.1A — Draft Update Concurrency and Transaction Safety Hardening

Date: 25 November 2026  
Status: **Complete.** Sample/Gift and Export Draft PUT now lock the header with `SELECT FOR UPDATE`, recheck status, and refuse non-Draft updates with HTTP 409. Submit/Approve/Reject routes remain unmounted. Write flags remain `no`. F.4B.2 and F.4C were not started.

---

## 1. Root cause of PUT race

F.4B.1 disposable PostgreSQL showed that Submit and Draft PUT did not share a lock.

Previous PUT sequence (both modules):

1. Authenticate; enforce admin/manager + draft write flag.
2. Load the header with a plain `SELECT` (`_load` / equivalent).
3. If `status != Draft`, return **400**.
4. Validate products and fields.
5. Mutate header fields, replace items, `commit`.

The isolated transition helper already used `SELECT … FOR UPDATE` on the same primary key, then changed `status` and committed.

Under `READ COMMITTED`, two sessions could therefore:

1. PUT read `Draft` without a row lock.
2. Submit lock, set `Submitted`, commit.
3. PUT still hold the old in-memory row, overwrite header/items, and commit.

The document left Draft and was still edited. That is the race this phase closes.

---

## 2. Files modified

| File | Change |
|---|---|
| `backend/app/services/draft_document_lock.py` | Shared `load_document_for_update` (`with_for_update`), `require_draft_for_write` (409 if not Draft), `commit_draft_write` / `abort_unlocked` |
| `backend/app/services/draft_status_transition.py` | `load_for_update` delegates to the shared lock helper (already in place) |
| `backend/app/routers/sample_gift_deliveries.py` | PUT uses `require_draft_for_write`; same-transaction item replace; rollback on 4xx/DB error |
| `backend/app/routers/export_deliveries.py` | Same PUT hardening |
| `backend/tests/test_sample_gift_deliveries.py` | 409 after Submit/Approve/Reject; PUT validation and replace-failure rollback |
| `backend/tests/test_export_deliveries.py` | Same |
| `docs/PHASE_F_4B_1A_DRAFT_UPDATE_CONCURRENCY_HARDENING_REPORT.md` | This report |

Not changed: Alembic, Compose flags, product flags, stock/billing, frontend, eligibility wiring, workflow mounts (`ENDPOINTS_MOUNTED = False`).

---

## 3. Locking strategy

PUT and `apply_transition` lock **the same header primary-key row**:

```text
SELECT … FROM sample_gift_deliveries WHERE id = :id FOR UPDATE
SELECT … FROM export_deliveries WHERE id = :id FOR UPDATE
```

SQLAlchemy: `db.query(model).filter(model.id == document_id).with_for_update().first()`.

PostgreSQL serializes those transactions on that row. The lock is held until `commit` or `rollback`. Failed validation after the lock calls `abort_unlocked` (`rollback`) so the lock is not held until the HTTP session ends.

SQLite tests still run; they do not prove `FOR UPDATE`. Concurrency proof is disposable PostgreSQL 16 (`f4b1a_iso`).

---

## 4. Status recheck behavior

After the lock is acquired:

1. `hide_foreign_depot` (foreign depot still **404**).
2. If `(status or "Draft") != "Draft"` → **409** `"Only Draft documents can be updated"`.
3. Only then mutate header fields and replace items.

Because the recheck runs **after** `FOR UPDATE`, a Submit that already committed is visible. A Submit still in progress blocks until it commits; PUT then sees `Submitted` and returns 409.

GET still uses unlocked `_load` (read path unchanged).

---

## 5. Transaction boundaries

One request, one session, one transaction:

1. Auth + role + `SAMPLE_GIFT_DRAFT_WRITES` / `EXPORT_DRAFT_WRITES`.
2. `SELECT FOR UPDATE` header.
3. Depot checks; product existence; delivery-number uniqueness; required `depot_id`.
4. Header assignment + `_replace_items` (`clear` + `flush` + insert) **before** commit.
5. `commit_draft_write`.

IntegrityError → rollback, **409** `"Delivery number already exists"`. Other `SQLAlchemyError` → rollback, **500** `"The document could not be saved"` (no SQL text). `HTTPException` after lock → rollback so items are not left half-replaced.

`AuditService` is unused on PUT. Isolated Submit still does not commit internally; the test caller commits.

---

## 6. HTTP response changes

| Case | Before | After |
|---|---|---|
| PUT while Draft | 200 | 200 (same body shape) |
| PUT after Submitted/Approved/Rejected | **400** | **409** `"Only Draft documents can be updated"` |
| Invalid product | 400 | 400 |
| Quantity ≤ 0 | 422 | 422 |
| Duplicate delivery number | 409 | 409 |
| Missing depot on PUT (admin, no depot on payload or row) | could proceed with `None` | **400** depot required |
| PSO/user write | 403 | 403 |
| Foreign depot | 404 | 404 |
| Unauthenticated | 401 | 401 |
| Write flags off (production) | 403 | 403 |
| DB error during replace/commit | could leak driver text | **500** generic message |

Request/response models for successful PUT are unchanged. Clients that treated non-Draft PUT as 400 must accept 409.

---

## 7. Concurrent PUT vs Submit results

Disposable `f4b1a_iso` (restore of `swift_distro_hub_20261125_123200.dump`, revision `f3_export_draft`). Real `update_sample_gift_delivery` / `update_export_delivery` plus `apply_transition`. Two sessions. Submit routes not mounted.

| Scenario | Result |
|---|---|
| Submit locks first, then PUT | Submit commits `Submitted`; PUT **409**; `recipient_name` / `destination_country` unchanged; item qty unchanged |
| PUT locks first, then Submit | PUT **200** (new header + items); Submit then commits `Submitted` on the **updated** document |
| Sample/Gift and Export | Same ordering for both |

No post-Submit header or item mutation when Submit wins.

---

## 8. Concurrent PUT vs PUT results

Two simultaneous Sample/Gift PUTs on the same Draft: both **200**, serialized. Final `recipient_name` is `A` or `B` (last writer). Item count remains **1** (no duplicate lines). Status remains **Draft**.

**Optimistic concurrency:** `updated_at` exists on both headers and is stamped on PUT. It is **not** sent by clients and is **not** compared. Two legitimate sequential Draft PUTs remain **last-write-wins**. An `If-Match` / `updated_at` precondition would be a new API contract and needs a business decision; it was **not** added.

---

## 9. Atomic item replacement results

| Failure | Persist? |
|---|---|
| Invalid product ID | Header and items unchanged (400) |
| Quantity 0 | Unchanged (422, Pydantic) |
| Duplicate delivery number | Unchanged (409) |
| Synthetic flush `OperationalError` | Unchanged (500 generic); SQLite and disposable PG |
| Submit already applied | Unchanged (409) |

`_replace_items` still `clear` + `flush` + insert in the same transaction as the header. A failed flush cannot commit a header-only write.

---

## 10. Authorization regression

Preserved:

- Admin/manager Draft PUT only while the module write flag is on (pytest sets flags `yes`; Compose remains `no`).
- PSO/`user` PUT **403**.
- Foreign-depot PUT **404**.
- JWT required.
- No new RBAC codes.
- No workflow approval permissions.
- `draft_product_eligibility` still unused by routers.

---

## 11. Backend test results

`docker exec … pytest /app/tests -q --tb=line -p no:cacheprovider`

**141 passed**, 199 warnings, 191.26s.

Includes Sample/Gift CRUD, Export CRUD, isolated status transitions, eligibility helper, depot isolation, authorization, order lifecycle, stock reservation, billing, and new PUT 409 / rollback cases.

Previous baseline was 135 (F.4B.1), then 137 after sequential 409 tests; this run is 141 with validation/rollback tests.

---

## 12. Frontend tests and build

- vitest: **9 passed** (2 files)
- `vite build`: success (~29s)
- No Submit/Approve/Reject buttons added. Form “submit” remains Draft save.

---

## 13. Disposable PostgreSQL evidence

Database: **`f4b1a_iso`** only. Not `swift_distro_hub`. Dropped after the run.

Script invoked the **router PUT functions** (not an unlocked stand-in) and `apply_transition` with `lock_timeout = 8s`.

```
PASS submit-first PUT 409
PASS submit-first header not mutated
PASS submit-first items not mutated
PASS put-first PUT 200 then submit on updated document
PASS two PUTs both 200; last-write-wins; item count 1
PASS invalid product PUT 400; no mutation
PASS flush failure 500 generic; rolled back
PASS export submit-first PUT 409; no mutation
PASS export put-first 200 then Submitted
PASS no leftover ungranted locks
PASS disposable commercial snapshot unchanged
      ledger 13000 / PISD 10635 / orders 131 / invoices 5
ALL_CONCURRENCY_CHECKS_PASSED
```

No deadlocks or lock timeouts. `f4b1a_iso` no longer exists.

---

## 14. Live database preservation (read-only)

No live writes, no Alembic, no autogenerate in the API volume.

| Check | Result |
|---|---|
| Alembic | `f3_export_draft` |
| Public tables (`pg_tables`) | **83** including `alembic_version` (**82** application tables). This phase added none. F.4B.1’s “82” matches the application count. |
| Sample/Gift rows | **0** |
| Export rows | **0** |
| `SAMPLE_GIFT_DRAFT_WRITES` | `no` |
| `EXPORT_DRAFT_WRITES` | `no` |
| Ledger available | **13000.00** |
| PISD available | **10635.00** |
| PIS `stock_qty` | **13275.00** |
| Orders / invoices | **131** / **5** |
| Sample/export product flags | **0** / **0** |
| `GET /health` | success (`SLI backend is running`) |
| `POST …/submit` and `…/approve` | **404** (unmounted) |

---

## 15. Business approval status

`docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md`: all **20** decisions **Pending**. Section E unsigned.

**`F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED`**

Eligibility helper remains disconnected. Workflow endpoints remain unmounted. Draft creation remains flag-gated off in production.

---

## 16. GO / NO-GO recommendation for the next phase

**F.4B.1A: GO (complete).** The Draft PUT race is closed on both modules. Sequential Draft PUTs remain last-write-wins without a new version column.

**F.4B.2 (mount Submit/Approve/Reject): NO-GO** until written owner decisions on the 20 policy rows and a separate engineering order.

**F.4C: NO-GO.** Not started.

Do not enable `SAMPLE_GIFT_DRAFT_WRITES` or `EXPORT_DRAFT_WRITES`. Do not classify live products. Do not mutate stock or billing.
