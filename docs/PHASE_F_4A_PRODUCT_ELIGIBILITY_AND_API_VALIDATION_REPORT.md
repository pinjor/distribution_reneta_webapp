# Phase F.4A — Product Eligibility Validation and Draft API Hardening

Date: 25 November 2026  
Status: **Analysis and isolated helper complete. Policy is not approved. Enforcement is not deployed on Draft routers. Live Draft writes remain disabled.**

No product flags were changed. No live Drafts were created. Inventory was not modified.

---

## 1. Product eligibility audit

Four boolean columns exist on `products`. There is **no** `product_type_gift` column.

| Column | SQL type | Nullable | SQL default | ORM | Pydantic `ProductBase` |
|---|---|---|---|---|---|
| `product_type_sample` | boolean | YES | none | `Boolean, default=False` | `bool = False` |
| `product_type_export` | boolean | YES | none | same | same |
| `product_type_commercial` | boolean | YES | none | same | same |
| `product_type_institutional` | boolean | YES | none | same | same |
| `is_active` | boolean | YES | none | `Boolean, default=True` | `bool = True` |

PostgreSQL has no `DEFAULT` on the columns; new rows get ORM Python defaults on insert.

**Save path:** Settings → Products (`src/pages/settings/Products.tsx`) checkboxes → `POST`/`PUT /api/products` (`backend/app/routers/products.py`, admin/manager). `model_dump()` includes the four flags.

**Read path:** `GET /api/products` returns **active** products only (`Product.is_active == True`). Draft forms call that endpoint and filter flags in the browser.

**Draft routers today:** `_require_products` checks that `product_id` exists. It does **not** check type flags or `is_active`.

**Approved policy document:** none in the repository. F.3.3 / F.3.4 list recommendations only. `POLICY_APPROVED = False` in `draft_product_eligibility.py`.

---

## 2. Actual product flag counts

Live `swift_distro_hub`, 2026-11-25 06:57:28 UTC. **No UPDATEs.**

| Metric | Count |
|---|---:|
| products | 14 |
| `product_type_sample = true` | **0** |
| `product_type_export = true` | **0** |
| `product_type_commercial = true` | **0** |
| `product_type_institutional = true` | **0** |
| active | 14 |
| inactive | 0 |

Enabling Draft writes today would still yield empty UI pickers. The API would still accept any of the 14 SKUs if a client bypassed the UI.

---

## 3. Existing API validation behavior

| Check | Sample/Gift | Export |
|---|---|---|
| Feature flag | 403 if `SAMPLE_GIFT_DRAFT_WRITES` off | 403 if `EXPORT_DRAFT_WRITES` off |
| Role | admin/manager writes; JWT reads | same |
| Depot | write requires `depot_id`; foreign GET/PUT 404 | same |
| Product exists | 400 `Invalid product_id` | same |
| Quantity `> 0` | Pydantic **422** | **422** |
| Empty items | 422 | 422 |
| Duplicate delivery number | 409 | 409 |
| Duplicate product lines | **allowed** | **allowed** |
| Eligibility flags | **not checked** | **not checked** |
| Inactive product | accepted if id exists | same |
| Stock / invoices | none | none |
| Failed item | raise before commit; header not persisted | same |

Commercial `POST /api/orders` is unchanged.

---

## 4. Proposed vs approved policy

| Topic | Proposed (F.3.4 / this phase) | Approved |
|---|---|---|
| Sample | `product_type_sample = true` | **pending** |
| Gift | same flag (no gift column) | **pending** |
| Export | `product_type_export = true` | **pending** |
| Inactive SKUs | reject | **pending** |
| Multi-category SKU | allowed if each required flag is true | **pending** |
| Commercial orders | do not apply these rules | implicit (not changed) |

Helper `require_eligible_products` implements the proposed rules and returns **400**. Draft routers **do not call it**.

Wiring it without signed approval would reject every live SKU (all flags false) as soon as write flags are turned on. That restriction was not activated.

---

## 5. Files changed

| File | Change |
|---|---|
| `backend/app/services/draft_product_eligibility.py` | **new** isolated helper; `POLICY_APPROVED = False` |
| `backend/tests/test_draft_product_eligibility.py` | **new** helper tests + proof routers still accept ineligible SKUs |
| `backend/app/routers/sample_gift_deliveries.py` | comment only: eligibility pending |
| `backend/app/routers/export_deliveries.py` | comment only |
| `docs/PHASE_F_4A_PRODUCT_ELIGIBILITY_AND_API_VALIDATION_REPORT.md` | this report |

No Alembic revision. No frontend redesign. Autogenerate probe on disposable DB was empty and deleted.

---

## 6. Backend validation design and implementation status

`require_eligible_products(db, product_ids, category, require_active=True)`:

1. Deduplicate ids for lookup; missing → 400 `Invalid product_id`.
2. Inactive → 400 `Inactive product_id` (proposed; `GET /api/products` already hides them).
3. Flag via `REQUIRED_FLAG`: sample/gift → `product_type_sample`; export → `product_type_export`.
4. Ineligible → 400 naming the flag and ids.
5. No stock writes.

**Status:** helper tested. **Not** imported by create/update handlers. After approval, replace `_require_products` with this helper using `document_kind` (sample/gift) or `"export"`.

Quantity stays 422 via Pydantic. Duplicate lines stay allowed unless product later forbids them.

---

## 7. Frontend product filtering verification

Inspected `SampleGiftDeliveryForm.tsx` and `ExportDeliveryForm.tsx`. No UI changes.

