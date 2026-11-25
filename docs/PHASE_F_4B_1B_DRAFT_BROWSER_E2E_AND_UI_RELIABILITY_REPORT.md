# Phase F.4B.1B — Draft Browser E2E and UI Reliability

Date: 25 November 2026  
Status: **Complete.** Playwright ran against an isolated PostgreSQL copy, isolated FastAPI processes, and an isolated Vite server. Live Compose Draft flags stayed `no`. Submit/Approve/Reject were not mounted. F.4B.2 and F.4C were not started.

---

## 1. Files reviewed and modified

**Reviewed:** F.4B.1A / F.4B.1 / F.4A / F.3 / F.2 / F.4 approval reports; Sample/Gift and Export list/form/detail pages; `App.tsx` routes; `menuNavigation.ts`; `MainLayout` auth gate; `api.ts`; Draft routers.

**Application (reliability only, no redesign):**

| File | Change |
|---|---|
| `SampleGiftDeliveryForm.tsx` / `ExportDeliveryForm.tsx` | Match product ids as strings; empty `Select` values; remove HTML `required` on the add-item quantity (it blocked save after a line existed); save-in-flight guard; empty-catalog copy on Sample/Gift; reject negative unit price; `data-testid` on save |
| `*DeliveryDetail.tsx` | Retry on load failure |
| `*DeliveryList.tsx` / details | Badge map includes Submitted / Approved / Rejected |
| `src/lib/api.ts` | HTTP 409 uses `detail` (no fake success) |

**E2E harness:** `playwright.config.ts`; `e2e/draft-modules/*`; `package.json` scripts `test:e2e` / `test:e2e:draft`; `@playwright/test` devDependency.

**Not changed:** Compose `SAMPLE_GIFT_DRAFT_WRITES` / `EXPORT_DRAFT_WRITES`; Alembic; live product flags; workflow mounts; eligibility wiring; RBAC codes.

---

## 2. E2E environment and database isolation

| Piece | Isolated | Live (untouched for writes) |
|---|---|---|
| PostgreSQL | `f4b1b_iso` restored from verified dump, revision `f3_export_draft` | `swift_distro_hub` |
| FastAPI (writes on) | container `f4b1b_api` `:18010`, flags **yes** | `swift_distro_api`, flags **no**, `DATABASE_URL` …/`swift_distro_hub` |
| FastAPI (flags off) | `f4b1b_api_flags_off` `:18011` | same live process |
| Frontend | Vite `127.0.0.1:15174` with `VITE_API_URL=http://127.0.0.1:18010/api` | Compose frontend (not used) |

Guards: seed and API startup refuse `swift_distro_hub`; Playwright `global-setup` requires `e2e/.isolation.json` with `database: f4b1b_iso`; unauthenticated Draft list must not return 200. Port **15174** was used because **5174** already served a different “CMS Admin Login” app.

Synthetic users and SKUs existed only on `f4b1b_iso`. Credentials are not listed here. Stack removed with `e2e/draft-modules/stop_isolated.sh` (`f4b1b_iso` dropped). Live volume was not dropped.

Start: `e2e/draft-modules/start_isolated.sh` then `npm run test:e2e`.

---

## 3. Sample/Gift browser results

Passed on the isolated stack:

- Authenticated admin list load and empty/list heading.
- New Sample: product pick (string id fix), quantity validation, save Draft, list row, detail fields, Print disabled.
- Gift document kind with the same sample-flagged picker (policy A2 still pending; UI does not invent a gift flag).
- List failure + Retry.
- Duplicate delivery number: toast **Unable to create delivery**, stay on `/new`.
- Save stays disabled until at least one line exists.

Submit/Approve/Reject were not invoked.

---

## 4. Export browser results

Passed:

- New Export: ports, shipping, B/L, L/C, invoice **reference**, Incoterms, payment terms, quantity and unit price.
- Negative quantity / negative unit price toasts.
- Native required destination keeps the user on `/new`.
- Persist, list, detail; server `total_value` shown (4 × 10.25 → **41**).
- Print disabled.

No commercial invoice row was created.

---

## 5. Authentication and authorization

| Check | Result |
|---|---|
| Unauthenticated `/delivery/sample-gift` and `/export` | Redirect `/login` |
| Admin / manager read | Lists open |
| PSO (`user`) read | List OK; POST **403** |
| Foreign-depot detail | **Not found** (no fake success) |
| Isolated flags-off POST | **403** (not enabled) |
| `POST …/submit` | **404** (unmounted) |

---

## 6. Empty catalog behavior

