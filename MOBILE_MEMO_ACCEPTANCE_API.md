# Mobile Memo Acceptance API Documentation

## Overview

This API enables mobile app users to:
1. View all assigned memos (memos that appear in "Assigned Order List" in the web app)
2. Accept memos from the mobile app
3. Check acceptance status for loading numbers
4. View their own accepted memos

## Database Migration Required

Before using these APIs, you need to add three new columns to the `orders` table:

```sql
ALTER TABLE orders 
ADD COLUMN mobile_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN mobile_accepted_by VARCHAR(100),
ADD COLUMN mobile_accepted_at TIMESTAMP;
```

Or using Alembic migration:
```python
# In your migration file
def upgrade():
    op.add_column('orders', sa.Column('mobile_accepted', sa.Boolean(), default=False))
    op.add_column('orders', sa.Column('mobile_accepted_by', sa.String(100), nullable=True))
    op.add_column('orders', sa.Column('mobile_accepted_at', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('orders', 'mobile_accepted_at')
    op.drop_column('orders', 'mobile_accepted_by')
    op.drop_column('orders', 'mobile_accepted')
```

## API Endpoints

### Base URL
All endpoints are prefixed with `/api/mobile`

---

### 1. Get Assigned Memos (Available for Acceptance)

**Endpoint:** `GET /api/mobile/assigned-memos`

**Description:**  
Returns all memos that have been assigned (appear in "Assigned Order List") and are available for mobile users to accept.

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip for pagination
- `limit` (optional, default: 100): Maximum number of records to return

**Response:**
```json
[
  {
    "id": 123,
    "order_id": 123,
    "memo_number": "87654321",
    "order_number": "order-123",
    "loading_number": "20250125-0001",
    "customer_name": "ABC Pharmacy",
    "customer_code": "CUST-001",
    "route_code": "RT-001",
    "route_name": "Route 1",
    "delivery_date": "2025-01-26",
    "assigned_employee_id": 5,
    "assigned_employee_name": "John Doe",
    "assigned_vehicle_id": 3,
    "assigned_vehicle_registration": "ABC-1234",
    "assignment_date": "2025-01-25T10:30:00",
    "items_count": 5,
    "total_value": 15000.50,
    "mobile_accepted": false,
    "mobile_accepted_by": null,
    "mobile_accepted_at": null,
    "area": "Downtown",
    "status": "Available"
  }
]
```

**Response Fields:**
- `id`: Order ID
- `memo_number`: 8-digit memo number
- `loading_number`: Loading number assigned to this memo
- `mobile_accepted`: Whether this memo has been accepted by a mobile user
- `mobile_accepted_by`: User ID of the mobile user who accepted (if accepted)
- `mobile_accepted_at`: Timestamp when memo was accepted (if accepted)

---

### 2. Accept a Memo

**Endpoint:** `POST /api/mobile/accept-memo`

**Description:**  
Allows a mobile user to accept a memo. Once accepted, the memo is marked as accepted and tracked.

**Request Body:**
```json
{
  "memo_number": "87654321",  // Either memo_number OR order_id required
  "order_id": 123,            // Optional if memo_number provided
  "user_id": "mobile_user_123" // Mobile app user ID (required)
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Memo 87654321 accepted successfully",
  "memo_number": "87654321",
  "loading_number": "20250125-0001",
  "accepted_at": "2025-01-25T14:30:00",
  "accepted_by": "mobile_user_123"
}
```

**Response (Already Accepted):**
```json
{
  "success": true,
  "message": "Memo 87654321 was already accepted",
  "memo_number": "87654321",
  "loading_number": "20250125-0001",
  "accepted_at": "2025-01-25T14:00:00",
  "accepted_by": "mobile_user_456"
}
```

**Error Responses:**
- `404 Not Found`: Memo not found
- `500 Internal Server Error`: Server error

---

### 3. Get Loading Number Status

**Endpoint:** `GET /api/mobile/loading-number/{loading_number}/status`

**Description:**  
Returns the acceptance status for all memos in a specific loading number. Useful for showing acceptance progress in the web app.

**Path Parameters:**
- `loading_number`: The loading number to check (e.g., "20250125-0001")

**Response:**
```json
{
  "loading_number": "20250125-0001",
  "total_memos": 10,
  "accepted_memos": 7,
  "pending_memos": 3,
  "acceptance_rate": 70.0,
  "all_accepted": false,
  "memos": [
    {
      "memo_number": "87654321",
      "order_id": 123,
      "customer_name": "ABC Pharmacy",
      "accepted": true,
      "accepted_by": "mobile_user_123",
      "accepted_at": "2025-01-25T14:30:00"
    },
    {
      "memo_number": "87654322",
      "order_id": 124,
      "customer_name": "XYZ Medical",
      "accepted": false,
      "accepted_by": null,
      "accepted_at": null
    }
  ]
}
```

