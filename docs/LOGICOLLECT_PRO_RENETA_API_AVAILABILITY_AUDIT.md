# LogiCollect Pro ↔ RENATA API Availability Audit

**Status: AUDIT ONLY — NO IMPLEMENTATION**  
**Recorded:** 26 November 2026  
**Spec:** uploaded `LogiCollect-Pro-Backend-API.md` (26 Nov 2026)  
**Backend:** FastAPI `backend/main.py` → `create_api_app(isolated_workflow=False)` in `backend/app/api_app.py`

This report does **not** authorize connecting the Flutter app to live data, adding endpoints, changing models, or deploying.

**Verdict: NO-GO for connecting LogiCollect Pro to live RENATA data.**  
Zero LogiCollect endpoints are an exact contract match. Commercial order/collection/depot APIs can be **reused as a base**, but every Flutter screen needs an adapter (paths, camelCase, integer BDT, employee-scoped memos, check-in, cash wallet). Isolated Sample/Gift/Export fulfillment is **not** the memo API.

---

## 1. Executive summary

LogiCollect Pro is a DSR field app for **chemist/pharmacy memos**: accept → check-in → deliver (full/partial) → collect cash or credit → deposit wallet → return undelivered lines. Money is **integer taka**. Auth is employee ID or phone plus password. Lists are **assigned-to-me**, not depot-wide.

RENATA is a **warehouse/depot web DMS**. Production APIs live under `/api/...`, use **snake_case**, **Decimal** money, **email login**, **JWT access token only** (no refresh token store), and **depot isolation** (not DSR assignment isolation). The closest field surface is `backend/app/routers/mobile.py` (`/api/mobile/...`): list assigned loaded orders and accept a memo. Collection and deposits live in `orders.py` and `billing.py` as **web HQ / billing-role** operations.

| Measure | Count |
|---|---|
| Contract operations audited | **36** (34 must-have from spec body + 2 should-have) |
| Exact matches | **0** |
| Partial matches | **8** |
| Equivalent routes (adapter required) | **11** |
| Internal-only (model/service, no suitable public API) | **4** |
| Isolated / test-only | **0** (none of the Flutter contract is isolated) |
| Missing | **13** |
| Exact contract readiness | **0 / 36 = 0%** |
| Business-function reuse (partial + equivalent + internal) | **23 / 36 ≈ 64%** |

Until slice 1 of the spec exists as a real Flutter contract (login + me + memo list/detail + accept + check-in + deliver + cash collect), the app should stay on mock data.

---

## 2. Backend architecture

| Piece | Location | Notes |
|---|---|---|
| Production app | `backend/main.py` | `create_api_app(isolated_workflow=False)` |
| Isolated app | `backend/isolated_workflow_app.py` | F.4B.2–F.4D-DEV only; **404 on live Compose** |
| Route registration | `backend/app/api_app.py` `register_production_routes` | Prefix `/api/...`; `PROTECTED = Depends(require_auth)` on most routers |
| Auth | `backend/app/routers/auth.py`, `backend/app/auth.py` | Email + password; JWT `sub` = email; `remember_me` only lengthens access TTL |
| Employees | `backend/app/models.py` `Employee` | `id` int PK, `employee_id` string, `phone`, no photo column |
| Commercial memos | `Order` / `OrderItem` | `memo_number`, `assigned_to`, `loading_number`, `mobile_accepted*`, `collection_status` |
| Warehouse delivery docs | `OrderDelivery` table `delivery_orders` | Status Draft→Packing→Loading→Shipped→Delivered |
| Field accept | `backend/app/routers/mobile.py` | Depot-filtered assigned **unaccepted** memos |
| Collections | `Order.collection_*`, `CollectionTransaction`, remaining-cash endpoints | Web/billing oriented |
| Deposits | `CollectionDeposit`, `DepositMethodEnum` BRAC / bKash / **Nagad** (not Rocket) | `billing.write` |
| Chemists | `ChemistShop` **and** `Customer` | Orders use `customer_id` string on `Order`, not `chemist_shops.id` |
| Credit | `Customer.credit_limit`, `CustomerCreditBalance`, refunds API | No due-date credit-chemist list |
| Storage | `Product.cold_chain_available` bool | Not `coldChain`/`general` on memo lines |
| Isolated F.4 | `isolated_inventory` / `isolated_fulfillment` | Sample/Gift/Export **test documents**, not chemist memos |

**Correct domain mapping for LogiCollect**

