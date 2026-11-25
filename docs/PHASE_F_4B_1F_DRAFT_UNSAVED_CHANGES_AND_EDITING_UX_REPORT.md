# Phase F.4B.1F — Draft Form Unsaved-Changes Protection and Editing UX Completion

Date: 25 November 2026  
Status: **Complete.** Sample/Gift and Export Create/Edit warn before discarding unsaved Draft input. Live Compose write flags remain `no`. Submit/Approve/Reject stay unmounted. Optimistic concurrency was **not** implemented. F.4B.2 and F.4C were not started.

---

## 1. Files reviewed and modified

**Reviewed:** F.4B.1E / 1D / 1A reports; `PHASE_F_4_BUSINESS_APPROVAL_VERIFICATION_REPORT.md`; Sample/Gift and Export forms; `DraftEditConflict.tsx`; `draftDocumentUi.ts`; `useDraftCapabilities.ts`; `package.json` (`react-router-dom` **6.30.1**); AlertDialog; Playwright specs.

**Added**

| File | Role |
|---|---|
| `src/lib/draftFormSnapshot.ts` | Normalized header + line snapshots |
| `src/lib/draftFormSnapshot.test.ts` | Dirty-detection unit tests |
| `src/hooks/useUnsavedDraftGuard.ts` | `useBlocker` + `beforeunload` + local confirm |
| `src/hooks/useUnsavedDraftGuard.test.tsx` | Stay / Discard / save / reload dialog tests |
| `src/pages/delivery/DraftUnsavedChangesDialog.tsx` | Existing AlertDialog: Stay on Page / Discard Changes |
| `e2e/draft-modules/unsaved.spec.ts` | Isolated create/edit/save-fail/capability/beforeunload |

**Modified**

| File | Change |
|---|---|
| `src/App.tsx` | `BrowserRouter` → `createBrowserRouter` so `useBlocker` is supported |
| `SampleGiftDeliveryForm.tsx` / `ExportDeliveryForm.tsx` | Snapshot, guard, save skip, conflict Reload confirm |
| `e2e/draft-modules/edit.spec.ts` | Dirty Cancel and 409 Back-to-Detail confirmation |

**Not changed:** Alembic; Compose flags; POST/PUT contracts; workflow mounts; F.4A wiring; RBAC; billing; stock.

---

## 2. Current form-state architecture

Forms are local React state (`useState`), not React Hook Form.

| Mode | Initialization | Mutation | Persist | Reset |
|---|---|---|---|---|
| Create | Empty header + today’s date after capabilities load | Header inputs, Add/Remove lines, qty / Export unit price, Sample/Gift kind | POST | Unmount or confirmed leave |
| Edit | GET `applyDocument` after capabilities | Same | PUT | Reload (confirmed if dirty) or leave |

Line `key` values are UI-only. Baseline is captured **after** GET/create defaults, so async prepopulation is not dirty. Failed POST/PUT leaves state unchanged. `if (saving) return` still prevents duplicate submits.

---

## 3. Dirty-state detection implementation

`captureDraftFormSnapshot(header, lines, lineFields)` JSON-stringifies:

- Sorted header keys, trimmed text
- Lines without React `key` / display name
- `quantity` and `unitPrice` via `Number` then `String` so `3.0` ≡ `3.00`

`isDraftFormDirty(current, baseline)` is false while `baseline === null` (GET in flight).

Detected: header edits, document kind, add/remove lines, quantity, Export unit price. Not detected: object identity, product display name, incomplete picker row (`itemDraft` before Add Item).

---

## 4. Navigation confirmation behavior

React Router 6.30 **`useBlocker` requires a data router**. The app now uses `createBrowserRouter` + `RouterProvider`. That is the supported mechanism; history hacks were not used.

When dirty, in-app `navigate()`, `Link`, sidebar, Back, and Cancel open AlertDialog:

- Title: Unsaved Draft changes
- Description: unsaved Draft changes will be lost
- **Stay on Page** (`blocker.reset` / cancel local action)
- **Discard Changes** (`blocker.proceed` / run local action)
- Escape / overlay: Stay (deliberate)
- After Discard, the dialog does not repeat for that navigation

**Limitations (not claimed as full coverage):**

- `beforeunload` handles refresh/tab close; browsers ignore custom prompt text.
- Full document loads that are not React Router navigations use the native dialog, not AlertDialog.
- Redirect to `/login` is **not** blocked so session expiry is not trapped.
- jsdom cannot complete data-router `navigate()` (`AbortSignal` mismatch); unit tests use the same dialog via `confirmOrRun`. Playwright covers real `useBlocker`.

---

## 5. Refresh/tab-close handling

`beforeunload` is registered only while dirty, removed on unmount or when clean. `preventDefault` + `returnValue = ""` (browser-controlled copy). Successful save sets `allowNextNavigation()` so the next in-app route change is not blocked and the listener drops when the form unmounts.

