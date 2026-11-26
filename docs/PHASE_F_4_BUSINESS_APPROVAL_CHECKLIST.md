# Phase F.4 — Business Approval Checklist

**Overall approval:** **Incomplete**  
**Engineering gate:** `F.4B Gate B: BLOCKED — BUSINESS APPROVAL REQUIRED`  
**Date:** 26 November 2026 (finalization pass; still no owner signatures)  

Every row is **Pending** until a named owner records Approve, Reject, or Request changes in `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` Section E / per-rule fields. Recommended defaults are engineering proposals, not decisions.

---

## Product eligibility (Product Owner)

| ID | Requirement | Recommended default | Approver | Evidence | Status | Engineering consequence if approved |
|---|---|---|---|---|---|---|
| A1 | Sample SKU rule | Active + `product_type_sample=true` | Product Owner | Policy §A; F.4A helper | Pending | 400 on create/update/submit for non-sample |
| A2 | Gift SKU rule | Same as Sample | Product Owner | Policy §A | Pending | No new column |
| A3 | Export SKU rule | Active + `product_type_export=true` | Product Owner | Policy §A | Pending | 400 for non-export |
| A4 | Multi-category SKU | Allowed | Product Owner | Policy §A | Pending | Independent flags |
| A5 | Backend enforcement points | Create, update, **and** submit | Product Owner | Policy §A5; F.4A | Pending | Wire helper; UI-only filter insufficient |
| A6 | Named SKU list before classify | Separate list; no auto-flag | Product Owner | Policy §A6 | Pending | Live flags stay false until that list |

## Authorization (Authorization policy owner)

| ID | Requirement | Recommended default | Approver | Evidence | Status | Engineering consequence if approved |
|---|---|---|---|---|---|---|
| B1 | Create/update Draft | Admin, Manager + write flag (existing) | Auth owner | Live routers | Pending | No role change |
| B2 | Submit | Admin, Manager | Auth owner | Isolated helper | Pending | Mount submit behind flag |
| B3 | Approve/reject | Admin, Manager | Auth owner | Isolated helper | Pending | Mount approve/reject behind flag |
| B4 | PSO / other writes | None for these documents | Auth owner | Live 403; policy §B4 | Pending | Keep 403; no `orders.write` mapping |
| B5 | Self-approve | Forbidden | Auth owner | Helper `ALLOW_SELF_APPROVE=False` | Pending | 403 if `user.id == created_by` |
| B6 | Depot isolation | Existing 404 | Auth owner | `hide_foreign_depot` | Pending | No change |

## Workflow (Operations Owner)

| ID | Requirement | Recommended default | Approver | Evidence | Status | Engineering consequence if approved |
|---|---|---|---|---|---|---|
| C1 | Happy path | Draft → Submitted → Approved | Operations | Helper `TRANSITIONS` | Pending | Mount three POSTs per module |
| C2 | Reject path | Submitted → Rejected | Operations | Helper | Pending | Same |
| C3 | Rejected terminal | Yes | Operations | Helper | Pending | 409 on further transitions |
| C4 | Reject reason | Mandatory | Operations | Helper 422 | Pending | Body `{reason}` |
| C5 | Invalid transition | 409 | Operations | Helper | Pending | No silent coerce |
| C6 | Audit + idempotent retry | Audit once; retry no extra row | Operations | Gate A PG sim | Pending | `FOR UPDATE` + skip audit if already target |
| C7 | Shared SG/Export model | Yes | Operations | Policy §C | Pending | One service, two prefixes |
| C8 | No stock/billing on status | Yes | Operations | Helper has no stock imports | Pending | Do not call reservation/invoice |

## Explicitly out of scope (must stay unapproved here)

| ID | Action | Status | Consequence |
|---|---|---|---|
| X1 | Live Draft write flags `yes` | **Not authorized** | Compose stays `no` |
| X2 | Change live product flags | **Not authorized** | Catalog stays 0 eligible |
| X3 | Live Draft creation | **Not authorized** | |
| X4 | Stock reserve/deduct/issue | **Not authorized** | F.4C still blocked |
| X5 | Dispatch / delivery confirm | **Not authorized** | |
| X6 | Invoice / financial posting | **Not authorized** | |
| X7 | Live inventory correction | **Not authorized** | F.3.4 2365 unexplained as loss |
| X8 | New RBAC codes | **Not authorized** | |
| X9 | Database migrations | **Not authorized** | Stay `f3_export_draft` |
| X10 | Phase F.4C implementation | **Not authorized** | |

---

**Mandatory set for Gate B “READY FOR CONTROLLED IMPLEMENTATION” (still not an execute order):** A1–A6, B1–B6, C1–C8 all **Approve**, plus Section E names, date, and consolidated **Approved**.

**Current:** zero of those rows are signed → overall **Incomplete**.
