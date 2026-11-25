# Phase F.1 — Sample/Gift and Export Delivery Architecture Audit

Date: 25 November 2026  
Status: **Analysis only.** No endpoints, tables, Alembic revisions, RBAC codes, stock movements, or UI redesigns were implemented. Live `swift_distro_hub` was read, not mutated. Phase F.2 / F.3 / F.4 were not started.

Business requirements below are taken from **existing source and project documents**. They are **not** confirmed with product or regulatory stakeholders unless a cited file already states them.

## 1. Existing frontend module inventory

Sample and gift are **one UI module**, not two. Export is a separate module with a different status set, shipping fields, and line pricing. Depot transfer (`/delivery/depot`) is a third “Others Delivery” screen and is **out of F.1 scope** except as a contrast: it already posts depot-transfer APIs.

Menu (`src/lib/menuNavigation.ts`, section “Others Delivery”):

| Item | Path | Menu permission |
|---|---|---|
| Sample Gift Delivery | `/delivery/sample-gift` | None (visible to every logged-in user) |
| Export | `/delivery/export` | None |

Routes in `src/App.tsx`: list, `/new`, and `/:id` for both modules.

No `localStorage` business keys on these pages. `src/lib/mockData.ts` is not imported here.

### 1.1 Sample Gift Delivery List — `SampleGiftDeliveryList.tsx`

| Aspect | Evidence |
|---|---|
| User action | Search, Refresh, New Sample Gift, View, Print |
| Input | Client-side search on number, recipient, type, gift type |
| Expected output | Table of SG documents with status badges |
| Data source | **Hardcoded six rows** (`SG-2026-001` … `006`). Comment names future `apiEndpoints.orderDeliveries.getSampleGiftDeliveries()` which **does not exist** in `api.ts` |
| Real / mocked / incomplete | **Mocked.** Refresh reloads the same array. Print has no `onClick` |
| Statuses shown | Draft, Pending, Prepared, Dispatched, Delivered, Cancelled — **not** the commercial `DeliveryStatusEnum` (Draft, Packing, Loading, Shipped, Delivered) |

### 1.2 Sample Gift Delivery Form — `SampleGiftDeliveryForm.tsx`

| Aspect | Evidence |
|---|---|
| User action | Create a document with recipient + line items |
| Header fields | delivery number (optional), date*, recipient name*, type* (Doctor / Pharmacy / Hospital / Distributor / Partner / Other), phone, email, gift type (Product Samples / Promotional Items / Medical Equipment / Literature / Other), occasion, address, remarks |
| Line fields | product*, quantity*, per-line gift type |
| Product source | `GET /api/products` then filter `product_type_sample` |
| Submit | `POST /api/order-deliveries` with `{ delivery_type: "sample_gift", … }` |
| Real / mocked / incomplete | **Incomplete.** Products load from FastAPI. Submit uses a commercial delivery contract that **requires `order_id`** and numeric `batch_number` on items. The payload will **422**. List never reads created rows. Recipient is free text — **Doctor and Chemist Shop APIs are not used**. Form type list does not include “Chemist Shop” even though mock list rows use it |
| Approval / dispatch / confirm | None |
| Inventory | Quantity only. No batch, depot, or available-stock check |

Live PostgreSQL: **0** products have `product_type_sample = true`, so the product dropdown is empty against current data.

### 1.3 Sample Gift Delivery Detail — `SampleGiftDeliveryDetail.tsx`

| Aspect | Evidence |
|---|---|
| User action | View header, items, Print |
| Data source | **Fabricated** from route `id` (`SG-2025-{id}`, always Dispatched, Dr. Mohammad Rahman, two sample SKUs) |
| Real / mocked / incomplete | **Mocked.** Print no-op. No edit, submit, approve, dispatch, deliver, cancel |

### 1.4 Export Delivery List — `ExportDeliveryList.tsx`

| Aspect | Evidence |
|---|---|
| User action | Search, Refresh, New Export, View, Print |
| Data source | **Hardcoded six rows** (`EX-2026-001` … `006`) with Malaysia/India/Nepal/Sri Lanka/Singapore/UAE, ports, shipping lines, containers, values |
| Future API named | `getExportDeliveries()` — **does not exist** |
| Statuses shown | Draft, Pending, CustomsCleared, InTransit, Shipped, Delivered, Cancelled |
| Print | No handler |

