# Phase F.4B.1D — Sample/Gift and Export Draft Edit UI Integration

Date: 25 November 2026  
Status: **Complete.** Draft documents can be opened, edited, and saved through the existing PUT APIs. Live Compose write flags remain `no`. Submit/Approve/Reject stay unmounted. F.4B.2 and F.4C were not started.

---

## 1. Files reviewed and modified

**Reviewed:** F.4B.1C / 1B / 1A reports; `PHASE_F_4_BUSINESS_APPROVAL_VERIFICATION_REPORT.md`; Sample/Gift and Export list/form/detail pages; `api.ts`; PUT handlers and Pydantic create/update schemas; `AuthContext`; `App.tsx` routes; sidebar (`/delivery/sample-gift`, `/delivery/export` unchanged).

**Modified**

| File | Change |
|---|---|
| `SampleGiftDeliveryForm.tsx` | Create and edit mode; GET prepopulation; line quantity; PUT save; 409 conflict panel |
| `ExportDeliveryForm.tsx` | Same for Export shipping fields, qty, unit price, PUT |
| `SampleGiftDeliveryDetail.tsx` / `ExportDeliveryDetail.tsx` | Edit button for admin/manager Draft only |
| `App.tsx` | `/:id/edit` routes before `/:id` |
| `src/lib/draftDocumentUi.ts` | Role/status helper, date/decimal, 409 detection, error formatting |
| `src/lib/draftDocumentUi.test.ts` | Unit tests |
| `src/pages/delivery/DraftEditConflict.tsx` | Reload / Back to Detail; no auto-retry |
| `src/lib/api.ts` | 403 errors carry `status` (message unchanged) |
| `e2e/draft-modules/edit.spec.ts` | Isolated edit, cancel, PSO, 404, 409 |
| `e2e/draft-modules/helpers.ts` | Logout, export Submitted marker, login if already authenticated |
| `e2e/draft-modules/auth.spec.ts` | Clear storage before unauthenticated check |
| `e2e/draft-modules/sample-gift.spec.ts` | Retry abort registered off the list URL |
| `e2e/draft-modules/mark_submitted.py` | Optional table name for Export |

**Not changed:** Alembic; Compose flags; workflow mounts; F.4A eligibility wiring; live SKU flags; RBAC codes; billing; stock.

---

## 2. Existing Create/List/Detail architecture

Create posts to `/sample-gift-deliveries` or `/export-deliveries` and returns to the list. List View opens `/:id`. Detail is read-only. PUT already existed (`SampleGiftDeliveryUpdate` / `ExportDeliveryCreate` shape, Draft only, `SELECT FOR UPDATE`, 409 if status is not Draft). This phase reuses those contracts.

---

## 3. Sample/Gift Edit implementation

- Detail **Edit** → `/delivery/sample-gift/:id/edit`.
- GET by id; fields include delivery number, kind, date, recipient, type, phone, email, address, gift type, occasion, remarks, lines.
- Kind remains editable because PUT accepts `document_kind` (`sample` \| `gift`).
- Lines: add, change quantity, remove. At least one line required.
- Save uses PUT; success toast only after 200; navigate to detail.
- Cancel returns to detail without PUT.
- Non-Draft or PSO: blocked copy, Save disabled.
- `depot_id` on PUT is the document depot, not a guessed depot.

---

## 4. Export Edit implementation

- Detail **Edit** → `/delivery/export/:id/edit`.
- Prepopulates destination, ports, shipping line, container, B/L, invoice reference, L/C, incoterms, payment terms, remarks, product lines with quantity and unit price.
- Line qty/price are editable; client-side qty &gt; 0 and unit price ≥ 0; server totals on GET after save (E2E: 4 × 10.25 → 41, then 2 × 12.50 → 25).
- No commercial invoice posting.

---

## 5. Routing and navigation

| Path | Page |
|---|---|
| `/delivery/sample-gift/:id/edit` | Sample/Gift form (edit) |
| `/delivery/export/:id/edit` | Export form (edit) |

Registered **before** `/:id`. Detail → Edit, Save → Detail, Cancel → Detail, direct `/edit`, Back. Missing id: load error + Retry. Foreign depot GET 404 (`Not found`). Sidebar paths unchanged.

---

## 6. Data prepopulation verification

Isolated E2E: Sample/Gift recipient, remarks, quantity 3; Export country, ports, qty 4, unit price 10.25. After save, GET matches the form.

