# Remaining mock data and API gaps

## Unused dummy source (not rendered)

- `src/lib/mockData.ts` — still contains fake receipts, orders, invoices, vehicles, drivers, routes. **No production import remains.** Safe to delete in a cleanup PR; left in place to avoid unrelated churn.

## Login helpers (not business tables)

- `src/lib/demoUsers.ts` — seed emails/passwords on the login screen (`Login.tsx`). Not dashboard statistics.

## UI kit demos (not routed)

- `src/components/ui/expand-cards-demo.tsx`
- `src/components/ui/display-cards-demo.tsx`
- `src/pages/Index.tsx`, `src/pages/Signup.tsx` — not in `App.tsx`.

## Missing production backends (do not fake)

| Gap | Pages | Files | Expected contract |
|---|---|---|---|
| Oracle EBS challan verify | Stock Receipt | `src/pages/StockReceipt.tsx` | No endpoint. UI now errors instead of `setTimeout` success. |
| `POST /stock/receipts` | Stock Receipt confirm | `backend/app/routers/stock_receipt.py` GET-only | Inbound **create** lives on product receipts (`/receive/factory`). |
| Adjustment delete / HQ approve that changes qty | Adjustment work list | `AdjustmentRequest.tsx`; `stock_adjustment.py` create-only | Policy + mutation not implemented. Delete button explains this. |
| Invoice auto-generate on loading | Vehicle loading | `VehicleLoading.tsx` | UI lists real invoices only. Bulk generate exists (`POST /invoices/generate-bulk/{challanId}`) but was **not** auto-called (financial). |

## Intentionally disabled (not dummy)

- Sample/Gift and Export **production writes** (`SAMPLE_GIFT_DRAFT_WRITES`, `EXPORT_DRAFT_WRITES`).
- Isolated reservation / picking / dispatch / warehouse print (`isolated_workflow_app`, `src/isolated-workflow/*`).
- Official F.4 A1–D18 remain **Pending** in policy docs. Do not treat as broken fetch.

## Incomplete verification (not remaining fake data)

Almost every operational list is **API-WIRED — CODE TRACE**. This session did **not** open each page in a browser against PostgreSQL or compare every table cell to SQL.

Playwright website audit: `e2e/website-audit/login-and-nav.spec.ts` requires `E2E_WEB_AUDIT=1` and was **not** run against `swift_distro_hub`.

## Do not mix

- LogiCollect `/api/logicollect/v1` is **not** a website API.
- Isolated F.4 URLs must not be pointed at from production `App.tsx`.
