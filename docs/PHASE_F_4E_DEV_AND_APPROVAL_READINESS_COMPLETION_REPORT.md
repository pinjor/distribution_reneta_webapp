# Combined F.4E-DEV Gate A and F.4B/F.4C/F.4D Approval Readiness — Completion Report

**Status: COMPLETE FOR ISOLATED DEVELOPMENT AND APPROVAL REVIEW — NOT PRODUCTION AUTHORIZED**

Date: 26 November 2026  
Option 1 (Development/Test Mode) only. Dummy identities are not owners. This Cursor task is not policy approval.

Official F.4 file remains unsigned. **53/53 policy rows remain Pending.** F.4B Gate B remains **BLOCKED**. F.4C-DEV Gate C remains skipped. Production F.4C / F.4D / official F.4E remain **NO-GO**. Phase G was not started.

Companion files:

1. `docs/PHASE_F_4E_DEV_GATE_A_DOCUMENT_TEMPLATES_AND_ISOLATED_INTEGRATION_REPORT.md`
2. `docs/PHASE_F_4E_WAREHOUSE_DOCUMENT_CATALOG.md`
3. `docs/PHASE_F_4B_4C_4D_CONSOLIDATED_APPROVAL_PACKET.md`
4. This report

---

## 1. F.4E implementation status

**Implemented and testable** under `isolated-workflow.html` / `src/isolated-workflow/` only.

| Document | Isolated route | Eligibility (fulfillment status) |
|---|---|---|
| Warehouse Pick List | `/delivery/{sample-gift\|export}/:id/warehouse/pick-list` | `PICKING` or later |
| Picking Confirmation Sheet | `.../pick-confirm` | `PICKED` or later |
| Stock Issue Slip | `.../issue-slip` | `ISSUED` or later |
| Dispatch Note / Delivery Challan | `.../dispatch-note` | `DISPATCHED` or later |
| Delivery Confirmation | `.../delivery-confirm` | `DELIVERED` only |
| Failed Delivery Summary | `.../delivery-confirm` | `FAILED_DELIVERY` (not shown as delivered) |

Batch lines come from isolated reservation slices only. Preview/print are GET-only. Watermark `PROVISIONAL — TEST DOCUMENT — NOT FOR DISPATCH` cannot be removed in the isolated UI.

Not done (by design): production `App.tsx` import, production fulfillment/reservation mounts, official numbering, signatures, POD images, PDF library, F.4C-DEV Gate C reservation UI.

---

## 2. Template and print testing

Executed:

- Vitest `warehouseDocuments.test.ts`: **13 passed** (Sample/Gift/Export pick lists, picking confirmation discrepancy, expired/null expiry, issue/dispatch/delivery/failed-delivery, empty optionals, malformed payload, watermark/official-claim checker).
- Playwright `e2e/isolated-workflow/warehouse-documents.spec.ts`: **passed** (provisional pick list, reserved batch `SG-EARLY`, issue slip gated until issue, delivery confirmation, production has no warehouse document route).
- Print CSS reuses existing A4 `@page`, hides chrome via `.draft-print-actions`, keeps the watermark in the same DOM used for screen and `window.print()`. No new PDF dependency.

---

## 3. API and frontend isolation

- Isolated GET only: fulfillment, reservations, history, source document.
- JWT + depot isolation unchanged (PSO 403, foreign depot 404).
- Production `src/App.tsx` does not import `isolated-workflow`.
- `dist/` grep after `npm run build`: no `PROVISIONAL — TEST DOCUMENT`, `WarehousePrintDocument`, `warehouseDocuments`, or `isolated-fulfillment`.
- Live production API (`swift_distro_api` `main:app`): isolated fulfillment GET **404**, isolated reservation GET **404**, submit/approve **404**.
- F.4C-DEV Gate C was not reintroduced.

Flake fix (draft-module Vite, not production): Playwright writing `playwright-report/` previously triggered Vite HMR and timed out on `#login-email`. `vite.config.ts` now ignores that directory; `e2e/run-isolated.sh` sets `VITE_DISABLE_HMR=1` for the flags-on Draft Vite.

---

## 4. Backend regression results

`pytest /app/tests` in `swift_distro_api` (disposable F.4B2/F.4C URLs; live `swift_distro_hub` not the test target):

**233 passed**, 222 warnings, ~186s. No assertions weakened. No live Alembic. No live inventory writes.

---

## 5. Frontend regression results

`npx vitest run`: **56 passed** (11 files). Includes existing Draft UI tests plus isolated warehouse mapping and production-isolation import check.

`npm run build` (normal production frontend): **successful** (3394 modules). Isolated templates are not in that bundle.

---

## 6. Playwright results

`npm run test:e2e:isolated` after the HMR ignore:

**28 passed** (3.4m), 1 worker. Disposable `reneta_e2e` only.

