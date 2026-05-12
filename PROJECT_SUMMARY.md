# NOVATECH ERP - PROJECT SUMMARY

> **Purpose**: This document provides a complete overview of the NovaTech Distribution ERP system. Any AI agent reading this file will understand the entire codebase and business logic without needing to explore the source code.

---

## 1. PROJECT OVERVIEW

| Attribute | Value |
|-----------|-------|
| **Project Name** | NovaTech Distribution ERP |
| **Domain** | Smart Home & IoT Device Distribution |
| **Database** | PostgreSQL (Supabase) |
| **Frontend** | React 18 + TypeScript + Vite |
| **State Management** | Zustand |
| **Styling** | Tailwind CSS |
| **Deployment** | Vercel (single app) |

**Key Features**:
- **CRM**: Full lead pipeline with auto-request leads, customer auto-detection from email, activity tracking
- **Sales**: Auto-calculation of financials (only tax% editable), quotation → SO flow
- **Purchase**: RFQ to 3 suppliers, serial/MAC scanning
- **Inventory**: Real-time stock levels, automatic reorder status, bin location management
- **Accounting**: Full AR/AP with credit limit checks, credit/debit notes
- **Master Data**: 500+ IoT devices, B2B/B2C classification, multi-warehouse
- **IoT Lifecycle**: MAC/Serial mapping, activation tracking, Proactive Warranty alerts
- **Auto-BOM**: Product package suggestions based on apartment size (Studio→Villa), BOM editor with cost/profit preview (route: /app/auto-bom)
- **Proactive Warranty**: Daily warranty expiry scan auto-generates CRM alerts for sales outreach

---

## 2. TECHNOLOGY STACK

### Frontend
```
React 18.2.0
TypeScript 5.x
Vite (bundler)
Tailwind CSS 3.3.x
React Router 6.x
Zustand 4.4.x (state management)
Recharts 2.10.x (charts)
jsPDF + AutoTable (PDF export)
Lucide React (icons)
React Hot Toast (notifications)
date-fns (date utilities)
```

### Backend/Database
```
Supabase (PostgreSQL)
Supabase Auth (authentication)
Supabase Storage (file uploads)
Row Level Security (RLS)
```

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables Structure

#### Organization
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, role (CEO, Sales_Manager, Purchasing_Manager, Warehouse_Manager, Accountant, Admin), department_id, status |
| `departments` | Organizational units | id, name, manager_id |
| `audit_logs` | Change tracking | entity_type, entity_id, action, old_values, new_values |

#### Master Data
| Table | Purpose | Key Dependencies |
|-------|---------|-----------------|
| `products` | Product catalog | category_id → product_categories, uom_id → units_of_measure |
| `product_categories` | Product hierarchy | parent_id (self-reference) |
| `customers` | Customer master | lead_id (optional), credit_limit, payment_terms |
| `suppliers` | Supplier master | supplier_type_id |
| `warehouses` | Warehouse locations | manager_id → users |
| `bin_locations` | Storage locations | warehouse_id, zone_id |

#### CRM
| Table | Purpose |
|-------|---------|
| `leads` | Lead/opportunity management |
| `lead_stages` | Pipeline stages: new(10%), site_survey(30%), proposition(60%), won(100%), lost(0%) |
| `activities` | Activity tracking (calls, emails, meetings, site surveys) |
| `activity_types` | Activity type definitions |

#### Sales
| Table | Purpose |
|-------|---------|
| `quotations` | Sales quotations |
| `quotation_lines` | Quotation line items |
| `sales_orders` | Sales orders (linked from quotation) |
| `sales_order_lines` | Order line items |
| `delivery_orders` | Delivery orders |
| `delivery_order_lines` | Delivery line items |
| `carriers` | Shipping carriers |

#### Purchase
| Table | Purpose |
|-------|---------|
| `rfqs` | Request for Quotations |
| `rfq_lines` | RFQ line items |
| `rfq_supplier_quotations` | Supplier responses |
| `purchase_orders` | Purchase orders |
| `purchase_order_lines` | PO line items |
| `goods_receipts` | Goods receiving |
| `goods_receipt_lines` | Receipt line items |

