# Phase F.4B.3-DEV — Isolated frontend Submit / Approve / Reject

Date: 26 November 2026  
Scope: Test-only frontend wired to `isolated_workflow_app:app`. **Not business approved. Not production F.4B.2 / F.4B.3 / F.4C.**

Official policy (`docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md`): A1–C8 **Pending**. Section E **Awaiting approval**. Engineering gate **F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED**. This file does not change those rows.

---

## 1. Files reviewed and modified

Reviewed: F.4B.2-DEV integration report and provisional policy; F.4B.1F / F.4B.1G reports; official F.4 policy; `src/isolated-workflow/`; production `src/App.tsx` / `src/main.tsx`; Sample/Gift and Export pages; `src/lib/api.ts`; `draftCapabilities.ts`; `useDraftCapabilities.ts`; `DraftEditConflict.tsx`; Draft preview pages; `backend/isolated_workflow_app.py`; `backend/app/routers/draft_workflow.py`; `backend/app/services/draft_workflow_execution.py`; isolated E2E runner.

**Added (test-only unless noted)**

| Path | Role |
|---|---|
| `isolated-workflow.html` | Isolated HTML entry |
| `vite.isolated.config.ts` | Isolated Vite; `dist-isolated-workflow`; port 15175 |
| `src/isolated-workflow/main.tsx` | Boot with runtime + health asserts |
| `src/isolated-workflow/App.tsx` | Isolated routes; workflow bar on Detail |
| `src/isolated-workflow/IsolatedHome.tsx` | Test banner and links |
| `src/isolated-workflow/IsolatedWorkflowBar.tsx` | Submit / Approve / Reject + history |
| `src/isolated-workflow/RejectDialog.tsx` | Shared rejection dialog |
| `src/isolated-workflow/workflowApi.ts` | Isolated POST + capability + audit GET |
| `src/isolated-workflow/runtime.ts` | Config and health guards |
| `src/isolated-workflow/errors.ts` | Status mapping; reason trim |
| `src/isolated-workflow/capabilities.ts` | Isolated sanitizer (not production) |
| `src/components/delivery/DraftWorkflowSlot.tsx` | Empty production slot; no isolated imports |
| `e2e/isolated-workflow/*.spec.ts` | Browser + API workflow tests |

**Changed**

| Path | Change |
|---|---|
| Sample/Gift and Export Detail | Render empty `DraftWorkflowSlot` (no buttons unless isolated provider/sibling is used) |
| `package.json` | `dev:isolated-workflow`, `build:isolated-workflow`; default `build` unchanged |
| `playwright.config.ts` | Second project `isolated-workflow` on port 15175 |
| `e2e/run-isolated.sh` | Workflow APIs 18012/18013; isolated Vite 15175 |
| `e2e/draft-modules/global-setup.ts` | Workflow health + isolated HTML checks |
| `e2e/draft-modules/seed_isolated.py` | Foreign manager + billing fixtures |
| `backend/isolated_workflow_app.py` | Refuse `swift_distro_hub`; allow disposable names |
| `backend/tests/test_f4b2_dev_pg_concurrency.py` | Missing docker → skip, not ERROR |
| Production Detail pages | Slot only; no Submit/Approve/Reject copy |

Official approval file: **unchanged**.

---

## 2. Isolated frontend architecture

- Production: `index.html` → `src/main.tsx` → `src/App.tsx`. No isolated-workflow imports. No workflow routes. Slot is empty.
- Isolated: `npm run dev:isolated-workflow` → `isolated-workflow.html` → `src/isolated-workflow/main.tsx`. Reuses Login, lists, forms, detail, preview.
- Isolated Detail routes render `IsolatedWorkflowBar` as a sibling of the existing Detail page (does not depend on a second React context copy).
- Isolated API only: `VITE_API_URL` → workflow FastAPI (`18012` in E2E). JWT is the same disposable secret as the isolated stack.
- Default `npm run build` / `npm run dev` never set `VITE_ISOLATED_WORKFLOW=1`. There is no production UI toggle.

### Isolated API (authoritative; not invented)

