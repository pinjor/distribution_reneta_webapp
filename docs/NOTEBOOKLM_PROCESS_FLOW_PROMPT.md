# NotebookLM Prompt — Swift Distribution Hub Process Flow Visualization

## Step 1: Upload these sources to NotebookLM first

Upload as many of these as possible before running the prompt:

1. `docs/SWIFT_DISTRIBUTION_HUB_CLIENT_DOCUMENTATION.md` (or the `.docx` version)
2. `WORKFLOW_VERIFICATION.md`
3. `MOBILE_MEMO_ACCEPTANCE_API.md`
4. `MOBILE_APP_API_INTEGRATION_GUIDE.md`
5. `DATABASE_SEEDING_GUIDE.md`
6. `DMS_CRITICAL_GAP_FIXING_REPORT.md`

---

## Step 2: Copy and paste this entire prompt into NotebookLM

---

**PROMPT START**

You are a senior business process analyst and solution architect. Using ONLY the uploaded source documents about **Swift Distribution Hub (Reneta DMS)** — a FMCG distribution management system — create a complete, client-ready **process flow visualization package**.

Your output must be accurate to the system described in the sources. Do not invent modules, steps, or integrations that are not documented. Where something is marked as sandbox/planned (e.g., live Oracle integration), label it clearly as **Future / Pending IT Configuration**.

---

### OUTPUT REQUIREMENTS

Produce **7 separate process flow diagrams**, each with:
1. A **Mermaid flowchart** (or swimlane diagram where actors differ)
2. A **plain-language narrative** (5–10 sentences explaining the flow)
3. A **legend** (actors, systems, status colors)
4. **Decision diamonds** for every branch/exception path
5. **Actor swimlanes** where multiple roles are involved

Use this visual convention consistently:
- 🟦 **Blue** = Happy path / normal flow
- 🟨 **Yellow** = Pending approval / manual review
- 🟥 **Red** = Rejected / failed / blocked
- 🟩 **Green** = Completed / approved / closed
- ⬜ **Grey dashed** = Future integration / sandbox / not yet live

Label every step with: **Step name | Actor | System (Web DMS / DEX Mobile / Oracle ERP / Field Force)**

---

### DIAGRAM 1 — MASTER END-TO-END DISTRIBUTION LIFECYCLE (Level 0)

Create a **single high-level overview** showing how the entire business operates from inbound stock to management reporting.

Must include these 8 lifecycle stages in order:
1. Order Creation
2. Validation
3. Route Wise (memo grouping & printing)
4. Assignment (vehicle/driver/loading number)
5. Delivery (field execution)
6. Collection (cash/cheque from customers)
7. Billing (deposits & invoicing)
8. MIS Report

Show parallel supporting tracks:
- **Warehouse track**: Stock Receipt → Stock Maintenance → Stock Issuance (FEFO)
- **Master data track**: Companies, Depots, Products, Customers, Routes, Vehicles, Drivers
- **Finance track**: Reconciliation → Day-End Closing
- **External systems track**: Oracle ERP, Field Force, RMC, HR/Empress, Power BI (mark sandbox items)

Show order sources entering the system:
- `MANUAL_DMS` (web entry)
- `FIELD_FORCE` (import)
- `DEX_CRP` (mobile)
- `INTEGRATION` (Oracle/other)

---

### DIAGRAM 2 — ORDER-TO-CASH DETAILED FLOW (Level 1 — Core Revenue Path)

This is the most important diagram. Model the **complete order-to-cash workflow** with every documented screen transition and API milestone.

**Phase A — Order Creation**
- Actor: Depot Operator / Sales User
- System: Web DMS
- Steps: Create draft order → Select depot, customer, PSO, route, products, delivery date → Save draft
- Status: `DRAFT`, `delivery_status = ORDER_CREATED`
- Screen: Order Entry → Order List (shows only non-validated orders)

**Phase B — Order Validation (Rules Engine)**
- Actor: Depot Operator (validate) / Manager (approve exception)
- System: Web DMS
- Steps: Submit for validation → Run 11 rules:
  - CUSTOMER_ACTIVE, PRODUCT_ACTIVE, CREDIT_LIMIT, CREDIT_PERIOD (days 1–7), STOCK_AVAILABLE, FEFO_ALLOCATION, PRICE_AVAILABLE, DISCOUNT_VALID (warning), PROMOTION_APPLY (warning), HIGH_VALUE > BDT 500,000 (warning), OVERDUE_CUSTOMER
- Decision branches:
  - ✅ VALIDATED → auto FEFO stock reservation → proceed
  - ⚠️ PENDING_APPROVAL → Manager approves exception (`orders.approve_exception`) → proceed
  - ❌ REJECTED → return to order correction
  - 💥 FAILED → technical error path
- Output: `validated = True`, memo_number generated (8-digit), `delivery_status = VALIDATED`
- Screen: Order List → Route Wise Memo List

**Phase C — Route Wise & Memo Printing**
- Actor: Depot Operator
- Steps: Group orders by route_code → Print route-wise memo report
- Output: `printed = True`, `printed_at` set
- Screen: Route Wise Memo List