An intermediate combined-task run recorded **17 failed / 11 passed** when Vite reloaded the Draft login page; that is not the final result. Final executed result is **28 passed**.

---

## 7. All 53 policy statuses

| Group | Count | Actual status |
|---|---|---|
| A1–A6 | 6 | **Pending** |
| B1–B6 | 6 | **Pending** |
| C1–C8 | 8 | **Pending** |
| W1–W15 | 15 | **Pending** |
| D1–D18 | 18 | **Pending** |
| **Total** | **53** | **53 Pending, 0 Approved, 0 Rejected, 0 Request changes** |

Source rows were copied, not rewritten. Proposed defaults remain test assumptions in isolated code only.

---

## 8. Actual approvals found

**None** for A1–C8, W1–W15, or D1–D18.

Evidence search (packet §1) found no named Product Owner, Authorization Policy Owner, Operations Owner, Warehouse Owner, QA, Finance, Transport, or DBA signature, date, or scoped Approve/Reject/Request changes on these 53 IDs.

Out of scope (not applied to this packet):

- D.5 Alembic stamp `d4_baseline`
- F.3.2 live Alembic `f3_export_draft`

Synthetic emails, Cursor prompts, and passing tests were **not** treated as owner evidence.

---

## 9. Missing approvals

Every owner field in packet §7 is **Pending — not on file**. Outstanding human work:

- Product Owner: A1–A6, C7, D16
- Authorization Policy Owner: B1–B6, D2, D7, D18
- Operations Owner: C1–C8 and the W/D rows listed in the packet
- Warehouse Owner: W1–W15 and listed D rows
- QA: W3, D6
- Finance: W14, D14, D16
- Transport: D10
- DBA: W15

Until those exist in the three source registers **and** the consolidated packet, F.4B Gate B stays **BLOCKED**.

---

## 10. Production safety verification

Read-only after this task (Compose API not restarted, no live migration):

| Check | Value |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| public tables | **83** (unchanged) |
| isolated iso tables on live | **0** |
| Sample/Gift / Export rows | **0 / 0** |
| products / sample flag / export flag | **14 / 0 / 0** |
| orders / invoices | **131 / 5** |
| PISD qty / available / reserved | **13275 / 10635 / 2640** |
| PIS `stock_qty` | **13275** |
| ledger `available_quantity` | **13000** |
| `SAMPLE_GIFT_DRAFT_WRITES` / `EXPORT_DRAFT_WRITES` | **no / no** |
| live isolated fulfillment GET | **404** |
| live isolated reservation GET | **404** |
| live submit / approve | **404** |
| `/health` (`swift_distro_api`) | `healthy` |
| production frontend bundle | isolated document strings **absent** |

Live operational notes (not decisions): expired commercial FEFO can still allocate; transfer may move reserved units; commercial `commit_for_order` does not deduct PISD on-hand; ledger vs PISD gap remains **2365**.

---

## 11. Outstanding technical risks

- Isolated APIs do not carry assigned picker names, draft-line SKUs, or display names (documents show —).
- Browser print only; no dedicated PDF engine.
- Warehouse documents open from the isolated detail bar/hub, not a reservation workstation (Gate C skipped).
- Commercial picking orders and invoices remain a parallel document family.
- Draft-Vite HMR vs Playwright report writes is now mitigated; keep `VITE_DISABLE_HMR=1` on isolated e2e.
- Parallel PISD / PIS / ledger stores still lack a signed reconciliation policy (W14).

---

## 12. Recommended next phase

**Human review of** `docs/PHASE_F_4B_4C_4D_CONSOLIDATED_APPROVAL_PACKET.md` **using the sign-off instructions in packet §8.** Named owners record Approve / Reject / Request changes with real names and dates. Do not ask Cursor to sign.

Do **not** start:

- production workflow, reservation, or fulfillment mounts
- live Draft write-flag activation
- official (non-provisional) F.4E documents
- F.4C-DEV Gate C unless separately ordered
- Phase G deployment

If isolated engineering continues before signatures, keep Option 1 fixtures and the provisional watermark. Even a later fully signed packet still needs a separate engineering order before any production mount.

---

## Scope integrity checklist

| Requirement | Result |
|---|---|
| F.4E-DEV Gate A implemented and testable | **Yes** (isolated only) |
| Official F.4B approvals not fabricated | **Yes** (53 Pending) |
| W1–W15 recorded accurately | **Yes** (Pending + operational notes) |
| D1–D18 recorded accurately | **Yes** (Pending) |
| Business blockers explicit | **Yes** (Gate B BLOCKED; C/D/E production NO-GO) |
| F.4C-DEV Gate C remains skipped | **Yes** |
| Production F.4C/F.4D/F.4E disabled | **Yes** (404 / no bundle import) |