| Flutter concept | RENATA entity that is relevant | Do not use |
|---|---|---|
| Memo / invoice | Commercial `Order` (`memo_number`, loaded + assigned) | Sample/Gift Draft, Export Draft, isolated fulfillment |
| Invoice number | `Order.memo_number` (8-digit) | Isolated warehouse document ids |
| Assigned DSR | `Order.assigned_to` → `Employee.id` | Isolated synthetic actors |
| Accept | `Order.mobile_accepted*` | Draft submit/approve |
| Delivery qty | `OrderDeliveryItem.delivery_quantity` **or** web `approve-delivery` counts | Isolated pick slices |
| Collection | `collected_amount` / `pending_amount` / `collection_status` | Isolated issue/dispatch |
| Chemist on a memo | `Order.customer_*` / `customers` | `chemist_shops` is a **separate** master; not wired to orders |
| Today’s route | `Order.route_code` + TMS `RouteStop` + trips | Isolated dispatch notes |

---

## 3. Complete existing route inventory

Enumerated by **static AST** of `backend/app/routers/*.py` plus factory routes in `api_app.py`. The production FastAPI app was **not** imported (lifespan seeds permissions). Isolated routes are **not** production-ready.

Counts: **271** production handlers (including `/` and `/health`); **21** isolated-only handlers.

### 3.1 Production (`main:app`)

Global: `GET /`, `GET /health`.

Authentication (`auth.py`, prefix `/api/auth`, login unauthenticated):

| Method | Path | Handler |
|---|---|---|
| POST | `/api/auth/login` | `login` |
| POST | `/api/auth/signup` | `signup` (admin.users) |
| GET | `/api/auth/me` | `get_current_user_info` |
| GET | `/api/auth/permissions` | `get_my_permissions` |
| POST | `/api/auth/refresh` | `refresh_token` (issues **new access** from current token; not a refresh-token grant) |
| POST | `/api/auth/logout` | `logout` (audit only) |

Mobile (`mobile.py`, `/api/mobile`, JWT):

| Method | Path | Handler |
|---|---|---|
| GET | `/api/mobile/assigned-memos` | `get_assigned_memos` |
| POST | `/api/mobile/accept-memo` | `accept_memo` |
| GET | `/api/mobile/loading-number/{loading_number}/status` | `get_loading_number_status` |
| GET | `/api/mobile/my-accepted-memos` | `get_my_accepted_memos` |

Orders (commercial memos) — selected field-relevant:

| Method | Path | Handler |
|---|---|---|
| GET | `/api/orders` | `list_orders` |
| GET | `/api/orders/{order_id}` | `get_order` |
| GET | `/api/orders/assigned` | `get_assigned_orders` |
| GET | `/api/orders/mis-report` | `get_mis_report_memos` |
| GET | `/api/orders/mis-report/{memo_id}` | `get_mis_report_memo_detail` |
| PUT | `/api/orders/assigned/{order_id}/status` | `update_assigned_order_status` |
| POST | `/api/orders/assigned/approve-delivery` | `approve_delivery` |
| GET | `/api/orders/remaining-cash-list` | `get_remaining_cash_list` |
| POST | `/api/orders/remaining-cash/collect/{loading_number}` | `collect_remaining_cash` |
| POST | `/api/orders/{order_id}/mark-partial-collection` | `mark_partial_collection` |
| POST | `/api/orders/{order_id}/mark-postponed-collection` | `mark_postponed_collection` |
| POST | `/api/orders/{order_id}/approve-collection` | `approve_collection` |

Order deliveries: CRUD + `POST /api/order-deliveries/{id}/advance` + `GET /api/order-deliveries/tracking/{identifier}`.

Billing: deposits CRUD/approve, transactions, collection-person report.

Chemist shops: `GET/POST /api/chemist-shops`, `GET/PUT/DELETE /api/chemist-shops/{id}`.

Customers: `GET/POST /api/customers/`, `GET/PUT/DELETE /api/customers/{id}`, `GET /api/customers/code/{code}`.

Refunds: liabilities, `GET /api/refunds/customers/{customer_id}/credit-balance`, settle.

Dashboard: `GET /api/dashboard/kpis`.

Routes master: `GET /api/routes/`, `GET /api/routes/{route_pk}` (master data, **not** `/routes/today`).

TMS: `GET /api/transport/routes/{route_id}/stops` (lat/lng sequence), trips, expenses.

Employees: admin CRUD `/api/employees/`.

Draft Sample/Gift and Export **CRUD** is mounted on production (`/api/sample-gift-deliveries`, `/api/export-deliveries`) as **draft documents**, write-flag gated. Submit/approve/reject, reservation, and fulfillment are **not** on `main:app`.

