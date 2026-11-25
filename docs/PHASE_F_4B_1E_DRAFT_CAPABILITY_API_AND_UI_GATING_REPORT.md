# Phase F.4B.1E — Draft Module Capability API and Frontend Action Gating

Date: 25 November 2026  
Status: **Complete.** Sample/Gift and Export Create/Edit actions now follow an authenticated, read-only capability snapshot. Live Compose write flags remain `no`. Submit/Approve/Reject stay unmounted. F.4B.2 and F.4C were not started.

This phase is UI reliability and existing-permission visibility only. The capability response is not operational approval and cannot authorize a write that POST/PUT would reject.

---

## 1. Files reviewed and modified

**Reviewed:** `docs/PHASE_F_4B_1D_DRAFT_EDIT_UI_INTEGRATION_REPORT.md`; `docs/PHASE_F_4B_1C_E2E_CI_AUTOMATION_AND_TEST_HARDENING_REPORT.md`; `docs/PHASE_F_4_BUSINESS_APPROVAL_VERIFICATION_REPORT.md`; `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md`; Sample/Gift and Export list/detail/form pages; `AuthContext`; `src/lib/api.ts`; Draft POST/PUT routers; `get_settings()` flags; `require_role("admin", "manager")`; CORS and `PROTECTED` mounting.

**Added**

| File | Role |
|---|---|
| `backend/app/services/draft_module_capabilities.py` | Effective capabilities for the authenticated user |
| `backend/app/routers/draft_modules.py` | `GET /api/draft-modules/capabilities` |
| `backend/tests/test_draft_module_capabilities.py` | 401, flags on/off, PSO, manager, PUT still 403 when flag off |
| `src/lib/draftCapabilities.ts` | Types, fail-closed sanitize, workflow keys forced false |
| `src/lib/draftCapabilities.test.ts` | Sanitize unit tests |
| `src/hooks/useDraftCapabilities.ts` | Fetch on auth/user change; fail closed |
| `src/pages/delivery/DraftWritesNotice.tsx` | Shared disabled-write copy |
| `e2e/draft-modules/capabilities.spec.ts` | Isolated API + UI gating |

**Modified**

| File | Change |
|---|---|
| `backend/main.py` | Mount capability router under `/api/draft-modules` with existing `PROTECTED` |
| `src/lib/api.ts` | `draftModules.capabilities()` |
| `src/lib/draftDocumentUi.ts` | `canShowDraftEdit(moduleCanEdit, status)` — role no longer sufficient |
| `SampleGiftDeliveryList.tsx` / `ExportDeliveryList.tsx` | Hide New unless `can_create`; notice when writes unavailable |
| `SampleGiftDeliveryDetail.tsx` / `ExportDeliveryDetail.tsx` | Edit only when module `can_edit` and status is Draft |
| `SampleGiftDeliveryForm.tsx` / `ExportDeliveryForm.tsx` | Wait for capabilities; block `/new` and `/:id/edit` when writes are off |
| `e2e/draft-modules/edit.spec.ts` | PSO direct-edit copy matches capability gating |
| `ExportDeliveryList.tsx` | Fix TDZ crash (`unavailable` used before `useState`) that hid Export Create |

**Not changed:** Alembic; Compose flags; workflow mounts; F.4A eligibility wiring; live SKU flags; RBAC codes; billing; stock; no flag-mutation API.

---

## 2. Existing authorization/flag behavior

Server writes were already gated independently of the UI:

1. JWT via `require_auth` on list/detail/create/update.
2. POST/PUT extra dependency `require_sample_gift_draft_writes` / `require_export_draft_writes`: `require_role("admin", "manager")` **and** `get_settings().sample_gift_draft_writes` / `export_draft_writes`.
3. Compose live values: `SAMPLE_GIFT_DRAFT_WRITES=no`, `EXPORT_DRAFT_WRITES=no`.
4. Pytest SQLite still forces flags **yes** (unchanged). Isolated Playwright uses a flags-on API plus a separate flags-off API.
5. PSO / `user` POST/PUT → 403 even when flags are on.
6. Depot scope: foreign depot GET → 404.
7. PUT: Draft only, `SELECT FOR UPDATE`; non-Draft → 409. That record check is not replaced by the module capability.