#### Inventory
| Table | Purpose |
|-------|---------|
| `stock_levels` | Stock per warehouse/product (quantity_on_hand, quantity_reserved, quantity_available) |
| `stock_in_bins` | Stock in specific bin locations |
| `warehouse_zones` | Zones within warehouses |
| `inventory_adjustments` | Stock count/adjustments |
| `inventory_adjustment_lines` | Adjustment details |

#### Accounting
| Table | Purpose |
|-------|---------|
| `customer_invoices` | Customer invoices |
| `customer_invoice_lines` | Invoice line items |
| `vendor_bills` | Supplier bills |
| `vendor_bill_lines` | Bill line items |
| `credit_notes` | Credit notes (returns, discounts) |
| `debit_notes` | Debit notes (supplier claims) |
| `customer_payments` | Customer payments |
| `supplier_payments` | Supplier payments |
| `payment_methods` | Payment methods (Bank, Cash, MoMo, ZaloPay, etc.) |
| `accounts` | Chart of accounts |

#### IoT/Device Tracking
| Table | Purpose |
|-------|---------|
| `serial_numbers` | Device serial/MAC tracking |
| `warranties` | Warranty records |
| `warranty_claims` | Warranty claims |

#### Analytics
| Table | Purpose |
|-------|---------|
| `daily_metrics` | Daily KPI aggregation |
| `product_sales_metrics` | Product sales analytics |
| `customer_metrics` | Customer analytics (spending, orders) |
| `supplier_metrics` | Supplier performance |

---

## 4. BUSINESS PROCESS FLOWS

### 4.1 CRM Pipeline
```
Lead Created (stage: new, probability: 10%)
    ↓
Activities logged (calls, emails, meetings)
    ↓
Stage: site_survey (probability: 30%) - Physical inspection
    ↓
Stage: proposition (probability: 60%) - Quotation sent
    ↓
┌─── Won (probability: 100%) → Customer Created → Sales Order
└─── Lost (probability: 0%) → Lead Closed
```

### 4.2 Sales Flow
```
Quotation (draft)
    ↓
Quotation Sent (status: sent)
    ↓
┌─── Accepted → Sales Order Created (copies quotation lines)
│        ↓
│    SO Confirmed (reserves stock, auto-creates DO)
│        ↓
│    Delivery Order → Warehouse picks → Ships
│        ↓
│    Invoice Created
│        ↓
│    Customer Payment
│
└─── Rejected / Expired
```

### 4.3 Purchase Flow
```
RFQ Created (draft)
    ↓
RFQ Sent to Suppliers
    ↓
Collect Supplier Quotations (compare price, lead time)
    ↓
RFQ Closed → Select Best Supplier
    ↓
Purchase Order Created (from RFQ)
    ↓
PO Confirmed → Sent to Supplier
    ↓
Goods Receipt (receive items, check quality)
    ↓
┌─── Good items → Stock Updated
└─── Defective → Debit Note Created
    ↓
Vendor Bill Created
    ↓
Supplier Payment
```

### 4.4 Inventory Flow
```
Outbound (from Sales):
Sales Order Confirmed → Delivery Order Created
    → Picking (select bin locations)
    → Shipped (update stock_levels: on_hand -= qty)
    → Delivered

Inbound (from Purchase):
Purchase Order → Goods Receipt
    → Quality Check
    → Stock Updated (on_hand += qty, in_transit -= qty)
    → Putaway (stock_in_bins)

Adjustment:
Stock Count → Inventory Adjustment
    → Variance Calculated (actual - system)
    → Approved → Stock Corrected
```

### 4.5 End-to-End Operational Flow (Updated 2026-05-12)

The current operating rule is "enter data once at the source, then let downstream documents inherit it."

```text
CRM Lead
  -> Quotation
  -> Sales Order
  -> Customer Invoice
  -> Customer Payment when required
  -> Delivery Order
  -> Stock deduction
```

