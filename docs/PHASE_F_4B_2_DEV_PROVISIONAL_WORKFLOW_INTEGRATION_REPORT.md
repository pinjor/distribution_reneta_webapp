# Phase F.4B.2-DEV — Provisional workflow integration (isolated)

Date: 26 November 2026  
Scope: Isolated Submit/Approve/Reject only. **Not business approved. Not production F.4B.2.**

Official policy (`PHASE_F_4_BUSINESS_POLICY_APPROVAL.md`): A1–C8 **Pending**. Section E **Awaiting approval**. Gate B **BLOCKED**.

---

## 1. Files reviewed and modified

Reviewed: official policy, Gate B handoff, F.4B.1A/1C/1G reports; eligibility and transition helpers; Draft routers; lock helper; capability API; `main.py`; isolated E2E stack.

**Added**

| File | Role |
|---|---|
| `backend/app/api_app.py` | Factory: production vs isolated |
| `backend/isolated_workflow_app.py` | Isolated uvicorn entrypoint |
| `backend/app/isolated_runtime.py` | Request context marker (not an env flag) |
| `backend/app/services/draft_workflow_execution.py` | Isolated lock + eligibility + transition |
| `backend/app/routers/draft_workflow.py` | Submit/Approve/Reject routes |
| `backend/tests/test_f4b2_dev_isolated_workflow.py` | Isolated HTTP + production 404 |
| `backend/tests/test_f4b2_dev_pg_concurrency.py` | Disposable PostgreSQL races |
| `src/isolated-workflow/*` | Test-only harness source (not in production `index.html`) |
| `docs/PHASE_F_4B_2_DEV_PROVISIONAL_WORKFLOW_POLICY.md` | Unsigned test assumptions |

**Changed (production-safe)**

| File | Change |
|---|---|
| `backend/main.py` | `create_api_app(isolated_workflow=False)` |
| Sample/Gift and Export routers | Eligibility **only** when isolated marker is active |
| `draft_module_capabilities.py` | Workflow flags **only** when isolated marker is active |
| `draft_modules.py` | Optional document ids; production still `can_submit=false` |
| `schemas.py` | `DraftWorkflowActionRequest` |
| `test_sample_gift_deliveries.py` | Production still accepts an unflagged existing SKU |

`ENDPOINTS_MOUNTED` and `POLICY_APPROVED` remain **False**. Official approval rows were **not** marked Approve. Synthetic emails were **not** written into Section E.

---

## 2. Isolated application architecture

- Production: `uvicorn main:app` → no workflow routers.
- Isolated: `uvicorn isolated_workflow_app:app` → same business routers **plus** workflow routers **plus** `IsolatedWorkflowMarkerMiddleware`.
- No Compose env var can turn on those routes. The production process never sets the contextvar.

---

## 3. Product eligibility integration

Isolated create/update/submit call `draft_product_eligibility` (proposed A1–A5). Production create/update remain existence-only. Live catalog flags were not changed (14 products, 0 sample flags, 0 export flags).

---

## 4–6. Submit / Approve / Reject APIs

Mounted **only** on the isolated app:

- `POST /api/sample-gift-deliveries/{id}/submit|approve|reject`
- `POST /api/export-deliveries/{id}/submit|approve|reject`

JWT, write-flag, admin/manager, depot 404, `SELECT FOR UPDATE`, eligibility on submit, mandatory reject reason, 409 on illegal status, no stock/invoice.

Production those paths: **HTTP 404** (verified on live nginx and pytest against `main:app`).

---

## 7. Provisional roles and permissions

Isolated tests: Admin/Manager may write when flags are on. PSO, billing: 403. Creator: 403 on approve. Foreign manager: 404. No new RBAC codes.

---

## 8. Synthetic test identities

See the DEV policy note. Disposable databases only. Not business signatories.

---

## 9. Status transition verification