Isolated E2E SKUs were temporarily unflagged via the isolated products API (not live).

- Sample/Gift: “No products are flagged as sample…” and disabled picker; Add Item → “Select a product”; save disabled.
- Export: matching empty-catalog copy; save disabled.
- After flags restored on **isolated** SKUs only, pickers showed E2E Sample / E2E Export products.

No demo catalog substitution.

---

## 7. Error handling and navigation findings

- List Retry already existed; detail Retry was missing (added).
- 401 still redirects to login; 403 and 409 surface API `detail`.
- Duplicate save does not navigate to a success list.
- Radix `Select` with `value=""` broke empty gift-type / product triggers (fixed with `undefined`).

---

## 8. Frontend defects fixed

1. **Product add crashed / never matched** — `products.find(p => p.id === itemDraft.productId)` compared number to string.
2. **Draft save blocked after adding a line** — add-item quantity input had HTML `required`.
3. **Empty Select values** — Radix warning / stuck placeholder.
4. **Detail load failure had no Retry.**
5. **409 treated as a generic error** — now uses `detail` (`Only Draft documents can be updated`).
6. **Negative export unit price** could be added; now rejected in the add-item handler.
7. Status badges did not name Submitted / Approved / Rejected (still Draft-looking via fallback).

Visual layout, chrome, and copy system were not redesigned.

---

## 9. Draft update UI findings

API `PUT` exists and is lock-hardened (F.4B.1A). **The UI has create + list + detail only.** There is no edit form, no save-changes button, and no 409 screen in the browser.

Playwright covered 409 on the **isolated API** after setting status to Submitted in SQL (Submit route still 404). Sequential Draft last-write-wins remains the API contract. An edit screen would be new product work, not this phase.

---

## 10. Backend test results

`pytest /app/tests`: **141 passed**, 199 warnings, 109.87s. Baseline held (CRUD, transitions, eligibility, depot, auth, orders, reservation, billing).

---

## 11. Frontend unit tests and build

- vitest: **10 passed** (was 9; added 409 client test).
- `vite build`: success.

---

## 12. Playwright results and execution evidence

Command: `npx playwright test --reporter=list` with `E2E_BASE_URL=http://127.0.0.1:15174`.

**10 passed** (1.1m), Chromium, workers=1.

| Spec | Coverage |
|---|---|
| `auth.spec.ts` (5) | Login gate, admin/manager read, PSO 403, foreign 404 |
| `empty-catalog.spec.ts` (1) | Empty pickers then restored flagged SKUs |
| `export.spec.ts` (1) | Create, totals, validation, print |
| `flags-and-conflict.spec.ts` (2) | Flags-off 403; PUT 409 after Submitted |
| `sample-gift.spec.ts` (1) | Sample + Gift, retry, duplicate, print |

Isolation evidence: isolated API `engine.url.database = f4b1b_iso`; live API remained `swift_distro_hub`.

---

## 13. Live database preservation (read-only)

| Check | Result |
|---|---|
| Alembic | `f3_export_draft` |
| Application tables (excl. `alembic_version`) | **82** |
| Sample/Gift / Export rows | **0 / 0** |
| Write flags | **no / no** |
| Ledger / PISD available | **13000 / 10635** |
| Orders / invoices / deposits | **131 / 5 / 49** |
| `GET /health` | success |
| Isolated DB after cleanup | dropped |

No live Draft creation, no live product-flag updates, no live migration.

---

## 14. Business approval status

All **20** policy rows remain **Pending**. Section E unsigned.

**`F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED`**

Eligibility helper still disconnected. Workflow endpoints still unmounted.

---

## 15. Remaining functional gaps

1. No Draft **edit** UI (PUT unused by pages).
2. No Submit / Approve / Reject UI or routes (correct until Gate B).
3. Backend eligibility not enforced on create (picker filters flags only).
4. Live catalog still has **zero** sample/export flags — empty pickers in production until a classified list is approved.
5. Admin without `depot_id` still cannot save (form requires `user.depot_id`).
6. Playwright is not in CI; run via `start_isolated.sh` + `npm run test:e2e`.

---

## 16. GO / NO-GO for the next phase

**F.4B.1B: GO (complete).** Browser Draft create/list/detail is verified on isolated PostgreSQL. UI defects that blocked real saves were fixed.

**F.4B.2 (mount workflow APIs): NO-GO** until written owner decisions and a separate engineering order.

**F.4C: NO-GO.** Not started.

Do not enable live Draft write flags. Do not classify live SKUs. Do not mount Submit/Approve/Reject.
