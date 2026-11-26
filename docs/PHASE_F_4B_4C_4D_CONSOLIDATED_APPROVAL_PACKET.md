# F.4B / F.4C / F.4D Consolidated Business Approval Packet

**Packet status: APPROVAL-READY — NOT APPROVED**  
**Recorded:** 26 November 2026  
**Engineering gate:** `F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED`  
**Production:** F.4C **NO-GO** · F.4D **NO-GO** · official F.4E **NO-GO**

This packet consolidates 53 unsigned policy decisions:

- A1–A6, B1–B6, C1–C8 (20) — `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md`
- W1–W15 (15) — `docs/PHASE_F_4C_WAREHOUSE_POLICY_DECISION_REGISTER.md`
- D1–D18 (18) — `docs/PHASE_F_4D_WAREHOUSE_FULFILLMENT_DECISION_REGISTER.md`

It does **not** authorize live Draft writes, product-flag changes, stock reservation, issuance, dispatch, delivery, invoices, RBAC, migrations, or production frontend activation.

Isolated Option 1 code uses the **proposed defaults as test assumptions only**. Passing tests are not approval.

---

## 1. Evidence search (26 November 2026)

Searched:

- `PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` Sections A–E
- `PHASE_F_4_BUSINESS_APPROVAL_CHECKLIST.md`
- `PHASE_F_4_BUSINESS_APPROVAL_VERIFICATION_REPORT.md`
- `PHASE_F_4_APPROVAL_FINALIZATION_REPORT.md`
- `PHASE_F_4B_GATE_B_FINAL_APPROVAL_AND_HANDOFF_REPORT.md`
- `PHASE_F_4B_GATE_B_WORKFLOW_INTEGRATION_REPORT.md`
- F.4A / F.4B / F.4C / F.4D / F.4E-DEV reports
- W1–W15 and D1–D18 registers
- Remainder of `docs/` for “I approve …”, named Product Owner, Operations Owner, Warehouse Owner, Authorization Policy Owner, Finance, Transport, QA, or DBA signatures on these 53 rules

**Findings:**

| Claimed evidence | Result |
|---|---|
| Named owner on A1–C8 / W1–W15 / D1–D18 | **None** |
| Date of Approve / Reject / Request changes on those rules | **None** |
| Unfilled tokens (`[Actual name]`, `[Date]`) | **Not** owner evidence (already excluded 26 Nov 2026) |
| Synthetic test emails (`test.*.@example.com`, `e2e.*@example.com`) | **Not** owner evidence |
| Cursor / developer prompts | **Not** owner evidence |
| Isolated pytest / Playwright / Vitest | **Not** owner evidence |
| D.5 “I approve … Alembic stamp `d4_baseline`” | **Out of scope** (schema stamp only) |
| F.3.2 “I approve … live Alembic … `f3_export_draft`” | **Out of scope** (additive draft tables only) |

No rule in this packet is changed from **Pending**. No names or dates were invented.

---

## 2. F.4B matrix — Product eligibility (A1–A6)

Responsible owner: **Product Owner**

| ID | Proposed policy | Owner role | Actual decision | Approver identity | Decision date | Evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| A1 | Sample Delivery: only **active** products with `product_type_sample=true`. | Product Owner | **Pending** | — | — | Policy §A; F.4A helper (proposed) | Named Approve/Reject/Request changes |
| A2 | Gift Delivery: **same** Sample flag. No `product_type_gift` column. | Product Owner | **Pending** | — | — | Policy §A | Same |
| A3 | Export Delivery: only **active** products with `product_type_export=true`. | Product Owner | **Pending** | — | — | Policy §A | Same |
| A4 | A product may belong to multiple categories (flags independent). | Product Owner | **Pending** | — | — | Policy §A | Same |
| A5 | Backend must enforce A1–A3 on Draft create, update, and submit. UI picker is not sufficient. | Product Owner | **Pending** | — | — | Policy §A5 | Same |
| A6 | Named eligible SKUs are a **separate** list. Do not auto-flag live SKUs. | Product Owner | **Pending** | — | — | Policy §A6; live flags all false | Same |

Live catalog observation (not a decision): 14 products, **zero** type flags true.

---

## 3. F.4B matrix — User permissions (B1–B6)

Responsible owner: **Authorization Policy Owner** (with Operations)