### 1.5 Export Delivery Form — `ExportDeliveryForm.tsx`

| Aspect | Evidence |
|---|---|
| Header fields | number, date*, destination country*, port of loading*, port of discharge*, shipping line, container, B/L, invoice number, L/C, Incoterms (FOB/CIF/CFR/EXW/DDP), payment terms (LC/TT/DP/DA/Advance), remarks |
| Line fields | product* (`product_type_export` only), batch (free text), expiry, quantity*, unit price, HSN |
| Submit | `POST /api/order-deliveries` with `{ delivery_type: "export", … }` |
| Real / mocked / incomplete | **Incomplete.** Same 422 contract mismatch. Batch is **not** loaded from FEFO APIs. Invoice/L/C/B/L are strings, not `invoices` rows. No consignee customer/doctor. No depot |
| Inventory | None |

Live PostgreSQL: **0** products have `product_type_export = true`.

### 1.6 Export Delivery Detail — `ExportDeliveryDetail.tsx`

Fabricated `EX-2025-{id}`, always InTransit to USA / Mumbai / Los Angeles / Maersk. Print no-op. No status transitions.

### 1.7 Related but distinct: commercial free goods and product flags

| Surface | Role |
|---|---|
| `settings/Products.tsx` | Persists `product_type_sample`, `product_type_export`, `product_type_commercial`, `product_type_institutional`, plus `free_goods_threshold` / `free_goods_quantity` |
| Order entry | Commercial **free goods** on `order_items.free_goods` (buy-X-get-Y). **Not** sample/gift delivery |
| Promotions | Scheme engine on commercial orders (`promotions.*`). Table `promotions` has **0** live rows. **Not** gift documents |
| `reports.export` | CSV export of reports. **Not** export delivery |

### 1.8 Buttons with no backend action

Print on all four list/detail pages. List Refresh only reloads mocks. Detail has no Dispatch / Deliver / Cancel. Form Create is a real HTTP call that cannot succeed against the current schema.

---

## 2. Existing backend functionality

**There is no Sample, Gift, or Export delivery router, schema, or table.** Searches for `sample_gift`, `getSampleGift`, and `delivery_type` hit only the React files above.

### 2.1 What the forms currently call

`POST /api/order-deliveries` (`order_deliveries.create_order_delivery`):

- Auth: JWT (`PROTECTED` + `require_auth`)
- Body: `OrderDeliveryCreate` — **required** `order_id`, `delivery_date`; items require `order_item_id`, `product_id`, `product_name`, **numeric** `batch_number`, ordered/delivery/picked quantities
- Writes `delivery_orders` / `delivery_order_items` with `ForeignKey("orders.id")` **NOT NULL**
- Does **not** accept `delivery_type`, recipient, gift_type, ports, container, BL, LC, Incoterms
- Does **not** call `StockReservationService`

`POST /api/order-deliveries/from-order/{id}` creates a **Draft** commercial delivery from an existing sales order and is used by Delivery Order screens, not sample/export.

### 2.2 Services that can be reused (not duplicated)

| Service / router | What it does today | Reuse for F |
|---|---|---|
| `StockReservationService` | `with_for_update` on `product_item_stock_details`; writes `order_batch_allocations`; reserve / release / commit ISSUED | **Yes, if generalized** off `order_id` or wrapped with a `source_type` allocation table. Do **not** invent a second ledger |
| `order_validation_service` + `GET .../fefo` in `stock_maintenance.get_product_batches_fefo` | FEFO from **product_item_stock_details** | Read path for batch pickers |
| `order_deliveries.allocate_fefo_batches` | FEFO from **stock_ledger** | **Do not reuse as the stock authority** (see §7) |
| `AuditService` | Entity action log | Header status changes |
| `depot_scope` | `hide_foreign_depot` / `apply_depot_id_filter` | New resources must be depot-owned |
| `doctors` / `chemist_shops` | E.1 CRUD | Recipient lookup **if** product confirms doctor/chemist as recipients |
| `products` GET | Flags for sample/export | Filter catalogs |
| `promotions` | Commercial schemes | **Do not** treat as gift documents |
| `picking_orders` | Tied to commercial `loading_number` on `orders` | Reuse only if sample/export join that loading model; they currently do not |
| `vehicle_loading` | GET only | Incomplete for dispatch |
| `stock_issuance` | GET only; FK to `customers.id` | Cannot store doctor/chemist gifts without schema change |
| `invoices` | Customer/depot invoices; bulk from picking challan | Export “invoice number” is a **string field**, not this table |
| `refunds` | Money liabilities | Not goods returns for samples |
| `depot_transfers` | Inter-depot stock with `inventory.write` | Pattern for inventory.write + depot isolation, not document type |
| `status_service` / `order_status_history` | Commercial delivery/collection statuses | Do not overload unless a written reason says sample/export share that state machine |