Isolated HTTP: Draft→Submitted→Approved; Submitted→Rejected; terminal 409; blank reason 422; Sample/Gift and Export share the helper.

---

## 10. Database locking and concurrency

Disposable PostgreSQL `f4b2_dev` (destroyed after tests): dual Submit (one audit); dual Approve (one audit); Approve vs Reject (one winner, one 409); Submit vs PUT (FOR UPDATE); rollback; invalid product on submit.

---

## 11. Audit and idempotency

One `SAMPLE_GIFT_*` / `EXPORT_*` event per successful transition. Retry after success is idempotent. Audit exception rolls the header back to Draft.

---

## 12. Test-only capability API

Isolated: `can_submit/approve/reject` follow role + write flags; optional `?sample_gift_id=` adds document actions (self-approve blocked). Production: all three remain **false**. Frontend `sanitizeModuleCapability` still forces them false. Isolated harness uses `sanitizeIsolatedWorkflowCapability`.

---

## 13. Frontend test-only integration

Production pages were **not** given Submit/Approve/Reject buttons. Production Vite build (`dist/index.html` only) does not include the harness. `src/isolated-workflow/App.tsx` is source for a later isolated Vite entry if needed. Browser workflow UI against the isolated API is the **next test-only phase**. Playwright 21 tests still assert production-like APIs return 404 for workflow.

---

## 14. Inventory and billing preservation

Isolated HTTP snapshots: stock ledger, PISD, PIS, allocations, orders, invoices, issuances, deposits, collections — unchanged across approve/reject. Live after this work: orders 131, invoices 5, `product_item_stock.stock_qty` 13275, PISD available/reserved 10635 / 2640.

---

## 15. Backend test results

`pytest /app/tests` in the API container, SQLite for the suite, `F4B2_DEV_DATABASE_URL` → disposable `f4b2_dev` for concurrency:

**162 passed**, 213 warnings, 164.78s.

Includes prior Draft/RBAC/order/reservation/billing tests, production 404, unflagged SKU still 201 on production client, isolated workflow HTTP, PostgreSQL races.

---

## 16. Frontend test and build results

- Vitest: **38 passed** (8 files), including isolated sanitizer vs production sanitizer.
- `npm run build`: **successful** (26.97s). No isolated-workflow chunk in `dist`.

---

## 17. Playwright E2E results

`npm run test:e2e:isolated` (disposable `reneta_e2e`, not live):

**21 passed** (3.0m), including “submit approve reject routes stay unmounted”.

---

## 18. Production isolation verification

Read-only after tests. Compose not edited. Production not redeployed as a release (uvicorn `--reload` picked up `main.py` factory; health remains `{"status":"healthy"}`).

| Check | Result |
|---|---|
| API database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| Public tables | 83 (`information_schema`; includes `alembic_version`) |
| Live Sample/Gift rows | 0 |
| Live Export rows | 0 |
| Write flags | `no` / `no` |
| Product flags | 14 products, 0 sample, 0 export |
| Orders / invoices | 131 / 5 |
| Workflow POST on live nginx | all **404** |
| `app.state.isolated_workflow` | **False** |

---

## 19. Outstanding approval requirements

Real Product Owner, Operations Owner, and Authorization Policy Owner signatures on A1–C8 and Section E. Until then Gate B stays BLOCKED. This DEV exercise does not replace that.

---

## 20. GO / NO-GO

| Next step | Verdict |
|---|---|
| F.4B.2-DEV (this isolated exercise) | **GO (complete)** |
| Production F.4B.2 (mount on `main:app`) | **NO-GO** |
| Enable live Draft write flags | **NO-GO** |
| Live SKU classification | **NO-GO** |
| Isolated frontend workflow Playwright | Optional next **test-only** phase |
| F.4B.3 / F.4C | **NO-GO** |

**Next required action:** genuine Section E signatures, or a further isolated-only UI harness. Do not start production F.4B.2.
