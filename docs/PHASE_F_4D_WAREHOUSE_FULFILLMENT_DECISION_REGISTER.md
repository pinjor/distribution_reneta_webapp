# F.4D Warehouse Fulfillment Decision Register

**Status: PROPOSED — NOT BUSINESS APPROVED**

Date: 26 November 2026  
Official F.4 file: `docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` remains **unsigned**. A1–C8 remain **Pending**. F.4B Gate B remains **BLOCKED**. W1–W15 remain **Pending**.

This register does not authorize live picking, issuance, dispatch, delivery confirmation, returns, invoices, or RBAC changes. Isolated simulation results and dummy identities are **not** warehouse approval. Do not invent approver names or change Pending to Approved.

---

| Decision ID | Business question | Proposed default | Business implications | Technical implications | Required owner | Actual decision |
|---|---|---|---|---|---|---|
| D1 | Where does fulfillment state live? | **Option B:** separate fulfillment header. Document status stays `Approved`. | Operators still see Approved documents while warehouse work proceeds. | Avoids mutating Draft→Submitted→Approved audit. Isolated reservation `RESERVED`/`ISSUED` remains on the reservation entity. | Operations Owner + Warehouse Owner | **Pending** |
| D2 | Who may start picking and confirm picked quantities? | Admin, Manager, and a future warehouse-operator role. PSO / billing / finance: no. | Warehouse floor work is not a sales action. | Do not map `orders.write`. New permission codes (`fulfillment.pick`) are proposals only. | Authorization + Warehouse Owner | **Pending** |
| D3 | Is picker assignment mandatory before starting? | **No** for the first isolated design. Optional assigned picker field. | Faster start; weaker accountability. | Nullable `assigned_picker_id`. | Warehouse Owner | **Pending** |
| D4 | Is partial picking allowed? | **Unresolved / fail closed: no.** Short pick fails confirmation. | Full reservation must be found in the warehouse. | Matches unsigned W7. Alternative: pick short + release remainder. | Warehouse Owner + Operations | **Pending** |
| D5 | What if reserved batch is damaged or missing at pick? | Fail the pick; do not silently substitute another batch. Release or re-reserve is a later decision. | Prevents picking unreserved stock (W6). | Picker cannot choose arbitrary lots. | Warehouse Owner | **Pending** |
| D6 | What if a reserved batch is expired when picking starts? | **Reject** pick start (same as W3). Do not auto-quarantine live expired PISD. | Forces a warehouse exception process. | Isolated simulator rejects `expiry < as_of` and null expiry at pick. | Warehouse Owner + QA | **Pending** |
| D7 | Who may issue stock? | Admin / Manager / warehouse operator. Not PSO, billing, finance, or transport. | Issue is a warehouse custody change. | Proposed `fulfillment.issue`. Not granted in production. | Authorization + Warehouse Owner | **Pending** |
| D8 | When is on-hand reduced? | Align with unsigned **W12**: at issue, which is intended to occur at **dispatch/load**, not at pick and not at delivery confirm. Isolated prototype **separates** pick → issue → dispatch so double deduction cannot hide. | Reports of on-hand change at load. | Issue math: `quantity−`, `reserved−`, `available` unchanged. PIS `stock_qty−`, `issue+`. Ledger projection later (W14). | Warehouse Owner | **Pending** |
| D9 | Does dispatch itself deduct stock? | **No if issue already posted.** Dispatch records movement. If W12 “issue at dispatch” is signed, implement as **one atomic issue+dispatch** later. | Avoids two writers deducting the same hold. | Unique issue per fulfillment. Dispatch unique. | Warehouse Owner + Operations | **Pending** |
| D10 | Is a transport/shipment reference required on dispatch? | **Optional** until Transport defines a required identifier. | Sample/Gift often has no vehicle; Export may reuse existing port/shipping fields on the document. | Nullable `transport_ref`. Do not integrate carriers. | Transport + Operations | **Pending** |
| D11 | Who confirms delivery? | Admin / Manager / warehouse operator. Transport may later confirm in-transit events only. PSO does not confirm. | Customer-facing proof is a later product. | No external customer portal. | Operations Owner | **Pending** |
| D12 | Is proof-of-delivery mandatory? | **No** until Operations defines POD type (photo, signature, paper). Optional text reference in the prototype. | Cannot block warehouse close-out on missing POD yet. | Nullable `pod_ref`. | Operations Owner | **Pending** |
| D13 | Failed delivery | Status `FAILED_DELIVERY` after dispatch. **Does not** reverse issuance. Returns are a separate process. | Stock is already off the shelf. | No automatic available restore. | Warehouse Owner + Operations | **Pending** |
| D14 | Returns / reverse issue | **Out of scope** until signed. Issued stock cannot be released (W9). | Prevents silent restock. | Isolated simulator has no return transition. | Warehouse Owner + Finance | **Pending** |
| D15 | Export-specific logistics states | **Do not** add Customs Cleared / Shipped as required states. Keep destination, ports, shipping line, BL/LC, incoterms on the existing Export document. | Avoids blocking warehouse on customs paperwork. | Optional future fields listed in the architecture report only. | Operations Owner (Export) | **Pending** |
| D16 | Sample/Gift financial treatment | **No sales invoice** on pick, issue, dispatch, or delivery. Costing / FOC accounting is a Finance decision. | Matches C8 (no billing on workflow) extended through fulfillment. | Do not call invoice generate-bulk. Gift uses the existing sample product flag (A2). | Finance + Product Owner | **Pending** |
| D17 | May a reservation be released during picking? | **No** until signed. Conflict if release and pick overlap. | Prevents disappearing pick lists. | Fail closed in the simulator. Alternative: cancel pick then release. | Warehouse Owner | **Pending** |
| D18 | Who may view pick lists and history? | Admin, Manager, warehouse operator; PSO read own depot proposed later. Billing/Finance: no stock detail by default. | Foreign depot remains 404. | Do not leak batch quantities across depots. | Authorization | **Pending** |

Dummy test identities are not owners. Isolated F.4D-DEV Gate A and Gate B use these rows as **TEST ASSUMPTIONS** only. Gate B lock hierarchy (isolated adapters only): document → fulfillment → reservation → lots by id ascending. Decisions D1–D18 remain **Pending**.