### 2.3 Existing Sample/Gift/Export API functionality

**None.** Do not extend `POST /api/order-deliveries` to absorb these payloads: that would change sales-delivery validation (required `order_id`, batch digits, VAT/free-goods on delivery items) and mix non-sale documents into `delivery_orders` (12 live commercial rows).

---

## 3. Current database relationships

Live revision **`d4_baseline`**, 78 application tables. No table name contains `sample`, `gift`, or `export`.

`delivery_allocation_outcomes` and `return_verifications` **are not present** on live PostgreSQL (they were unmapped in older reports; `d4_baseline` did not recreate them). Do not resurrect them without a demonstrated custody requirement.

Relevant existing tables:

| Table | Can it represent sample/gift/export? |
|---|---|
| `orders` / `order_items` | No as-is. Requires `customer_id`/`pso_id`, trade price, validation, collection, memo numbers. Mixing would run commercial credit/VAT/free-goods rules |
| `delivery_orders` | Requires `order_id`. Status enum is commercial packing/loading |
| `order_batch_allocations` | FK `order_id` NOT NULL. Cannot attach to a non-order document without a new nullable `order_id` or a parallel allocation table |
| `product_item_stock` / `product_item_stock_details` | Batch available/reserved — **the reservation authority** |
| `stock_ledger` | Parallel batch qty; used by delivery FEFO helper; **not** what validation locks |
| `stock_issuances` | Customer-scoped warehouse issue; GET-only API |
| `doctors` / `chemist_shops` | Recipient masters (E.1). No FK from any delivery table |
| `products` | Boolean type flags; **all four flags are 0** on 14 live products |
| `invoices` | Sale invoices (5 rows). Not export commercial invoice documents |
| `promotions*` | 0 rows; commercial schemes |
| `audit_logs` | Generic audit |

---

## 4. Sample Delivery workflow analysis

**Source of truth:** the combined Sample Gift UI plus product flags. There is **no separate Sample page**.

Justified by current UI:

1. **Create request** — operator enters recipient (free text + type) and lines from `product_type_sample` products, optional SG number, date, gift type, occasion, remarks.
2. **Persist** — intended, but POST is the wrong contract.
3. **List / view / print** — intended; print and list are mocks.

**Not in the UI (proposals, unconfirmed):** Validation, approval, stock allocation, picking, vehicle dispatch, proof of delivery, returns, billing.

| Topic | What the code shows | Unconfirmed |
|---|---|---|
| Recipient | Free text; type includes Doctor but not Chemist Shop; no `doctor_id` | Should Doctor/Chemist masters be required FKs? |
| Product | Sample-flagged SKUs only | Should commercial SKUs be issuable as samples? Live flags are all false |
| Quantity | Header total of lines | UOM / pack size unused |
| Approval | Status “Pending” appears on mock list only | Who approves? |
| Inventory | Not applied | Must an issue decrement `product_item_stock_details`? Modernization plan: only if gift issue must reduce stock, and then **only** via the existing movement/reservation service |
| Billing | No price on sample form | Assumed non-invoiced; **not confirmed** |
| Documentation | Print button, no PDF | Delivery note vs memo vs challan |

---

## 5. Gift Delivery workflow analysis

The same three pages as Sample. Distinction in UI:

- Header **Gift Type** and per-line gift type (Product Samples vs Promotional Items vs equipment vs literature).
- Mock rows mix “Product Samples”, “Promotional Items”, “Vaccine Samples”, “Conference Kit”.
- Product picker still filters **`product_type_sample` only**. There is **no `product_type_gift` column**.

| Topic | Evidence | Unconfirmed |
|---|---|---|
| Recipient | Same free-text types | Partner / Distributor vs customer master |
| Gift vs sample | String `gift_type`, one document type `sample_gift` | Separate legal documents vs one header with a type column |
| Pricing | None | Book at cost / zero / promo |
| Inventory | Same gap as sample | Promotional literature may not be stocked in `product_item_stock` |
| Promotions module | Separate, empty, commercial | Do not auto-create gift deliveries from promotion BONUS rules without a decision |

