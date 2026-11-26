# F.4E Warehouse Document Catalog

**Status: PROVISIONAL / TEST-ONLY — NOT BUSINESS APPROVED**

Date: 26 November 2026  
Official F.4 A1–C8, W1–W15 and D1–D18 remain **Pending**. These layouts are isolated test previews. They are not authorized production challans, issue slips or POD certificates.

Watermark on every preview and print: `PROVISIONAL — TEST DOCUMENT — NOT FOR DISPATCH`  
There is no toggle to remove it.

Data sources are isolated GET APIs only. Printing never reserves, issues, dispatches or delivers stock.

| Document | Purpose | Data source | Allowed fulfillment status | Required fields shown | Optional / dashed if missing | Print | Future approval |
|---|---|---|---|---|---|---|---|
| Warehouse Pick List | Read-only pick instruction from reserved batches | Isolated fulfillment GET + reservation slices + source document | `PICKING` and later | Document/fulfillment/reservation refs, depot, status, reserved batch slices | Assigned picker, SKU, remarks, product name fallback | A4, existing print CSS, watermark | Warehouse Owner: official pick-list numbering and picker assignment (D2/D3) |
| Picking Confirmation Sheet | Record of confirmed picked quantities | Same + `CONFIRM_PICK` audit | `PICKED` and later | Reserved vs picked qty per reserved lot; discrepancy only if quantities differ | Picker name (—); discrepancy — when equal | Same | Warehouse Owner: partial pick / damage process (D4/D5) |
| Stock Issue Slip | Evidence of isolated synthetic issue | Fulfillment after `ISSUE` + `ISSUE` audit | `ISSUED`, `DISPATCHED`, `DELIVERED`, `FAILED_DELIVERY` | Fulfillment id as issue reference, issued qty, actor id, timestamp, batch qty | Actor display name | Same | Warehouse Owner: official issue number; W12 timing |
| Dispatch Note / Delivery Challan | Movement document after dispatch | Fulfillment after `DISPATCH` + source recipient or export logistics fields | `DISPATCHED`, `DELIVERED`, `FAILED_DELIVERY` | Dispatch id, depot, destination/recipient, batches, quantities | Transport ref, shipping line, container, B/L | Same | Operations + Transport: required transport id (D10); do not treat as commercial invoice (D16) |
| Delivery Confirmation | Successful close-out | Fulfillment `DELIVERED` + `CONFIRM_DELIVERY` audit | `DELIVERED` only for “delivered” wording | Dispatch ref, status Delivered, delivered qty | Receiver name, POD text ref, remarks | Same | Operations: mandatory POD type (D12); no signature image until signed |
| Failed Delivery Summary | Same template, failed path | Fulfillment `FAILED_DELIVERY` + `FAIL_DELIVERY` audit | `FAILED_DELIVERY` | Status failed, reason, actor | Receiver/POD/delivered qty forced to — | Same | Warehouse + Operations: returns (D13/D14) |

Sample/Gift uses recipient name and type from the existing Sample/Gift document. Export reuses destination country, ports, shipping line, container and B/L from the existing Export document. No customs clearance or shipping authorization fields.

Batch lines always come from reserved slices joined to fulfillment pick slices by `lot_id`. Unreserved lots are omitted.

---

Dummy test identities are not owners. Isolated F.4E-DEV Gate A uses this catalog as **TEST ASSUMPTIONS** only.