Other production modules (full AST list): companies, depots, vendors, doctors, products, materials, shipping-points, route-shipping-points, uoms, primary-packagings, price-setups, role-masters, product-receipts, picking-orders, vehicles, drivers, stock receipts/issuances/adjustments/maintenance, product-item-stock, invoices, depot-transfers, audit-logs, promotions, reconciliation, integrations, devices, sync, reports, validation/status under `/api/orders`, vehicle loadings.

Devices/sync (`/api/devices`, `/api/sync`) are **DEX binding / generic sync queue**, not LogiCollect telemetry or memo APIs.

### 3.2 Isolated only (`isolated_workflow_app:app`)

Not suitable for LogiCollect:

- `POST /api/sample-gift-deliveries/{id}/submit|approve|reject` and Export twins  
- `/api/isolated-inventory/.../reserve|reservations|release`  
- `/api/isolated-fulfillment/...` pick / issue / dispatch / delivery  

### 3.3 Defined but not a LogiCollect mount

- `CollectionStatusEnum` / `DeliveryStatusEnum` in `models_platform.py` are **not** the HTTP contract for Flutter enums.  
- `POST /api/auth/refresh` is **not** refresh-token rotation.  
- No unmounted `/memos` or `/wallet` routers exist.

---

## 4. Required API comparison

See §5–7 and the full table in §11. Every row uses **one** primary status. **EXACT MATCH** requires verified Flutter field names, enums, money, and rules — none qualified.

---

## 5. Exact matches

**None.**

`POST /api/auth/login` and `GET /api/auth/me` share a path suffix with the spec but fail camelCase keys, `employeeId` login, `refreshToken`, integer user `id` vs string `D001`, and error `{detail}` vs `{code,message}`.

---

## 6. Partial / equivalent matches

### Partial (same family, contract differs)

| Flutter | RENATA | Gap |
|---|---|---|
| POST `/auth/login` | POST `/api/auth/login` | Body `email` (EmailStr) not `employeeId`; response `access_token` not `accessToken`; no `refreshToken`; `expiresIn` absent; user is snake_case + depot |
| GET `/auth/me` | GET `/api/auth/me` | Same user object mismatch; no `name` / `profilePictureUrl` |
| POST `/auth/logout` | POST `/api/auth/logout` | Audit log only; JWT stays valid until expiry |
| GET/POST `/chemists`, PATCH `/chemists/{id}` | `/api/chemist-shops` GET/POST/PUT | Path, JSON (`code` vs `legacyCode`, `is_active` vs `active`, required `owner_name`, no BD geography, no photo, PUT not PATCH, write = admin/manager) |
| GET/POST `/wallet/deposits` | `/api/billing/deposits` | JSON Decimal; methods `BRAC`/`bKash`/`Nagad` vs `brac`/`bkash`/`rocket`; `billing.write`; no cash-on-hand cap; `collection_person_id` required |

### Equivalent (adapter required)

| Flutter | RENATA candidates | Why not the same |
|---|---|---|
| GET `/memos` | GET `/api/mobile/assigned-memos`, `/api/mobile/my-accepted-memos`, `/api/orders/assigned`, `/api/orders/mis-report` | Split lists; snake_case; depot not `assignedTo`; no Flutter statuses; money float |
| GET `/memos/{id}` | GET `/api/orders/{id}`, `/api/orders/mis-report/{memo_id}` | No `items[].deliveredQty`, `storageCondition`, `collectibleDue`, `credit` block |
| POST `/memos/{id}/accept` | POST `/api/mobile/accept-memo` | Body `{memo_number\|order_id, user_id}`; does not require JWT user == assignee; `user_id` is a free string |
| POST `/memos/{id}/deliver` | POST `/api/orders/assigned/approve-delivery`; `POST /api/order-deliveries/{id}/advance` | HQ loading-group qty totals, or warehouse stage advance — not per-line DSR confirm |
| POST `/memos/{id}/collect` | POST `/api/billing/transactions`; remaining-cash / mark-partial / mark-postponed | Client-supplied amounts; no cash vs credit wallet split; billing permissions |
| GET `/routes/today` | GET `/api/routes/`, `/api/transport/routes/{id}/stops`, assigned orders | Master route + lat/lng stops; no Dhaka “today” DSR itinerary with memoId |
| GET `/wallet` | GET `/api/billing/reports/collection-person/{id}` | Decimal totals; not DSR self wallet; no creditBalance vs cashBalance split as specified |
| GET `/wallet/movements` | GET `/api/billing/transactions` | Same |
| POST `/chemists/{id}/active` | PUT `/api/chemist-shops/{id}` `is_active` | Combined update |
| GET `/credit-chemists` | GET `/api/refunds/customers/{id}/credit-balance` + `Customer.credit_limit` | Per-id balance, not a DSR list with `dueDate` |
| GET `/activity` | GET `/api/orders/mis-report` | No `deliveredAt` sort contract |

