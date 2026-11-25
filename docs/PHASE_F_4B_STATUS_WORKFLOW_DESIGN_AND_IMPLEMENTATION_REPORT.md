# Phase F.4B — Sample/Gift and Export Status Workflow Design and Isolated Validation

Date: 25 November 2026  
Status: **Gate A complete. No written business approval. Status endpoints are not mounted. Live Draft writes remain disabled. F.4C was not started.**

This report does not claim the workflow is deployed.

---

## 1. Approval evidence and pending decisions

Searched project docs for explicit sign-off on submit/approve/reject actors. **None found.** F.3.3 / F.3.4 / F.4A recommendations are not approvals.

| # | Policy | Current code | Proposed default (not granted) | Status |
|---|---|---|---|---|
| 1 | Who may create Drafts | admin/manager + write flag | keep | **PENDING** (matches code; not re-signed) |
| 2 | Who may submit | not built | admin/manager; not PSO | **PENDING** |
| 3 | Who may approve/reject | not built | admin/manager; not PSO | **PENDING** |
| 4 | Self-approve | n/a | **forbidden** | **PENDING** |
| 5 | Reject destination | n/a | terminal **Rejected** (not back to Draft) | **PENDING** |
| 6 | Reject reason | n/a | required (422 if empty) | **PENDING** |
| 7 | Same roles for Sample/Gift and Export | n/a | **yes** | **PENDING** |

`orders.write` is **not** treated as Sample/Gift or Export authority. No new RBAC codes.

Gate B (mount endpoints, still flags off) requires a written answer to rows 2–7.

---

## 2. Proposed state machines

Shared machine for Sample/Gift and Export. **Not** commercial `DeliveryStatusEnum` (PACKING/LOADING/SHIPPED/DELIVERED). **Not** Prepared, Dispatched, Delivered, or CustomsCleared.

```
Draft ──submit──► Submitted ──approve──► Approved
                      │
                      └──reject──► Rejected (terminal)
```

| From | Action | To | Invalid examples |
|---|---|---|---|
| Draft | submit | Submitted | approve/reject from Draft → 409 |
| Submitted | approve | Approved | submit from Approved → 409 |
| Submitted | reject | Rejected | submit/approve from Rejected → 409 |
| Approved | — | — | any transition → 409 except idempotent approve |
| Rejected | — | — | any transition → 409 except idempotent reject |

Stock: **none**. Eligibility on submit: **after F.4A product policy is approved**; helper exists but is not called.

---

## 3. API contract matrix (not mounted)

`ENDPOINTS_MOUNTED = False`. POST to these paths returns **404**.

