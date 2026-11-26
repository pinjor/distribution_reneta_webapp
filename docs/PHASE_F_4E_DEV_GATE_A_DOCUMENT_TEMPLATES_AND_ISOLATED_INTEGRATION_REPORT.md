# F.4E-DEV Gate A — Isolated Warehouse Document Templates and Integration Report

**Status: PROVISIONAL / TEST-ONLY — NOT BUSINESS APPROVED**

Date: 26 November 2026  
Official F.4 file remains unsigned. A1–C8, W1–W15 and D1–D18 remain **Pending**. F.4B Gate B remains **BLOCKED**. F.4C-DEV Gate C remains skipped.

Option 1 isolated development only. Dummy identities are not owners. This report does not authorize production challans, live stock, official document numbering, F.4E deployment or Phase G.

---

## 1. Files reviewed and changed

Reviewed: F.4B.1G draft preview/print; F.4C Gate B and F.4D Gate A/B reports; `draftPrint.ts`; `DraftPrintDocument.tsx`; `DraftPreviewPage.tsx`; Sample/Gift and Export preview pages; `PickingOrderPrint.tsx` (commercial loading challan — not reused for batch reservation); invoice report (commercial); `index.css` print rules; isolated workflow App, bar, APIs; fulfillment/reservation response schemas.

Changed (isolated frontend + docs only):

| Path | Role |
|---|---|
| `src/isolated-workflow/warehouseDocuments.ts` | Mapping, watermark, state gates |
| `src/isolated-workflow/warehouseApi.ts` | Isolated GET helpers (JWT) |
| `src/isolated-workflow/WarehousePrintDocument.tsx` | A4 sheet reuse |
| `src/isolated-workflow/WarehouseDocumentPreview.tsx` | Hub + print preview |
| `src/isolated-workflow/App.tsx` | Isolated routes only |
| `src/isolated-workflow/IsolatedWorkflowBar.tsx` | Isolated “Warehouse documents” link |
| `src/isolated-workflow/IsolatedHome.tsx` | Test-document notice |
| `src/isolated-workflow/warehouseDocuments.test.ts` | Vitest mapping/state |
| `src/isolated-workflow/productionIsolation.test.ts` | Production App must not import templates |
| `e2e/isolated-workflow/warehouse-documents.spec.ts` | Isolated Playwright |
| `vite.config.ts` | Ignore Playwright report dirs in the Vite watcher |
| `e2e/run-isolated.sh` | Disable HMR on the flags-on Draft Vite so report writes cannot reload `/login` |
| `docs/PHASE_F_4E_WAREHOUSE_DOCUMENT_CATALOG.md` | Document inventory |
| This report | Gate A deliverable |

No backend routers, Alembic, Compose or production `App.tsx` changes. Production `src/App.tsx` is unchanged.

---

## 2. Existing document architecture

Draft Sample/Gift and Export already share `DraftPrintView` + `DraftPrintDocument` + `window.print()` + A4 `@media print` (hide chrome, keep `.draft-print-sheet`). Watermark is `DRAFT — NOT FOR DISPATCH`.

Commercial `PickingOrderPrint` auto-prints a loading-challan report (memo/cash/dues) and is not batch-reservation data. Invoice PDF is a commercial report. Those were **not** wired to synthetic fulfillment.

---

## 3. Reused templates/components

Reused: RENATA logo block, A4 max-width sheet, field definition list, bordered tables, `draft-print-sheet` / `draft-print-actions` / `draft-print-row` print CSS, `formatDraftDate` / `formatDraftDecimal` / `displayDraftText`, PageHeader print button pattern.

New mapping lives only under `src/isolated-workflow/` so the production bundle does not import it.

---

## 4. Pick List implementation

Title: Warehouse Pick List. Shown from `PICKING` onward. Lines = fulfillment pick slices whose `lot_id` exists on the matching reservation. Extra unreserved lots are dropped. Columns: product, id, SKU (— if the source item has no sku), batch, expiry (including expired dates; null → —), reserved, requested pick, picked. Assigned picker is — (not on the API).

---

## 5. Picking Confirmation Sheet

Same batch table after `PICKED`. Includes `CONFIRM_PICK` timestamp when present in isolated history. A discrepancy column is shown; it is **—** when reserved equals picked (current fail-closed policy does not persist short picks).

---

## 6. Stock Issue Slip

Rendered only when status is `ISSUED` or later. Issue reference is the fulfillment id (no separate issue number exists). Issued qty and `ISSUE` actor/time come from the server. Printing does not call issue.

---

## 7. Dispatch Note / Challan

Rendered from `DISPATCHED`. Shows `dispatch_id`, optional `transport_ref`, dispatch actor/time, batches. Sample/Gift recipient fields; Export destination/ports/shipping line/container/B/L from the source document. No invoice generation.

---

## 8. Delivery Confirmation