No form data is written to `localStorage`.

Playwright Chromium: a reload listener is attached; if the native dialog appears it is dismissed. This is not asserted as guaranteed on every engine.

---

## 6. Save and Cancel behavior

| Event | Result |
|---|---|
| POST/PUT 2xx | Skip blocker, navigate, no discard prompt |
| Save failure | Fields and dirty flag kept; toast; no success toast |
| Cancel, clean | Immediate leave |
| Cancel / Back, dirty | Confirmation |
| Double Save | `saving` guard + disabled button |
| Conflict Reload | Confirmation if dirty, then GET (does not silent-discard) |

Payloads unchanged.

---

## 7. 409 conflict behavior

Existing `DraftEditConflict` remains. No automatic PUT retry. Entered values stay on screen (`#recipientName` still “After Submit” in E2E). **Reload** uses `confirmOrRun`. **Back to Detail** is a route change, so dirty users get the unsaved dialog first. Stay keeps the conflict panel and edits.

401 / 403 / 404 / 422 / 500 handling unchanged.

---

## 8. Sample/Gift results

Create: clean Cancel; dirty Back → Stay keeps recipient; Discard returns to list; successful Create has no prompt; 500 POST keeps values and still prompts on Cancel. Edit: clean Cancel leaves; dirty Cancel confirms. Writes-disabled Save still disabled.

---

## 9. Export results

Create dirty Back Stay/Discard matches Sample/Gift. Existing Export edit, totals, 404, and 409 tests still pass. Same AlertDialog copy and test ids.

---

## 10. Stale-editor risk and proposed future contract

**Decision note — not implemented in F.4B.1F.**

**What `SELECT FOR UPDATE` protects today:** one PUT (or a future Submit on the same row) at a time. The locker re-reads status under the lock and returns **409** if the document is no longer Draft. It does **not** compare field versions.

**Why sequential edits overwrite:** two browsers load Draft v1. A saves, B saves later. Both are Draft. The second PUT replaces the first. Last-write-wins.

**`updated_at`:** already on Sample/Gift and Export headers and GET responses, stamped on PUT. Clients do not send it. Clock skew and `onupdate` make it usable as a weak ETag, but it is not a monotonic integer.

**If-Match (future, needs a separate decision):**

1. Client stores `updated_at` (or a new `version` column) from GET.
2. PUT sends `If-Match` or body `expected_updated_at`.
3. Server, still under `SELECT FOR UPDATE`, compares; mismatch → **409** with a distinct code (not the non-Draft message).
4. UI: keep current values, offer Reload vs Overwrite only if product later allows overwrite.

Do not add that contract until approved. This phase only documents it.

---

## 11. Unit tests

`npm test`: **29 passed** (6 files).

| Area | Coverage |
|---|---|
| Snapshot | Clean, header, kind, qty, add/remove, Export price, revert, GET baseline null, whitespace |
| Guard | Clean leave, dirty Stay, Discard, save grant, failed-save dirty, Reload confirm |
| Existing | api 401/403/409, capabilities sanitize, draftDocumentUi, masterData |

jsdom does not execute real `useBlocker` proceeds (undici `AbortSignal`). In-app blocking is proven in Playwright.

---

## 12. Playwright results

`npm run test:e2e:isolated` — disposable `reneta_e2e` only.

**20 passed** (~2.5m).

New: stay/discard/clean/save/500 on Sample/Gift; Export stay/discard; edit clean vs dirty Cancel; capability Save disabled; optional beforeunload. Existing create/edit/capability/409/auth still pass. E2E containers removed afterward.

---

## 13. Backend regression results

`docker exec … pytest /app/tests -p no:cacheprovider`

**146 passed**, 204 warnings, 93.20s. SQLite. Draft CRUD, PUT lock, capabilities, eligibility helper (unwired), transitions (unmounted), RBAC/depot, orders, reservation, billing. No assertion weakening. Not `swift_distro_hub`.

---

## 14. Frontend build result

`npm run build`: **success** (vite, 13.32s).

---

## 15. Live database preservation

Read-only after isolated cleanup. No live PUT, no migration, no Compose edit, no production restart.

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

All **20** F.4 decisions remain **Pending**. Section E unsigned. Gate B stays blocked. This UX work is not operational authorization, flag activation, or workflow mounting.

---

## 17. Remaining issues

- Last-write-wins for two Draft editors (see §10).
- Incomplete product picker row is not part of the snapshot.
- Native `beforeunload` wording cannot be customized.
- Print still disabled.
- Workflow and F.4A eligibility still unwired (policy).

---

## 18. GO / NO-GO recommendation

| Gate | Verdict |
|---|---|
| F.4B.1F | **GO — complete** |
| F.4B.2 | **NO-GO** — policy unsigned |
| F.4C / F.4D | **NO-GO** |
| Optimistic concurrency API | **NO-GO** until a separate decision |

Keep live Draft writes off until Section E is signed.