Key implementation notes:
- Lead is the starting point for prospect/customer intent. It stores contact, source, owner, stage, rating, estimated value, expected close date, notes, and optional customer link fields.
- Lead does not store order financial fields. `tax_percent` belongs to quotations, sales orders, purchase orders, invoices/bills, and line-level financial records where applicable.
- Lead product requirements are persisted in `lead_products`; they can be copied into a quotation.
- Quotation must have at least one product line and must be linked to either a Lead or a Customer.
- When a quotation reaches `accepted`/`won`, `acceptQuotationWorkflow()` ensures the Customer, creates a confirmed Sales Order, copies quotation lines, creates a Customer Invoice, and creates a Delivery Order when payment terms allow it.
- For B2B customers, credit usage is checked before confirming a new order. If credit usage is above 80% of credit limit, the order is blocked until collection/review.
- For `COD` and `Prepaid`, Delivery Order creation waits until the invoice is paid. For `NET30`, `NET45`, and `NET60`, delivery can be opened immediately and AR remains outstanding.
- Delivery creation selects a warehouse with available stock, creates delivery lines, and reserves stock by increasing `quantity_reserved`.
- When Delivery Order transitions to `shipped` or `delivered`, stock is deducted and reserved quantity is reduced.
- Customer payments update invoice `paid_amount` and status (`partial_paid`/`paid`); paying an immediate-payment invoice opens delivery automatically.
- Manual Sales Order, Invoice, or Delivery creation should be used only for exceptions or historical data when a prior source document does not exist.

### 4.6 Data Entry Ownership

| Department | Primary Entry | Should Not Manually Re-enter |
|------------|---------------|------------------------------|
| Sales | Lead, Activity, Quotation | Sales Order/Invoice/Delivery that can be generated from accepted quotation |
| Sales Manager | Pipeline review, quotation acceptance/follow-up | Stock quantity, accounting settlement |
| Warehouse | Goods Receipt, Delivery status, Adjustment, Stock Transfer | Prices, quotes, customer invoices |
| Purchasing | RFQ, Purchase Order, supplier comparison | Customer sales delivery/invoice |
| Accounting | Payment, exception invoice/bill, credit/debit notes | Delivery lines, stock movement quantity |
| Admin/Master Data | Product, Customer, Supplier, Warehouse, Bin setup | Day-to-day transaction documents |

---

## 5. STATUS FLOWS

### Lead Stages
| Status | Probability | Color |
|--------|-------------|-------|
| new | 10% | #808080 |
| site_survey | 30% | #4A90E2 |
| proposition | 60% | #F5A623 |
| won | 100% | #7ED321 |
| lost | 0% | #D0021B |

### Quotation Status
`draft` → `sent` → `accepted` / `rejected` / `expired`

### Sales Order Status
`draft` → `confirmed` → `partially_shipped` → `shipped` → `delivered` → `cancelled`

### Delivery Order Status
`draft` → `ready` → `done`

### Customer Invoice Status
`draft` → `issued` → `sent` → `partial_paid` → `paid` / `overdue` → `cancelled`

### Purchase Order Status
`draft` → `confirmed` → `partial_received` → `received` → `cancelled`

### Goods Receipt Status
`draft` → `received` → `verified` → `completed` → `cancelled`

### Stock Reorder Status
`optimal` | `understocked` | `overstocked` | `critical`

---

## 6. KEY BUSINESS RULES

### 6.1 Automatic Calculations

