# RENATA page-by-page API connection matrix

Statuses used:

- **VERIFIED — REAL API** — pytest and/or prior HTTP coverage plus live query origin.
- **FIXED — REAL API** — dummy/hardcoded business data removed this session; now API or honest empty/error.
- **API-WIRED — CODE TRACE** — `apiEndpoints` used; not re-proven with SQL/browser this session.
- **INTENTIONALLY DISABLED** — F.4 / draft write flags / isolated workflow.
- **MISSING BACKEND API** — UI action has no production mutation.
- **STATIC UI ONLY** — no business records.
- **NOT VERIFIED** — routed but not traced beyond inventory.

`Browser test` for all rows this session: **NOT EXECUTED** (see audit report).

| Page | Route | Component | Module | API | DB (typical) | Status | Mock found | CRUD | Fix |
|---|---|---|---|---|---|---|---|---|---|
| Login | `/login` | `Login.tsx` | Auth | `POST /auth/login` | `employees` | VERIFIED — REAL API | Demo user chips (seed creds) | Login | None |
| Dashboard | `/` | `Dashboard.tsx` | Dashboard | `GET /dashboard/kpis` | `orders`, `stock_ledger`, `product_item_stock_details` | FIXED — REAL API | Hardcoded charts/alerts | Read | Charts+alerts from KPI payload |
| Stock receipt | `/warehouse/receipt` | `StockReceipt.tsx` | Inventory | `GET /stock/receipts` | `stock_receipts` | FIXED — REAL API | mockData + fake EBS | List only | Persist missing (see gaps) |
| Stock issuance | `/warehouse/issuance` | `StockIssuance.tsx` | Inventory | order-deliveries | deliveries | API-WIRED — CODE TRACE | — | Read | — |
| Order entry | `/orders/new` | `OrderEntry.tsx` | Orders | `/orders` | `orders` | VERIFIED — REAL API | — | Create | — |
| Order list | `/orders` | `OrderListPage.tsx` | Orders | `/orders` | `orders` | VERIFIED — REAL API | — | List | — |
| Route-wise | `/orders/route-wise` | `RouteWiseOrderList.tsx` | Orders | `/orders/route-wise` | `orders` | API-WIRED — CODE TRACE | — | Assign | — |
| Assigned | `/orders/assigned` | `AssignedOrderList.tsx` | Orders | `/orders/assigned` | `orders` | FIXED — REAL API | Fake Accepted/items | List | Real mobile_accepted |
| Remaining cash list | `/orders/remaining-cash-list` | `RemainingCashList.tsx` | Billing | remaining-cash-list | `orders` | API-WIRED — CODE TRACE | — | Collect | — |
| Collection approval | `/orders/collection-approval` | `ApprovalForCollection.tsx` | Billing | collection-approval | `orders` | API-WIRED — CODE TRACE | — | Approve | — |
| MIS report | `/orders/mis-report` | `MISReport.tsx` | Reports | `/orders/mis-report` | `orders` | API-WIRED — CODE TRACE | — | Read | — |
| Cockpit | `/distribution/cockpit` | `DistributionCockpit.tsx` | Dashboard | orders | `orders` | API-WIRED — CODE TRACE | — | Read | — |
| Cockpit alias | `/orders/distribution-cockpit` | same | Dashboard | same | same | API-WIRED — CODE TRACE | — | — | Duplicate route |
| Delivery list | `/orders/delivery` | `OrderDeliveryList.tsx` | Delivery | `/order-deliveries` | deliveries | API-WIRED — CODE TRACE | — | List | — |
| Delivery detail | `/orders/delivery/:id` | `OrderDeliveryDetail.tsx` | Delivery | `/order-deliveries/{id}` | deliveries | FIXED — REAL API | Random ledger ids | Detail | Skip invalid ids |
| Tracking | `/orders/tracking` | `OrderTrackingPage.tsx` | Delivery | tracking | deliveries | API-WIRED — CODE TRACE | — | Read | — |
| Packing board | `/orders/picking` | `PackingBoard.tsx` | Picking | picking-orders | picking | API-WIRED — CODE TRACE | — | Read | — |
| Packing report | `/orders/picking/report` | `PackingReport.tsx` | Picking | report | picking | API-WIRED — CODE TRACE | — | Print | — |
| Loading requests | `/orders/loading-request` | `PickingOrdersList.tsx` | Picking | `/picking-orders` | picking | API-WIRED — CODE TRACE | — | List | — |
| Loading request new | `/orders/loading-request/new` | `PickingOrderCreate.tsx` | Picking | POST picking-orders | picking | API-WIRED — CODE TRACE | — | Create | — |
| Loading request detail | `/orders/loading-request/:id` | `PickingOrderDetail.tsx` | Picking | GET/approve | picking | API-WIRED — CODE TRACE | — | Approve | — |
| Loading print | `/orders/loading-request/:id/print` | `PickingOrderPrint.tsx` | Picking | report | picking | API-WIRED — CODE TRACE | — | Print | — |
| Loading list | `/orders/loading-list` | `VehicleLoading.tsx` | Loading | loadings + invoices | loadings, invoices | FIXED — REAL API | Fake invoice ids | Read | Real invoices |
| Issuance loading | `/warehouse/issuance/loading` | `VehicleLoading.tsx` | Loading | same | same | FIXED — REAL API | same | — | Same component |
| Depot delivery list/form/detail | `/delivery/depot*` | `DepotDelivery*` | Transfers | depot-transfers | `depot_transfers` | API-WIRED — CODE TRACE | — | CRUD | — |
| Sample/Gift list/form/detail/preview | `/delivery/sample-gift*` | SampleGift* | Drafts | sample-gift-deliveries | `sample_gift_deliveries` | INTENTIONALLY DISABLED (writes) | — | Draft CRUD gated | Do not enable flags |
| Export list/form/detail/preview | `/delivery/export*` | Export* | Drafts | export-deliveries | `export_deliveries` | INTENTIONALLY DISABLED (writes) | — | Draft CRUD gated | Do not enable flags |
| Receive factory/depot/return | `/receive/*` | `ReceiveFormPage.tsx` variants | Inventory | product-receipts | `product_receipts` | API-WIRED — CODE TRACE | — | Create | Real inbound path |
| Receive list/report | `/receive/list`, `/receive/report/:id` | ReceiveList/Report | Inventory | product-receipts | `product_receipts` | API-WIRED — CODE TRACE | — | Read | — |
| Stock maintenance | `/warehouse/maintenance` | `StockMaintenance.tsx` | Inventory | `/stock/maintenance` | `stock_ledger` | API-WIRED — CODE TRACE | — | Read | — |
| Stock adjustment | `/warehouse/adjustment` | `StockAdjustment.tsx` | Inventory | `/stock/adjustments` | `stock_adjustments` | FIXED — REAL API | Hardcoded ADJ | Create Pending | — |
| New adjustment | `/warehouse/adjustment/new` | `NewAdjustment.tsx` | Inventory | POST adjustments | `stock_adjustments` | FIXED — REAL API | Seed Acarbose | Create | Seed removed |
| Adjustment work list | `/warehouse/adjustment/request` | `AdjustmentRequest.tsx` | Inventory | GET adjustments | `stock_adjustments` | FIXED — REAL API | Fake vouchers | List | Delete API missing |
| Vehicles (distribution) | `/distribution/vehicles` | `Vehicles.tsx` | Transport | `/vehicles` | `vehicles` | FIXED — REAL API | Fake fleet | CRUD | Empty not fake |
| Drivers (distribution) | `/distribution/drivers` | `Drivers.tsx` | Transport | `/drivers` | `drivers` | FIXED — REAL API | Fake drivers | Create | Empty not fake |
| Routes | `/distribution/routes` | `RoutePlanning.tsx` | Transport | `/routes` | `routes` | API-WIRED — CODE TRACE | — | CRUD | — |
| Reconciliation | `/distribution/reconciliation` | `Reconciliation.tsx` | Finance | reconciliation | recon tables | API-WIRED — CODE TRACE | — | Read | — |
| Audit logs | `/platform/audit-logs` | `AuditLogsPage.tsx` | Platform | audit | `audit_logs` | API-WIRED — CODE TRACE | — | Read | — |
| Report center | `/platform/reports` | `ReportCenterPage.tsx` | Reports | reports | various | API-WIRED — CODE TRACE | — | Read | — |
| Masters hub | `/masters` | `Masters.tsx` | Settings | several | masters | API-WIRED — CODE TRACE | — | Nav | — |
| Company … Doctor | `/settings/*` | `settings/*.tsx` | Settings | matching `/api/*` | matching tables | VERIFIED — REAL API | — | CRUD | pytest master data |
| Billing deposits/reports | `/billing/*` | billing/* | Billing | `/billing/*` | deposits | API-WIRED — CODE TRACE | — | CRUD | — |
| Transport module | `/transport/*` | `transport/*` | Transport | `/transport/*` | trips, expenses | API-WIRED — CODE TRACE | — | CRUD | — |
| Profile | `/profile` | `ProfilePage.tsx` | Account | `/auth/me` | `employees` | API-WIRED — CODE TRACE | — | Read | — |
| Not found | `*` | `NotFound.tsx` | — | — | — | STATIC UI ONLY | — | — | — |

Isolated workflow pages (`src/isolated-workflow/App.tsx`) are a **separate app**, not production website pages.