---

## 7. Missing functionality

| Flutter | Status | Nearby internals |
|---|---|---|
| PATCH `/auth/me` | **INTERNAL** | `Employee` fields; only `PUT /api/employees/{id}` with `admin.users` |
| POST/DELETE `/auth/me/photo` | **MISSING** | No photo column or upload |
| POST `/auth/change-password` | **MISSING** | `hashed_password` + `verify_password` exist |
| POST `/memos/accept-batch` | **MISSING** | Loop of accept-memo would still be wrong-scoped |
| POST `/memos/{id}/check-in` | **MISSING** | No `checkedInAt`; TMS stop has no check-in status |
| POST `/memos/{id}/postpone` | **MISSING** | `Order.postponed` boolean; collection postpone is different |
| POST `/memos/{id}/cancel` | **MISSING** | `delivery_rejected*` columns; no field API |
| GET `/returns/pending` | **INTERNAL** | `approve-delivery` `returned_quantity` is a **header count**, not per-line remaining |
| POST `/returns/{id}/adjust` | **MISSING** | `stock_adjustment`, product receipts `RETURN` are warehouse HQ |
| GET `/returns?status=adjusted` | **MISSING** | |
| Chemist photo POST/DELETE | **MISSING** | |
| POST `/credit-chemists/{id}/clear` | **MISSING** | Refund settle ≠ “allow new orders” |
| GET `/exceptions` | **INTERNAL** | `Product.cold_chain_available` |
| GET `/performance` | **INTERNAL** | Dashboard KPIs + placeholder report `depot_performance_league` |
| POST `/telemetry/location` | **MISSING** | `POST /api/sync/push` is a generic DEX queue |

---

## 8. Request/response contract differences (cross-cutting)

| Topic | Flutter | RENATA |
|---|---|---|
| Base path | `/auth`, `/memos`, … | `/api/...` |
| Keys | camelCase (`accessToken`, `employeeId`) | snake_case |
| User id | string `D001` | integer PK `Employee.id`; code is `employee_id` |
| Money | integer BDT | `Decimal` / `float` |
| Time | ISO-8601 with `+06:00` | `datetime.utcnow()` naive ISO, or `date` only |
| Business day | Asia/Dhaka | `date.today()` (server TZ) |
| Errors | `{code, message}` | `{detail: str}` or FastAPI 422 `{detail: [...]}` |
| Auth header | Bearer | Bearer (OAuth2) |
| Login identity | phone **or** employee code | **email only** (`authenticate_user`) |
| Refresh | `refreshToken` + logout revoke | No stored refresh; `/refresh` mints another access JWT |
| Idempotency | `Idempotency-Key` on check-in/deliver/collect/deposit | **Not** on commercial/mobile/billing. Isolated F.4 only |
| Enums | `fullDelivered`, `due`, `brac`, `rocket`, `coldChain` | `Fully Collected`, `Pending`, `BRAC`, `Nagad`, boolean cold chain |
| Pagination | unspecified | `skip`/`limit` on many lists |

---

## 9. Authentication and security gaps

Evidence:

- JWT: `backend/app/auth.py` HS256, payload `sub`=email, `id`=employee PK.  
- `require_auth` on production routers except login.  
- Depot hide: `hide_order` / `filter_orders` compare **`Order.depot_code`**, not `assigned_to == user.id` (`depot_scope.py`).  
- `GET /api/mobile/assigned-memos` returns **all loaded unaccepted memos in the depot**. A DSR sees colleagues’ memos.  
- `POST /api/mobile/accept-memo` records `payload.user_id` (client string), **not** `user.id` from JWT. Another depot user who can see the order can accept as any `user_id`. Already-accepted returns 200 success (soft idempotency, not keyed).  
- Chemist list has **no extra permission** beyond JWT (any authenticated role). Writes are admin/manager.  
- Deposits require `billing.write`; a DSR `user` role typically **cannot** post deposits.  
- Logout does not blacklist tokens.  
- No `Idempotency-Key` on commercial mutating routes (replay risk on field networks).  
- Profile PUT is `admin.users` — DSRs cannot self-update; conversely an admin can change any employee in-depot.