| Field | Formula | Source |
|-------|---------|--------|
| `profit_margin_percent` (Product) | `(list_price - cost_price) / list_price × 100` | DB GENERATED STORED ✅ |
| `profit_margin_percent` (SO) | `(total_amount - total_cost) / total_amount × 100` | DB GENERATED STORED ✅ |
| `estimated_profit` (SO) | `total_amount - total_cost` | DB GENERATED STORED ✅ |
| `line_profit` (SO Line) | `(qty × price - qty × cost_price) × (1 - discount%)` | DB GENERATED STORED ✅ |
| `line_total` (Quotation Line) | `qty × price × (1 - discount%) × (1 + tax%)` | DB GENERATED STORED ✅ |
| `line_total` (PO Line) | `qty × price × (1 + tax%)` | DB GENERATED STORED ✅ |
| `quantity_available` | `quantity_on_hand - quantity_reserved` | DB GENERATED STORED ✅ |
| `outstanding_amount` | `total_amount - paid_amount` | DB GENERATED STORED ✅ |
| `quantity_variance` (Adj Line) | `quantity_actual - quantity_system` | DB GENERATED STORED ✅ |
| **BIN occupancy** | `SUM(stock_in_bins.quantity)` | **⚠️ CẦN TRIGGER** |
| **WH occupancy** | `SUM(bin_locations.current_occupancy_units)` | **⚠️ CẦN TRIGGER** |
| **credit_used** | `SUM(invoices.total_amount) - SUM(payments.amount)` | **⚠️ CẦN TRIGGER** |
| **supplier.total_spent** | `SUM(PO.total_amount)` | **⚠️ CẦN TRIGGER** |
| **quantity_reserved** | Auto-updated when SO confirmed/shipped | **⚠️ CẦN TRIGGER** |

### 6.2 Business Constraints

1. **Credit Hold**: Check `credit_used <= credit_limit` before creating SO (warning only, not blocking)
2. **High Discount Alert**: Warn if discount > 15% on quotation
3. **Soft Delete**: Most records use `is_deleted` flag instead of hard delete
4. **Cascade Rules**:
   - Delete Lead → CASCADE delete Activities
   - Delete Quotation/SO/PO → CASCADE delete Line items
5. **Stock Validation**: Cannot delete warehouse with existing stock
6. **Stock Reserve**: When SO confirmed → `quantity_reserved` += qty; When DO shipped → `quantity_on_hand` -= qty

### 6.3 Stock Tracking

| Quantity Type | Description |
|---------------|-------------|
| `quantity_on_hand` | Physical stock in warehouse |
| `quantity_reserved` | Allocated to unfulfilled SOs |
| `quantity_available` | On Hand - Reserved |
| `quantity_in_transit` | Items in transit (from GR) |

---

## 7. USER ROLES & PERMISSIONS

| Role | Access |
|------|--------|
| `CEO` | Full access to all modules |
| `Sales_Manager` | CRM, Sales, Accounting (invoices), Master Data |
| `Purchasing_Manager` | Purchase, Inventory, Master Data |
| `Warehouse_Manager` | Inventory, Stock management |
| `Accountant` | Accounting, some Sales/Purchase visibility |
| `Admin` | System administration |
| `user` | Limited access based on assignment |

---

## 8. FILE STRUCTURE

```
d:/project/ERP/
├── index.html                      # Entry point
├── package.json                    # Dependencies
├── vite.config.ts                  # Vite configuration
├── tailwind.config.js              # Tailwind theme
├── database_schema.sql             # Full schema (~1300 lines)
├── seed_data.sql                  # Sample data
├── ERP_QUY_TRINH_NHAP_LIEU_CHI_TIET.md  # Consolidated data-entry and business workflow guide
├── src/
│   ├── main.tsx                   # React entry
│   ├── App.tsx                    # Main app component
│   ├── config/
│   │   └── api.ts                 # API endpoints
│   ├── lib/
│   │   └── supabase.ts            # Supabase client
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── components/
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── EditModal.tsx          # Edit modal
│   │   ├── ProtectedRoute.tsx      # Auth guard
│   │   └── Notification.tsx       # Toast notifications
│   ├── layouts/
│   │   └── MainLayout.tsx         # Main layout wrapper
│   ├── pages/
│   │   ├── Landing.tsx            # Landing page
│   │   ├── AuthPage.tsx          # Login/Register
│   │   ├── Dashboard.tsx         # KPI dashboard
│   │   ├── CRM.tsx               # Lead management
│   │   ├── Sales.tsx             # Sales module
│   │   ├── Purchase.tsx           # Purchase module
│   │   ├── Inventory.tsx         # Inventory module
│   │   ├── Accounting.tsx         # Accounting module
│   │   ├── MasterData.tsx         # Master data
│   │   └── IoTLifecycle.tsx       # Serial number tracking
│   ├── services/
│   │   ├── apiClient.ts           # HTTP client
│   │   ├── authService.ts         # Authentication
│   │   ├── erpApi.ts              # Main API (2000+ lines)
│   │   ├── salesService.ts        # Sales operations
│   │   ├── purchaseService.ts     # Purchase operations
│   │   ├── inventoryService.ts    # Inventory operations
│   │   ├── crmService.ts          # CRM operations
│   │   ├── customerService.ts      # Customer CRUD
│   │   ├── productService.ts      # Product CRUD
│   │   ├── validationService.ts    # Data validation
│   │   └── pdfExportService.ts    # PDF export
│   ├── stores/
│   │   ├── authStore.ts           # Auth state
│   │   ├── uiStore.ts             # UI state
│   │   ├── salesStore.ts          # Sales state
│   │   ├── inventoryStore.ts      # Inventory state
│   │   ├── productStore.ts        # Product state
│   │   └── crmStore.ts            # CRM state
│   └── hooks/
│       ├── index.ts               # Custom hooks
│       ├── useAuth.ts             # Auth hook
│       └── useNotification.ts    # Notification hook
└── (documentation files)
```

