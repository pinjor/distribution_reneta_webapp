# F.4B.2-DEV — Provisional workflow policy (NOT BUSINESS APPROVED)

**Status:** TEST ENVIRONMENT ONLY  
**Date:** 26 November 2026  
**Official policy file:** `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` remains **unsigned**. A1–C8 remain **Pending**. Section E remains **Awaiting approval**.

This note describes **test assumptions** used by the isolated FastAPI entrypoint `isolated_workflow_app:app`. It is **not** Product Owner, Operations Owner, or Authorization Policy Owner approval. Do not copy synthetic names into Section E.

---

## NOT BUSINESS APPROVED

- The official F.4 package is still Proposed — Awaiting Approval.
- `F.4B Gate B` remains **BLOCKED — BUSINESS APPROVAL REQUIRED**.
- This development exercise does **not** authorize production F.4B.2, official F.4B.3, or F.4C.
- F.4B.3-DEV adds an isolated Vite entry (`vite.isolated.config.ts`, `isolated-workflow.html`) pointed only at `isolated_workflow_app`. Production `npm run build` / `src/main.tsx` / `src/App.tsx` stay without Submit/Approve/Reject.
- Isolated Vite uses `appType: mpa` and rewrites `/` and `/index.html` to `isolated-workflow.html`. Vite’s default SPA fallback to production `index.html` is not allowed on the isolated port.
- Isolated frontend boot requires `VITE_ISOLATED_WORKFLOW=1`, refuses production-looking API hosts (`:9080`, `:80`, `:8088`, `swift_distro_hub`), and requires `/health.isolated_workflow === true`.

## TEST ENVIRONMENT ONLY

- Entrypoint: `backend/isolated_workflow_app.py` (`create_api_app(isolated_workflow=True)`).
- Production: `backend/main.py` (`create_api_app(isolated_workflow=False)`). Compose still runs `uvicorn main:app`.
- Disposable PostgreSQL used for concurrency: database name prefix `f4b2` (example `f4b2_dev`). Never `swift_distro_hub`.
- Isolated pytest SQLite TestClient for HTTP contracts.
- There is **no** environment variable that mounts provisional routes on the production app.

---

## Proposed rules used in testing (unsigned)

Copied from the official proposal. Decisions on that file stay Pending.

**A — eligibility**

- Sample: active + `product_type_sample=true`
- Gift: same Sample flag
- Export: active + `product_type_export=true`
- Independent flags may coexist
- Enforce on isolated create, update, and submit
- Do not auto-flag live SKUs

**B — authorization**

- Admin/Manager create/update when the Draft write flag is on
- Admin/Manager submit, approve, reject
- PSO/`user`, billing, finance, transport: no these writes
- Creator cannot approve their own document
- Foreign depot: HTTP 404

**C — workflow**

```
Draft ──submit──► Submitted ──approve──► Approved
                      └──reject──► Rejected (terminal)
```

- Rejection reason required
- Invalid transition HTTP 409
- Audit once; idempotent retry
- Sample/Gift and Export share the machine
- No stock or billing on status change

---

## Synthetic test identities

These accounts exist **only** in disposable test databases. They are **not** business owners.

| Email | Test role |
|---|---|
| `test.product.owner@example.com` | synthetic fixture (admin) |
| `test.operations.owner@example.com` | synthetic fixture (manager approver) |
| `test.authorization.owner@example.com` | synthetic fixture (admin) |
| `test.creator.manager@example.com` | creator (must not self-approve) |
| `test.pso.user@example.com` | PSO denial |
| `test.billing.user@example.com` | billing denial |
| `test.foreign.manager@example.com` | foreign-depot 404 |
| `e2e.foreign.manager.f4b1b@example.com` | disposable E2E foreign manager (404) |
| `e2e.billing.f4b1b@example.com` | disposable E2E billing role |

---

## Outstanding real approvals

| Owner | Status |
|---|---|
| Product Owner (A1–A6) | **Outstanding** |
| Operations Owner (C1–C8) | **Outstanding** |
| Authorization Policy Owner (B1–B6) | **Outstanding** |

---

## Production activation restrictions

Still forbidden without a later named decision:

- `SAMPLE_GIFT_DRAFT_WRITES=yes` / `EXPORT_DRAFT_WRITES=yes` on live Compose
- Live SKU classification
- Mounting workflow routes on `main:app`
- Wiring eligibility on the production request path as policy (production still existence-only)
- Inventory reserve/deduct/issue, invoices, dispatch, live migrations, F.4C