---

## 7. Product line editing behavior

Picker still filters `product_type_sample` / `product_type_export`. Add uses the same validation as create. Table inputs update qty (and Export unit price). Remove uses the existing trash control. Empty lines cannot save.

---

## 8. API PUT integration

`apiEndpoints.sampleGiftDeliveries.update` / `exportDeliveries.update`. Payload field names match create/update schemas (`recipient_name`, `destination_country`, `port_of_loading`, `unit_price`, …). Duplicate number still 409 from the backend, distinct from the non-Draft 409.

---

## 9. Role and feature-flag enforcement

| Actor | UI | Server |
|---|---|---|
| Admin/Manager + Draft | Edit shown | PUT allowed only if module write flag is on |
| PSO / `user` | Edit hidden; `/edit` blocked | PUT 403 (`require_role`) |
| Foreign depot | GET 404 | `hide_foreign_depot` |
| Non-Draft | No Edit; `/edit` blocked | PUT 409 |

**Flag limitation:** the frontend has no endpoint that reports `SAMPLE_GIFT_DRAFT_WRITES` / `EXPORT_DRAFT_WRITES`. It does **not** invent a client flag. Admin/Manager still see Edit on Draft; a live environment with flags `no` gets 403 on Save (`You do not have permission to save`). Isolated E2E APIs set flags in container env only.

---

## 10. HTTP 409 handling

If detail is `Only Draft documents can be updated`:

- No success toast for “updated”.
- `draft-conflict` panel with the backend sentence and “no longer editable”.
- Reload and Back to Detail.
- Save disabled; PUT is not retried.

Duplicate-number 409 is a normal error toast, not this panel.

---

## 11. Validation and error handling

Client: required fields, qty &gt; 0, Export unit price ≥ 0, ≥1 line. Server 400/422/500 surface `formatApiError`. 401 still clears tokens and sends login. 403 Save toast. 404 load error + Retry. Loading spinner on GET. Saving spinner; `if (saving) return` plus disabled button. No `beforeunload` prompt (none exists elsewhere). Cancel does not PUT.

F.4A eligibility helper is **not** wired into live routers.

---

## 12. Browser E2E results

`npm run test:e2e:isolated` (disposable `reneta_e2e`, retries 0):

**13 passed** in 1.5m.

Includes prior 11 cases plus:

- Sample/Gift: create via API, Detail → Edit, populate, change recipient/qty, PUT 200, GET, Cancel discard, PSO no Edit, 409 after isolated `Submitted`.
- Export: populate shipping/lines, change destination/port/qty/price, server total 25, invalid qty 0, `/edit` 404, 409.

---

## 13. Backend regression tests

`docker exec … pytest /app/tests -p no:cacheprovider`

**141 passed**, 199 warnings, 125.60s. SQLite. Draft CRUD, PUT lock, eligibility helper (isolated tests), transitions, RBAC/depot, orders, reservation, billing. Assertions not weakened. Not `swift_distro_hub`.

---

## 14. Frontend tests and build

| Command | Result |
|---|---|
| `npm test` | **13 passed** (3 files; +3 `draftDocumentUi` tests) |
| `npm run build` | Success |

---

## 15. Database preservation

Read-only after isolated cleanup:

| Check | Result |
|---|---|
| Alembic | `f3_export_draft` |
| App tables | 82 |
| Sample/Gift rows | 0 |
| Export rows | 0 |
| Products / type flags | 14 / 0 |
| Orders / invoices | 131 / 5 |
| `stock_qty` sum | 13275.00 |
| Live API database | `swift_distro_hub` |
| Write flags | False / False |
| `/health` | healthy |
| E2E containers | none |

No live PUT. No migration. No flag change.

---

## 16. Business approval status

All **20** F.4 decisions remain **Pending**. Gate B stays blocked. This UI work is not operational authorization.

---

## 17. Remaining functional gaps

- No module-flag read API; Edit can appear while live PUT is 403.
- Last-write-wins for two concurrent Draft editors is unchanged (no If-Match).
- Unsaved-changes warning not added (no existing app pattern).
- Print still disabled.
- Workflow actions not present (by design).

---

## 18. GO / NO-GO for the next phase

| Gate | Verdict |
|---|---|
| F.4B.1D | **GO — complete** |
| F.4B.2 | **NO-GO** — policy unsigned |
| F.4C / F.4D | **NO-GO** |

Keep live Draft writes off until Section E is signed.