---

## 9. API ENDPOINTS (via Supabase)

### Pattern: `supabase.from('table').select/insert/update/delete`

#### Key Endpoints
| Feature | Table | Operations |
|---------|-------|------------|
| Auth | `users` | Login, Register, Token management |
| Products | `products` | CRUD with category, uom |
| Customers | `customers` | CRUD, credit tracking |
| Suppliers | `suppliers` | CRUD, performance tracking |
| Leads | `leads` | CRUD, stage transitions |
| Activities | `activities` | CRUD, linked to leads |
| Quotations | `quotations` | CRUD, status transitions |
| Sales Orders | `sales_orders` | CRUD, from quotation |
| Purchase Orders | `purchase_orders` | CRUD, from RFQ |
| Goods Receipts | `goods_receipts` | CRUD, stock update |
| Delivery Orders | `delivery_orders` | CRUD, stock reduction |
| Invoices | `customer_invoices` | CRUD, payment tracking |
| Vendor Bills | `vendor_bills` | CRUD, payment tracking |
| Customer Payments | `customer_payments` | Create payment, update invoice paid amount/status, open delivery when paid |
| Supplier Payments | `supplier_payments` | Create payment, update vendor bill paid amount/status |
| Stock | `stock_levels` | Query, update |
| Stock Transfers | `stock_transfers`, `stock_transfer_lines` | Internal movement workflow with line persistence |
| Product BOM | `product_bom` | Package/BOM editor and Auto-BOM suggestions |
| Warranty Scan | `warranties`, `serial_numbers`, `activities` | Preview or generate warranty expiry CRM alerts |
| Metrics | `daily_metrics` | Query aggregations |

---

## 10. ENVIRONMENT CONFIGURATION

```env
VITE_SUPABASE_URL=https://thrazxhwqetphjogcdji.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
NEXT_PUBLIC_SUPABASE_URL=https://thrazxhwqetphjogcdji.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
DEMO_PUBLIC_API=false
```

---

## 11. MASTER DATA REFERENCE TABLES

### Units of Measure
`pcs`, `box`, `kg`, `m`, `l`, `set`, `pack`

### Lead Sources
`Website`, `Referral`, `Showroom`, `Architect Partner`, `Cold Call`, `Social Media`

### Lead Ratings
`Hot`, `Warm`, `Cold`

### Activity Types
`call`, `email`, `meeting`, `site_survey`, `quotation`, `proposal`, `follow_up`, `negotiation`, `contract`, `note`

### Supplier Types
`equipment`, `components`, `logistics`, `services`, `maintenance`

### Payment Terms
`NET30`, `NET45`, `NET60`, `COD`, `Prepaid`

### Payment Methods
`Bank Transfer`, `Check`, `Cash`, `Credit Card`, `Digital Wallet` (MoMo, ZaloPay, VNPay), `Other`

