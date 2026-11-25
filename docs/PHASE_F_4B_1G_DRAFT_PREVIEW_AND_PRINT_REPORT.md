# Phase F.4B.1G — Sample/Gift and Export Draft Preview and Browser Printing

Date: 25 November 2026  
Status: **Complete.** Persisted Sample/Gift and Export documents can be opened as an internal read-only Draft preview and sent to the browser print dialog. Every view is marked **DRAFT — NOT FOR DISPATCH**. Live Compose write flags remain `no`. Submit/Approve/Reject stay unmounted. This preview is not an official challan, invoice, dispatch slip, or shipping document.

---

## 1. Files reviewed and modified

**Reviewed:** F.4B.1F / 1E / 1D reports; `PHASE_F_4_BUSINESS_APPROVAL_VERIFICATION_REPORT.md`; Sample/Gift and Export detail pages; GET response schemas; `PickingOrderPrint.tsx` (`window.print`, `print:hidden`); `AppBrand` / `/renata-logo.png`; depot GET 404; no Draft PDF library in this app.

**Added**

| File | Role |
|---|---|
| `src/lib/draftPrint.ts` | Mapping, date/decimal format, watermark constants |
| `src/lib/draftPrint.test.ts` | Sample/Gift/Export mapping tests |
| `src/pages/delivery/DraftPrintDocument.tsx` | Shared read-only print sheet |
| `src/pages/delivery/DraftPreviewPage.tsx` | Load/error/print chrome |
| `src/pages/delivery/SampleGiftDraftPreview.tsx` | GET Sample/Gift detail → preview |
| `src/pages/delivery/ExportDraftPreview.tsx` | GET Export detail → preview |
| `e2e/draft-modules/preview.spec.ts` | Isolated Sample/Gift/Export preview E2E |

**Modified**

| File | Change |
|---|---|
| `src/App.tsx` | `/:id/preview` before `/:id` |
| `SampleGiftDeliveryDetail.tsx` / `ExportDeliveryDetail.tsx` | **Preview Draft**; removed disabled Print on items card |
| `src/index.css` | A4 `@page`, hide chrome, row `break-inside: avoid`, watermark |
| `MainLayout.tsx` | `print:hidden` decorative layer; print padding |
| `sample-gift.spec.ts` / `export.spec.ts` | Detail expects Preview Draft |

**Not changed:** Alembic; Compose flags; POST/PUT; capability API; workflow mounts; F.4A; list Print remains disabled (preview is from Detail). No new backend endpoint.

---

## 2. Preview architecture

Frontend-only. Existing authenticated GET `/api/sample-gift-deliveries/{id}` and `/api/export-deliveries/{id}` supply the payload. Mapping is pure. Print is `window.print()` after a successful map. Create/Edit forms do not offer preview of unsaved state.

Routes: `/delivery/sample-gift/:id/preview`, `/delivery/export/:id/preview`.

---

## 3. Shared print components

- `DraftPrintDocument`: brand (logo optional; hidden on error), banner, title, field grid, item table, totals, disclaimer, watermark.
- `DraftPreviewPage`: loading, Retry on GET failure, **Print Draft** only when a view exists, **Back to Detail**.
- CSS: A4 12mm, hide `header` / `[data-sidebar]` / `.draft-print-actions`, repeating `thead`, avoid splitting item rows.

No jsPDF / reportlab dependency.

---

## 4. Sample preview implementation

Title **Sample Delivery Draft**. Fields from GET: number, kind, status, date, recipient, type, phone, email, address, gift type, occasion, depot ID (no invented depot name), remarks, product name/id, quantity, line gift type. No money columns.

---

## 5. Gift preview implementation

Same mapper; `document_kind=gift` → **Gift Delivery Draft**. Same watermark. No `product_type_gift` column.

---

## 6. Export preview implementation

