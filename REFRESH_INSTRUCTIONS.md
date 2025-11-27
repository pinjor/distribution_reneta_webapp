# Refresh Instructions - Order Management Updates

## The changes are in the code, but you need to refresh:

### Option 1: Rebuild Frontend Container (Recommended)

```powershell
# Stop and rebuild frontend
docker-compose stop frontend
docker-compose build frontend
docker-compose up -d frontend

# Or rebuild everything
docker-compose down
docker-compose up -d --build
```

### Option 2: Clear Browser Cache

1. **Chrome/Edge:**
   - Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"
   - Or press `Ctrl + F5` to hard refresh

2. **Firefox:**
   - Press `Ctrl + Shift + Delete`
   - Select "Cache"
   - Click "Clear Now"
   - Or press `Ctrl + F5`

### Option 3: Restart All Services

```powershell
docker-compose restart
```

### Option 4: If Using Local Dev Server

If you're running the frontend locally (not Docker):

```powershell
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

## What Should You See After Refresh:

### Sales Order Form (`/orders/new`):
- **New fields:** Free goods, Unit Price, Use code, Discount %
- **Updated table columns:** Product code, Size, Free goods, Total Qty, Unit Price, Use code, Price - Dis.%, Total Price

### Sales Order List (`/orders`):
- **Updated columns when expanded:** Product code, Size, Free goods, Total Qty, Unit Price, Use code, Price - Dis.%, Total Price

### New Menu Items:
- Route Wise Order (`/orders/route-wise`)
- Assigned Order List (`/orders/assigned`)

## Verify Changes:

1. Go to `/orders/new` - You should see the new fields
2. Add an item - The table should show new columns
3. Check the menu - Should only show "Sales Order", "Sales Order List", "Route Wise Order", "Assigned Order List"

## If Still Not Working:

1. Check browser console for errors (F12)
2. Check if backend is running: `docker-compose ps`
3. Check backend logs: `docker-compose logs backend`
4. Check frontend logs: `docker-compose logs frontend`