**Response Fields:**
- `total_memos`: Total number of memos in this loading number
- `accepted_memos`: Number of accepted memos
- `pending_memos`: Number of pending memos
- `acceptance_rate`: Percentage of accepted memos (0-100)
- `all_accepted`: Boolean indicating if all memos are accepted
- `memos`: Array of individual memo statuses

---

### 4. Get My Accepted Memos

**Endpoint:** `GET /api/mobile/my-accepted-memos?user_id={user_id}`

**Description:**  
Returns all memos that have been accepted by a specific mobile user.

**Query Parameters:**
- `user_id` (required): Mobile app user ID
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100): Maximum number of records to return

**Response:**  
Same format as `/assigned-memos`, but only includes memos accepted by the specified user.

---

## Implementation Flow

### Web App Flow:
1. Admin assigns orders in "Assigned Order List"
2. Orders get a `loading_number` and appear in the system
3. These orders automatically become available to mobile app users

### Mobile App Flow:
1. **Fetch Available Memos:**
   ```
   GET /api/mobile/assigned-memos
   ```
   Shows all memos that are assigned but not yet accepted

2. **Accept a Memo:**
   ```
   POST /api/mobile/accept-memo
   Body: { "memo_number": "87654321", "user_id": "mobile_user_123" }
   ```
   User taps "Accept" button → API call → Memo marked as accepted

3. **View Accepted Memos:**
   ```
   GET /api/mobile/my-accepted-memos?user_id=mobile_user_123
   ```
   Shows all memos accepted by this user

### Web App Status Check:
1. **Check Loading Number Status:**
   ```
   GET /api/mobile/loading-number/20250125-0001/status
   ```
   In the "Assigned Order List", you can show:
   - "7/10 memos accepted"
   - Individual memo acceptance status
   - Acceptance progress bar

---

## Integration Example (React/TypeScript)

```typescript
// Fetch assigned memos
const fetchAssignedMemos = async () => {
  const response = await fetch('http://your-api/api/mobile/assigned-memos');
  const memos = await response.json();
  return memos;
};

// Accept a memo
const acceptMemo = async (memoNumber: string, userId: string) => {
  const response = await fetch('http://your-api/api/mobile/accept-memo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memo_number: memoNumber,
      user_id: userId
    })
  });
  const result = await response.json();
  return result;
};

// Check loading number status
const checkLoadingStatus = async (loadingNumber: string) => {
  const response = await fetch(
    `http://your-api/api/mobile/loading-number/${loadingNumber}/status`
  );
  const status = await response.json();
  return status;
};
```

---

## Display in Web App (Assigned Order List)

You can enhance the "Assigned Order List" to show acceptance status:

```typescript
// In your AssignedOrderList component
const [loadingStatus, setLoadingStatus] = useState({});

useEffect(() => {
  // Fetch status for each loading number
  const loadingNumbers = [...new Set(orders.map(o => o.loading_number))];
  
  loadingNumbers.forEach(async (ln) => {
    const status = await checkLoadingStatus(ln);
    setLoadingStatus(prev => ({ ...prev, [ln]: status }));
  });
}, [orders]);

// Display in UI
{orders.map(order => {
  const status = loadingStatus[order.loading_number];
  return (
    <div>
      <h3>Loading: {order.loading_number}</h3>
      {status && (
        <Badge>
          {status.accepted_memos}/{status.total_memos} Accepted
        </Badge>
      )}
    </div>
  );
})}
```

---

## Error Handling

All endpoints return standard HTTP status codes:
- `200 OK`: Success
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "detail": "Error message here"
}
```

---

## Notes

1. **User ID Format:** The `user_id` field accepts any string. It should match your mobile app's user identification system (could be email, UUID, employee ID, etc.)

2. **Acceptance is Permanent:** Once a memo is accepted, it cannot be unaccepted through the API. If needed, you can manually update the database.

3. **Multiple Acceptances:** The API prevents duplicate acceptances. If a memo is already accepted, the API returns the existing acceptance information.

4. **Real-time Updates:** The web app should poll or use WebSocket to get real-time updates of acceptance status.

5. **Security:** Consider adding authentication/authorization middleware to these endpoints in production.

---

## Testing

Use the following curl commands to test:

```bash
# Get assigned memos
curl -X GET "http://localhost:8000/api/mobile/assigned-memos"

# Accept a memo
curl -X POST "http://localhost:8000/api/mobile/accept-memo" \
  -H "Content-Type: application/json" \
  -d '{"memo_number": "87654321", "user_id": "test_user_123"}'

# Check loading number status
curl -X GET "http://localhost:8000/api/mobile/loading-number/20250125-0001/status"

# Get my accepted memos
curl -X GET "http://localhost:8000/api/mobile/my-accepted-memos?user_id=test_user_123"
```

---

## Summary

This API system allows:
✅ Mobile users to see all assigned memos  
✅ Mobile users to accept memos  
✅ Web app to show acceptance status per loading number  
✅ Track which user accepted which memo  
✅ View acceptance progress and statistics  

The system seamlessly integrates with your existing order assignment workflow!