| ID | Proposed policy | Owner role | Actual decision | Approver identity | Decision date | Evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| B1 | Admin and Manager may create and update Drafts (existing, flag-gated). | Authorization Policy Owner | **Pending** | — | — | Policy §B; live routers | Named decision |
| B2 | Admin and Manager may submit. | Authorization Policy Owner | **Pending** | — | — | Isolated helper only | Same |
| B3 | Admin and Manager may approve or reject. | Authorization Policy Owner | **Pending** | — | — | Isolated helper only | Same |
| B4 | PSO and other roles cannot create, submit, approve, or reject under this initial policy. | Authorization Policy Owner | **Pending** | — | — | Policy §B4 | Same |
| B5 | A user cannot approve a document they created. | Authorization Policy Owner | **Pending** | — | — | Isolated `ALLOW_SELF_APPROVE=False` | Same |
| B6 | Existing depot isolation remains (foreign depot **404**). | Authorization Policy Owner | **Pending** | — | — | `hide_foreign_depot` | Same |

Do not map `orders.write` onto these documents. No new production RBAC codes.

---

## 4. F.4B matrix — Approval workflow (C1–C8)

Responsible owner: **Operations Owner** (with Product Owner)

Proposed machine (not mounted in production): Draft → Submitted → Approved; Submitted → Rejected (terminal).

| ID | Proposed policy | Owner role | Actual decision | Approver identity | Decision date | Evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| C1 | Draft → Submitted → Approved | Operations Owner | **Pending** | — | — | Policy §C | Named decision |
| C2 | Submitted → Rejected | Operations Owner | **Pending** | — | — | Policy §C | Same |
| C3 | Rejected is terminal (not returned to Draft) | Operations Owner | **Pending** | — | — | Policy §C | Same |
| C4 | Rejection reason is mandatory | Operations Owner | **Pending** | — | — | Policy §C | Same |
| C5 | Invalid transitions HTTP 409 | Operations Owner | **Pending** | — | — | Isolated helper | Same |
| C6 | Successful transitions audited; retries must not duplicate audit or re-approve | Operations Owner | **Pending** | — | — | Isolated helper | Same |
| C7 | Sample/Gift and Export use the same initial approval model | Operations Owner + Product Owner | **Pending** | — | — | Policy §C | Same |
| C8 | Status changes have no stock or billing effects | Operations Owner | **Pending** | — | — | Policy §C | Same |

---

## 5. Warehouse matrix (W1–W15)

Source: F.4C register. **Actual decision: Pending** on every row.

| ID | Topic | Proposed default | Owner roles | Actual decision | Approver | Date | Evidence | Outstanding |
|---|---|---|---|---|---|---|---|---|
| W1 | Inventory source of truth | Option A: PISD (batch) + PIS (depot header). Ledger is **not** sellable authority. | Warehouse Owner | **Pending** | — | — | Register W1 | Named decision |
| W2 | Available-stock calculation | Use PISD `available_quantity`; reject if `quantity ≠ available + reserved` **before issue**. After issue, restore the identity by deducting quantity and reserved together. | Warehouse Owner | **Pending** | — | — | Register W2 | Named decision. **Operational:** production `commit_for_order` deducts reserved only. |
| W3 | Expired-batch handling | **No** new reservation of `expiry < today`. Do not auto-quarantine existing expired-available (live PISD **9160** observed in F.4C). | Warehouse Owner + QA | **Pending** | — | — | Register W3 | Named decision. **Operational:** commercial FEFO **can still allocate expired stock**. |
| W4 | Null expiry | **Reject** for new Sample/Gift and Export reservations. Alternative (not default): FEFO last. Live PISD null-expiry count observed **0**. | Warehouse Owner | **Pending** | — | — | Register W4 | Named decision |
| W5 | Reservation trigger | **Not on Approve.** Explicit warehouse action after Approved. | Operations Owner + Warehouse Owner | **Pending** | — | — | Register W5 | Named decision |
| W6 | FEFO allocation | Automatic FEFO at reserve, depot-scoped. Manual override later. | Warehouse Owner | **Pending** | — | — | Register W6 | Named decision |
| W7 | Partial reservations | **No** (all-or-nothing). | Operations Owner | **Pending** | — | — | Register W7 | Named decision |
| W8 | Depot restrictions | Reserve **only** the document’s depot. Foreign stock invisible (404). | Warehouse Owner | **Pending** | — | — | Register W8 | Named decision |
| W9 | Release | Before reserve: status only. While RESERVED: locked release. After ISSUED: no cancel except future returns. | Warehouse Owner | **Pending** | — | — | Register W9 | Named decision. **Operational:** production `_release_one` has **no** row lock. |
| W10 | Reservation timeout | **None** until Operations defines an SLA. | Operations Owner | **Pending** | — | — | Register W10 | Named SLA |
| W11 | Transfer of reserved stock | **No.** Transfer available only. | Warehouse Owner | **Pending** | — | — | Register W11 | Named decision. **Operational:** production transfer may move reserved units (checks quantity / stock_qty, not available). |
| W12 | Issuance timing | At **dispatch / load**, not reserve and not delivery confirm. Deduct `quantity` and `reserved`; PIS `issue+`, `stock_qty−`. | Warehouse Owner | **Pending** | — | — | Register W12 | Named decision. **Operational:** production `commit_for_order` does **not** deduct physical on-hand. |
| W13 | Dispatch and delivery stock effects | Dispatch = issue (W12). Delivery confirm = status only if already issued. No invoices from Sample/Gift or Export stock events. | Operations Owner | **Pending** | — | — | Register W13 | Named decision |
| W14 | Ledger reconciliation | Explain, do not overwrite. Observed live gap **2365** = reserved 2640 − Khulna-only 275. Parallel ledger and PISD require a reporting policy. | Warehouse Owner + Finance | **Pending** | — | — | Register W14; F.3.4 | Named decision. **No live UPDATE** from one store onto the other. |
| W15 | Correction procedure | Snapshot, disposable dry-run, per-batch worksheet, signed W1–W14, then a **later** approved correction phase. | Warehouse Owner + DBA | **Pending** | — | — | Register W15; F.3.4 §9 | Named procedure |