Title **Export Delivery Draft**. Destination country, ports, shipping line, container, B/L, L/C, invoice **reference**, incoterms, payment terms, depot ID, remarks, product, qty, unit price, line total, server `total_value`. No currency symbol. No consignee field (API has none). Disclaimer: not a commercial invoice, shipping authorization, or customs document.

---

## 7. Printing behavior

**Print Draft** calls `window.print()` only if mapping succeeded. Native browser dialog; not a signed PDF. Playwright stubs `window.print` and checks print-media CSS (`display` of the banner is not `none`; action bar is `none`). OS printer output was **not** validated. `page.pdf()` text extraction was **not** claimed.

---

## 8. Draft watermark and safety restrictions

`DRAFT — NOT FOR DISPATCH` is on the banner and watermark for every preview, independent of status, role, or capabilities. No signature or approval block. Print does not POST, reserve stock, or change status.

---

## 9. Navigation and authentication

Detail **Preview Draft** is a GET of a persisted id. Edit gating unchanged. Unauthenticated preview → login. Foreign depot GET → 404; no Print Draft. JWT and depot scope are the existing read path.

---

## 10. Error handling

| Case | UI |
|---|---|
| Loading | Spinner; no print |
| Network / 5xx / 503 | Error + Retry; no blank success print |
| 401 | Existing API redirect to login |
| 403 | Permission message; no print |
| 404 | Not found; no print |
| Missing optionals | Em dash |
| Empty lines | “No line items on this document.” |
| Missing logo | Image omitted |

---

## 11. Frontend unit tests

`npm test`: **37 passed** (7 files). `draftPrint.test.ts` (8): Sample, Gift, Export, missing fields, decimals/dates, 40-line list, no official labels, no source mutation.

---

## 12. Playwright results

`npm run test:e2e:isolated` — disposable `reneta_e2e`.

**21 passed** (~2.6m) on the clean run used for this report.

Preview spec: Sample/Gift/Export content, watermark, stubbed print, print CSS, Back to Detail, status still Draft after preview, unauthenticated login, foreign depot no print. Create/edit/capability/unsaved still pass. List Print remains disabled.

One earlier suite run had a blank-page timeout on Export edit login (unrelated flake); the following full isolated run was 21/21.

---

## 13. Backend regression results

`pytest /app/tests -p no:cacheprovider`: **146 passed**, 204 warnings, 93.12s. SQLite. Draft CRUD, PUT lock, capabilities, orders, reservation, billing. Not `swift_distro_hub`.

---

## 14. Frontend production build

`npm run build`: **success**.

---

## 15. Live database preservation

Read-only after E2E cleanup. No live PUT, no migration, no Compose edit, no production restart.

| Check | Result |
|---|---|
| Alembic | `f3_export_draft` |
| Application tables | **82** |
| Sample/Gift / Export rows | **0 / 0** |
| Products / sample / export flags | **14 / 0 / 0** |
| Orders / invoices | **131 / 5** |
| `stock_qty` | **13275.00** |
| Available / reserved | **10635.00 / 2640.00** |
| Live API database | `swift_distro_hub` |
| Write flags | False / False |
| `/health` | healthy |
| E2E containers | none |

---

## 16. Business approval status

All **20** F.4 decisions remain **Pending**. Gate B blocked. Internal Draft preview is **not** operational approval, official documentation, or write-flag activation.

---

## 17. Remaining limitations

- Browser print is not a digitally signed PDF.
- Repeating headers depend on the browser’s print engine.
- List-row Print is still disabled (preview is from Detail).
- Depot name is not on GET; preview shows Depot ID only.
- Export has no consignee field.
- Workflow and F.4A eligibility still unwired.

---

## 18. GO / NO-GO for the next phase

| Gate | Verdict |
|---|---|
| F.4B.1G | **GO — complete** |
| F.4B.2 | **NO-GO** — policy unsigned |
| F.4C / F.4D | **NO-GO** |

Keep live Draft writes off. Do not treat this preview as an authorized dispatch or invoice.
