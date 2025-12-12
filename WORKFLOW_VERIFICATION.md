# Order Workflow Verification Checklist

This document verifies that all connections in the order workflow are functioning correctly.

## Complete Order Flow

1. **Order Creation** → Order List
2. **Order Validation** → Route Wise Memo List  
3. **Print Report** → Assignment
4. **Assignment** → Loading Number → Assigned Order List
5. **Approval** → Collection Approval

## Step-by-Step Verification

### Step 1: Order Creation → Order List
- ✅ Endpoint: `POST /orders` (create order)
- ✅ Endpoint: `GET /orders` (list orders - only shows non-validated orders)
- ✅ Frontend: OrderEntry.tsx creates order
- ✅ Frontend: OrderListPage.tsx displays orders
- **Status**: CONNECTED ✓

### Step 2: Order Validation → Route Wise Memo List
- ✅ Endpoint: `POST /orders/validate` (validate orders)
  - Sets `validated = True`
  - Sets `status = APPROVED` (if all items selected)
  - Generates memo_number
- ✅ Endpoint: `GET /orders/route-wise/all` (get route-wise orders)
  - Filters: `validated = True AND loaded = False`
  - Groups by route_code
- ✅ Frontend: OrderListPage.tsx validates orders
- ✅ Frontend: RouteWiseOrderList.tsx displays validated orders
- **Status**: CONNECTED ✓

### Step 3: Print Report
- ✅ Endpoint: `POST /orders/route-wise/print` (print orders)
  - Sets `printed = True`
  - Sets `printed_at = now()`
- ✅ Frontend: RouteWiseOrderList.tsx prints reports
- **Status**: CONNECTED ✓

### Step 4: Assignment → Loading Number → Assigned Order List
- ✅ Endpoint: `POST /orders/route-wise/assign` (assign orders)
  - Sets `assigned_to`, `assigned_vehicle`
  - Sets `loaded = True`
  - Generates `loading_number` (format: YYYYMMDD-XXXX)
  - Sets `loading_date`, `assignment_date`, `loaded_at`
  - Sets `area` from route
- ✅ Endpoint: `GET /orders/assigned` (get assigned orders)
  - Filters: `assigned_to IS NOT NULL AND assigned_vehicle IS NOT NULL`
  - Groups by loading_number in frontend
- ✅ Frontend: RouteWiseOrderList.tsx assigns orders
- ✅ Frontend: AssignedOrderList.tsx displays assigned orders grouped by loading_number
- **Status**: CONNECTED ✓

### Step 5: Approval → Collection Approval
- ✅ Endpoint: `POST /orders/assigned/approve-delivery` (approve delivery)
  - Takes `loading_number` and `memos` array with quantities
  - Determines delivery status from quantities:
    - Fully Delivered: returned_quantity = 0
    - Postponed: delivered_quantity = 0
    - Partial: both > 0
  - Sets `collection_status` (Fully Collected/Partially Collected/Postponed)
  - Sets `collection_approved = False` (moves to collection approval)
  - Calculates `collected_amount` and `pending_amount`
- ✅ Endpoint: `GET /orders/collection-approval` (get collection approval list)
  - Filters: `collection_status IN ('Pending', 'Partially Collected', 'Postponed') AND collection_approved = False`
  - Includes loading_number, loading_date, area, employee, vehicle
- ✅ Endpoint: `POST /orders/{order_id}/approve-collection` (approve collection)
  - Sets `collection_approved = True`
- ✅ Frontend: AssignedOrderList.tsx approves delivery
- ✅ Frontend: ApprovalForCollection.tsx displays orders grouped by loading_number
- ✅ Frontend: ApprovalForCollection.tsx approves collection and prints money receipt
- **Status**: CONNECTED ✓

## Potential Issues to Check

1. **Order List Filtering**: Should only show non-validated orders ✓
2. **Route Wise List Filtering**: Should only show validated and unloaded orders ✓
3. **Assigned Order List Filtering**: Should show orders with loading numbers ✓
4. **Collection Approval Filtering**: Should show orders with collection_approved = False ✓
5. **Loading Number Generation**: Should be unique per day ✓
6. **Memo Number Generation**: Should be 8-digit numeric ✓
7. **Status Updates**: All status fields should update correctly ✓

## Endpoints Summary

### Order Management
- `GET /orders` - List non-validated orders
- `POST /orders` - Create order
- `PUT /orders/{id}` - Update order
- `POST /orders/validate` - Validate orders (moves to route-wise)

### Route Wise
- `GET /orders/route-wise/all` - Get all route-wise orders
- `GET /orders/route-wise/{route_code}` - Get route-specific orders
- `POST /orders/route-wise/print` - Print route-wise orders
- `POST /orders/route-wise/assign` - Assign orders (creates loading number)

### Assigned Orders
- `GET /orders/assigned` - Get assigned orders (by loading number)
- `POST /orders/assigned/approve-delivery` - Approve delivery (moves to collection)

### Collection Approval
- `GET /orders/collection-approval` - Get collection approval list
- `POST /orders/{id}/approve-collection` - Approve collection

### Reports
- `GET /orders/loading-report/{loading_number}` - Loading report PDF
- `GET /orders/money-receipt/{loading_number}` - Money receipt PDF

## Data Flow Verification

```
Order Creation
  ↓
Order List (validated = False)
  ↓
Validation (validated = True, status = APPROVED)
  ↓
Route Wise List (validated = True, loaded = False)
  ↓
Print (printed = True)
  ↓
Assignment (loaded = True, loading_number = generated, assigned_to, assigned_vehicle)
  ↓
Assigned Order List (loading_number, loaded = True)
  ↓
Approval (collection_status set, collection_approved = False)
  ↓
Collection Approval List (collection_approved = False)
  ↓
Collection Approval (collection_approved = True)
  ↓
Complete
```

All connections verified! ✓

