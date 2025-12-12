# Mobile Memo Acceptance API - Setup Guide

## Quick Start

### Step 1: Run Database Migration

You need to add three new columns to the `orders` table. Choose one method:

#### Option A: Using SQL Script (Recommended)
```bash
# Connect to your PostgreSQL database
psql -h localhost -p 55432 -U swift_user -d swift_distro_hub

# Run the migration script
\i backend/db/migrations/add_mobile_acceptance_fields.sql
```

Or manually:
```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS mobile_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mobile_accepted_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS mobile_accepted_at TIMESTAMP;
```

#### Option B: Using Python (If you prefer)
```python
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("""
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS mobile_accepted BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS mobile_accepted_by VARCHAR(100),
        ADD COLUMN IF NOT EXISTS mobile_accepted_at TIMESTAMP;
    """))
    conn.commit()
```

### Step 2: Restart Your Backend Server

The API endpoints are already registered in `main.py`. Just restart your FastAPI server:

```bash
# If using Docker
docker-compose restart backend

# If running directly
cd backend
python -m uvicorn main:app --reload
```

### Step 3: Verify API is Working

Test the endpoints:

```bash
# 1. Get assigned memos
curl http://localhost:8000/api/mobile/assigned-memos

# 2. Accept a memo (replace memo_number and user_id)
curl -X POST http://localhost:8000/api/mobile/accept-memo \
  -H "Content-Type: application/json" \
  -d '{"memo_number": "12345678", "user_id": "mobile_user_123"}'

# 3. Check loading number status
curl http://localhost:8000/api/mobile/loading-number/20250125-0001/status
```

---

## How It Works

### Flow Diagram

```
┌─────────────────┐
│   Web App       │
│  Admin assigns  │
│  orders to      │
│  loading number │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orders get     │
│  loading_number │
│  and appear in  │
│  Assigned List  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Mobile App     │◄─────┤  GET /assigned-  │
│  Users see all  │      │      memos       │
│  assigned memos │      └──────────────────┘
└────────┬────────┘
         │
         ▼ User taps "Accept"
┌─────────────────┐      ┌──────────────────┐
│  POST /accept-  │─────►│  Memo marked as  │
│      memo       │      │  accepted        │
└─────────────────┘      └────────┬─────────┘
                                  │
                                  ▼
┌─────────────────┐      ┌──────────────────┐
│  Web App shows  │◄─────┤  GET /loading-   │
│  acceptance     │      │  number/status   │
│  status         │      └──────────────────┘
└─────────────────┘
```

---

## Integration Steps

### 1. Mobile App Integration

In your mobile app, implement:

**a) Fetch Available Memos:**
```javascript
// React Native / Flutter / etc.
const fetchMemos = async () => {
  const response = await fetch('http://your-api/api/mobile/assigned-memos');
  const memos = await response.json();
  // Display list of memos
};
```

**b) Accept Memo:**
```javascript
const acceptMemo = async (memoNumber, userId) => {
  const response = await fetch('http://your-api/api/mobile/accept-memo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memo_number: memoNumber,
      user_id: userId
    })
  });
  const result = await response.json();
  if (result.success) {
    // Show success message
    // Refresh memo list
  }
};
```

### 2. Web App Integration

In your React web app (AssignedOrderList.tsx):

```typescript
import { useEffect, useState } from 'react';
import { apiEndpoints } from '@/lib/api';

// Add this to show acceptance status
const [loadingStatuses, setLoadingStatuses] = useState<Record<string, any>>({});

useEffect(() => {
  // Fetch status for each unique loading number
  const loadingNumbers = [...new Set(orders.map(o => o.loading_number).filter(Boolean))];
  
  loadingNumbers.forEach(async (ln) => {
    try {
      const status = await fetch(`/api/mobile/loading-number/${ln}/status`)
        .then(r => r.json());
      setLoadingStatuses(prev => ({ ...prev, [ln]: status }));
    } catch (error) {
      console.error('Failed to fetch status for', ln, error);
    }
  });
}, [orders]);

// Display in your component
{orders.map(order => {
  const status = loadingStatuses[order.loading_number];
  return (
    <div key={order.id}>
      <h3>Loading: {order.loading_number}</h3>
      {status && (
        <div>
          <Badge>
            {status.accepted_memos}/{status.total_memos} Accepted
          </Badge>
          <Progress value={status.acceptance_rate} />
        </div>
      )}
      {/* Show individual memo acceptance */}
      <div>
        Memo: {order.memo_number}
        {status?.memos?.find(m => m.memo_number === order.memo_number)?.accepted && (
          <Badge variant="success">Accepted</Badge>
        )}
      </div>
    </div>
  );
})}
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mobile/assigned-memos` | Get all memos available for acceptance |
| `POST` | `/api/mobile/accept-memo` | Accept a memo from mobile app |
| `GET` | `/api/mobile/loading-number/{ln}/status` | Get acceptance status for a loading number |
| `GET` | `/api/mobile/my-accepted-memos?user_id={id}` | Get memos accepted by a user |

---

## Testing Checklist

- [ ] Database migration ran successfully
- [ ] Backend server restarted
- [ ] `GET /api/mobile/assigned-memos` returns memos
- [ ] `POST /api/mobile/accept-memo` accepts a memo
- [ ] `GET /api/mobile/loading-number/{ln}/status` shows status
- [ ] Web app displays acceptance status
- [ ] Mobile app can fetch and accept memos

---

## Troubleshooting

### Issue: "Column mobile_accepted does not exist"
**Solution:** Run the database migration script.

### Issue: "404 Not Found" on mobile endpoints
**Solution:** Make sure the backend server is running and the mobile router is registered in `main.py`.

### Issue: Memos not showing in `/assigned-memos`
**Solution:** 
- Make sure orders have `loading_number` set
- Make sure orders have `assigned_to` and `assigned_vehicle` set
- Check that `loaded = True` on orders

### Issue: Can't accept memo
**Solution:**
- Verify `memo_number` or `order_id` is correct
- Make sure `user_id` is provided
- Check backend logs for errors

---

## Next Steps

1. ✅ Run database migration
2. ✅ Test API endpoints
3. ✅ Integrate in mobile app
4. ✅ Add acceptance status display in web app
5. ✅ Add real-time updates (optional - WebSocket/polling)

---

## Support

For detailed API documentation, see: `MOBILE_MEMO_ACCEPTANCE_API.md`