Treat **Sample and Gift as one persistence resource** with a `document_kind` or `gift_type` unless product splits them.

---

## 6. Export Delivery workflow analysis

Justified by current UI:

1. **Create** — destination country, ports, optional vessel/container/BL/LC/invoice strings, Incoterms, payment terms, lines with optional batch/expiry, quantity, unit price, HSN.
2. **Value** — client-side `qty * unit_price`.
3. **List statuses** — Draft → Pending → CustomsCleared → InTransit → Shipped → Delivered (and Cancelled).

**Not in the UI:** customer/consignee master, depot, FEFO batch picker, stock reserve, picking, vehicle loading, commercial `invoices` generation, customs file upload, delivery confirmation, returns.

| Topic | Evidence | Unconfirmed |
|---|---|---|
| Destination / recipient | Country + ports; no consignee | Export customer vs sold-to party |
| Order/reference | Optional delivery number; optional invoice/LC/BL **text** | Must a commercial `orders` row exist first? |
| Product / batch | Export-flagged products; batch typed by user | FEFO vs shipper-specified batch |
| Documentation | Form fields only; Print no-op | Regulatory/customs packs are **not** in repo. Flag for confirmation; do not invent HS/customs filings |
| Stock | None | Same reservation service if stock must leave the depot |
| Invoicing | String `invoice_number` + line unit price | Whether `invoices` / VAT / FX apply is **unconfirmed**. Do not auto-post billing |
| Status | Distinct from commercial delivery enum | Do not reuse `DeliveryStatusEnum` without mapping |

---

## 7. Inventory and FEFO impact analysis

### Dual stock stores (live, 25 Nov 2026)

| Store | Rows | Quantity picture |
|---|---:|---|
| `stock_ledger` | 22 | qty 13 000, available 13 000, reserved 0 |
| `product_item_stock` | 13 | `stock_qty` 13 275, `issue` 0 |
| `product_item_stock_details` | 25 | qty 13 275, available 10 635, reserved 2 640 |
| `order_batch_allocations` | 61 | Commercial order FEFO reservations |

These stores are **not reconciled**. Validation and `StockReservationService` mutate **details**. `order_deliveries.allocate_fefo_batches` mutates **ledger**. Product receipts also write ledger. Using both for sample/export would double-count (called out in `BACKEND_MODERNIZATION_PLAN.md` §8).

### How the application answers the ten questions

1. **Available stock** — sellable path: `product_item_stock_details.available_quantity` (order create/update and validation). Ledger `available_quantity` is a second number.
2. **Batch quantities** — details: `quantity`, `available_quantity`, `reserved_quantity`, `batch_no`, `expiry_date`.
3. **FEFO** — `stock_maintenance.get_product_batches_fefo` and validation allocate earliest `expiry_date` on **details**. Delivery helper uses ledger expiry.
4. **Reserve** — `StockReservationService.reserve_allocations`: lock detail row, require `available >= qty`, move to reserved, set allocation `RESERVED`.
5. **Release** — `release_for_order` on order edit/reject validation.
6. **Issuance** — `commit_for_order` sets allocation `ISSUED` and reduces **reserved** (does not reduce `quantity` on details in that method). `stock_issuances` is unused (0 rows, GET-only).
7. **Returns / reconciliation** — finance `reconciliation_*` and `refund_*` are money. No live goods-return table. Retired custody tables must not be recreated without a requirement.
8. **Negative stock** — reservation refuses `available < qty`. No CHECK on details. Ledger FEFO raises 400 if short.
9. **Double allocation** — row lock on details during reserve; allocations keyed to `order_id`. A second document type writing details without allocations would race.
10. **Concurrency** — `with_for_update` only in `StockReservationService`. Delivery ledger FEFO has **no** row lock.

**Safe support rule:** Sample/Gift/Export must not write `stock_ledger` independently. If inventory impact is required, extend or wrap `StockReservationService` so the **same** `product_item_stock_details` rows are locked, and record allocations in a table that is not forced to `orders.id`. Do not add a third quantity column set.

**Recommended default until product confirms:** F.2/F.3 persist documents with **zero stock side effects**. F.4 turns stock on behind tests that prove commercial order reservation still passes.