### Account Types
`Asset`, `Liability`, `Revenue`, `Expense`

---

## 12. KEY QUERIES FOR ANALYTICS

### Top Selling Products
```sql
SELECT p.name, SUM(sol.quantity_ordered) as total_qty, SUM(sol.quantity_ordered * sol.unit_price) as revenue
FROM sales_order_lines sol
JOIN sales_orders so ON sol.sales_order_id = so.id
JOIN products p ON sol.product_id = p.id
WHERE so.status = 'delivered'
GROUP BY p.id
ORDER BY revenue DESC
LIMIT 10;
```

### Customer Outstanding
```sql
SELECT c.name, SUM(ci.total_amount - ci.paid_amount) as outstanding
FROM customer_invoices ci
JOIN customers c ON ci.customer_id = c.id
WHERE ci.status NOT IN ('paid', 'cancelled')
GROUP BY c.id;
```

### Low Stock Alert
```sql
SELECT p.name, sl.quantity_on_hand, p.reorder_level
FROM stock_levels sl
JOIN products p ON sl.product_id = p.id
WHERE sl.quantity_on_hand < p.reorder_level;
```

---

## 14. KNOWN ISSUES & TECHNICAL DEBTS

### Critical Issues (Fix in Phase 1)
1. **Stock Level Save Bug**: `Inventory.tsx` - Stock records created via form are NOT saved to DB
2. **Accounting Save Bug**: `Accounting.tsx` - customer/supplier lookup uses label mismatch (saves wrong IDs)
3. **Accounting Table Display**: `Accounting.tsx` - table shows `record.invoice_number` but data has `invoiceNumber` → undefined
4. **Sales Save Bug**: `Sales.tsx` - `quotation_number`/`sales_order_number` not included in save payload
5. **RFQ Form Broken**: `Purchase.tsx` - RFQ form has no product lines or supplier selection

### Medium Issues (Fix in Phase 2)
6. **Bin Location Filter**: `MasterData.tsx` - filter by `bin.warehouseName` which doesn't exist → empty dropdown
7. **Supplier Type Field**: `MasterData.tsx` - field name mismatch between `openEdit` and `handleSave`
8. **Purchase Table Display**: `Purchase.tsx` - `record.date`/`record.productName` don't exist → undefined
9. **Low Stock Alert**: `Dashboard.tsx` - doesn't include `critical`/`out_of_stock` statuses in filter
10. **Status Flow**: Multiple tabs share same `flow` object but have different status progressions

### Business Logic Issues (Fix in Phase 3)
> Historical backlog list retained for context. Several items below are now resolved in the 2026-05-12 fixed list.

11. **No Stock Reservation**: SO confirmation doesn't auto-reserve stock
12. **No Stock Auto-Update**: DO shipped doesn't auto-deduct stock_levels
13. **No Payment Entry UI**: Customer/Supplier payments cannot be entered (only manually in Invoice/Bill)
14. **No Stock Transfer**: No Internal Transfer functionality between warehouses/bins
15. **RFQ No Lines**: RFQ form doesn't support adding product lines or selecting suppliers
16. **Quotation Requires Customer**: Current schema requires `quotations.customer_id`. UI auto-creates a customer from lead when saving quotation; if strict rule is "customer only after lead won", schema must allow nullable `customer_id` with lead-only quotations.
17. **Schema Update**: `quotations.customer_id` is now nullable to support lead-first quotations; customer is set on lead win or later conversion.
18. **Quotation Totals Mapping**: API now maps `subtotal/discount/tax` into `total_amount_before_tax`, `total_discount`, and `tax_amount` fields for correct reporting.
19. **CRM Conversion Rule**: Customer creation now happens only when a lead is marked `won` (quotation no longer auto-creates customers).
20. **Sales Order Quotation Link Bug**: Sales order payload uses `quotation_number` as `quotation_id` (should be quotation UUID).
21. **Line Items Not Persisted**: Sales/Quotation/RFQ/PO line items are sent by UI but not stored by API (headers only).
22. **RFQ Create Mismatch**: API expects `supplierName` and `productName`, UI sends RFQ lines and no supplier name → save can fail.
23. **CRM Owner Invalid FK**: `auto_request` is stored in `owner_id` (UUID FK), causing invalid references.
24. **Lead Product Search Bug**: Product filter uses incorrect boolean precedence; excluded items can reappear.
25. **Inventory Name-Based Linking**: Inventory saves rely on partner/warehouse names; duplicates can mis-link records.
26. **Purchase List Display Bug**: Uses `record.productName` and `record.date`, which are not set in mapped data.
27. **Sales Stock Check Uses Wrong Field**: ERP stock validation reads `body.products` but UI sends `lines`, so checks may be skipped.