| Method | Path | Body |
|---|---|---|
| POST | `/api/sample-gift-deliveries/{id}/submit` | `DraftWorkflowActionRequest` `{ reason?, remarks? }` |
| POST | `/api/sample-gift-deliveries/{id}/approve` | same |
| POST | `/api/sample-gift-deliveries/{id}/reject` | `reason` required (trimmed) |
| POST | `/api/export-deliveries/{id}/submit\|approve\|reject` | same |

Responses: existing Sample/Gift or Export **detail** models (status, items, shipping, totals). Auth: Bearer JWT. Production `main:app` does not mount these paths (HTTP 404).

Capabilities: `GET /api/draft-modules/capabilities?sample_gift_id=` or `export_id=`. Isolated backend may set module + `document.can_submit|can_approve|can_reject`. Production always reports workflow flags false.

---

## 3. Production bundle isolation evidence

`npm run build` (18.08s): 3394 modules. `dist/index.html` loads `/assets/index-D9FPBiic.js` only.

Grep of `dist` JS/HTML/CSS:

| Needle | Result |
|---|---|
| IsolatedWorkflowBar | ABSENT |
| isolated-workflow-banner | ABSENT |
| draft-workflow-submit / approve / reject | ABSENT |
| e2e.admin.f4b1b / E2eIsolatedPass | ABSENT |
| isolated_workflow_app / VITE_ISOLATED_WORKFLOW | ABSENT |

Vitest `productionIsolation.test.ts`: production `App.tsx` / `main.tsx` do not import isolated-workflow or IsolatedWorkflowBar. `DraftWorkflowSlot.tsx` does not import IsolatedWorkflowBar.

Hiding buttons is not the control: the production graph never includes the isolated entry.

---

## 4. Sample/Gift workflow UI

Isolated journey (Playwright, disposable `reneta_e2e`): manager creates Draft with E2E Sample Product → Submit + confirm → server `Submitted` → creator has no Approve → admin Approve → `Approved` and no further actions. Separate document: Reject with mandatory reason; whitespace-only blocked; `Rejected` terminal.

PSO: no Submit/Approve on isolated Detail.

---

## 5. Export workflow UI

Equivalent isolated journey. After Submit, destination Malaysia, shipping line, ports, and line total `41` remain. Approve does not create an invoice or shipping authorization in this phase (no such calls; backend workflow does not touch inventory or billing).

---

## 6. Rejection dialog

Shared `RejectDialog`: required trimmed reason; blank / whitespace blocked locally; Confirm disabled while pending; no duplicate POST while pending; reason kept after failure; dialog closes only after successful POST then reload. No Rejected → Draft control.

---

## 7. Capabilities and permissions

Buttons require **both** module sanitizer (`sanitizeIsolatedWorkflowCapability`) and `document.can_* === true`. Fail closed on missing document block or HTTP error. Production UI continues to use `sanitizeModuleCapability` (workflow flags forced false). PSO, billing, foreign-depot manager: API 403/404 as in F.4B.2-DEV. Creator cannot self-approve (backend 403; UI hides Approve for creator). Draft write flags yes only on isolated API processes.

---

## 8. Status handling

No optimistic status. Reload after confirmed POST. Terminal Approved/Rejected hide Submit/Approve/Reject. Existing read-only details and Draft preview unchanged.

---

## 9. Error and concurrency handling

| Code | UI |
|---|---|
| 401 | Authentication required |
| 403 | Server detail / permission copy |
| 404 | “Not found” (no foreign-depot body) |
| 409 | Conflict message + capability reload |
| 422 | Rejection validation |
| 500 | Could not be saved |
| timeout | Network timeout copy |

No automatic retry. Concurrent second submit: backend idempotent 200 or 409 (Playwright allows both). PG concurrency suite: **passed** with disposable `f4b2_dev`.

---

## 10. Audit visibility

Supported read API: `GET /api/audit-logs/{entity_type}/{entity_id}` with `audit.read`. Entity types used by workflow: `sample_gift_delivery`, `export_delivery`. Isolated bar shows a read-only list when the GET returns an array; HTTP 403 hides history (does not invent actors or dates). Workflow writes are still audited by the isolated backend. A production-facing workflow history page was **not** added.

