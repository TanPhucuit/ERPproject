# API Testing Results & Analysis

## Summary
Successfully tested Supabase REST API endpoints for NovaTech ERP. Identified RLS (Row Level Security) restrictions on write operations.

---

## Test Results

### ✅ Working Operations (GET/SELECT)
- List warehouses
- List products
- List customers
- List suppliers
- List stock levels
- List delivery orders
- List bin locations
- List lead stages
- **Read-only queries work fine**

### ❌ Blocked Operations (POST/INSERT)
- **Create lead** - 400 Bad Request (RLS policy blocks INSERT)
- Create customer invoice - 400 Bad Request (RLS policy blocks INSERT)
- Create vendor bill - 400 Bad Request (RLS policy blocks INSERT)
- Create sales order directly - 400 Bad Request (RLS policy blocks INSERT)

### ⚠️ Important Observations
1. **RLS is active** - Supabase has Row Level Security enabled, which blocks anonymous/public INSERT operations
2. **Schema exists** - All tables and columns are created correctly in PostgreSQL
3. **GET works** - Reading data is permitted, but writing data is restricted
4. **Data flow vs API** - The frontend React app likely:
   - Uses Supabase client SDK (not REST API)
   - Has authentication token
   - Benefits from different RLS policies for authenticated users
   - Implements business logic in `erpApi.ts` (middleware layer)

---

## Business Process Flow (Correct Understanding)

### Complete End-to-End Workflow
```
Lead (CRM)
  ↓ [Sales creates/manages lead]
Quotation (from Lead)
  ↓ [Sales rep provides quote]
Quotation → Accepted
  ↓ [System auto-generates downstream documents]
Sales Order (auto-created from Quotation)
  ↓
Customer Invoice (auto-created from Sales Order)
  ↓
Delivery Order (auto-created if conditions met)
  ↓
Payment Recording
  ↓
Stock Deduction
```

### Database Constraints That Require Proper Sequencing
1. **customer_invoices**
   - `sales_order_id` is NOT NULL (required)
   - `customer_id` is NOT NULL (required)
   - Cannot create invoice without sales order

2. **vendor_bills**
   - `purchase_order_id` is NOT NULL (required)
   - `supplier_id` is NOT NULL (required)
   - Cannot create bill without purchase order

3. **sales_orders**
   - `customer_id` is NOT NULL (required)
   - `required_delivery_date` is NOT NULL (required)

### Purchase Workflow Sequence
```
RFQ (Request for Quotation)
  ↓ [Purchasing sends to suppliers]
Purchase Order (created from RFQ or manual)
  ↓ [PO confirmed and sent to supplier]
Goods Receipt (when items arrive)
  ↓ [Quality check, stock updated]
Vendor Bill (must come after Goods Receipt)
  ↓ [Payment tracking]
Supplier Payment
```

---

## Master Data Available (Tested)
- **Warehouses**: 3 (WH-HN, WH-HCM, WH-BH)
- **Products**: 5+ IoT devices (robots, hubs, switches)
- **Customers**: 5 (mix of B2B and B2C)
- **Suppliers**: 5 (HIKVISION, DAHUA, Roborock, Viettel, GHN)
- **Lead Stages**: 5 (new, site_survey, proposition, won, lost)
- **Stock Levels**: 27 records (currently all empty/zero)

---

## Recommendations for Testing

### Option 1: Use Supabase Client SDK (Recommended)
Instead of REST API, use official Supabase JS client:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(URL, ANON_KEY)
const { data, error } = await supabase
  .from('leads')
  .insert([{ company_name: '...', contact_person_name: '...', ... }])
```

### Option 2: Configure RLS Policies
Review and update Supabase RLS policies to allow:
- Anonymous users: SELECT only (reporting/dashboard)
- Authenticated users: CRUD operations with role-based restrictions

### Option 3: Use Frontend Application
The React app already handles:
- Authentication
- Business logic in `erpApi.ts`
- Proper data transformation
- RLS-compliant operations

---

## Test Scripts Created

1. **test_complete_workflow.ps1** - Lead → Quotation → Sales Order → Invoice → Delivery
2. **test_purchase_workflow.ps1** - RFQ → PO → Goods Receipt → Vendor Bill
3. **test_inventory.ps1** - Stock management and delivery workflows
4. **test_debts.ps1** - Accounting: Invoices, Bills, Credit/Debit Notes
5. **test_delivery.ps1** - Delivery order lifecycle
6. **test_api.ps1** - Initial data verification

### Usage
```powershell
cd D:\project\ERP\scripts\api_tests
$env:BASE_URL = "http://localhost:3000"
$env:AUTH_TOKEN = "your_token_here"

# Run tests
& .\test_complete_workflow.ps1
& .\test_purchase_workflow.ps1
```

---

## Next Steps

1. **Verify RLS Policies** - Check Supabase RLS configuration
2. **Use Authenticated Requests** - Add JWT token if available
3. **Use Frontend App** - Test workflows through React UI (has authentication)
4. **Update Tests** - Add Authorization header if needed:
   ```powershell
   -Headers @{
     "apikey" = $ANON_KEY
     "Authorization" = "Bearer $TOKEN"
     "Content-Type" = "application/json"
   }
   ```
5. **Enable RLS for Anonymous** - If REST API access is intended for partners/external systems

---

## Key Insights

### Why This Matters
- **Data Consistency**: Forced workflow order ensures data integrity
- **RLS Security**: Blocks unauthorized data modification at database level
- **Business Logic**: ERP system enforces workflows through:
  1. Schema constraints (NOT NULL, FK references)
  2. RLS policies (who can INSERT/UPDATE)
  3. Application validation (erpApi.ts)

### Architecture Pattern
```
Frontend (React + TypeScript)
    ↓ (authenticated requests with JWT)
Supabase Client SDK
    ↓ (RLS-compliant)
PostgreSQL Database
    ↓ (constraints + triggers)
Guaranteed Data Integrity
```

---

## API Endpoints Tested

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/leads` | GET | ✅ | List leads works |
| `/leads` | POST | ❌ | RLS blocks insert |
| `/quotations` | GET | ✅ | List quotations works |
| `/quotations` | POST | ❌ | RLS blocks insert |
| `/sales_orders` | GET | ✅ | List sales orders works |
| `/sales_orders` | POST | ❌ | RLS blocks insert |
| `/customer_invoices` | GET | ✅ | List invoices works |
| `/customer_invoices` | POST | ❌ | RLS blocks insert |
| `/vendor_bills` | GET | ✅ | List bills works |
| `/vendor_bills` | POST | ❌ | RLS blocks insert |
| `/delivery_orders` | GET | ✅ | List deliveries works |
| `/delivery_orders` | POST | ✅ | One delivery order created |
| `/products` | GET | ✅ | List products works |
| `/customers` | GET | ✅ | List customers works |
| `/suppliers` | GET | ✅ | List suppliers works |
| `/warehouses` | GET | ✅ | List warehouses works |

---

Generated: 2026-05-12
