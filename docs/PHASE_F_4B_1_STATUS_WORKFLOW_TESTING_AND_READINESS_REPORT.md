# Phase F.4B.1 — Status Workflow Testing and Integration Readiness

Date: 25 November 2026  
Status: **Isolated testing complete. Endpoints not mounted. Eligibility not wired to routers. Write flags remain off. F.4B Gate B remains blocked. F.4B.2 and F.4C were not started.**

---

## 1. Files reviewed and modified

**Reviewed (no production router changes):** Draft routers, `AuditService` (`log_action` adds a row, **does not commit**), models/schemas, depot_scope, F.4A/F.4B tests, approval docs.

| File | Change |
|---|---|
| `backend/app/services/draft_status_transition.py` | 401 if `user` is None; still `ENDPOINTS_MOUNTED = False` |
| `backend/app/services/draft_product_eligibility.py` | `category_for_sample_gift`, `validate_lines_for_submit` (unused by routers) |
| `backend/tests/test_draft_status_transition.py` | expanded isolated cases |
| `backend/tests/test_draft_product_eligibility.py` | submit-time helper tests |
| `docs/PHASE_F_4B_1_STATUS_WORKFLOW_TESTING_AND_READINESS_REPORT.md` | this report |

Routers, Compose flags, Alembic, frontend: **unchanged**.

---

## 2. State machine review

Proposed (unsigned): Draft→Submitted→Approved; Submitted→Rejected. Approved and Rejected terminal for this phase.

Isolated helper: Draft submit only; Submitted approve/reject; 409 otherwise; idempotent retry if already at that action’s target; depot `hide_foreign_depot` 404; self-approve 403; no stock imports.

---

## 3. New unit tests (SQLite)

Added coverage: blank reject reason 422; approve-from-Draft 409; submit-from-Approved/Rejected 409; repeated approve/reject (no extra audit); billing role 403; missing user 401; session rollback restores Draft and audit count; audit field completeness; `validate_lines_for_submit` for gift vs export; endpoints still 404.

Existing submit/approve/reject/self-approve/PSO/foreign-depot/export/stock-snapshot tests remain.

---

## 4. PostgreSQL concurrency (`f4b1_iso`, not live)

Restored from `swift_distro_hub_20261125_123200.dump`, `f3_export_draft`. Dropped after.

| Scenario | Result |
|---|---|
| Two concurrent approves | one apply + one idempotent; **1** `SAMPLE_GIFT_APPROVED`; status Approved |
| Approve vs reject | winner **Approved**; reject **409**; one audit |
| Two concurrent submits | one apply + one idempotent; **1** submit audit |
| Two concurrent rejects | one apply + one idempotent; **1** reject audit |
| Submit vs unlocked PUT-like update | submit succeeded; PUT **still wrote** `recipient_name` on Submitted (no `FOR UPDATE` / no re-check) |
| Rollback after apply, before commit | status **Draft**; audit **0** |

Stock/invoices/orders/delivery_orders/collection_deposits **unchanged** on the disposable copy (13000 / 10635 / 5 / 131 / 12 / 49).

---

## 5. Audit atomicity

`AuditService.log_action` only `db.add`s; **no independent commit**. Status + audit share the caller’s transaction. Rollback tests confirm both revert. Commercial audit callers were not changed.

Fields verified on submit: `user_id`, `user_name`, `role_name`, `entity_id`, `entity_type`, `depot_id`, old/new status, remarks, `created_at`.

---

## 6. Eligibility integration readiness

`validate_lines_for_submit` + `category_for_sample_gift` are ready for a future submit path. Routers still do not import them. Live product flags remain all false. Policy unsigned.

---

## 7. Draft update concurrency

Current PUT (`sample_gift_deliveries` / `export_deliveries`): load **without** `FOR UPDATE`, require `status == Draft`, then mutate and commit.

Disposable race: submit can finish first; PUT then overwrites header fields on a **Submitted** row.

**Proposed (not implemented):** `SELECT … FOR UPDATE` on PUT; re-read status after lock; if not Draft → 409; same transaction as item replace. Apply only after Gate B.

---

## 8. API contract readiness (not registered)

Auth: JWT. Flag: existing Draft write flags. Roles: proposed admin/manager. Depot: 404 foreign. Body: submit none; approve optional remarks; reject `{reason}` required.

| Code | Meaning |
|---|---|
| 200 | applied or idempotent |
| 401 | no user |
| 403 | role / self-approve / flag |
| 404 | missing or foreign depot |
| 409 | illegal status |
| 422 | empty reject reason |

Concurrency: `FOR UPDATE`. Idempotent: already-target status, no extra audit.

---

## 9. Inventory and billing preservation

Helpers do not import stock or invoice models. SQLite snapshots and disposable PG snapshots matched before/after.

---

## 10. Backend test results

**135 passed**, 193 warnings, 161.74s (was 126). Includes new transition tests, eligibility, Sample/Gift and Export CRUD, RBAC, depot, orders, reservation, billing.

---

## 11. Frontend test/build

vitest **9 passed**. `vite build` **success**. No UI workflow buttons.

---

## 12. Live database checks (read-only)

No Alembic autogenerate in the live API volume.

| Check | Expected / verified after this phase |
|---|---|
| Alembic | `f3_export_draft` |
| Tables | 82 |
| Draft rows | 0 / 0 |
| Write flags | `no` / `no` |
| ledger / PISD available | 13000 / 10635 |
| `/health` | `{"status":"healthy"}` |

---

## 13. Approval status

`docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md`: **20 Pending**. Section E unsigned.

**`F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED`**

---

## 14. Remaining blockers

1. Named owner sign-off on A1–C8.
2. Wire eligibility + mount endpoints only after Gate B **and** a separate engineering order.
3. PUT `FOR UPDATE` / status re-check (proposed).
4. Named SKU list (0 eligible live products).
5. F.4C source of truth still unsigned.

---

## 15. GO / NO-GO for F.4B.2

| Item | Verdict |
|---|---|
| Isolated tests / helper hardening | **GO** (this phase) |
| F.4B.2 mount endpoints / frontend buttons | **NO-GO** until signed Gate B + engineering instruction |
| Enable write flags | **NO-GO** |
| F.4C | **NO-GO** |

**F.4B.1 complete.** Do not claim business approval. Do not start F.4B.2 or F.4C.