---

## 11. Synthetic test fixtures

Disposable DB `reneta_e2e` only. Emails: `e2e.admin.f4b1b@example.com`, `e2e.manager.f4b1b@example.com`, `e2e.pso.f4b1b@example.com`, `e2e.foreign.manager.f4b1b@example.com`, `e2e.billing.f4b1b@example.com`. SKUs `E2E-SAMPLE-SKU` / `E2E-EXPORT-SKU`. These are not business owners.

---

## 12. Browser E2E results

`npm run test:e2e:isolated`: **25 passed** (3.5m).

- chromium (existing draft-modules): 21 passed (includes unmounted production workflow 404).
- isolated-workflow: 4 passed (Sample/Gift approve + reject + PSO; Export submit/approve/reject + totals; API foreign 404 / flags-off 403 / billing 403 / production 404 / idempotent resubmit).

Stack: disposable PostgreSQL 16 `reneta_e2e`, `main:app` on 18010/18011, `isolated_workflow_app` on 18012/18013, Vite 15174 + isolated Vite 15175. Cleanup targets only `reneta_e2e_*` / owned PIDs.

---

## 13. Backend regression results

Full pytest in `swift_distro_api` with `F4B2_DEV_DATABASE_URL` → disposable `f4b2_dev`: **162 passed**, 213 warnings, 292.55s. Includes isolated workflow HTTP tests, PG concurrency, RBAC, commercial order lifecycle, stock reservation, billing. Assertions were not weakened. Missing docker in the API container is treated as skip (returncode 127), not ERROR.

---

## 14. Frontend unit test results

`npm run test` (Vitest): **43 passed** (10 files). Includes isolated runtime URL refusal, rejection trim, production sanitizer still forcing workflow false, production source isolation.

---

## 15. Normal production build verification

See §3. Production Create/List/Detail/Edit/Preview remain on `src/App.tsx`. Playwright chromium project (production-like isolated API **without** workflow UI) still exercises those pages.

---

## 16. Live database preservation

Read-only against `swift_distro_postgres` / `swift_distro_hub`. Compose API **not** restarted.

| Check | Value |
|---|---|
| Alembic | `f3_export_draft` |
| public tables | 83 (includes `alembic_version`; 82 application tables as previously counted) |
| sample_gift_deliveries | 0 |
| export_deliveries | 0 |
| products / sample flag / export flag | 14 / 0 / 0 |
| orders | 131 |
| invoices | 5 |
| product_item_stock.stock_qty | 13275.00 |
| details available / reserved | 10635.00 / 2640.00 |
| SAMPLE_GIFT_DRAFT_WRITES | no |
| EXPORT_DRAFT_WRITES | no |
| `main:app` POST `.../submit` | **404** `Not Found` |
| `GET /api/draft-modules/capabilities` unauthenticated | **401** |
| `/health` | `{"status":"healthy"}` (no workflow mount) |

---

## 17. Official approval status

Unchanged. Dummy E2E identities are **not** Product / Operations / Authorization approval. F.4B Gate B remains **BLOCKED**.

---

## 18. Remaining functionality gaps

- Official F.4B.2 (mount workflow on `main:app`) not started.
- Production frontend still has no Submit/Approve/Reject.
- Live Draft writes remain off; live SKUs remain unclassified.
- Workflow history only if `audit.read`; otherwise hidden.
- No Rejected → Draft.
- No F.4C (stock, invoice, dispatch).
- Isolated Vite must keep rewriting production `index.html` on the isolated port (`appType: mpa`).

---

## 19. GO / NO-GO for next phase

**NO-GO** for official F.4B.2, production frontend workflow, live flags, live SKU classification, F.4C, or deploying the isolated frontend.

**GO** only to keep using Option 1 isolated/test mode. F.4B.3-DEV isolated frontend + isolated API is usable in disposable environments. Gate B stays blocked until named owners complete Section E without placeholder tokens.
