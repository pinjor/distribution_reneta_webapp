# Mobile API Quick Reference Card

## Base URL
```
Development: http://localhost/api/mobile
Production: https://your-domain.com/api/mobile
```

---

## Endpoints at a Glance

### 1. Get Assigned Memos
```
GET /api/mobile/assigned-memos?skip=0&limit=100
```
**Response:** Array of memo objects

---

### 2. Accept Memo
```
POST /api/mobile/accept-memo
Body: {
  "memo_number": "23295051",
  "user_id": "mobile_user_123"
}
```
**Response:** Success message with acceptance details

---

### 3. Check Loading Number Status
```
GET /api/mobile/loading-number/20251127-0001/status
```
**Response:** Status object with acceptance statistics

---

### 4. Get My Accepted Memos
```
GET /api/mobile/my-accepted-memos?user_id=mobile_user_123&skip=0&limit=100
```
**Response:** Array of accepted memo objects

---

## Request Headers
```
Content-Type: application/json
```

---

## Response Status Codes
- `200 OK` - Success
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Key Data Fields

### Memo Object
- `id` - Order ID
- `memo_number` - Memo number (8 digits)
- `loading_number` - Loading number
- `customer_name` - Customer name
- `total_value` - Order value
- `mobile_accepted` - Acceptance status (boolean)
- `mobile_accepted_by` - User ID who accepted
- `mobile_accepted_at` - Acceptance timestamp

---

## Quick Code Snippets

### Fetch Memos (JavaScript/TypeScript)
```javascript
const response = await fetch('http://localhost/api/mobile/assigned-memos');
const memos = await response.json();
```

### Accept Memo (JavaScript/TypeScript)
```javascript
const response = await fetch('http://localhost/api/mobile/accept-memo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    memo_number: "23295051",
    user_id: "mobile_user_123"
  })
});
const result = await response.json();
```

### Check Status (JavaScript/TypeScript)
```javascript
const response = await fetch(
  'http://localhost/api/mobile/loading-number/20251127-0001/status'
);
const status = await response.json();
```

---

## Error Handling
```javascript
try {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Request failed');
  }
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error.message);
  throw error;
}
```

---

## Testing Commands

### cURL Examples
```bash
# Get assigned memos
curl http://localhost/api/mobile/assigned-memos

# Accept a memo
curl -X POST http://localhost/api/mobile/accept-memo \
  -H "Content-Type: application/json" \
  -d '{"memo_number":"23295051","user_id":"test_user"}'

# Check status
curl http://localhost/api/mobile/loading-number/20251127-0001/status
```

### PowerShell Examples
```powershell
# Get assigned memos
Invoke-WebRequest -Uri "http://localhost/api/mobile/assigned-memos" -Method GET

# Accept a memo
$body = @{memo_number="23295051"; user_id="test_user"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost/api/mobile/accept-memo" `
  -Method POST -Body $body -ContentType "application/json"
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Connection refused | Check if backend is running |
| 404 Not Found | Verify endpoint path |
| No memos showing | Check if orders have loading_number |
| Can't accept | Verify memo_number exists |

---

**For detailed documentation, see:** `MOBILE_APP_API_INTEGRATION_GUIDE.md`