**Phase D — Assignment & Loading**
- Actor: Distribution Manager
- Steps: Select route orders → Assign vehicle + driver + employee → Generate `loading_number` (format: YYYYMMDD-XXXX)
- Output: `loaded = True`, `assigned_to`, `assigned_vehicle`, `loading_date`, `loaded_at`
- Screen: Route Wise → Assigned Order List (grouped by loading_number)
- Generate: Loading Report PDF, Money Receipt PDF

**Phase E — Delivery Execution (Web + Mobile)**
- Actor: Driver / Field Rep (mobile) OR Depot Manager (web approval path)
- Systems: DEX Mobile App + Web DMS

Show BOTH paths:

*Web path:*
- Approve delivery (`POST /orders/assigned/approve-delivery`)
- Determine: Fully Delivered / Partial / Postponed based on quantities
- Set `collection_status`: Pending / Partially Collected / Postponed

*Mobile path (state machine):*
- ACCEPT_ASSIGNMENT → CHECK_IN → DELIVER_FULL / DELIVER_PARTIAL / POSTPONE / CANCEL
- Delivery statuses: ORDER_CREATED → VALIDATED → PICKING_IN_PROGRESS → PACKING_IN_PROGRESS → PLANNED_FOR_DELIVERY → READY_TO_DISPATCH → IN_DELIVERY → DELIVERY_IN_PROGRESS → DELIVERED / POSTPONED / CANCELLED
- Collection statuses (parallel): NOT_YET_DELIVERED → DELIVERED_NOT_COLLECTED → COLLECTION_IN_PROGRESS → COLLECTED / DUE_COLLECTION

**Phase F — Collection Approval**
- Actor: Billing User / Manager
- Steps: Review collection approval list (grouped by loading_number) → Approve collection → Print money receipt
- Output: `collection_approved = True`, `collected_amount`, `pending_amount` calculated
- Screen: Approval for Collection

**Phase G — Billing & Deposit**
- Actor: Billing / Finance User
- Steps: Record collection deposits → Link transactions to orders
- Output: `CollectionTransaction` with `deposit_id` set
- Screen: Collection Deposit List, Billing Reports

**Phase H — MIS Reporting**
- Actor: Manager / Finance
- Steps: Generate MIS reports from completed orders
- Screen: Order MIS, Report Center (65 registered reports)

Include a **side panel** showing key data fields that change at each gate (validated, printed, loaded, collection_approved, deposit_id).

---

### DIAGRAM 3 — WAREHOUSE & INVENTORY FLOW

Model inventory movement through the warehouse module:

1. **Stock Receipt** — goods received at depot (challan verification UI references Oracle EBS — mark as simulated/sandbox until Oracle adapter live)
2. **Product Item Stock** — batch-level stock with expiry dates stored in `product_item_stock_details`
3. **Stock Maintenance** — status changes (Unrestricted, Sellable, etc.)
4. **FEFO Allocation** — on order validation, earliest-expiry batches reserved first
5. **Stock Reservation** — `available_quantity` → `reserved_quantity` on validate; released on re-validate; committed on issuance
6. **Stock Issuance** — goods leave warehouse for distribution
7. **Stock Adjustment** — manual correction for physical count discrepancies
8. **Depot Transfer** — inter-depot stock movement with approval

Show decision: **Stock sufficient?** → Yes: reserve FEFO batches → No: validation REJECTED

---

### DIAGRAM 4 — FINANCE, RECONCILIATION & DAY-END CLOSING

Model the cash control workflow:

1. Loading assignment completed → Create reconciliation from loading_number
2. Reconciliation status flow: `DRAFT` → `PENDING_VERIFICATION` → `PENDING_APPROVAL` → `APPROVED` / `REJECTED`
3. Actors: Finance Clerk (verify) → Finance Manager (approve/reject)
4. Variance handling: cash short, cash over, missing collection
5. Day-end closing: create day-end for depot + date → approve → lock period
6. Link to collection deposits and billing

Show exception path: variance found → reject with reason → return to field collection review

---

### DIAGRAM 5 — EXTERNAL SYSTEM INTEGRATION & DATA EXCHANGE

Model integration boundaries as a **system context diagram** with data flow arrows:

| System | Direction | Data | Trigger | Status |
|--------|-----------|------|---------|--------|
| Oracle ERP | Inbound | Inventory/challan pull | API: `/integrations/oracle/inventory/pull` | Sandbox |
| Oracle ERP | Outbound | Revenue push | API: `/integrations/oracle/revenue/push` | Sandbox |
| Field Force / OOT | Inbound | Order import | API: `/integrations/field-force/orders/import` | Sandbox |
| RMC | Outbound | Sales push | API: `/integrations/rmc/sales/push` | Sandbox |
| HR / Empress | Inbound | Employee sync | API: `/integrations/hr/employees/sync` | Sandbox |
| Power BI | Outbound | Report export | Adapter framework | Sandbox |
| DEX Mobile | Bidirectional | Orders, delivery, collection, sync | `/api/mobile/*`, `/api/sync/*` | Live |