Risks if Flutter were pointed at live APIs today: cross-DSR memo visibility, spoofable accept identity, billing-role mismatch, unrecalled JWTs, decimal money rounding vs integer taka.

**No live credentials were used.** Production mutating calls were not executed.

---

## 10. Memo and delivery lifecycle findings

Flutter machine: `pending → accepted → (check-in) → fullDelivered|partialDelivered|postponed|canceled`.

RENATA commercial machine (simplified):

- Order status: Draft / Submitted / Approved / Partially Approved (`OrderStatusEnum`).  
- Warehouse delivery doc: Draft → Packing → Loading → Shipped → Delivered (`DeliveryStatusEnum`).  
- Field flag: `mobile_accepted` boolean.  
- Collection strings: Pending, Partially Collected, Postponed, Fully Collected.  
- `approve_delivery` sets collection from **loading-level** delivered/returned **integers**, not line qtys, and uses **order total** (loading qty × price) rather than deliveredAmount = Σ deliveredQty × unitPrice.

**Accept does not precede a dedicated deliver endpoint.** Check-in does not exist. Route stop status (`pending|checkedIn|delivered|…`) is **not** stored on `RouteStop` (that table is lat/lng sequence only).

Isolated fulfillment (`PICKING`→`DELIVERED`) is a **different product** (Sample/Gift/Export drafts) and must not be mapped to chemist memos.

---

## 11. Collection and wallet findings

Flutter: `collectibleDue = max(0, deliveredAmount - paidAmount)`; cash collect increases wallet; credit collect does not; `creditDueAt` hides until due.

RENATA:

- `collected_amount` / `pending_amount` on `Order`.  
- `approve_delivery` can set `collected_amount = total_amount` on **full delivery before cash is taken** (treats delivered as collected). That **breaks** collectible-due.  
- `CollectionTransaction` stores client-supplied collected/pending/total; updates `order.collection_status` to enum **display strings**.  
- No `creditDueAt`. Credit mode is `Order.order_type` COD/CREDIT and customer flags, not postponed collection with a date.  
- Wallet snapshot is `CollectionReportResponse` Decimal totals, not `{cashBalance, creditBalance, currentBalance}`.  
- No server rule “deposit ≤ cash on hand” in `create_collection_deposit`.

---

## 12. Deposit and return findings

Deposits: reusable **HQ billing** records (`collection_deposits`). Methods: BRAC, bKash, **Nagad**. Flutter: brac, bkash, **rocket**. Multipart slip is `attachment_url` string, not `file` in create (UploadFile imported in billing.py but create uses JSON schema).

Returns: Flutter remaining = ordered − delivered **per line**. RENATA `DeliveryApprovalMemo` has `delivered_quantity` + `returned_quantity` as **two integers per memo**, not SKU lines. `OrderItem` has no `delivered_qty`. `OrderDeliveryItem` has `ordered_quantity` and `delivery_quantity` (warehouse FEFO allocation), not field-confirmed shorts. No return memo number `R2500004` API.

---

## 13. Chemist and credit findings

- **`chemist_shops`**: master with `code`, `owner_name` required, city, no division/district/thana, no `legacyCode`/`cnBalance`/`imageUrl`. Duplicate check on `code`.  
- **`customers`**: what orders actually reference (`Order.customer_id` is a **string**, not FK to `customers.id`). Credit limit and cash/credit flags live here.  
- Flutter chemists are likely **customers** in commercial flow; wiring chemists CRUD to `chemist_shops` would **not** update memo `customerName`.  
- Credit list: `CustomerCreditBalance.balance_amount` + refunds GET; no `dueDate`, no “clear so they can order” endpoint (`delivery_status_block` on Customer is a different flag).

---

## 14. Performance and exception findings

- Exceptions: `Product.cold_chain_available` boolean; memo lines do not carry `storageCondition`. Validation “approve-exception” is **order credit/risk validation**, not cold chain.  
- Performance: `GET /api/dashboard/kpis` is depot order-pipeline counts (validated/assigned/collection buckets), not DSR target vs actual deliveries/collections/amounts. Report registry includes a **placeholder** depot performance league.

---

## 15. Existing reusable services

| Service | Reuse for LogiCollect |
|---|---|
| JWT + `Employee` | Yes, after login identifier expansion |
| `Order` assignment + loading | Yes, as memo source |
| `mobile.accept_memo` | Prototype only; must bind JWT and assignee |
| `OrderItem` prices/qty | Line catalog; add delivered qty |
| `CollectionDeposit` / `CollectionTransaction` | Ledger after wallet rules |
| `hide_order` depot 404 | Keep, **add** assignee 404 |
| TMS `RouteStop` lat/lng | Optional map; not stop status |
| `Product.cold_chain_available` | Map to `storageCondition` |
| Isolated F.4 APIs | **Do not reuse** for this app |
| `sync.push` idempotency | Pattern only; payload is not memos |

