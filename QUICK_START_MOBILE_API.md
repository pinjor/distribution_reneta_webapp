# Quick Start: Mobile Memo Acceptance API

## ✅ Migration Status: COMPLETED

The database migration has been successfully run! The following columns have been added to the `orders` table:
- `mobile_accepted` (BOOLEAN)
- `mobile_accepted_by` (VARCHAR(100))
- `mobile_accepted_at` (TIMESTAMP)

---

## Next Steps

### 1. Restart Your Backend Server

The API endpoints are already registered. Just restart your FastAPI server:

```bash
# If using Docker
docker-compose restart backend

# If running directly
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 2. Test the API

Once your server is running, test the endpoints:

**Option A: Using curl (PowerShell)**
```powershell
# Get assigned memos
Invoke-WebRequest -Uri "http://localhost:8000/api/mobile/assigned-memos" -Method GET

# Accept a memo (replace with actual memo_number and user_id)
$body = @{
    memo_number = "12345678"
    user_id = "mobile_user_123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/mobile/accept-memo" -Method POST -Body $body -ContentType "application/json"

# Check loading number status
Invoke-WebRequest -Uri "http://localhost:8000/api/mobile/loading-number/20250125-0001/status" -Method GET
```

**Option B: Using Python**
```python
import requests

# Get assigned memos
response = requests.get("http://localhost:8000/api/mobile/assigned-memos")
print(response.json())

# Accept a memo
response = requests.post(
    "http://localhost:8000/api/mobile/accept-memo",
    json={
        "memo_number": "12345678",
        "user_id": "mobile_user_123"
    }
)
print(response.json())
```

**Option C: Using Browser**
Just visit: `http://localhost:8000/api/mobile/assigned-memos`

---

## How to Run Migration Again (if needed)

If you need to run the migration again (it's safe - uses `IF NOT EXISTS`):

```bash
cd backend
python -m db.run_migration
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mobile/assigned-memos` | GET | Get all memos available for acceptance |
| `/api/mobile/accept-memo` | POST | Accept a memo from mobile app |
| `/api/mobile/loading-number/{loading_number}/status` | GET | Get acceptance status for a loading number |
| `/api/mobile/my-accepted-memos?user_id={id}` | GET | Get memos accepted by a user |

---

## Integration Guide

### Mobile App Integration

```javascript
// Fetch available memos
const fetchMemos = async () => {
  const response = await fetch('http://your-api/api/mobile/assigned-memos');
  return await response.json();
};

// Accept a memo
const acceptMemo = async (memoNumber, userId) => {
  const response = await fetch('http://your-api/api/mobile/accept-memo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memo_number: memoNumber,
      user_id: userId
    })
  });
  return await response.json();
};
```

### Web App Integration

Add acceptance status display in your `AssignedOrderList.tsx`:

```typescript
// Fetch loading number status
const checkStatus = async (loadingNumber: string) => {
  const response = await fetch(
    `/api/mobile/loading-number/${loadingNumber}/status`
  );
  return await response.json();
};

// Display in UI: "7/10 memos accepted"
```

---

## Documentation

- **Full API Documentation:** `MOBILE_MEMO_ACCEPTANCE_API.md`
- **Setup Guide:** `MOBILE_API_SETUP_GUIDE.md`

---

## Troubleshooting

**Q: Getting 404 on mobile endpoints?**  
A: Make sure your backend server is running and restarted after the code changes.

**Q: No memos showing in `/assigned-memos`?**  
A: Make sure you have orders with:
- `loading_number` set
- `assigned_to` and `assigned_vehicle` set
- `loaded = True`

**Q: Migration failed?**  
A: If columns already exist, that's okay. The migration uses `IF NOT EXISTS` so it won't error.

---

## ✅ You're All Set!

Your mobile memo acceptance API is ready to use. Start integrating it into your mobile app!