---

## 6. Fulfillment matrix (D1–D18)

Source: F.4D register. **Actual decision: Pending** on every row.

| ID | Topic | Proposed default | Owner roles | Actual decision | Approver | Date | Evidence | Outstanding |
|---|---|---|---|---|---|---|---|---|
| D1 | Separate fulfillment entity | Option B: separate header. Document stays `Approved`. | Operations Owner + Warehouse Owner | **Pending** | — | — | Register D1 | Named decision |
| D2 | Picking permissions | Admin, Manager, future warehouse-operator. Not PSO/billing/finance. | Authorization + Warehouse Owner | **Pending** | — | — | Register D2 | Named decision; no production RBAC yet |
| D3 | Picker assignment | **Not** mandatory. Optional field. | Warehouse Owner | **Pending** | — | — | Register D3 | Named decision |
| D4 | Partial picking | Fail closed: **no**. | Warehouse Owner + Operations | **Pending** | — | — | Register D4 | Named decision |
| D5 | Batch discrepancies | Fail pick; no silent substitution. | Warehouse Owner | **Pending** | — | — | Register D5 | Named decision |
| D6 | Expiry checks at pick | **Reject** expired or null expiry (align W3). | Warehouse Owner + QA | **Pending** | — | — | Register D6 | Named decision |
| D7 | Issuance permissions | Admin / Manager / warehouse operator. Not PSO, billing, finance, transport. | Authorization + Warehouse Owner | **Pending** | — | — | Register D7 | Named decision |
| D8 | Issuance timing | Align W12: on-hand reduced at issue, intended at dispatch/load. Isolated prototype separates pick → issue → dispatch. | Warehouse Owner | **Pending** | — | — | Register D8 | Named decision |
| D9 | Dispatch stock effects | **No** second deduction if issue already posted. | Warehouse Owner + Operations | **Pending** | — | — | Register D9 | Named decision |
| D10 | Transport reference | **Optional** until Transport defines a required id. | Transport + Operations | **Pending** | — | — | Register D10 | Named decision |
| D11 | Delivery confirmation | Admin / Manager / warehouse operator. PSO does not confirm. | Operations Owner | **Pending** | — | — | Register D11 | Named decision |
| D12 | POD requirements | **Not** mandatory. Optional text `pod_ref`. | Operations Owner | **Pending** | — | — | Register D12 | Named POD type |
| D13 | Failed delivery | `FAILED_DELIVERY` after dispatch. **Does not** reverse issuance. | Warehouse Owner + Operations | **Pending** | — | — | Register D13 | Named decision |
| D14 | Returns | **Out of scope** until signed. | Warehouse Owner + Finance | **Pending** | — | — | Register D14 | Named returns process |
| D15 | Export logistics | Do **not** add Customs Cleared / Shipped as required states. Keep existing Export fields. | Operations Owner (Export) | **Pending** | — | — | Register D15 | Named decision |
| D16 | Sample/Gift financial treatment | **No sales invoice** on pick/issue/dispatch/delivery. | Finance + Product Owner | **Pending** | — | — | Register D16 | Named costing/FOC |
| D17 | Release during picking | **No** until signed. | Warehouse Owner | **Pending** | — | — | Register D17 | Named decision |
| D18 | History permissions | Admin, Manager, warehouse operator; foreign depot 404. | Authorization | **Pending** | — | — | Register D18 | Named decision |