### Known Issues / Technical Debt (2026-05-12)

> All items below marked [FIXED] have been resolved in the current codebase.
> Items marked [PENDING] still require attention.

**FIXED ISSUES:**
1. `ensure_stock_levels_exists()` recursive trigger: Moved to app-level + INSERT...ON CONFLICT in triggers 8-10
2. `normalizeWriteBody` camelCase vs snake_case priority: Added `norm()` helper, applied to all entity handlers
3. Missing resolver functions: Added `resolveUomId`, `resolveUserIdByName` with UUID-direct check
4. `stock_levels` initialization: Added app-level init in `upsert('products')` and `upsert('warehouses')`
5. `generate_data.cjs` stale CSV: Fixed `parent_id: null`, `bin_location_id: null`, added `is_active`, `is_auto_request`, `tax_percent`
6. Lead `products` array not persisted: Added `persistLines('lead_products', ...)` to POST and PUT handlers
7. Quotation financial fields written by frontend: Only `tax_percent` sent; subtotal/tax_amount/total_amount are GENERATED ALWAYS AS in DB
8. CRM auto-detect customer: On save, checks by email before saving; auto-creates on lead won
9. CRM activities not in API: Added GET/POST `/crm/activities` handlers
10. Lead auto-request: Added `is_auto_request` field, `auto_request` option in owner dropdown
11. Quotation from lead: Added "Create Quotation" action in CRM that sends products from lead
12. Sales Order financial fields: Only `tax_percent` sent; subtotal, total, profit are GENERATED ALWAYS AS
13. **Auto-BOM**: Full module at `/app/auto-bom` — BOM table + product packages panel, size-based suggestions, CRUD editor (src/pages/AutoBom.tsx). API: GET/POST `/product-bom` in erpApi.ts. Migration: `product_bom` table + `is_auto_bom`, `min_sqm`, `max_sqm` columns in products table.
14. **Proactive Warranty**: Warranty scan endpoint POST `/iot/warranty-scan` in erpApi.ts auto-generates warranty_expiring / warranty_expired alerts. "Quét BH chủ động" button in IoT Lifecycle page triggers scan. GET `/iot/warranty-scan` returns preview of expiring/expired devices.
15. **Auto-quotation Trigger 15**: Fixed bug (RETURNING id INTO NEW.id invalid), enabled CREATE TRIGGER statement, added lead_products → quotation_lines copy.
16. **Accepted quotation workflow**: `acceptQuotationWorkflow()` now converts accepted/won quotation into Customer (if needed), confirmed Sales Order, Sales Order Lines, Customer Invoice, and Delivery Order when allowed by payment terms.
17. **Payment-gated delivery**: `COD`/`Prepaid` orders wait for paid invoice before delivery; `NET30`/`NET45`/`NET60` can create delivery immediately while AR remains outstanding.
18. **Customer payments**: POST `/accounting/customer-payments` records payment, updates invoice paid amount/status, and opens delivery when an immediate-payment invoice becomes paid.
19. **Supplier payments**: POST `/accounting/supplier-payments` records supplier payment and updates vendor bill paid amount/status.
20. **Stock reservation**: Delivery creation reserves stock through `quantity_reserved` after choosing a warehouse with enough available stock.
21. **Stock deduction**: Delivery status transition to `shipped`/`delivered` deducts `quantity_on_hand` and reduces `quantity_reserved`.
22. **Line persistence**: Sales Orders, Quotations, RFQs, Purchase Orders, Delivery Orders, Lead Products, and Stock Transfers persist child lines instead of saving headers only.
23. **RFQ lines**: RFQ save now supports product lines with quantity and required delivery date.
24. **Sales stock check**: Stock validation now reads line data consistently from `lines`/`products` payloads.
25. **Stock transfers**: `/inventory/stock-transfers` and related line persistence exist for internal stock movement workflows.
26. **Lead tax field bug**: Lead write/read normalization no longer injects `tax_percent`; tax is kept on quotation/order financial documents only.
27. **Documentation consolidation**: Detailed data-entry/business workflow guidance is consolidated into `ERP_QUY_TRINH_NHAP_LIEU_CHI_TIET.md`; older scattered operational/deployment docs were removed from the active worktree.
28. **Activities schema alignment**: CRM activity save uses `activity_type_id`, `description`, `activity_date`, and `performed_by_id`; no `outcome` column is written because the current Supabase `activities` table does not have that column.
29. **Lead-first quotation rule**: Sales Quotation form no longer allows choosing Customer. Quotation must be linked to a Lead; Customer is created/linked only when quotation is accepted/won, and the Lead stage is moved to `won`.
30. **Supabase schema alignment pass**: Removed global `is_deleted` injection and old-schema line fields. Sales/quotation/RFQ/PO lines now write current columns (`quantity`, `sequence`, `description` where applicable); payments no longer write non-existent performer columns.
31. **Header totals from lines**: API calculates quotation, sales order, purchase order, and invoice header amounts from submitted lines before insert/update because the current schema does not aggregate child lines into headers automatically.