Frontend `AuthContext.role` is **not** used to authorize writes after this phase.

---

## 3. Capability API contract

`GET /api/draft-modules/capabilities`

Authenticated JSON only. Effective permissions, not env dumps.

```json
{
  "sample_gift": {
    "can_read": true,
    "can_create": false,
    "can_edit": false,
    "writes_enabled": false,
    "can_submit": false,
    "can_approve": false,
    "can_reject": false
  },
  "export": { "...same keys..." }
}
```

Derivation:

| Field | Meaning |
|---|---|
| `can_read` | Always `true` for an authenticated caller (list/detail still depot-scoped on those routes) |
| `writes_enabled` | Boolean from `get_settings()` for that module |
| `can_create` / `can_edit` | `writes_enabled` **and** role in `{admin, manager}` |
| `can_submit` / `can_approve` / `can_reject` | Always `false` (workflow unmounted) |

Module `can_edit` does **not** mean every document is editable. Forms and detail still require status `Draft`. Depot ownership and PUT 409 remain server-side.

The payload never includes env names, secrets, database URLs, other users, or unrelated settings. Tests assert `secret`, `password`, `database_url`, and `sample_gift_draft_writes` are absent.

There is no POST/PUT/PATCH on this router.

---

## 4. Authentication and security

- Route uses `Depends(require_auth)` and the app-wide `PROTECTED` list (same JWT as other operational APIs).
- Unauthenticated GET → **401**.
- CORS is the existing `CORSMiddleware` allow-list; no public unauthenticated capability endpoint was added.
- Capability GET is not an authorization bypass: `test_capability_true_does_not_bypass_put_guards` fetches `can_create: true`, then turns the flag off and asserts POST **403**.
- Frontend `sanitizeModuleCapability` treats only explicit `true` as write permission and forces workflow keys false even if a payload claimed otherwise.
- Fail closed: load error / 403 / network abort → both modules use `DISABLED_DRAFT_MODULE` (`can_create`/`can_edit` false).

---

## 5. Sample/Gift UI integration

| Surface | Behavior |
|---|---|
| List | `New Sample Gift` only when `can_create` after capabilities load |
| List | Otherwise `DraftWritesNotice`: “Draft creation is currently unavailable.” |
| List | Read-only table, search, refresh unchanged |
| Detail | Edit only if `canShowDraftEdit(can_edit, status)` |
| Create URL | Blocks with “Draft creation is currently unavailable.”; Save disabled |
| Edit URL | Non-Draft: “Only Draft documents can be edited.”; writes off or PSO: “Editing is currently unavailable.”; Save disabled |
| Save | Existing 403/409 toasts; no success toast; no silent retry |

---

## 6. Export UI integration

Equivalent to Sample/Gift (`New Export`, same notice, `export-edit` / `export-save`). List still respects the existing 503 “migration required” empty path via `unavailable`.

A render crash (`canCreate` referenced `unavailable` before `useState`) was fixed so Export Create is visible when the isolated flags-on API actually allows writes. Sample/Gift and Export action gating now match.

---

## 7. Direct-route protection

| Direct URL | Writes off or role cannot write |
|---|---|
| `/delivery/sample-gift/new` | Blocked copy + Save disabled |
| `/delivery/export/new` | Same |
| `/delivery/sample-gift/:id/edit` | Document still GET-readable; Save disabled |
| `/delivery/export/:id/edit` | Same |

Isolated E2E uses the **real** flags-off capability JSON (from `E2E_API_FLAGS_OFF_URL`) injected only onto `GET **/draft-modules/capabilities`. The Vite app still talks to the flags-on API for documents, so the UI lock is what prevents Save — backend guards remain if that lock were skipped.

---

## 8. Disabled-write user experience

- Create/Edit controls hidden, not advertised.
- Short explanation on list and on direct form URLs.
- Details remain readable (admin flags-off E2E: recipient still shown; Edit count 0).
- Print remains disabled (prior phase).
- No Submit/Approve/Reject buttons.

---

## 9. Capability failure handling

`useDraftCapabilities`:

- Loading spinner on forms until the GET finishes (or fails).
- List waits to show New until `!loading && can_create`.
- Abort / network / 403 → error string + disabled writes; list heading still renders.
- 401 uses existing API client redirect to `/login`.
- Refetch when `isAuthenticated`, `user.id`, or `user.role` changes (logout → PSO → admin E2E).
- No localStorage of capabilities; no TTL cache of a stale “writes on” snapshot across sessions.

If flags change between capability GET and PUT, the PUT 403/409 is final: existing conflict panel and permission toasts; document fields unchanged.

---

## 10. Backend regression results

`docker exec -e PYTHONPATH=/app -w /tmp swift_distro_api pytest /app/tests -p no:cacheprovider`

**146 passed**, 204 warnings, 96.14s. SQLite. Includes Draft CRUD, PUT lock, capability tests (5), eligibility helper (unwired), transitions (unmounted), RBAC/depot, orders, reservation, billing. Assertions not weakened. Not `swift_distro_hub`.

---

## 11. Frontend unit and build results

| Command | Result |
|---|---|
| `npm test` | **14 passed** (4 files; +1 sanitize) |
| `npm run build` | Success (`vite build`, 13.55s) |

---

## 12. Playwright test results

`npm run test:e2e:isolated` — disposable PostgreSQL `reneta_e2e` only. Live Compose flags untouched.

**17 passed** (1 worker, ~1.9m) after the Export list TDZ fix.

Coverage vs requested cases:

| Case | Where |
|---|---|
| Admin flags-on sees Create | capabilities + auth |
| Manager sees permitted actions | capabilities + auth |
| PSO cannot create/edit | capabilities UI + edit PSO + API 403 |
| Flags-off hides Create/Edit | capabilities (real flags-off payload) |
| Read-only list/detail | auth empty lists; flags-off detail text |
| Direct Create/Edit blocked | capabilities |
| Capability GET abort fail-closed | capabilities |
| Re-auth refreshes | PSO then admin Create returns |
| Non-Draft not editable | edit.spec 409 + Submitted |
| Backend 403/409 | flags-and-conflict + edit |
| Sample/Gift and Export consistent | both modules in capabilities/auth/export/edit |

Submit/Approve/Reject remain unmounted (`flags-and-conflict.spec.ts`). E2E containers `reneta_e2e_*` were removed after the run. Live `swift_distro_*` containers were not stopped.

---

## 13. Live database preservation

Read-only after isolated cleanup. No live PUT, no migration, no Compose edit, no service restart as a deploy step.

| Check | Result |
|---|---|
| Alembic | `f3_export_draft` |
| Application tables (excl. `alembic_version`) | **82** |
| Sample/Gift rows | **0** |
| Export rows | **0** |
| Products / sample flags / export flags | **14 / 0 / 0** |
| Orders / invoices | **131 / 5** |
| `product_item_stock.stock_qty` sum | **13275.00** |
| Detail available / reserved | **10635.00 / 2640.00** |
| Live API database | `swift_distro_hub` |
| Write flags (`get_settings`) | False / False |
| `/health` | `{"status":"healthy"}` |
| E2E containers | none |

---

## 14. Business approval status

All **20** F.4 decisions (A1–A6, B1–B6, C1–C8) remain **Pending**. Section E unsigned. Gate B stays **BLOCKED — BUSINESS APPROVAL REQUIRED**.

This capability endpoint is **not** treated as operational approval. Eligibility helper stays unwired. Workflow routes stay unmounted. Live write flags stay `no`.

---

## 15. Remaining functional gaps

- Concurrent Draft editors still last-write-wins (no If-Match).
- No unsaved-changes warning (no existing app pattern).
- Print still disabled.
- Workflow actions absent (by design until signed policy).
- F.4A eligibility not applied on POST/PUT (blocked).
- Live Create/Edit remain unavailable because flags are `no` — the UI now matches that instead of advertising writes that 403.

---

## 16. GO / NO-GO for the next phase

| Gate | Verdict |
|---|---|
| F.4B.1E | **GO — complete** |
| F.4B.2 | **NO-GO** — policy unsigned |
| F.4C / F.4D | **NO-GO** |

Keep live Draft writes off until Section E is signed. Do not mount Submit/Approve/Reject from this report.