---

## 8. Proposed API contracts

All **new** routes. Prefix proposal: `/api/sample-gift-deliveries` and `/api/export-deliveries`. Auth: JWT. Depot: non-admin filtered by `depot_id`; foreign id **404**. Do not implement in F.1.

Existing endpoints to **keep calling** from the forms: `GET /api/products`, and (if product agrees) `GET /api/doctors`, `GET /api/chemist-shops`, `GET /api/stock/maintenance/.../fefo` (exact path as today).

### 8.1 Sample/Gift (one resource)

| Method | Route | Body (proposal) | Response | Authz (proposal — product decision) | State | Tables | Inventory | Idempotency | Reuse | Frontend |
|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/sample-gift-deliveries` | query: status, q, skip, limit | list + totals | `orders.read` **or** JWT-only until decided | — | header+items | none | — | list pattern | List (replace mock) |
| GET | `/api/sample-gift-deliveries/{id}` | — | header+items | same + depot 404 | — | same | none | — | — | Detail |
| POST | `/api/sample-gift-deliveries` | recipient fields, gift_type, occasion, remarks, items[{product_id, qty, gift_type}] | 201 header | `orders.write` | → Draft | insert | **none in F.2** | unique `delivery_number` | products, doctors optional | Form submit |
| PUT | `.../{id}` | same, Draft only | header | `orders.write` | Draft | update | none | — | — | future edit (not in UI) |
| POST | `.../{id}/submit` | — | header | `orders.write` | Draft → Pending | status | none | reject if not Draft | AuditService | **not in UI** |
| POST | `.../{id}/approve` | reason? | header | `orders.approve_exception` or `promotions.approve` — **undecided** | Pending → Approved | status | optional reserve | — | StockReservationService later | **not in UI** |
| POST | `.../{id}/reject` | reason | header | same as approve | → Rejected/Cancelled | status | release if reserved | — | — | **not in UI** |
| POST | `.../{id}/dispatch` | vehicle/driver optional | header | `orders.status` or `orders.assign` | Approved → Dispatched | status | commit/issue later | — | — | **not in UI** |
| POST | `.../{id}/deliver` | — | header | `orders.status` | Dispatched → Delivered | status | — | — | — | **not in UI** |
| POST | `.../{id}/cancel` | reason | header | `orders.write` | if not Delivered | status | release | — | — | **not in UI** |
| GET | `.../{id}/print` | — | PDF or 501 | `orders.print` | — | — | none | — | reportlab used on orders | Print buttons |

Do **not** use `POST /api/order-deliveries` for this body.

### 8.2 Export

Same list/get/create/update shape with export shipping fields and priced items. Status transitions proposal (only if UI is later wired; F.1 does not add buttons): Draft → Pending → CustomsCleared → InTransit → Shipped → Delivered, plus Cancel.

Stock endpoints same rule: none until F.4.

Create body must not require `order_id` unless product mandates a commercial order reference (`source_order_id` nullable).

---

## 9. Proposed database design

**New additive tables. Do not modify `d4_baseline`.** Future Alembic revisions only, on a disposable database first. Prefer **not** adding columns to `delivery_orders` or `orders`.

### 9.1 `sample_gift_deliveries`

| Column | Type | Null | Notes |
|---|---|---|---|
| id | serial PK | no | |
| delivery_number | varchar(50) | no | UNIQUE |
| depot_id | int FK depots | no | isolation |
| document_kind | varchar(20) | no | `sample` / `gift` or store only `gift_type` |
| gift_type | varchar(100) | yes | UI list |
| occasion | varchar(255) | yes | |
| status | varchar(50) | no | Draft/Pending/… — app-enforced; do not reuse commercial enum blindly |
| delivery_date | date | no | |
| recipient_name | varchar(255) | no | UI required |
| recipient_type | varchar(50) | no | |
| recipient_address / phone / email | text/varchar | yes | |
| doctor_id | int FK doctors | yes | only if product requires |
| chemist_shop_id | int FK chemist_shops | yes | only if product requires |
| remarks | text | yes | |
| created_by | int FK employees | yes | |
| created_at / updated_at | timestamptz | no | |

Index `(depot_id, status)`, unique `delivery_number`.

### 9.2 `sample_gift_delivery_items`

id PK; `delivery_id` FK cascade; `product_id` FK products NOT NULL; `quantity` numeric(12,2) NOT NULL CHECK > 0; `gift_type` varchar; optional `batch_no` / `expiry_date` only if F.4 allocates; created_at.

### 9.3 `export_deliveries`

Same depot/status/audit pattern. Columns matching the form: destination_country, port_of_loading, port_of_discharge, shipping_line, container_number, bl_number, invoice_number, lc_number, incoterms, payment_terms, remarks, delivery_date, delivery_number UNIQUE. Optional `source_order_id` FK orders **nullable**. Do not put customs file blobs until a requirement exists.

### 9.4 `export_delivery_items`

product_id, batch_number (varchar, **not** digit-only unless product says so), expiry_date, quantity, unit_price, hsn_code.

### 9.5 Stock allocations (F.4 only, if inventory is required)

Either:

- Additive `sample_gift_batch_allocations` / `export_batch_allocations` mirroring `order_batch_allocations` but FK to the new headers and `stock_source_id` → `product_item_stock_details.id`, **or**
- Nullable `order_id` on `order_batch_allocations` plus `source_type` + `source_id` — **riskier**; touches commercial reservation.

Prefer dedicated allocation tables so commercial unique/filter logic stays intact.

**Do not** add warehouse/zone/capacity or customs tables in F.2.

---

## 10. Authorization matrix

No new permission codes in this phase. Mapping below is a **proposal** using the existing 30 codes. **Product must confirm** before F.2 attaches `require_permission`.

| Action | Sample/Gift UI today | Export UI today | Existing code that could fit | Roles that have it today |
|---|---|---|---|---|
| View | any login (menu unscoped) | same | `orders.read` | all six roles |
| Create / edit Draft | form, no gate | form, no gate | `orders.write` | admin, manager, billing, user |
| Submit | none | none | `orders.write` | same |
| Approve / reject | none | none | `orders.approve_exception` **or** `promotions.approve` — **undecided** | manager/admin (+ billing on exception) |
| Reserve stock | none | none | `inventory.write` | admin, manager |
| Pick | none | none | `orders.status` or inventory.write | admin, manager, transport (status) |
| Dispatch | none | none | `orders.assign` / `orders.status` | admin, manager, transport |
| Confirm delivery | none | none | `orders.status` | admin, manager, transport |
| Cancel | none | none | `orders.write` | writers |
| Print | dead button | dead button | `orders.print` | admin, manager, transport |
| Invoice / billing | n/a | text field | `billing.write` only if real invoices | admin, manager, billing |

PSO (`user`) can create commercial orders. Whether they may create sample/export is **unconfirmed**. Menu currently shows both items to everyone.

Depot isolation: new rows need `depot_id`. Admin cross-depot; others 404 on foreign ids (same as E.2/E.3 masters).

---

## 11. Frontend integration gaps

Preserve layouts. Replace data sources only.

| Page | Existing API | Missing | Mock to remove | Fields needing backend | Status | Loading/error | Authz controls |
|---|---|---|---|---|---|---|---|
| SampleGift list | none (comment only) | GET list | 6 fake SG rows | — | map new statuses | already has spinner/empty | hide New if no write |
| SampleGift form | GET products; POST order-deliveries | POST sample-gift; optional doctors/chemists | — | all header/lines | create as Draft | product load toast exists; submit 422 today | disable submit without write |
| SampleGift detail | none | GET by id | fabricated SG-2025 | items, recipient | display only until transitions exist | spinner | no approve buttons unless added later **without redesign** — F.2 can no-op missing actions |
| Export list | none | GET list | 6 fake EX rows | shipping columns | export statuses | spinner/empty | same |
| Export form | GET products; POST order-deliveries | POST export; optional FEFO batches | — | ports, docs, priced lines | Draft | empty export catalog today | same |
| Export detail | none | GET by id | fabricated EX-2025 | value rollup | display | spinner | Print later |

Validation already in forms: required recipient/type or ports; at least one line; qty > 0. Backend must repeat 422.

Do not keep posting to `/api/order-deliveries` once dedicated APIs exist.

---

## 12. Business decisions requiring clarification

1. Must sample/gift **reduce** `product_item_stock_details`? Plan says only if required; UI does not allocate.
2. One table vs separate sample vs gift legal documents.
3. Recipient: free text vs mandatory Doctor/Chemist FKs vs customers.
4. Who approves, and which existing permission.
5. May PSO (`orders.write`) create these, or manager-only.
6. Export: independent document vs child of commercial `orders`; whether `invoices` / VAT / FX apply.
7. Batch: FEFO vs user-typed (export form types batch; sample form has none).
8. Customs/regulatory packs — **not in codebase**; do not invent.
9. Product flags: live catalog has **zero** sample/export SKUs; master-data process to flag SKUs.
10. Gift promotional items not in inventory.
11. Print format (PDF vs browser).
12. Status vocab: UI vs commercial `DeliveryStatusEnum` vs platform `ORDER_CREATED`… — pick one per module.

Until (1), (4), (5), and (6) are answered, F.2 should persist Draft documents only.

---

## 13. Implementation risks

| Risk | Why |
|---|---|
| Reusing `delivery_orders` | Breaks NOT NULL `order_id`, batch digit rule, VAT/free-goods, 12 live deliveries |
| Writing `stock_ledger` and details | Double count; live totals already diverge |
| Turning on stock in F.2 | Plan residual risk; reservation tests could fail |
| New RBAC codes | Forbidden without approval |
| Empty sample/export catalogs | Forms cannot add lines until products are flagged |
| Mock lists in production | Operators may treat SG-2026-001 as real |
| Overloading promotions or orders validation | Credit, collection, memo numbers do not apply |
| Recreating custody tables | Not on live; not required by UI |
| Export “invoice” vs `invoices` | Accidental AR if mis-wired |
| Menu with no permission | UI will show create to roles the API later 403s |

---

## 14. Recommended F.2 / F.3 / F.4 sequence

Adjusted from the suggested split because **sample and gift share one UI and one payload** (`delivery_type: "sample_gift"`), while **export is a different state machine and priced lines**. Stock is deferred so commercial reservation tests stay green.

### F.2 — Sample/Gift persistence (no stock)

- Additive Alembic revision **after** `d4_baseline` (never edit `d4_baseline`) on disposable PostgreSQL.
- Models + `/api/sample-gift-deliveries` CRUD (Draft).
- Replace list/form/detail mocks; form POST to the new route; GET list empty is valid; failures toast, no demo rows.
- Optional doctor/chemist dropdowns **without** layout redesign if FKs are confirmed; otherwise keep free text.
- Tests: 401/403 proposal as decided, depot 404, unique number, 422, SQLite + disposable PG, live row-count preservation.
- **No** reservation, picking, invoice, or commercial order changes.

### F.3 — Export persistence (no stock)

- Additive tables + `/api/export-deliveries`.
- Wire export pages the same way.
- Store documentation **strings**; do not add customs file storage unless decided.
- Same test/Alembic/live-preservation bar.

### F.4 — Inventory, approval, dispatch (only after decisions in §12)

- If stock required: allocation tables + `StockReservationService` extension; FEFO from **details** only; concurrent tests; prove existing order validation/reservation/billing tests still pass.
- If approval required: submit/approve/reject using **existing** permission codes.
- Dispatch/deliver only if UI already has a place for them (today it does not — adding buttons is a product UX change; F.4 may keep API-only transitions).
- Isolated PG, Alembic autogenerate no-op after apply, no live mutation.

Do **not** implement sample/gift and export in one phase if stock is in scope; persistence-first reduces blast radius.

Each implementation phase must include: isolated PostgreSQL, Alembic validation, backend tests, frontend tests/build, authorization tests, stock invariant tests (even if “stock unchanged”), live count checks.

---

## 15. GO / NO-GO recommendation for implementation

**Conditional GO for F.2 (persistence-only Sample/Gift)** after product answers at least: inventory impact (yes/no for F.2), who may create, whether Doctor/Chemist FKs are required.

**NO-GO for F.2 if** the intent is to store these as commercial `orders`/`delivery_orders`, or to decrement stock in the same phase as the first tables.

**GO for F.3** after F.2 exit, same persistence-only rule.

**NO-GO for F.4** until inventory/approval decisions are written and F.2/F.3 documents survive restart without touching `stock_ledger`.

**NO-GO for production use of these screens** until mocks are removed and catalogs have real sample/export products.

This phase does **not** claim sample/gift/export business rules are signed off. It claims only that the React modules, FastAPI contracts, and PostgreSQL catalog were inspected as of 25 November 2026.