---

## 16. Development effort estimates (after this audit; not scheduled work)

| Module | Nature | Effort (engineering days, order-of-magnitude) |
|---|---|---|
| Auth adapter (phone/code login, camelCase, me, logout, password, optional photo) | Adapter + small model | 3–6 |
| Memo list/detail + accept (+ batch) + employee scope | Adapter + query rewrite | 5–10 |
| Check-in + deliver + postpone/cancel + stop sync | **New lifecycle** on Order + RouteStop | 10–18 |
| Collect cash/credit + collectibleDue + wallet | Substantial rules vs current collection_status | 8–14 |
| Deposits DSR self-service + method enum + cap | Adapter on billing | 3–6 |
| Returns per-line + return memo | Substantial / mostly missing | 8–14 |
| Chemists vs customers unification + photos | Medium | 5–10 |
| Credit list + clear | Medium | 3–6 |
| Exceptions + performance | Small once memo lines exist | 2–4 |
| Idempotency + Dhaka time + integer money | Cross-cutting | 3–5 |

Totals are sequential and overlapping; first slice (spec § First slice 1–3) is the critical path.

---

## 17. Recommended implementation sequence

Do **not** implement until this audit is reviewed.

1. Contract adapter layer (`/auth/*`, `/memos*`) over commercial `Order`, integer BDT, Asia/Dhaka, `{code,message}`, JWT employee scope.  
2. Accept + check-in + deliver with line qty validation and stop sync.  
3. Cash collect + wallet + deposits (cap).  
4. Credit collect + credit chemists.  
5. Returns.  
6. Chemists (decide Customer vs ChemistShop).  
7. Performance + exceptions.  

Keep Flutter on mocks until 1–3 exist. Do not mount isolated F.4 as the field API.

---

## 18. Final coverage statistics

Contract set **N = 36** (checklist 31 + chemist photos 2 + adjusted returns 1 + telemetry 1 + activity 1).

| Status | Count | % of 36 |
|---|---|---|
| EXACT MATCH | 0 | 0% |
| PARTIAL MATCH | 8 | 22% |
| EQUIVALENT API | 11 | 31% |
| INTERNAL ONLY | 4 | 11% |
| ISOLATED / TEST ONLY | 0 | 0% |
| MISSING | 13 | 36% |
| UNVERIFIED | 0 | 0% |

**Exact contract readiness:** 0%.  
**Reuse (partial+equivalent+internal):** 23/36 ≈ 64%.  
Equivalent is **not** counted as exact.

Must-have subset (exclude telemetry, activity): **N = 34**; exact 0%; reuse 22/34 ≈ 65%.

---

## 19. GO / NO-GO for connecting LogiCollect to live data

**NO-GO.**

Reasons: no exact endpoints; login is email-only; memos are depot-wide; accept identity is client-supplied; no check-in; delivery/collection math does not match integer `deliveredAmount`/`collectibleDue`; deposits are billing-role and Nagad≠Rocket; chemists master is not the order customer; isolated warehouse APIs are the wrong domain.

**GO** only after a reviewed implementation of spec first slice 1–3 against disposable data, with employee scoping and money rules tested.

---

## Detailed comparison table (every spec operation)

Priority: M = must have, S = should have.

