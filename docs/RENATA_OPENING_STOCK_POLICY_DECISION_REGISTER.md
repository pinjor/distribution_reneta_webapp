# RENATA — Opening Stock Policy Decision Register

**Document status:** Proposed — Awaiting owner authorization  
**Recorded:** 26 November 2026  
**Does not authorize** live inventory posting, production Alembic upgrade, new permission rows, or PIS/PISD/StockLedger writes.

Dummy identities are not owners. Do not treat this file as approval.

How to complete a rule: set the owner decision to **Approve**, **Reject**, or **Request changes**, add the owner name and date. Leave **Pending** until that happens.

## Proposed engineering defaults (not signed)

These are what the current isolated implementation enforces. They are not business sign-off.

| ID | Topic | Proposed default in code today | Owner decision |
|---|---|---|---|
| OS-1 | Who can request opening stock? | JWT users with `inventory.read` for their depot (admin any depot). Dedicated `inventory.opening` permission was **not** added because inserting new `PERMISSIONS` rows would write the live `permissions` table on API startup. | Pending |
| OS-2 | Who can approve/reject? | Employee `role == admin` only (`is_admin`). Manager cannot approve. Frontend labels are not sufficient. | Pending |
| OS-3 | Self-approval | Blocked. | Pending |
| OS-4 | Eligible depot/product | Product must exist. No separate warehouse-eligibility matrix exists in code; fail closed to “product exists + depot exists + caller depot scope”. | Pending |
| OS-5 | One opening per product/depot | Yes. A Pending Approval or Approved request for the same product/depot blocks another. Rejected/Draft does not. | Pending |
| OS-6 | Reopen after historical zero balance | **No.** Any StockLedger, ProductItemStock, or ProductItemStockDetail history for that product/depot blocks a new opening. | Pending |
| OS-7 | Expired batches | Rejected when expiry date is before opening date. They must not become available stock. | Pending |
| OS-8 | Unknown expiry | Rejected. Expiry is required. | Pending |
| OS-9 | Source of truth for posting | **Not established.** Commercial inventory is split across ProductItemStock, ProductItemStockDetail, and StockLedger, which have historically disagreed. Authoritative write path for opening stock is **unsigned**. | Pending |
| OS-10 | How to update PIS / PISD / ledger | Do not update them until OS-9 is signed. Isolated in-memory simulation exists in tests only. | Pending |
| OS-11 | Valuation / unit cost | Optional field stored on the request line. Not posted to any valuation ledger. | Pending |
| OS-12 | Correction / reversal | Not implemented. Rejected requests are not editable. | Pending |
| OS-13 | Does approval post immediately? | **No.** Approval records status `Approved` and `posting_status=not_posted`. | Pending |
| OS-14 | Reconciliation with commercial receipts | Opening stock is not a product receipt. Unposted requests must not appear as received stock. | Pending |
| OS-15 | Migration / reopening exception | No exception path. Requires a separately authorized policy. | Pending |

## Signed decisions

None. Section remains empty until named owners complete the table above.
