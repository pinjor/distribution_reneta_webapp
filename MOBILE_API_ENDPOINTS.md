# Mobile App API Endpoints

API endpoints for mobile app integration to display assigned invoices/deliveries for employees after assignment.

## Base URL
```
http://localhost:8000/api/mobile
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Get Employee Dashboard Summary
Get summary statistics for an employee's assigned deliveries.

**Endpoint:** `GET /mobile/dashboard/{employee_id}`

**Query Parameters:**
- `date` (optional): Filter by date (YYYY-MM-DD format). Defaults to today.

**Response:**
```json
{
  "employee_id": 123,
  "employee_name": "John Doe",
  "employee_code": "EMP001",
  "date": "2025-01-15",
  "summary": {
    "total_loading_groups": 3,
    "total_invoices": 15,
    "total_amount": 450000.50,
    "pending_delivery": 8,
    "delivered": 5,
    "partially_delivered": 2,
    "postponed": 0
  },
  "loading_groups": [
    {
      "loading_number": "20250115-0001",
      "loading_date": "2025-01-15",
      "vehicle_registration": "ABC-1234",
      "route_code": "R001",
      "route_name": "Route Central",
      "area": "Dhaka Central",
      "invoices_count": 5,
      "total_amount": 150000.00,
      "status": "Out for Delivery",
      "assignment_date": "2025-01-15T08:00:00Z"
    }
  ]
}
```

---

### 2. Get Assigned Invoices by Employee
Get all assigned invoices/invoices for a specific employee, grouped by loading number.

**Endpoint:** `GET /mobile/invoices/employee/{employee_id}`

**Query Parameters:**
- `loading_number` (optional): Filter by specific loading number
- `status` (optional): Filter by status - "Pending", "Out for Delivery", "Delivered", "Partially Delivered", "Postponed"
- `date` (optional): Filter by loading date (YYYY-MM-DD format)

**Response:**
```json
{
  "employee_id": 123,
  "employee_name": "John Doe",
  "employee_code": "EMP001",
  "loading_groups": [
    {
      "loading_number": "20250115-0001",
      "loading_date": "2025-01-15",
      "vehicle_registration": "ABC-1234",
      "vehicle_type": "Van",
      "route_code": "R001",
      "route_name": "Route Central",
      "area": "Dhaka Central",
      "assignment_date": "2025-01-15T08:00:00Z",
      "status": "Out for Delivery",
      "invoices": [
        {
          "memo_number": "12345678",
          "order_number": "ORD-2025-001",
          "customer_name": "ABC Pharmacy",
          "customer_code": "CUST001",
          "customer_address": "123 Main Street, Dhaka",
          "customer_phone": "+8801712345678",
          "pso_name": "Sales Rep 1",
          "pso_code": "PSO001",
          "delivery_date": "2025-01-15",
          "route_code": "R001",
          "route_name": "Route Central",
          "total_amount": 35000.50,
          "total_items": 12,
          "total_quantity": 150,
          "items": [
            {
              "product_code": "PROD001",
              "product_name": "Product Name 1",
              "pack_size": "10x10",
              "batch_number": "BATCH001",
              "expiry_date": "2026-12-31",
              "quantity": 50,
              "free_goods": 5,
              "total_quantity": 55,
              "unit_price": 500.00,
              "discount_percent": 5.0,
              "price_after_discount": 475.00,
              "total_price": 26125.00
            }
          ],
          "delivery_status": null,
          "delivered_quantity": null,
          "returned_quantity": null,
          "collection_status": "Pending",
          "collected_amount": null,
          "pending_amount": null
        }
      ],
      "total_invoices": 5,
      "total_amount": 150000.00,
      "total_items_count": 60
    }
  ],
  "total_loading_groups": 3,
  "total_invoices": 15,
  "total_amount": 450000.50
}
```

---

### 3. Get Invoice Details by Loading Number
Get detailed information about all invoices in a specific loading group.

**Endpoint:** `GET /mobile/invoices/loading/{loading_number}`

**Response:**
```json
{
  "loading_number": "20250115-0001",
  "loading_date": "2025-01-15",
  "employee": {
    "id": 123,
    "name": "John Doe",
    "code": "EMP001",
    "phone": "+8801712345678"
  },
  "vehicle": {
    "id": 45,
    "registration": "ABC-1234",
    "type": "Van",
    "model": "Toyota Hiace"
  },
  "route": {
    "code": "R001",
    "name": "Route Central"
  },
  "area": "Dhaka Central",
  "assignment_date": "2025-01-15T08:00:00Z",
  "status": "Out for Delivery",
  "invoices": [
    {
      "memo_number": "12345678",
      "order_number": "ORD-2025-001",
      "order_id": 101,
      "customer": {
        "id": 201,
        "name": "ABC Pharmacy",
        "code": "CUST001",
        "address": "123 Main Street, Dhaka",
        "phone": "+8801712345678",
        "city": "Dhaka"
      },
      "pso": {
        "id": 301,
        "name": "Sales Rep 1",
        "code": "PSO001"
      },
      "delivery_date": "2025-01-15",
      "route_code": "R001",
      "route_name": "Route Central",
      "items": [
        {
          "id": 1001,
          "product_code": "PROD001",
          "product_name": "Product Name 1",
          "pack_size": "10x10",
          "batch_number": "BATCH001",
          "expiry_date": "2026-12-31",
          "quantity": 50,
          "free_goods": 5,
          "total_quantity": 55,
          "trade_price": 500.00,
          "unit_price": 500.00,
          "discount_percent": 5.0,
          "price_after_discount": 475.00,
          "total_price": 26125.00
        }
      ],
      "totals": {
        "total_items": 12,
        "total_quantity": 150,
        "total_amount": 35000.50,
        "total_discount": 1750.00,
        "net_amount": 33250.50
      },
      "delivery": {
        "status": null,
        "delivered_quantity": null,
        "returned_quantity": null,
        "delivery_date": null
      },
      "collection": {
        "status": "Pending",
        "collected_amount": null,
        "pending_amount": null,
        "collection_type": null
      }
    }
  ],
  "summary": {
    "total_invoices": 5,
    "total_items": 60,
    "total_amount": 150000.00,
    "total_quantity": 750
  }
}
```

---

### 4. Get Invoice Details by Memo Number
Get detailed information about a specific invoice/memo.

**Endpoint:** `GET /mobile/invoices/memo/{memo_number}`

**Response:**
```json
{
  "memo_number": "12345678",
  "order_number": "ORD-2025-001",
  "order_id": 101,
  "loading_number": "20250115-0001",
  "loading_date": "2025-01-15",
  "customer": {
    "id": 201,
    "name": "ABC Pharmacy",
    "code": "CUST001",
    "address": "123 Main Street, Dhaka",
    "phone": "+8801712345678",
    "city": "Dhaka",
    "email": "abc@pharmacy.com"
  },
  "pso": {
    "id": 301,
    "name": "Sales Rep 1",
    "code": "PSO001",
    "phone": "+8801712345679"
  },
  "delivery_date": "2025-01-15",
  "route_code": "R001",
  "route_name": "Route Central",
  "employee": {
    "id": 123,
    "name": "John Doe",
    "code": "EMP001"
  },
  "vehicle": {
    "registration": "ABC-1234",
    "type": "Van"
  },
  "items": [
    {
      "id": 1001,
      "product_code": "PROD001",
      "product_name": "Product Name 1",
      "pack_size": "10x10",
      "batch_number": "BATCH001",
      "expiry_date": "2026-12-31",
      "quantity": 50,
      "free_goods": 5,
      "total_quantity": 55,
      "trade_price": 500.00,
      "unit_price": 500.00,
      "discount_percent": 5.0,
      "price_after_discount": 475.00,
      "total_price": 26125.00
    }
  ],
  "totals": {
    "total_items": 12,
    "total_quantity": 150,
    "total_amount": 35000.50,
    "total_discount": 1750.00,
    "net_amount": 33250.50
  },
  "delivery": {
    "status": null,
    "delivered_quantity": null,
    "returned_quantity": null,
    "delivery_date": null
  },
  "collection": {
    "status": "Pending",
    "collected_amount": null,
    "pending_amount": null,
    "collection_type": null
  },
  "created_at": "2025-01-15T07:00:00Z",
  "updated_at": "2025-01-15T08:00:00Z"
}
```

---

### 5. Update Delivery Status (Mobile App)
Update delivery status for an invoice from mobile app.

**Endpoint:** `POST /mobile/invoices/{memo_number}/delivery-status`

**Request Body:**
```json
{
  "delivery_status": "Fully Delivered",
  "delivered_quantity": 150,
  "returned_quantity": 0,
  "remarks": "Delivered successfully"
}
```

**Delivery Status Options:**
- `"Fully Delivered"` - All items delivered (returned_quantity = 0)
- `"Partial Delivered"` - Some items delivered (both quantities > 0)
- `"Postponed"` - Delivery postponed (delivered_quantity = 0)

**Response:**
```json
{
  "success": true,
  "message": "Delivery status updated successfully",
  "memo_number": "12345678",
  "delivery_status": "Fully Delivered",
  "delivered_quantity": 150,
  "returned_quantity": 0,
  "updated_at": "2025-01-15T14:30:00Z"
}
```

---

### 6. Update Collection Status (Mobile App)
Update collection status and amount for an invoice from mobile app.

**Endpoint:** `POST /mobile/invoices/{memo_number}/collection`

**Request Body:**
```json
{
  "collection_status": "Fully Collected",
  "collected_amount": 35000.50,
  "collection_method": "Cash",
  "remarks": "Cash collected"
}
```

**Collection Status Options:**
- `"Pending"` - Not yet collected
- `"Partially Collected"` - Partially collected
- `"Fully Collected"` - Fully collected
- `"Postponed"` - Collection postponed

**Response:**
```json
{
  "success": true,
  "message": "Collection status updated successfully",
  "memo_number": "12345678",
  "collection_status": "Fully Collected",
  "collected_amount": 35000.50,
  "pending_amount": 0.00,
  "collection_method": "Cash",
  "updated_at": "2025-01-15T14:35:00Z"
}
```

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "detail": "Invalid request parameters"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Not authenticated"
}
```

**404 Not Found:**
```json
{
  "detail": "Employee not found" // or "Invoice not found", "Loading number not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

---

## Status Values

### Delivery Status
- `null` - Not yet delivered
- `"Fully Delivered"` - All items delivered
- `"Partial Delivered"` - Partially delivered
- `"Postponed"` - Delivery postponed

### Collection Status
- `"Pending"` - Collection pending
- `"Partially Collected"` - Partially collected
- `"Fully Collected"` - Fully collected
- `"Postponed"` - Collection postponed

---

## Notes

1. All dates are in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
2. All amounts are in decimal format (e.g., 35000.50)
3. All quantities are integers
4. Loading numbers are unique per day and follow format: YYYYMMDD-XXXX
5. Memo numbers are 8-digit numeric strings
6. The mobile app should handle pagination for large result sets (future enhancement)