| Feature | Method | Path | Pri | RENATA method/path | Router / handler | Status | Request | Response | Rules | Security | Required changes | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sign in | POST | `/auth/login` | M | POST `/api/auth/login` | `auth.py::login` | PARTIAL | `employeeId` vs `email` | snake_case, no refresh | Email only | JWT OK | Identifier, camelCase, refresh policy | `auth.py`, `LoginRequest`, `authenticate_user` |
| Me | GET | `/auth/me` | M | GET `/api/auth/me` | `auth.py::get_current_user_info` | PARTIAL | Bearer OK | no `name`/`profilePictureUrl` | — | JWT | Map profile | `build_user_profile` |
| Logout | POST | `/auth/logout` | M | POST `/api/auth/logout` | `auth.py::logout` | PARTIAL | Bearer | `{message}` | No revoke | Token remains valid | Blacklist or refresh store | `logout` |
| Edit profile | PATCH | `/auth/me` | M | PUT `/api/employees/{id}` | `employees.py::update_employee` | INTERNAL | Admin body | Employee schema | Not self-service | `admin.users` | Self-service PATCH | employees router |
| Profile photo | POST | `/auth/me/photo` | M | — | — | MISSING | multipart | — | — | — | Storage + column | Employee model |
| Remove photo | DELETE | `/auth/me/photo` | M | — | — | MISSING | — | — | — | — | Same | — |
| Change password | POST | `/auth/change-password` | M | — | — | MISSING | — | — | min 6 exists on signup only | — | Verify current hash | `verify_password` |
| Memo list | GET | `/memos` | M | GET `/api/mobile/assigned-memos` (+ others) | `mobile.py::get_assigned_memos` | EQUIVALENT | skip/limit, no Flutter filters | `MobileAssignedMemo` | Depot not assignee; unaccepted only | Cross-DSR leak | Unified query + enums + money | `mobile.py` |
| Memo details | GET | `/memos/{id}` | M | GET `/api/orders/{id}` / mis-report | `orders.py` | EQUIVALENT | int id | no lines deliveredQty/credit | 404 is depot not assignee | Depot 404 | Compose Flutter object | `MISReportMemoDetail` |
| Accept | POST | `/memos/{id}/accept` | M | POST `/api/mobile/accept-memo` | `mobile.py::accept_memo` | EQUIVALENT | memo_number + user_id | success wrapper | pending→accepted not modelled | `user_id` spoof | Path + JWT bind | `accept_memo` |
| Accept batch | POST | `/memos/accept-batch` | M | — | — | MISSING | — | — | skip non-pending | — | New | — |
| Check-in | POST | `/memos/{id}/check-in` | M | — | — | MISSING | — | — | stop sync | — | New fields + txn | `RouteStop` has no status |
| Deliver | POST | `/memos/{id}/deliver` | M | POST `/api/orders/assigned/approve-delivery` | `orders.py::approve_delivery` | EQUIVALENT | loading memos counts | message + counts | Not line validation; collected=total | JWT depot | New per-memo deliver | `DeliveryApprovalRequest` |
| Postpone delivery | POST | `/memos/{id}/postpone` | M | — | `Order.postponed` | MISSING | — | — | — | — | New + stop | models.Order.postponed |
| Cancel delivery | POST | `/memos/{id}/cancel` | M | — | `delivery_rejected*` | MISSING | — | — | — | — | New + stop | Order columns |
| Collect | POST | `/memos/{id}/collect` | M | POST `/api/billing/transactions` + remaining-cash | `billing.py`, `orders.py` | EQUIVALENT | client amounts | transaction | No creditDueAt; cash=credit mixed | billing.write / HQ collect | Wallet rules | CollectionCollectRequest |
| Today’s route | GET | `/routes/today` | M | GET `/api/routes/` + TMS stops | `routes.py`, `transport.py` | EQUIVALENT | — | master route | No today/Dhaka/memoId | depot routes | Compose from assigned orders | RouteStop |
| GPS telemetry | POST | `/telemetry/location` | S | POST `/api/sync/push` | `sync.py::sync_push` | MISSING | generic sync | — | — | `sync.write` | Dedicated or skip v1 | spec optional |
| Wallet | GET | `/wallet` | M | GET `/api/billing/reports/collection-person/{id}` | `billing.py` | EQUIVALENT | person id | Decimal report | No cash vs credit | billing.read | DSR self snapshot | CollectionReportResponse |
| Movements | GET | `/wallet/movements` | M | GET `/api/billing/transactions` | `billing.py::list_collection_transactions` | EQUIVALENT | filters | Decimal rows | kind=collect/deposit N/A | billing.read | Map kinds | — |
| Record deposit | POST | `/wallet/deposits` | M | POST `/api/billing/deposits` | `billing.py::create_collection_deposit` | PARTIAL | JSON vs multipart; Nagad vs rocket | deposit row | No cash cap | billing.write | Self DSR + cap + enum | DepositMethodEnum |
| Deposit list | GET | `/wallet/deposits` | M | GET `/api/billing/deposits` | `list_collection_deposits` | PARTIAL | person filter | list | — | billing.read | Self filter | — |
| Returns pending | GET | `/returns/pending` | M | — | approve-delivery returned_quantity | INTERNAL | — | — | Not per-line | — | Line remaining | DeliveryApprovalMemo |
| Mark returned | POST | `/returns/{id}/adjust` | M | POST `/api/stock/adjustments/` | `stock_adjustment.py` | MISSING | HQ adjustment | — | Not return memo | stock roles | New | — |
| Returns adjusted | GET | `/returns?status=adjusted` | M | — | — | MISSING | — | — | — | — | New | spec §6.2 |
| Chemists list | GET | `/chemists` | M | GET `/api/chemist-shops` | `chemist_shops.py::list_chemist_shops` | PARTIAL | q, is_active | ChemistShop | Not customers | JWT any role | Geography + mapping | schemas.ChemistShop |
| Chemist create | POST | `/chemists` | M | POST `/api/chemist-shops` | `create_chemist_shop` | PARTIAL | JSON vs multipart; owner required | 201 | duplicate code | admin/manager | Fields + photo | chemist_shops.py |
| Chemist edit | PATCH | `/chemists/{id}` | M | PUT `/api/chemist-shops/{id}` | `update_chemist_shop` | PARTIAL | PUT | same | — | admin/manager | PATCH + fields | — |
| Chemist photo | POST | `/chemists/{id}/photo` | M | — | — | MISSING | — | — | — | — | New | — |
| Chemist photo del | DELETE | `/chemists/{id}/photo` | M | — | — | MISSING | — | — | — | — | New | — |
| Chemist active | POST | `/chemists/{id}/active` | M | PUT shop `is_active` | `update_chemist_shop` | EQUIVALENT | flag | shop | Immediate active | admin/manager | Dedicated or map | — |
| Credit list | GET | `/credit-chemists` | M | GET `/api/refunds/customers/{id}/credit-balance` | `refunds.py` | EQUIVALENT | per customer | `{balance}` | no dueDate | billing.read | List + due dates | CustomerCreditBalance |
| Clear credit | POST | `/credit-chemists/{id}/clear` | M | POST `/api/refunds/liabilities/{id}/settle` | `settle_liability` | MISSING | settle amount | liability | Different meaning | billing.approve | Policy + API | refunds.py |
| Exceptions | GET | `/exceptions` | M | — | `Product.cold_chain_available` | INTERNAL | — | — | not on lines | — | Group memos | models.Product |
| Performance | GET | `/performance` | M | GET `/api/dashboard/kpis` | `dashboard.py::get_dashboard_kpis` | INTERNAL | — | pipeline KPIs | not DSR targets | JWT depot | Targets store | dashboard.py |
| Activity | GET | `/activity` | S | GET `/api/orders/mis-report` | `get_mis_report_memos` | EQUIVALENT | — | MIS cards | no deliveredAt | depot | Filter | orders.py |