| Requirement | Sample/Gift | Export |
|---|---|---|
| Loads FastAPI products | `apiEndpoints.products.getAll()` | same |
| Category flag | `product_type_sample` | `product_type_export` |
| Demo products | none | none |
| Empty catalog | toast: flags not set | same |
| API error | destructive toast | same |
| Unauthorized SKUs in picker | filtered out (UI only) | same |
| Mutates product master | no | no |
| Gift vs sample picker | **same sample flag** | n/a |

Gift still shares the sample picker. A distinct Gift flag needs a signed schema decision.

---

## 8. Authorization behavior

Unchanged.

| Actor | Read | Write |
|---|---|---|
| Unauthenticated | 401 | 401 |
| `user` / PSO | 200 depot-scoped | **403** |
| admin / manager | 200 | 403 while Compose flags are `no` |
| Compose | `SAMPLE_GIFT_DRAFT_WRITES=no`, `EXPORT_DRAFT_WRITES=no` | |

No new permission codes. No internal bypass.

---

## 9. Backend test results

SQLite pytest in `swift_distro_api` (Compose flags forced `yes` only inside `conftest.py`):

**117 passed**, 176 warnings, 157.51s (previous baseline 106 + 11 eligibility tests). Includes `test_draft_product_eligibility.py`, Sample/Gift, Export, auth, order lifecycle, and reservation tests.

Helper coverage: sample accept/reject, gift uses sample flag, export accept/reject, multi-flag SKU, missing id, inactive, mixed lines, duplicate line ids, `POLICY_APPROVED is False`, routers still 201 for a commercial-flagged SKU.

Existing rollback test `test_invalid_item_does_not_persist_header` remains: missing product_id → 400, no header row.

---

## 10. Frontend tests and build

| Command | Result |
|---|---|
| `npm test` (vitest) | **9 passed** (2 files) |
| `npm run build` | **success** (existing chunk-size warning) |

---

## 11. Disposable PostgreSQL results

Database `f4a_iso` restored from `swift_distro_hub_20261125_123200.dump` (PostgreSQL 16, `f3_export_draft`). Not live.

| Check | Result |
|---|---|
| Existing 14 products flags | sample 0, export 0 |
| Synthetic sample/export/both accepted by helper | 400 on none / mixed / missing |
| Draft row counts | 0 / 0 before and after |
| stock_ledger available | 13000 unchanged |
| PISD available | 10635 unchanged |
| orders / invoices | 131 / 5 unchanged |
| Autogenerate | empty `pass`; probe deleted |
| Database | **dropped** after the run |

---

## 12. Live database preservation

| Check | After F.4A |
|---|---|
| Alembic | `f3_export_draft` |
| Tables | 82 |
| Draft rows | 0 / 0 |
| Write flags | `no` / `no` |
| Product flags | all false (unchanged) |
| ledger available | 13000 |
| PISD available / reserved / qty | 10635 / 2640 / 13275 |
| Live migration | none |
| Startup DDL | schema_guard only; no `create_all` on live |

`GET /health` after tests: `{"status":"healthy"}`. Compose flags remained `no`.

---

## 13. Business approval decision table

No invented signatures. Status is **pending** unless noted.

| # | Decision | Recommended | Alternatives | Approver | Status | Operational impact |
|---|---|---|---|---|---|---|
| 1 | Sample SKU rule | `product_type_sample=true` | Any SKU; commercial+sample | Product | pending | Empty catalog until flags set; API 400 after wire-up |
| 2 | Gift SKU rule | Share sample flag | New `product_type_gift`; any SKU | Product | pending | No schema change if shared |
| 3 | Export SKU rule | `product_type_export=true` | Allow commercial export SKUs | Product + export ops | pending | Same empty-catalog effect |
| 4 | Inactive SKUs | Disallow | Allow | Product | pending | Matches `GET /api/products` |
| 5 | Multi-category SKU | Allowed | Exclusive types | Product | pending | One batch can serve sample and export |
| 6 | Flag SKUs before activation | **Yes**, named list, no auto-flag | Enable writes with empty catalog | Product | pending | Required before write flags |
| 7 | Draft write roles | admin/manager only | PSO create | Product + HR | pending (current code matches) | PSO stays 403 |
| 8 | PSO submit later | No in F.4B | PSO submit-only | Product | pending | F.4B must not grant PSO |

---

## 14. Remaining critical stock risks (from F.3.4)

Unchanged. F.4A did not touch inventory code.

1. Dual stores: PISD reserved 2640 vs ledger reserved 0; Khulna-only 275; available gap **2365 = 2640 − 275**.
2. `commit_for_order` does not reduce PISD `quantity`.
3. Validation and delivery FEFO do not skip expired batches.
4. Delivery FEFO has no `FOR UPDATE`.
5. Source of truth (PISD authority) is **not** live-approved.

These remain **blockers for F.4C**, not for eligibility policy.

---

## 15. GO / NO-GO for F.4B

| Item | Verdict |
|---|---|
| F.4A analysis + helper + tests | **GO** (complete) |
| Treat proposed flags as approved | **NO-GO** |
| Wire helper into Draft POST/PUT | **NO-GO** until §13 rows 1–6 signed |
| Enable Compose Draft write flags | **NO-GO** (0 eligible SKUs) |
| Change product flags | **NO-GO** without named SKU list |
| F.4B submit/approve/reject **without stock** | **CONDITIONAL GO** for design/tests only after §13 rows 7–8; still **NO-GO** for live writes |
| F.4C stock reservation | **NO-GO** (F.3.4) |

**F.4A is complete.** Enforcement remains pending. Live Draft creation was not enabled.