`DELIVERED` uses title Delivery Confirmation with receiver, delivered qty, optional POD text. `FAILED_DELIVERY` uses title **Failed Delivery Summary**, banner “Failed delivery — not delivered”, reason required from API, receiver/POD/delivered qty shown as —. No signature or POD image.

---

## 9. Sample/Gift support

`document_kind` sample vs gift from the source document. Recipient name/type preserved. Isolated routes under `/delivery/sample-gift/:id/warehouse/...`.

---

## 10. Export support

Source export logistics fields only. Isolated routes under `/delivery/export/:id/warehouse/...`. No customs clearance.

---

## 11. Test watermark handling

Constant `PROVISIONAL — TEST DOCUMENT — NOT FOR DISPATCH` on the sheet overlay, the banner, the page subtitle, and print (same DOM). No hide flag.

---

## 12. Print styling

Existing A4 `@page`, hide `header` / sidebar / `.draft-print-actions`, `break-inside: avoid` on rows, `print-color-adjust: exact`. Print is explicit button only.

---

## 13. API integration

Read-only:

- `GET /isolated-fulfillment/{sample-gift|export}-deliveries/{id}/fulfillment`
- `GET /isolated-inventory/.../reservations`
- `GET /isolated-fulfillment/{id}/history`
- existing document GET

No extra mutating endpoints. 401/403/404 surface as authentication, permission or Not found.

---

## 14. Role and depot security

Backend remains authoritative. PSO **403** on fulfillment GET. Foreign depot **404**. Isolated preview uses the same JWT. Hub/preview show “Not found” rather than foreign batch lists.

---

## 15. State validation

Unavailable copy is shown (empty line table) when the fulfillment status is earlier than the document type requires. Issue/dispatch/delivery cannot claim a later state than the server.

---

## 16. Backend test results

`pytest /app/tests` in `swift_distro_api` with disposable F.4B2/F.4C URLs: **233 passed**, 222 warnings, 186.92s. No backend tests removed.

---

## 17. Frontend test results

Vitest: **56 passed** (11 files). Prior 43 plus 13 warehouse mapping/state tests (Sample/Gift/Export pick lists, picking confirmation discrepancy, expired/null expiry, issue/dispatch/delivery/failed-delivery, empty optionals, malformed payload, watermark). `productionIsolation.test.ts` still asserts production `App.tsx` does not import isolated-workflow templates.

---

## 18. Playwright results

`npm run test:e2e:isolated`: **28 passed** (3.4m) after disabling Draft-Vite HMR and ignoring `playwright-report/` in `vite.config.ts`. An earlier combined-task run failed 17 draft-module tests because Vite reloaded `/login` when Playwright wrote `playwright-report/` (timeout on `#login-email`). Isolated-workflow warehouse spec remains included. Covers pick list watermark and reserved batch `SG-EARLY`, issue slip blocked before issue then available after, delivery confirmation, PSO 403, foreign 404, production fulfillment GET 404.

---

## 19. Production build isolation

`npm run build`: **successful** (16.58s, 3394 modules). `dist/` has no `PROVISIONAL — TEST DOCUMENT`, `WarehousePrintDocument`, `warehouseDocuments`, or `isolated-fulfillment`. Production `App.tsx` still does not import `isolated-workflow`.

---

## 20. Live-data preservation

Read-only, Compose API not restarted:

| Check | Value |
|---|---|
| Database | `swift_distro_hub` |
| Alembic | `f3_export_draft` |
| public tables | 83 |
| f4c/f4d/f4e iso tables | 0 |
| Sample/Gift / Export | 0 / 0 |
| products / flags | 14 / 0 / 0 |
| orders / invoices | 131 / 5 |
| PISD qty / avail / reserved | 13275 / 10635 / 2640 |
| PIS / ledger avail | 13275 / 13000 |
| Draft flags | no / no |
| live fulfillment / reserve / submit | **404** |
| `/health` | healthy |

---

## 21. Remaining integration gaps

- No assigned picker, SKU on draft items, or actor display names on isolated APIs (shown as —).
- No PDF library; browser print only.
- Reservation frontend (F.4C-DEV Gate C) still skipped; documents are opened from the isolated detail bar / hub, not a new reserve UI.
- Commercial picking_orders / invoices remain separate systems.
- Official numbering, signatures, POD images and production mounts are unsigned.

---

## 22. Outstanding business approvals

- F.4 A1–C8 **Pending**
- F.4B Gate B **BLOCKED**
- W1–W15 **Pending**
- D1–D18 **Pending**

---

## 23. GO / NO-GO recommendation

**GO for continued Option 1 isolated document work.** Isolated A4 pick list, pick confirmation, issue slip, dispatch note and delivery/failed-delivery summaries render from real isolated GET state with a fixed provisional watermark.

**NO-GO for official F.4E production documents, live dispatch, invoice generation, production frontend buttons, F.4C Gate C, and Phase G.**