For each integration show:
- Job created → Adapter executes → SUCCESS / SANDBOX / FAILED
- Failed path → `integration_failures` table → Manual retry (`/jobs/{id}/retry`)

Include **data ownership matrix**: which system is system-of-record for Products, Customers, Orders, Inventory, Revenue.

---

### DIAGRAM 6 — MOBILE FIELD OPERATIONS (DEX App)

Model the field representative / driver workflow:

1. **Device Registration** — register device → verify → (optional) block
2. **View Assigned Memos** — `GET /api/mobile/assigned-memos` (orders with loading_number, not yet mobile-accepted)
3. **Accept Memo** — permanent acceptance (no unaccept API) → `mobile_accepted = True`
4. **Offline Sync** — push events to sync queue → pull updates → conflict resolution
5. **Field Delivery** — CHECK_IN (with geo) → DELIVER_FULL / DELIVER_PARTIAL / POSTPONE
6. **Field Collection** — START_COLLECTION → COLLECT_FULL / COLLECT_PARTIAL
7. **Sync failure** → retry via `/api/sync/failures/{id}/retry`

Show offline mode: events queued locally → sync on reconnect → idempotency key prevents duplicates

Actors: Driver, Field Sales Rep (PSO), System Admin (device management)

---

### DIAGRAM 7 — EXCEPTION HANDLING & MANUAL OVERRIDE MAP

Create a **decision tree / exception flow** covering all documented edge cases:

**Validation exceptions:**
- Credit limit exceeded → PENDING_APPROVAL → Manager override
- Insufficient stock → REJECTED → warehouse replenishment → re-validate
- Overdue customer → block or approve exception
- High-value order → warning → manager review
- Credit period violation (days 8–31) → REJECTED or exception

**Delivery exceptions:**
- Partial delivery → DUE_COLLECTION
- Postponed delivery → POSTPONED → returns to assignment queue
- Cancelled order → CANCELLED → refund path
- Invalid status transition → HTTP 400 blocked

**Finance exceptions:**
- Reconciliation variance → reject → investigation
- Day-end not closed → pending reconciliations must be resolved

**System exceptions:**
- API timeout (Nginx 60s) → retry
- Integration job FAILED → manual retry
- Sync queue FAILED → manual retry
- Redis unavailable → degrade gracefully, continue operations

**Authorization matrix** — show which role can perform each override:
- admin, manager, billing, finance, transport, user

---

### FINAL DELIVERABLES CHECKLIST

At the end of your response, provide:

1. ✅ All 7 Mermaid diagrams (ready to paste into Mermaid Live Editor or draw.io)
2. ✅ A **one-page executive summary** of the entire distribution operation
3. ✅ A **glossary** of all status values (delivery_status, collection_status, validation_status, order.status)
4. ✅ A **role × responsibility matrix** (who does what at each stage)
5. ✅ A **recommended slide order** if presenting these flows to a client workshop (which diagram to show first, second, etc.)
6. ✅ Suggested **color palette and icon set** for building this in PowerPoint, Visio, or Lucidchart

**Style guidance:**
- Use professional FMCG/distribution industry language
- Keep diagrams readable — max 25 nodes per diagram; split into sub-diagrams if needed
- Every arrow must have a label (action or condition)
- Number steps sequentially within each diagram
- Audience: C-level executives + IT operations + depot managers (diagram must work for all three)

**PROMPT END**

---

## Step 3: Follow-up prompts (use after the first response)

### Refinement Prompt A — Simplify for executives
```
Take Diagram 1 (Master End-to-End) and Diagram 2 (Order-to-Cash) only. 
Simplify to maximum 15 steps total. Remove technical API names. 
Output as a single PowerPoint-ready slide outline with speaker notes.
```

### Refinement Prompt B — Technical deep-dive
```
Take Diagram 2 (Order-to-Cash) and expand it into a BPMN 2.0 swimlane diagram 
with lanes for: Depot Operator, Manager, Driver/Mobile, Billing, Finance, System (Automated).
Include all status enum values at each transition gate.
```

### Refinement Prompt C — Exception-only workshop
```
Take Diagram 7 only. Convert it into a facilitator guide for a 90-minute client workshop.
Include: scenario name, trigger, system behavior, who decides, resolution SLA, audit trail location.
Format as a table.
```

### Refinement Prompt D — Export to visual tool
```
Convert all 7 Mermaid diagrams to draw.io XML format, 
or provide step-by-step instructions to recreate each diagram in Lucidchart 
with exact shapes, colors, and connector labels.
```

---

## Tips for best NotebookLM results

1. **Upload the `.docx` client document** — NotebookLM handles Word files well
2. **Ask one diagram at a time** if the full prompt produces truncated output: e.g., "Create Diagram 2 only"
3. **Pin the best response** in NotebookLM and ask follow-ups against it
4. **Use Audio Overview** after generating flows — NotebookLM can narrate the process for stakeholder review
5. **Cross-check** generated flows against `WORKFLOW_VERIFICATION.md` for accuracy