**PENDING:**
_(All major workflow blockers are addressed. Remaining tasks are minor UI polish, documentation encoding cleanup, and final user-acceptance testing.)_

---

## 15. QUICK REFERENCE FOR NEW AGENT

### When Working on This Project:

1. **Authentication**: Uses Supabase Auth with JWT tokens stored in Zustand store
2. **State Management**: Zustand stores for auth, UI, sales, inventory, products, CRM
3. **API Calls**: Centralized in `services/erpApi.ts` and individual service files
4. **Database**: All data goes through Supabase with RLS policies
5. **Routing**: React Router v6 with protected routes
6. **UI**: Tailwind CSS with custom color theme (primary, secondary, accent)

### Common Patterns:
- All monetary values stored as `numeric` or `decimal`
- Dates stored as ISO 8601 strings
- Status fields use snake_case: `partially_shipped`, `partial_paid`
- Soft delete via `is_deleted` boolean flag
- Audit logging via `audit_logs` table
- Financial totals are generally database-generated; UI/API should send editable inputs like line quantity, unit price, discount, and document-level `tax_percent`.
- `tax_percent` is not a Lead field. Do not include it in `/crm/leads` payloads.
- `outcome` is not an Activity field in the current Supabase schema. Store activity notes/results inside `description`.
- Quotation creation is Lead-first. Do not pass `customer_id` for quotation create/edit; acceptance creates/links Customer from Lead data.

### Testing Order:
1. Master Data (products, customers, suppliers, warehouses)
2. CRM (leads → activities → conversion)
3. Sales (quotation → SO → delivery → invoice)
4. Purchase (RFQ → PO → goods receipt → bill)
5. Accounting (payments, credit/debit notes)

### Updated Testing Order (2026-05-12):
1. Master Data (products, customers, suppliers, warehouses)
2. CRM (leads -> activities -> quotation)
3. Sales (accepted quotation -> SO -> invoice -> delivery gate)
4. Accounting (customer payment for COD/Prepaid, credit/debit notes)
5. Inventory (delivery reserve -> shipped/delivered stock deduction, stock transfer)
6. Purchase (RFQ -> PO -> goods receipt -> bill -> supplier payment)

---

**Document Version**: 1.0
**Last Updated**: 2026-05-12
**Purpose**: Agent onboarding and quick reference
