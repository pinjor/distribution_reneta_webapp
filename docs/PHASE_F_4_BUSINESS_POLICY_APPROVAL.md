# RENATA — Phase F.4 Business Policy Approval

**Document status:** Proposed — Awaiting Approval  
**Engineering gate:** `F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED`  
**Modules:** Sample/Gift Delivery and Export Delivery  
**Recorded:** 25 November 2026  
**Last finalization pass:** 26 November 2026 — a later reply used unfilled template tokens (`[Actual name]`, `[Date]`, `[Approve all / Specify individual decisions]`). Those are not owner evidence. Decisions remain Pending. Combined packet: `docs/PHASE_F_4B_4C_4D_CONSOLIDATED_APPROVAL_PACKET.md` (53 rules still Pending).  

This package is for Product Owner and Operations Owner review. **Section E is unsigned.** A proposal is not approval. This file does not authorize implementation, live Draft writes, product-flag changes, stock, billing, or F.4C.

How to complete a rule: set the owner decision to **Approve**, **Reject**, or **Request changes**, add the owner name and date, and a comment if needed. Leave **Pending** until that happens. Do not invent names or dates.

---

## A. Product Eligibility

Responsible approver: **Product Owner**

| # | Proposed rule | Product Owner decision | Comments |
|---|---|---|---|
| A1 | Sample Delivery: only **active** products with `product_type_sample=true`. | Pending | |
| A2 | Gift Delivery: **same** Sample flag. No `product_type_gift` column. | Pending | |
| A3 | Export Delivery: only **active** products with `product_type_export=true`. | Pending | |
| A4 | A product may belong to multiple categories (flags independent). | Pending | |
| A5 | Backend must enforce A1–A3 on Draft **create**, **update**, and **submit**. UI picker is not sufficient. | Pending | |
| A6 | Named eligible SKUs are a **separate** list. An administrator classifies products only after that list is approved. Do not auto-flag live SKUs. | Pending | |

Live catalog today: 14 products, **zero** of the four type flags are true. Empty pickers are the real catalog.

---

## B. User Permissions

Responsible approver: **Authorization policy owner** (with Operations)

**Already live (not granted by this package; do not change until a different decision):**

| Action | Admin | Manager | PSO / `user` | Other roles |
|---|---|---|---|---|
| Read Draft list/detail (JWT, depot-scoped) | yes | yes | yes (own depot) | JWT + depot |
| Create / update Draft | yes, **if** write flag on | yes, **if** write flag on | **no** (403) | **no** |
| Write flags | Compose `no` | Compose `no` | n/a | n/a |

**Proposed workflow permissions (not live; not mounted):**

| Action | Admin | Manager | PSO / `user` | Billing / Finance / Transport |
|---|---|---|---|---|
| Submit Draft | proposed yes | proposed yes | no | no new writes |
| Approve Submitted | proposed yes | proposed yes | no | no new writes |
| Reject Submitted | proposed yes | proposed yes | no | no new writes |
| Approve own document | **no** | **no** | n/a | n/a |

| # | Proposed rule | Authorization decision | Comments |
|---|---|---|---|
| B1 | Admin and Manager may create and update Drafts (existing, flag-gated). | Pending | |
| B2 | Admin and Manager may submit. | Pending | |
| B3 | Admin and Manager may approve or reject. | Pending | |
| B4 | PSO and other roles cannot create, submit, approve, or reject under this initial policy. | Pending | |
| B5 | A user cannot approve a document they created. | Pending | |
| B6 | Existing depot isolation remains (foreign depot **404**). | Pending | |

No new RBAC permission codes. Do not map `orders.write` onto these documents.

---

## C. Approval Workflow

Responsible approver: **Operations Owner** (with Product Owner)

Proposed machine (not mounted):

```
Draft ──submit──► Submitted ──approve──► Approved
                      │
                      └──reject──► Rejected (terminal)
```

Sample/Gift and Export share this machine. No Prepared, Dispatched, Delivered, or CustomsCleared in this package. No stock or billing on these transitions.

| # | Proposed rule | Operations decision | Comments |
|---|---|---|---|
| C1 | Draft → Submitted → Approved | Pending | |
| C2 | Submitted → Rejected | Pending | |
| C3 | Rejected is terminal (not returned to Draft) | Pending | |
| C4 | Rejection reason is mandatory | Pending | |
| C5 | Invalid transitions are rejected (HTTP 409) | Pending | |
| C6 | Successful transitions are audited; retries must not duplicate audit or re-approve | Pending | |
| C7 | Sample/Gift and Export use the same initial approval model | Pending | |
| C8 | Status changes have no stock or billing effects | Pending | |

---

## D. Operational Restrictions

This package, **even if later signed**, covers only document eligibility and status-workflow **implementation behind disabled live write flags**, unless a further activation decision is recorded.

It does **not** authorize:

- Live Draft write-flag activation (`SAMPLE_GIFT_DRAFT_WRITES` / `EXPORT_DRAFT_WRITES`)
- Changes to live product flags or classifications
- Live Draft creation
- Stock reservation, release, deduction, or issuance
- Warehouse dispatch
- Delivery confirmation
- Invoice generation or financial posting
- Live inventory reconciliation or correction
- New RBAC permission codes
- Database migrations
- Phase F.4C (unified stock reservation)

Those require separate, named approvals.

---

## E. Approval Record

Finalization review 25 November 2026: searched this file, the F.4 checklist, F.4A/F.4B reports, and the rest of `docs/` for named Product Owner, Operations Owner, or Authorization Policy signatures on A1–A6, B1–B6, and C1–C8. **None found.** The only repo sentences of the form “I approve …” are D.5 Alembic stamp and F.3.2 live migration, which do not cover this workflow.

Finalization pass 26 November 2026: the F.4 approval-finalization task asked for Product Owner, Authorization Policy Owner, and Operations Owner names and per-rule decisions. **That user message did not contain those names, dates, or Approve/Reject/Request-changes marks.** A Cursor prompt is not business approval.

Same-day follow-up: a decision form was submitted with placeholder tokens only (`[Actual name]`, `[Date]`, `[Approve all / Specify individual decisions]`, `[Optional]`). A confirmation sentence that “authorized owners” decided is not a substitute for names and per-rule marks. **Those tokens were not recorded as names, dates, or Approve.** No owner names, dates, or decision marks were invented. A1–C8 and this table remain Pending.

| Field | Value |
|---|---|
| Product Owner name | Pending |
| Product Owner decision (Approve / Reject / Request changes) | Pending |
| Operations Owner name | Pending |
| Operations Owner decision | Pending |
| Authorization policy approver name | Pending |
| Authorization policy decision | Pending |
| Approval date | Pending |
| Comments or requested changes | Pending — no owner comments on file |
| **Final consolidated decision** | **Awaiting approval** |

---

## Implementation gate (engineering)

`F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED`

Until Section E has named owners, a date, and **Final consolidated decision: Approved**:

- Do not mount Submit/Approve/Reject HTTP routes.
- Do not wire `draft_product_eligibility` into live Draft POST/PUT.
- Do not set Draft write flags to yes.
- Do not change product flags or start F.4C.

Isolated helpers (`draft_product_eligibility.py`, `draft_status_transition.py`) already match A–C as **proposed** code. They stay unconnected.

Marking `F.4B Gate B: READY FOR CONTROLLED IMPLEMENTATION` is allowed only after Section E is genuinely signed. That mark still does **not** authorize running the implementation until a separate engineering order is issued.
