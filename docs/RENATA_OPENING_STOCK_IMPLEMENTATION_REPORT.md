# RENATA — Opening Stock Implementation Report

**Date:** 26 November 2026  
**Production posture:** Request/review enabled in the website API. Physical inventory posting **disabled**. Production Alembic head unchanged (`f3_export_draft`). Live `swift_distro_hub` is not migrated.

## 1. Files reviewed

- `src/lib/menuNavigation.ts`, `src/App.tsx`, `src/pages/receive/ReceiveList.tsx`, `src/pages/receive/ReceiveFormPage.tsx`
- `src/lib/api.ts`, `src/hooks/usePermissions.ts`, `src/contexts/AuthContext.tsx`
- `backend/app/api_app.py`, `backend/app/core/schema_guard.py`, `backend/app/core/permissions.py`, `backend/app/core/depot_scope.py`
- `backend/app/models.py` (`Product`, `ProductItemStock`, `ProductItemStockDetail`, `StockLedger`, `StockAdjustment`)
- `backend/app/routers/stock_adjustment.py`, `backend/app/routers/stock_receipt.py`, `backend/app/routers/product_receipts.py` (inbound posting remains the existing receipt path)
- `backend/alembic.ini` / production versions (head `f3_export_draft`)
- `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` (unrelated F.4 decisions remain Pending; not used as opening-stock approval)

## 2. Sidebar and route changes

Stock Receive now lists:

1. Receive from Factory  
2. Receive from Depot  
3. Stock Return Receive  
4. **Opening Stock** (`PackagePlus`, `/receive/opening-stock`, `inventory.read`)  
5. All Receipts  

Alias: `/stock-receive/opening-stock` redirects to `/receive/opening-stock`.

Additional routes: `/receive/opening-stock/new`, `/receive/opening-stock/:id`, `/receive/opening-stock/:id/edit`.

Existing receive routes were not changed.

## 3. Opening Stock UI

- List: `src/pages/receive/OpeningStockList.tsx` — live summary cards, search, depot/status/date filters, pagination, refresh.
- Form: `src/pages/receive/OpeningStockForm.tsx` — draft create/edit, multi-line products, Save Draft / Submit / Cancel.
- Detail: `src/pages/receive/OpeningStockDetail.tsx` — request, lines, approval vs posting, audit timeline, approve/reject dialogs.

No mock rows. Counts come from `GET /api/opening-stock/summary`.

## 4. Backend endpoints

Mounted on production `main:app` (document workflow only):

| Method | Path | Effect |
|---|---|---|
| GET | `/api/opening-stock/summary` | Depot-scoped counts |
| GET | `/api/opening-stock` | Paginated list |
| POST | `/api/opening-stock` | Create Draft |
| GET | `/api/opening-stock/{id}` | Detail |
| PATCH | `/api/opening-stock/{id}` | Edit Draft |
| POST | `/api/opening-stock/{id}/submit` | Draft → Pending Approval |
| POST | `/api/opening-stock/{id}/approve` | Admin approve; **does not post stock** |
| POST | `/api/opening-stock/{id}/reject` | Admin reject with reason |
| GET | `/api/opening-stock/{id}/history` | Audit rows |

There is **no** production endpoint that writes ProductItemStock, ProductItemStockDetail, or StockLedger for opening stock.

## 5. Database changes

New models in `backend/app/models_opening_stock.py`:

- `opening_stock_requests`
- `opening_stock_request_items` (unique product+batch per request)
- `opening_stock_approval_history`
- `opening_stock_posting_references` (reserved; unused for commercial posting)

Disposable Alembic: `backend/alembic_opening_stock.ini`, revision `os_request_workflow`, version table `alembic_version_opening_stock`. Env refuses `swift_distro_hub`.

Tables are listed in `PENDING_MODELED_TABLES` so production startup does not require them on live PostgreSQL.

SQLite pytest uses `Base.metadata.create_all`.

## 6. Draft workflow

Create → Draft (server request number `OS-YYYYMMDD-####`) → edit/remove lines → Submit. Drafts do not touch inventory columns or ledgers.

## 7. Approval workflow

Submit: Draft → Pending Approval.  
Approve: admin, not self, re-validate eligibility, lock row on PostgreSQL, status Approved, posting_status `not_posted`.  
Reject: reason required, inventory unchanged, record not reopened.

## 8. Posting architecture

**Selected authoritative path for live inventory: not approved.**

Existing commercial inbound posting continues to be product receipt approval. Opening stock must not invent a second engine.

Until Finance/Warehouse signs:

1. Which of PIS, PISD, and StockLedger is source of truth  
2. How the three stay consistent on an opening movement  
3. Whether expired/unknown-expiry can ever be unrestricted  

the approve handler records the decision and returns `inventoryPosted: false`.

Isolated arithmetic lives in `app/services/opening_stock_simulation.py` and is used by tests only.

## 9. Duplicate prevention

- Application check: any Pending/Approved opening for the same product+depot  
- History check: any ledger/PIS/PISD row for that product+depot, even if quantity is now 0  
- Unique constraint on request_id + product_id + batch_number  
- Idempotent approve if already Approved  
- PostgreSQL `SELECT … FOR UPDATE` on approve

## 10. Authorization

- JWT required  
- `inventory.read` for document APIs (no new permission codes; would auto-insert on live startup)  
- Approve/reject: `is_admin` only  
- Depot isolation: `apply_depot_id_filter` / `hide_foreign_depot`  
- Self-approval blocked  

## 11. Audit

`opening_stock_approval_history` records created, patched, submitted, approved, rejected with actor and timestamps. Approval note stores the posting-block message.

## 12. Regression tests

See `docs/RENATA_OPENING_STOCK_TEST_REPORT.md`.

## 13. Production isolation

- Production Alembic head unchanged  
- Opening-stock Alembic refuses live DB name  
- Models pending in schema_guard  
- Approve does not write commercial stock  
- LogiCollect untouched  
- F.4 posting/workflow still blocked  

## 14. Remaining blockers

- OS-1 through OS-15 unsigned (`docs/RENATA_OPENING_STOCK_POLICY_DECISION_REGISTER.md`)  
- Dual inventory engines (PIS vs ledger) still unresolved; opening posting must not choose one unilaterally  
- Warehouse eligibility matrix beyond “product exists” is unsigned  
- User-role create uses `inventory.read` until a dedicated permission is authorized  
- Disposable PostgreSQL concurrency tests require `OPENING_STOCK_PG_URL`  
- Live website browser pass depends on a running authenticated environment  

## 15. GO/NO-GO

**NO-GO for production inventory posting.**

**Conditional GO for request/review on a database that has the opening-stock tables** (pytest SQLite or a disposable PostgreSQL after `alembic -c alembic_opening_stock.ini upgrade head`).

Do not enable posting, do not run the opening-stock Alembic against `swift_distro_hub`, and do not treat Approved as on-hand stock.