---

## 7. Required owners (roles only — no names on file)

| Role | Reviews | Status |
|---|---|---|
| Product Owner | A1–A6, C7, D16 | Unsigned |
| Authorization Policy Owner | B1–B6, D2, D7, D18 | Unsigned |
| Operations Owner | C1–C8, W5, W7, W10, W13, D1, D4, D9–D13, D15 | Unsigned |
| Warehouse Owner | W1–W15, D1–D9, D13–D14, D17 | Unsigned |
| QA (expiry) | W3, D6 | Unsigned |
| Finance | W14, D14, D16 | Unsigned |
| Transport | D10 | Unsigned |
| DBA | W15 | Unsigned |

Different decisions require different roles. This packet does **not** assume one person may approve all 53 items.

| Field | Value |
|---|---|
| Product Owner name | Pending — not on file |
| Authorization Policy Owner name | Pending — not on file |
| Operations Owner name | Pending — not on file |
| Warehouse Owner name | Pending — not on file |
| QA approver name | Pending — not on file |
| Finance approver name | Pending — not on file |
| Transport approver name | Pending — not on file |
| DBA approver name | Pending — not on file |
| Approval date | Pending |
| Requested changes | Pending — no owner comments on file |
| **Final consolidated decision** | **Awaiting approval** |

---

## 8. Sign-off instructions (humans only)

Do **not** ask Cursor or any automated agent to sign.

1. **Who reviews what**  
   Use the role table in §7. Product Owner starts with A1–A6. Authorization Policy Owner covers B1–B6. Operations Owner covers C1–C8 and the W/D rows listed for Operations. Warehouse Owner covers W1–W15 and the D rows listed for Warehouse. QA, Finance, Transport, and DBA sign only the rows that name them.

2. **How to record a decision**  
   For each ID, write **Approve**, **Reject**, or **Request changes** in:
   - A1–C8: `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` (per-rule column **and** Section E)
   - W1–W15: `docs/PHASE_F_4C_WAREHOUSE_POLICY_DECISION_REGISTER.md` column **Actual decision**
   - D1–D18: `docs/PHASE_F_4D_WAREHOUSE_FULFILLMENT_DECISION_REGISTER.md` column **Actual decision**  
   Then copy the same mark into this packet so the three files stay aligned. Leave **Pending** if you have not decided.

3. **Name and date**  
   Write the **actual person’s name** and **calendar date** next to the decision. Do not use test emails, placeholders, or “authorized owners” without a name.

4. **Comments and evidence**  
   Put comments in the Comments / Business implications column of the source register. Attach or cite meeting notes, email, or ticket IDs in Evidence. If you request changes, state which proposed default must change.

5. **Who verifies completion**  
   A designated coordinator (not this packet) checks that every ID that a given owner must sign is marked, named, and dated, then updates Section E of the F.4 policy file and §7 of this packet. Partial signatures do **not** complete the packet.

6. **Unresolved decisions stay blocked**  
   Any **Pending** or **Reject** or unanswered **Request changes** keeps:
   - `F.4B Gate B: BLOCKED`
   - F.4C / F.4D / official F.4E production **NO-GO**  
   Isolated Option 1 development may continue under test assumptions. Even a fully signed packet does **not** by itself authorize deployment, live stock writes, or write-flag activation.

---

## 9. Consolidated approval status

| Group | Count | Approved | Rejected | Request changes | Pending |
|---|---|---|---|---|---|
| A1–A6 | 6 | 0 | 0 | 0 | **6** |
| B1–B6 | 6 | 0 | 0 | 0 | **6** |
| C1–C8 | 8 | 0 | 0 | 0 | **8** |
| W1–W15 | 15 | 0 | 0 | 0 | **15** |
| D1–D18 | 18 | 0 | 0 | 0 | **18** |
| **Total** | **53** | **0** | **0** | **0** | **53** |

**Overall:** Awaiting human owner signatures. Packet is complete for review. Packet is **not** complete as an approval.

---

## 10. Production GO / NO-GO

| Item | Status |
|---|---|
| Isolated Option 1 development/testing | Allowed (existing user selection) |
| F.4B Gate B production workflow mount | **BLOCKED** |
| F.4C production reservation / live stock | **NO-GO** |
| F.4D production picking / issue / dispatch / delivery | **NO-GO** |
| Official F.4E production documents (no provisional watermark) | **NO-GO** |
| Live Draft write flags | Remain **no/no** |
| Phase G deployment | **Not started** |

A later engineering order is still required after signatures before any production mount.