---

## Critical business rules (spec §7)

| # | Rule | Mark | Gap |
|---|---|---|---|
| 1 | DSR sees only assigned memos | **MISSING** | Depot filter only (`filter_orders`) |
| 2 | Accept before delivery | **MISSING** | No field deliver API; accept is optional flag |
| 3 | Check-in before delivery | **MISSING** | No `checkedInAt` |
| 4 | Partial qty validated server-side | **PARTIAL** | Warehouse FEFO on `OrderDeliveryItem`; field `approve-delivery` uses memo-level ints, not 0≤qty≤ordered per SKU |
| 5 | deliveredAmount from delivered qty | **MISSING** | Full delivery sets collected to **order total** |
| 6 | collectibleDue never negative | **UNVERIFIED** / **PARTIAL** | `pending_amount` can be set by client; no `max(0, …)` helper found |
| 7 | Credit collect does not increase cash | **MISSING** | No cash vs credit wallet |
| 8 | Deposit ≤ cash-on-hand | **MISSING** | `create_collection_deposit` does not compare |
| 9 | Postponed credit due date | **MISSING** | No `creditDueAt` |
| 10 | Returns = genuine undelivered | **MISSING** | Header returned_quantity, not lines |
| 11 | Memo and route-stop sync | **MISSING** | RouteStop has no delivery status |
| 12 | Integer BDT at API boundary | **MISSING** | Decimal/float |
| 13 | ISO-8601 with offset | **PARTIAL** | Naive utcnow ISO |
| 14 | Asia/Dhaka business dates | **MISSING** | `date.today()` |
| 15 | Access control employee/customer | **PARTIAL** | Depot JWT; not employee memo ACL; chemists readable by any role |
| 16 | Idempotency-Key on writes | **MISSING** on commercial; **ISOLATED** on F.4 only |

---

## Tests reviewed (read-only)

Existing automated tests cover auth RBAC, depot scope, order lifecycle, billing-adjacent orders, chemist CRUD, **not** LogiCollect camelCase contracts. Isolated F.4 tests must not be treated as memo E2E. No production POST/PATCH/DELETE was issued for this audit.
