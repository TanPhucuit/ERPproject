# 🧪 Mock API for Local Testing

## Overview
You can now test the NovaTech ERP frontend completely locally **without needing a backend server or Supabase**. The frontend uses mock API data for all operations.

## ✅ Features Available in Mock Mode

- ✅ **Login**: Use any email and password to login
- ✅ **Dashboard**: View metrics, charts, and KPIs
- ✅ **CRM Module**: Browse leads and activities
- ✅ **Sales Module**: View sales orders and quotations
- ✅ **Purchase Module**: Manage purchase orders and supplier management
- ✅ **Inventory Module**: Track warehouse stock and inventory items
- ✅ **Accounting Module**: View invoices and financial data

## 🚀 How to Start

### Step 1: Start Frontend Only (No Backend Needed!)

```bash
cd d:\project\ERP\frontend
npm run dev
```

The frontend will start at **http://localhost:5173**

### Step 2: Open Browser and Login

1. Open http://localhost:5173 in your browser
2. **Login with any credentials** (mock mode accepts anything):
   - Email: `admin@novatech.com` (or any email)
   - Password: `password123` (or any password)

### Step 3: Start Exploring!

- Navigate through all modules
- View dashboards and charts (all with mock data)
- Test UI/UX without backend delays
- Development mode with hot reload enabled

## 📊 Mock Data Included

The system comes with realistic mock data:
- **3 Customers**: TechCorp Vietnam, Global Solutions, Smart Industries
- **5 Products**: Enterprise Software, Cloud Storage, Analytics Platform, Mobile Development, IT Consulting
- **3 Sales Orders**: Various statuses (completed, pending, draft)
- **10+ Inventory Items**: Across different warehouses
- **Financial Metrics**: Revenue data, invoices, payments
- **CRM Data**: Leads and activities

## 🔄 Switching Between Mock and Real Backend

### To Use Mock API (Current Configuration)
Mock API is **already enabled**. You're good to go!

File: `src/services/apiClient.ts`
```typescript
const USE_MOCK_API = true // ← Mock mode enabled
```

### To Switch to Real Backend Later
When you have the backend running on port 3001:

1. Open `src/services/apiClient.ts`
2. Change line `const USE_MOCK_API = true` to `const USE_MOCK_API = false`
3. Restart frontend with `npm run dev`

## 📝 What's Mocked

All API endpoints return mock data:
- `/api/auth/login` → Returns mock user and token
- `/api/auth/user` → Returns mock user profile
- `/api/customers` → Returns 3 mock customers
- `/api/products` → Returns 5 mock products
- `/api/sales-orders` → Returns 3 mock orders
- `/api/metrics/dashboard` → Returns financial metrics
- `/api/inventory/*` → Returns warehouse inventory data
- `/api/crm/leads` → Returns CRM leads
- And more...

## ⚡ Network Behavior

Mock API simulates realistic network conditions:
- Each API call has a **300ms delay** to simulate network latency
- Errors are not thrown unless endpoint is unknown
- All responses follow the same format as real API

## 🛠️ Customize Mock Data

To modify mock data:

1. Open `src/services/mockData.ts`
2. Edit any of the mock objects (mockCustomers, mockProducts, etc.)
3. Save the file - frontend will hot reload
4. Data changes take effect immediately

Example:
```typescript
export const mockCustomers = [
  {
    id: 'cust-1',
    name: 'Your Company Name', // ← Change this
    email: 'contact@yourcompany.com',
    // ... rest of fields
  },
  // Add more customers...
]
```

## 🎯 Common Use Cases

### Testing UI Layout
```bash
npm run dev
# Login and navigate through pages
# No backend latency, test flows quickly
```

### Testing with Different Data
Edit `src/services/mockData.ts` and reload to see changes instantly.

### Taking Screenshots/Demo
Use mock mode for consistent, controlled data.

### Development on Airplanes/Offline
100% local - no internet connection needed!

## 📱 Browser Console Messages

When you start the frontend, check the browser console (F12). You'll see:

```
🧪 MOCK MODE ENABLED
✅ Frontend is using mock data - no backend/Supabase needed
You can test all features locally:
• Login with any email and password
• Browse all modules (CRM, Sales, Purchase, Inventory, Accounting)
• View charts and metrics
• Test adding/editing items

💡 To use real backend: Set USE_MOCK_API = false in src/services/apiClient.ts
```

## ⚙️ How Mock API Works

1. **Request Interceptor**: Every API call is intercepted before hitting the backend
2. **Pattern Matching**: Endpoint URL is checked against mock patterns
3. **Mock Response**: If pattern matches, returns mock data instead of calling backend
4. **Real Backend Fallback**: If USE_MOCK_API is false, calls real backend

```typescript
// Request to /api/customers → matches pattern → returns mockCustomers
// Request to /api/products → matches pattern → returns mockProducts
// etc.
```

## 🔌 Limitations

While in mock mode, you **cannot**:
- Persist changes to database
- Create real accounts
- Generate actual business transactions
- Use real Supabase data

These work once you switch to real backend.

## ✅ Next Steps

### Option A: Continue Testing Frontend Locally
Keep using mock mode to develop and test UI.

### Option B: Switch to Real Backend
1. Ensure backend is running: `cd backend && npm run dev`
2. Set `USE_MOCK_API = false` in `src/services/apiClient.ts`
3. Restart frontend: `npm run dev`
4. Login with real credentials

### Option C: Deploy to Vercel
See `VERCEL_DEPLOYMENT_GUIDE.md` for deployment instructions.

## 🐛 Troubleshooting

**Q: Login not working?**
- Check browser console (F12) for errors
- Ensure `USE_MOCK_API = true` in apiClient.ts
- Try clearing localStorage: `localStorage.clear()` in console

**Q: Data not loading in dashboard?**
- Refresh page (Ctrl+R)
- Check console for errors
- Ensure mockData.ts has data exports

**Q: Frontend won't start?**
```bash
# Clear node_modules and reinstall
rm -r node_modules package-lock.json
npm install
npm run dev
```

**Q: Want to use real backend?**
- Make sure backend is running: `cd backend && npm run dev` (watch for port 3001)
- Set `USE_MOCK_API = false`
- Ensure `.env.local` has correct Supabase credentials
- Restart frontend

## 📞 Need Help?

Check these files for reference:
- Mock data: `src/services/mockData.ts`
- API client: `src/services/apiClient.ts`
- Authentication: `src/services/authService.ts`
- Auth store: `src/stores/authStore.ts`

---

**Happy testing! 🚀**
