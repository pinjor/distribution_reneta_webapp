# F.4C Warehouse Policy Decision Register

**Status: PROPOSED — NOT BUSINESS APPROVED**

Date: 26 November 2026  
Official F.4 file: `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` remains **unsigned**. A1–C8 remain **Pending**. F.4B Gate B remains **BLOCKED**.

This register does not authorize live stock reservation, deduction, issuance, transfer, reconciliation, dispatch, or invoice posting. Dummy test identities and isolated simulation results are **not** warehouse approval. Do not invent approver names or change Pending to Approved.

---

| Decision ID | Business question | Proposed default | Technical implications | Required approver | Actual decision |
|---|---|---|---|---|---|
| W1 | Which store is authoritative for sellable and reserved stock? | **Option A:** `product_item_stock_details` (batch) + `product_item_stock` (depot header). Ledger is **not** sellable authority. | Matches `StockReservationService` and live reserved 2640. Receipts and order-delivery FEFO still write ledger only until a later projection project. | Warehouse Owner | **Pending** |
| W2 | How is available stock calculated? | `available_quantity` on PISD; do not recompute as `quantity − reserved` in a second writer. Reject if `quantity ≠ available + reserved` **before issue**. After issue, proposed: `quantity = available + reserved` again because issue deducts both quantity and reserved. | Production `commit_for_order` today deducts reserved only, which **breaks** the identity after first issue. Future F.4C must change issue math if W12 is approved. | Warehouse Owner | **Pending** |
| W3 | May expired batches (`expiry_date < today`) be newly reserved? | **No.** Skip in FEFO. Existing expired-available (live PISD **9160**) is not auto-quarantined. | Current `_allocate_fefo` and ledger `allocate_fefo_batches` **do** pick expired stock. Commercial path would diverge until aligned. | Warehouse Owner + QA | **Pending** |
| W4 | How are batches with **null** expiry treated? | **Reject** for new Sample/Gift and Export reservations. Alternative (not default): FEFO last (`nullslast`). Live PISD null-expiry count today: **0**. | Policy must be coded; commercial FEFO currently uses `nullslast` and still allocates. | Warehouse Owner | **Pending** |
| W5 | When does reservation happen? | **Not on Approve.** Draft / Submit / Approve remain documentary. Reservation is a **later explicit warehouse action** after Approved. Automatic-on-approve is an alternative, not the default. | Isolated F.4B.3 workflow does not reserve. Do not add auto-reserve to Approve. | Operations Owner + Warehouse Owner | **Pending** |
| W6 | Automatic vs manual batch pick? | **Automatic FEFO** at reserve time, depot-scoped. Manual override is a later enhancement. | Requires FEFO skip rules W3/W4. | Warehouse Owner | **Pending** |
| W7 | Are partial reservations allowed? | **No** (all-or-nothing). Shortfall fails the reserve request. | Matches current order validation reserve (raise + rollback). Partial fill is a separate product decision. | Operations Owner | **Pending** |
| W8 | Multiple depots? | Reserve **only** the document’s depot. Foreign depot stock is invisible (same 404 pattern as drafts). | Do not steal Khulna stock for a Kushtia document. | Warehouse Owner | **Pending** |
| W9 | Cancellation and release? | Before reserve: status only. While RESERVED: release with `SELECT FOR UPDATE`, available+. After ISSUED: no cancel except a future return process. | Release today has **no** row lock in production `StockReservationService._release_one`. Future F.4C must lock. | Warehouse Owner | **Pending** |
| W10 | Reservation timeout? | **None** until Operations defines hours/days. Do not expire holds in code without a signed SLA. | Avoid silent available restoration. | Operations Owner | **Pending** |
| W11 | Can reserved quantity be transferred? | **No.** Transfer may move **available** only. Production transfer approve today checks `quantity` / `stock_qty`, **not** available, so it can move reserved units. | Future transfer must FOR UPDATE PISD and require `available >= qty`. | Warehouse Owner | **Pending** |
| W12 | When is inventory issued (on-hand reduced)? | At **dispatch / load**, not at reserve and not at delivery confirmation. Deduct `quantity` and `reserved` together; increment PIS `issue`; decrement PIS `stock_qty`. | Production `commit_for_order` does **not** deduct `quantity`. Seed helper `deduct_delivered` does. Aligning them is a breaking change for reports. | Warehouse Owner | **Pending** |
| W13 | Dispatch and delivery confirmation stock effects? | Dispatch = issue (W12). Delivery confirm = document status only if already issued. | Do not double-deduct. Do not post invoices from Sample/Gift or Export stock events. | Operations Owner | **Pending** |
| W14 | How to treat ledger vs PISD differences? | Explain, do not overwrite. Live gap **2365** = reserved 2640 − Khulna-only 275. Not missing stock. | No live UPDATE from one store onto the other. | Warehouse Owner + Finance (reporting) | **Pending** |
| W15 | Required reconciliation procedure before any live correction? | Snapshot, disposable dry-run, per-batch worksheet, signed W1–W14, then a **later** approved correction phase. | F.3.4 §9. This Gate A does not execute it. | Warehouse Owner + DBA | **Pending** |

---

## Reservation trigger (W5) — explicit

| Stage | Stock effect under proposed default |
|---|---|
| Draft create / edit | none |
| Submit | none |
| Approve | none |
| Reserve (explicit) | PISD available → reserved |
| Pick | status only |
| Issue / dispatch | reserved and quantity down |
| Delivery confirm | status only |
| Cancel reserved | release |
| Cancel issued | forbidden without returns |

Automatic reservation on Approve is **not** assumed.

---

## No-expiry batches (W4) — business decision required

Live PISD currently has **zero** null expiry dates. The isolated simulator default is **reject**. Switching to “FEFO last” is a warehouse choice, not an engineering default for production.

---

## F.4C-DEV Gate B — isolated implementation note (not a decision)

Date: 26 November 2026

Isolated reservation (disposable PostgreSQL / SQLite only) uses the proposed defaults above as **TEST ASSUMPTIONS**:

- Reserve only after **Approved**, via an explicit isolated API (not Submit/Approve).
- Automatic FEFO; skip expired; reject null expiry.
- All-or-nothing; document depot only; release before issue; no timeout.
- Re-reservation after release is **fail-closed** until W9 is signed.

W1–W15 remain **Pending**. This note does not approve production reservation, issuance, or ledger correction. Dummy identities are not warehouse owners.