| Method | Path | Flag | Roles (proposed) | Depot | Body | From → To | HTTP | Audit | Idempotency | Concurrency |
|---|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/sample-gift-deliveries/{id}/submit` | `SAMPLE_GIFT_DRAFT_WRITES` | admin, manager | `hide_foreign_depot` 404 | none | Draft→Submitted | 200 | `SAMPLE_GIFT_SUBMITTED` | already Submitted: 200, no extra audit | `SELECT … FOR UPDATE` |
| POST | `…/approve` | same | admin, manager; not creator | 404 foreign | optional remarks | Submitted→Approved | 200 | `SAMPLE_GIFT_APPROVED` | already Approved: 200, no extra audit | same; loser sees idempotent or 409 |
| POST | `…/reject` | same | admin, manager | 404 foreign | `{reason}` required | Submitted→Rejected | 200 | `SAMPLE_GIFT_REJECTED` | already Rejected: 200, no extra audit | same |
| POST | `/api/export-deliveries/{id}/submit` | `EXPORT_DRAFT_WRITES` | same | same | none | Draft→Submitted | 200 | `EXPORT_SUBMITTED` | same | same |
| POST | `…/approve` | same | same; not creator | same | optional remarks | Submitted→Approved | 200 | `EXPORT_APPROVED` | same | same |
| POST | `…/reject` | same | same | same | `{reason}` required | Submitted→Rejected | 200 | `EXPORT_REJECTED` | same | same |

Errors: 401 unauthenticated; 403 role/self-approve/flag; 404 missing or foreign depot; 409 illegal status; 422 missing reject reason. Failed calls do not commit.

Existing GET/POST/PUT Draft CRUD is unchanged.

---

## 4. Authorization rules

| Rule | Live | Isolated helper |
|---|---|---|
| Six roles | unchanged | `user`/PSO 403 on submit/approve/reject |
| Permission codes | none added | none added |
| Draft writes | Compose `no` / `no` | n/a (no HTTP) |
| Depot isolation | GET/PUT 404 foreign | `hide_foreign_depot` |
| Create vs approve | same admin/manager today for create | **approve ≠ create**: creator 403 on approve |
| `orders.write` | not used | not used |

Gap: there is **no** existing permission that means “approve Sample/Gift” distinctly from “create Draft”. Do not reuse unrelated codes. Document a new code only after product/HR sign-off (out of this phase).

---

## 5. Transition service implementation status

| Item | Status |
|---|---|
| `backend/app/services/draft_status_transition.py` | **present**, `POLICY_APPROVED = False` |
| Imported by Draft routers | **no** |
| HTTP routes | **not registered** |
| `with_for_update` | **yes** |
| Commits inventory | **no** (caller commits document + audit only) |
| Eligibility on submit | **not wired** (F.4A still pending) |
| Schema / Alembic | **unchanged** (`status` is already `String(50)`) |

After Gate B: routers call `apply_transition` then `db.commit()`, still behind write flags.

---

## 6. Concurrency and idempotency findings

SQLite: sequential tests. PostgreSQL 16 `f4b_iso` (restored dump, **not live**):

Two concurrent `approve` calls on one Submitted row (`FOR UPDATE`): one performed the transition (`idempotent=False`); the other waited then no-op (`idempotent=True`). Final status **Approved**. **One** `SAMPLE_GIFT_APPROVED` audit row. Retry after Approved was again idempotent.

Illegal transitions leave the original status (409 after rollback).

---

## 7. Audit logging design

Uses existing `AuditService.log_action` (`audit_logs`). Not written to **live** data.

| Field | Source |
|---|---|
| action | names in §3 |
| entity_type | `sample_gift_delivery` / `export_delivery` |
| entity_id | document id |
| user_id / user_name / role | actor |
| depot_id | document depot |
| old_value / new_value | `{status}` |
| reason / remarks | reject/approve payload |
| timestamp | `AuditLog` created_at |

Idempotent retries **do not** insert a second row.

---

## 8. Frontend integration plan (not implemented)

Inspected list/detail pages. **No UI change in this phase.** Print remains disabled. New Sample Gift button still hits create (403 while flags off).

When Gate B is signed:

| Surface | Placement using existing components |
|---|---|
| Sample/Gift detail `PageHeader` actions | `Button` next to Back: Submit if Draft; Approve/Reject if Submitted |
| Export detail | same |
| List Actions column | optional later; detail-first is enough |
| Status badge maps | add Submitted/Approved/Rejected; do **not** enable Prepared/Dispatched/CustomsCleared actions |

Do not show working controls until backend routes exist **and** flags/roles are approved.

---

## 9. Inventory and billing non-mutation

Helper never imports stock or invoice models.

SQLite snapshots before/after submit→approve and export submit→approve: ledger, PISD, PIS, allocations, orders, invoices, issuances **unchanged**.

Disposable PG: ledger **13000**, PISD **10635**, invoices **5** before and after concurrent approve. One synthetic Sample/Gift row existed **only** on `f4b_iso` (dropped).

---

## 10. Backend test results

SQLite pytest in API container:

**126 passed**, 184 warnings, 175.18s (117 prior + 9 isolated transition tests). Includes Sample/Gift CRUD, Export CRUD, order lifecycle, stock reservation, and `POST …/submit` **404**.

---

## 11. Frontend test/build results

| Command | Result |
|---|---|
| vitest | **9 passed** |
| `vite build` | **success** (existing chunk-size warning) |

---

## 12. Disposable PostgreSQL tests

`f4b_iso` from `swift_distro_hub_20261125_123200.dump`, revision `f3_export_draft`.

| Check | Result |
|---|---|
| Concurrent approve | one apply + one idempotent; one audit |
| Idempotent retry | no extra audit |
| Stock/invoices | unchanged |
| Autogenerate | empty; probe deleted |
| Database | **dropped** |

---

## 13. Live preservation checks

2026-11-25 07:05:24 UTC, read-only.

| Check | Value |
|---|---|
| Alembic | `f3_export_draft` |
| Tables | 82 |
| Sample/Gift rows | 0 |
| Export rows | 0 |
| Write flags | `no` / `no` |
| ledger available | 13000 |
| PISD available | 10635 |
| orders / invoices | 131 / 5 |
| Live migration | none |
| Live status mutations | none |
| `/health` | `{"status":"healthy"}` after API restart |

A disposable autogenerate probe briefly made Alembic head `a0f93b5a0cac`. `schema_guard` refused startup (no live upgrade). The empty probe was deleted and the API container was restarted. Live revision remained `f3_export_draft`.

---

## 14. Exact approval requirements for activation (Gate B)

Written product/operations sign-off must state:

1. Submit roles (recommended admin/manager; PSO no).
2. Approve/reject roles (recommended admin/manager; PSO no).
3. Self-approve yes/no (recommended no).
4. Rejected = terminal vs return to Draft (recommended terminal).
5. Reject reason required yes/no (recommended yes).
6. Sample/Gift and Export share those roles yes/no (recommended yes).
7. Whether submit must call F.4A eligibility (blocked until product flags are approved **and** SKUs are flagged — still **0** live eligible products).

Then, still **without** enabling Compose write flags:

- Mount the six POSTs behind existing write-flag dependencies.
- Do not add Prepared/Dispatch/stock.

Live Draft **creation** still requires a separate write-flag approval (F.3.3 §9) and named eligible SKUs (F.4A).

---

## 15. GO / NO-GO for the next phase

| Item | Verdict |
|---|---|
| F.4B Gate A (design + isolated tests) | **GO** (complete) |
| Claim workflow deployed | **NO-GO** |
| Mount status endpoints | **NO-GO** until §14 |
| Enable Draft write flags | **NO-GO** |
| F.4C unified stock reservation | **NO-GO** (F.3.4 source-of-truth and issue-accounting blockers) |
| Frontend Submit/Approve buttons | **NO-GO** |

**F.4B is complete under Gate A.** Do not start F.4C.
