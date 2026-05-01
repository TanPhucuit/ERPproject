
# 🔗 DATABASE RELATIONSHIPS & ERD (Entity Relationship Diagram)

## 📊 Diagram Tóm Tắt

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NOVATECH ERP SYSTEM - RELATIONSHIPS              │
└─────────────────────────────────────────────────────────────────────┘

                           【 USERS & ORGANIZATION 】
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
                 users           departments      audit_logs
              (5 roles)                            (trace all)

                           【 PRODUCTS & CATEGORIES 】
                                     │
           ┌─────────────────┬───────┴────────┬─────────────────┐
           ▼                 ▼                ▼                 ▼
      product_categories  products      units_of_measure   (supports
      (20 categories)    (500+ items)   (pcs, box, pack)    metrics:
           │                 │                               ├─product_sales_metrics
           │                 │                               └─stock in bins)
           │                 │
           │          【 STOCK MANAGEMENT 】
           │                 │
      ┌────┴──────┬──────────┼──────────┬──────────┐
      │            │         │          │          │
      ▼            ▼         ▼          ▼          ▼
  warehouses  stock_levels  stock_in_bins  bin_locations  carriers
  (3 WH)      (qty tracking) (batch trace)  (30+ bins)    (for DO)
      │
  warehouse_zones
  (A, B, C)

                        【 CRM PIPELINE 】
           lead_stages → leads → activities → customers
           (5 stages)   (100+)   (log trail)  (1000+)
                          │           │          │
                          ▼           ▼          ▼
                       lead_rating  assignee   (segment:
                       estimate     contact    B2B/B2C)
                       probability  type       credit_limit

                        【 SALES FLOW 】
            Lead (CRM)
              ▼
            quotations (QTN-001) → quotation_lines
              ▼                        ▼ (product_id)
            customers
              ▼
            sales_orders (SO-001) → sales_order_lines
              │                        │ (profit tracking)
              ▼                        ▼
            invoice                cost_price recorded
            (optional)             at SO time
              │                   (for accurate margin)
              ▼
            delivery_orders (DO-001) ← DO_lines ← bin_locations
                                       (picked from where)

                        【 PURCHASE FLOW 】
            suppliers (1000+)
              ▼
            rfqs (RFQ-001) → rfq_lines → rfq_supplier_quotations
              ▼                            ▼ (compare price/lead time)
            quotation                 is_selected flag
            comparison
              ▼
            purchase_orders (PO-001) → purchase_order_lines
              │                          ▼ (qty_ordered vs received)
              ▼
            goods_receipts (GR-001) → goods_receipt_lines
              │                        ├─ quality_status
              │                        ├─ bin_location (putaway)
              ▼                        └─ batch_number
            Debit Note
            (if defective)

                      【 INVENTORY OPERATIONS 】
            DO (from SO)              GR (from PO)
              ▼                          ▼
            delivery_order_lines ◄──► goods_receipt_lines
              ├─ quantity_to_deliver   ├─ quantity_received
              ├─ bin_location_id       ├─ bin_location_id
              └─ updates stock_levels  └─ quality_status

            stock_levels (per warehouse + product)
              ├─ quantity_on_hand (physical)
              ├─ quantity_reserved (allocated to SO)
              ├─ quantity_available (=on_hand - reserved)
              └─ quantity_in_transit (items in GR)

            Stock Count (monthly)
              ▼
            inventory_adjustments → inventory_adjustment_lines
              ├─ quantity_system (per system)
              ├─ quantity_actual (physical count)
              ├─ variance calculated
              └─ Auto-update stock_levels when approved

                      【 ACCOUNTING & METRICS 】
            journal_entries (auto from transactions)
              ├─ reference_type: SO, PO, DO, GR, ADJ
              └─ journal_entry_lines (debit/credit per account)

            daily_metrics (aggregated)
            product_sales_metrics (per product per period)
            customer_metrics (spending, orders, RFM)
            supplier_metrics (performance tracking)

                      【 SETTINGS & CONFIG 】
            company_settings (flexible key-value store)
            activity_types (call, email, meeting, etc.)
            accounts (chart of accounts for GL)
            supplier_types (equipment, services, etc.)
```

---

## 🔀 DETAILED RELATIONSHIPS

### **1. ORGANIZATIONS**

```
departments (CEO, Sales, Purchasing, Warehouse, Accounting)
    ├─ manager_id → users (optional)
    └─ is_deleted (soft delete)

users
    ├─ department_id → departments
    ├─ role: CEO, Sales_Manager, Purchasing_Manager, Warehouse_Manager, Accountant, Admin
    ├─ avatar_url (CDN link)
    └─ status: active, inactive, suspended

audit_logs
    ├─ user_id → users (who did it)
    ├─ entity_type: Lead, SO, PO, DO, etc.
    ├─ entity_id (which record)
    ├─ action: CREATE, UPDATE, DELETE, APPROVE
    ├─ old_values (JSONB)
    └─ new_values (JSONB)
```

---

### **2. PRODUCTS & INVENTORY STRUCTURE**

```
product_categories (20 categories)
    ├─ parent_id → product_categories (hierarchy A → A.1)
    ├─ image_url (category thumbnail)
    └─ is_deleted

products (500+ items)
    ├─ category_id → product_categories
    ├─ uom_id → units_of_measure
    ├─ sku (UNIQUE)
    ├─ image_url (product image)
    ├─ list_price (selling)
    ├─ cost_price (procurement)
    ├─ profit_margin_percent ⚙️ GENERATED
    ├─ reorder_level, reorder_quantity
    ├─ supplier_lead_time_days (average from suppliers)
    ├─ barcode (for future scanning)
    └─ is_deleted

units_of_measure (pcs, box, pack, kg, m, etc.)
    ├─ code (UNIQUE)
    └─ conversion_factor

stock_levels (per warehouse per product)
    ├─ product_id → products
    ├─ warehouse_id → warehouses
    ├─ quantity_on_hand (physical)
    ├─ quantity_reserved (allocated to SO)
    ├─ quantity_available ⚙️ = on_hand - reserved
    ├─ quantity_in_transit (in GR)
    ├─ reorder_status (optimal, understocked, overstocked, critical)
    └─ UNIQUE: (product_id, warehouse_id)

stock_in_bins (physical location in warehouse)
    ├─ bin_location_id → bin_locations
    ├─ product_id → products
    ├─ quantity (how many in this bin)
    ├─ batch_number (supplier lot)
    ├─ expiry_date
    ├─ received_date
    └─ UNIQUE: (bin_id, product_id, batch_number)

warehouses (3 warehouses)
    ├─ warehouse_code (WH-HN, WH-HCM, WH-REPAIR) UNIQUE
    ├─ manager_id → users
    ├─ capacity_sqm
    ├─ current_occupancy_sqm
    └─ is_deleted

warehouse_zones (within warehouses)
    ├─ warehouse_id → warehouses
    ├─ zone_code (A, B, C - high value, small, bulky)

bin_locations (30+ bins)
    ├─ warehouse_id → warehouses
    ├─ zone_id → warehouse_zones
    ├─ bin_code (A1, A2, B1, etc.) UNIQUE per warehouse
    ├─ capacity_units
    ├─ status (active, maintenance, reserve)
```

---

### **3. CRM PIPELINE**

```
lead_stages (lookup table)
    ├─ name: new, site_survey, proposition, won, lost
    ├─ probability_percent: 10, 30, 60, 100, 0
    └─ color_code (HEX for Kanban)

leads (100+ leads)
    ├─ company_name, contact_person_name
    ├─ lead_number (AUTO: LEAD-2024-0001)
    ├─ stage_id → lead_stages
    ├─ owner_id → users (Sales Manager)
    ├─ estimated_value (expected contract)
    ├─ probability_percent (win chance)
    ├─ source (Direct, Website, Referral, Event, Cold Call, Email)
    ├─ lead_rating (Hot, Warm, Cold)
    ├─ expected_close_date, closed_date
    └─ is_deleted

activities (multi-purpose log)
    ├─ lead_id → leads (primary: link to lead)
    ├─ activity_type_id → activity_types (call, email, meeting, etc.)
    ├─ assigned_to_id → users
    ├─ scheduled_date, actual_date
    ├─ status: planned, in_progress, done, cancelled
    ├─ outcome (result)
    └─ attachments (JSONB: documents, photos)

activity_types (lookup)
    ├─ name: call, email, meeting, site_survey, quotation, proposal, etc.
    └─ icon_class (for UI)
```

**Luồng Chính:**
```
Lead (new) 
  → Activity: Site Survey (scheduled)
  → Activity: Quotation Preparation (done, outcome: sent to customer)
  → Lead stage: proposition (probability: 60%)
  → Activity: Follow-up call (done, outcome: accepted)
  → Lead stage: won (closed_date = today)
  → Convert to Customer + Sales Order
```

---

### **4. SALES (Quotation → Order)**

```
customers (1000+)
    ├─ customer_number (AUTO: CUST-2024-0001)
    ├─ name, company_tax_id
    ├─ customer_type: B2B, B2C
    ├─ lead_id → leads (optional: origin from CRM)
    ├─ credit_limit (max payable balance)
    ├─ credit_used (current outstanding)
    ├─ payment_terms: NET30, NET60, COD, Prepaid
    ├─ billing_address, shipping_address (separate)
    ├─ status: active, inactive, blocked
    └─ created_by_id → users

quotations (100+)
    ├─ quotation_number (AUTO: QTN-2024-0001)
    ├─ customer_id → customers (who is this for)
    ├─ issued_date, valid_until_date (expiry)
    ├─ status: draft, sent, accepted, rejected, expired
    ├─ total_amount_before_tax, total_discount, tax_amount, total_amount
    ├─ estimated_profit ⚙️ = SUM(line profits before tax)
    ├─ created_by_id → users
    ├─ approved_by_id → users, approved_at
    ├─ attachments (JSONB: terms, specs, etc.)
    └─ 可选soft delete

quotation_lines (line items)
    ├─ quotation_id → quotations
    ├─ product_id → products
    ├─ quantity_quoted
    ├─ unit_price (selling price at quote time)
    ├─ discount_percent, tax_percent
    └─ line_total ⚙️ = quantity * unit_price * (1-discount/100) * (1+tax/100)

sales_orders (50+ actual orders)
    ├─ sales_order_number (AUTO: SO-2024-0001)
    ├─ quotation_id → quotations (from accepted QTN)
    ├─ customer_id → customers
    ├─ order_date, required_delivery_date, actual_delivery_date
    ├─ status: draft, confirmed, partially_shipped, shipped, delivered, cancelled
    ├─ total_amount (revenue including tax)
    ├─ total_cost ⚙️ = SUM(quantity * cost_price per line)
    ├─ estimated_profit ⚙️ = total_amount - total_cost
    ├─ profit_margin_percent ⚙️ = (estimated_profit / total_amount) * 100
    ├─ sales_person_id → users
    ├─ approval flow
    └─ auto-reserve stock when confirmed
       auto-create delivery_order

sales_order_lines (line items)
    ├─ sales_order_id → sales_orders
    ├─ product_id → products
    ├─ quantity_ordered, quantity_delivered (track partial delivery)
    ├─ unit_price (selling price at SO time)
    ├─ cost_price ⚙️ (cost at SO time - for accurate margin calc)
    ├─ discount_percent, tax_percent
    └─ line_profit ⚙️ = (qty*unit_price - qty*cost_price) * (1-discount/100)
```

**Luồng Chính:**
```
Quotation (sent to customer)
  → Customer accepts
  → Convert to Sales Order
    (system auto-copies line items, reserves stock)
  → SO Confirmed (approval)
  → Delivery Order auto-created
  → Items picked & shipped
  → Stock reduced from stock_levels
  → Invoice created (optional accounting module)
```

---

### **5. PURCHASE (RFQ → PO)**

```
suppliers (1000+)
    ├─ supplier_number (AUTO: SUPP-2024-0001)
    ├─ name, company_tax_id
    ├─ supplier_type_id → supplier_types
    ├─ contact info, company_address
    ├─ logo_url (company logo)
    ├─ payment_terms: NET30, NET60, COD, Prepaid
    ├─ is_preferred (flag for favorites)
    ├─ quality_rating (0-5 stars)
    ├─ total_spent ⚙️ (metric: cumulative PO amount)
    ├─ average_response_time_hours ⚙️ (metric)
    ├─ status: active, inactive, blocked
    └─ is_deleted

supplier_types (lookup)
    ├─ equipment
    ├─ components
    ├─ logistics
    ├─ services (packaging, office supply)
    └─ maintenance

rfqs (Request For Quotation - 100+)
    ├─ rfq_number (AUTO: RFQ-2024-0001)
    ├─ issued_date, closing_date
    ├─ status: draft, sent, closed, cancelled
    ├─ created_by_id → users (Purchasing Manager)
    ├─ total_estimated_cost
    └─ attachments (JSONB)

rfq_lines
    ├─ rfq_id → rfqs
    ├─ product_id → products
    ├─ quantity_required
    ├─ required_delivery_date

rfq_supplier_quotations (comparison table)
    ├─ rfq_line_id → rfq_lines
    ├─ supplier_id → suppliers (who quoted)
    ├─ quoted_price
    ├─ quoted_lead_time_days
    ├─ minimum_order_quantity
    ├─ is_selected (flag: chosen supplier)
    └─ received_date (when quote received)

purchase_orders (50+ - 100 POs)
    ├─ po_number (AUTO: PO-2024-0001)
    ├─ supplier_id → suppliers
    ├─ rfq_id → rfqs (from which RFQ)
    ├─ order_date, required_delivery_date, actual_delivery_date
    ├─ status: draft, confirmed, partial_received, received, cancelled
    ├─ total_amount, received_amount (track partial receipt)
    ├─ created_by_id → users
    ├─ approved_by_id → users, approved_at
    └─ auto-create goods_receipt

purchase_order_lines
    ├─ po_id → purchase_orders
    ├─ product_id → products
    ├─ quantity_ordered, quantity_received (track)
    ├─ unit_price
    └─ line_total ⚙️ = quantity * unit_price * (1 + tax%)
```

**Luồng Chính:**
```
RFQ Created
  → Send to 5 suppliers
  → Collect quotations (compare price, lead time)
  → Select best supplier
  → Create PO from RFQ
  → PO Confirmed (approval)
  → Wait for delivery
  → Goods Receipt (GR) created
  → Stock updated when items accepted
```

---

### **6. INVENTORY (Complex)**

#### **Outbound (từ Sales Order):**

```
sales_order (confirmed)
  ▼
delivery_order auto-created
  ├─ delivery_order_lines (1 line per SO line)
  ├─ quantity_to_deliver
  ├─ bin_location_id (where to pick from)
  ├─ status: draft → ready → picked → shipped → delivered
  ├─ carrier_id → carriers (who ships)
  └─ tracking_number
  
When marked "Shipped":
  ▼
  Auto-update stock_levels:
  ├─ quantity_on_hand -= qty_shipped
  ├─ quantity_reserved -= qty_shipped
  └─ sales_order.status → shipped

When delivery confirmed:
  ▼
  Auto-update stock_levels:
  ├─ quantity_on_hand -= qty_delivered (if not already)
  └─ sales_order.status → delivered
```

#### **Inbound (từ Purchase Order):**

```
purchase_order (confirmed)
  ▼
goods_receipt auto-created
  ├─ goods_receipt_lines (1 line per PO line)
  ├─ quantity_received (may be different from ordered)
  ├─ quality_status: good, defective, damaged, wrong_item
  ├─ bin_location_id (where to putaway)
  └─ status: draft → received → verified → completed

When line marked "Received":
  ▼
  Auto-update stock_levels:
  ├─ quantity_in_transit -= qty_received
  ├─ quantity_on_hand += qty_received (if good)
  │
  └─ Add to stock_in_bins:
     ├─ bin_location_id
     ├─ batch_number (from supplier)
     ├─ expiry_date
     └─ quantity

If defective/damaged:
  ▼
  Auto-create Debit Note
  (request reimbursement from supplier)
```

#### **Stock Count & Adjustment:**

```
inventory_adjustments
  ├─ adjustment_number (AUTO: ADJ-2024-0001)
  ├─ warehouse_id → warehouses
  ├─ adjustment_type: stock_count, damage_loss, destruction, correction
  ├─ status: draft → confirmed → completed
  └─ adjustment_lines:
     ├─ product_id → products
     ├─ bin_location_id → bin_locations
     ├─ quantity_system (per system)
     ├─ quantity_actual (physical count)
     ├─ quantity_variance ⚙️ = actual - system (loss if negative)

When approved:
  ▼
  Auto-update stock_levels:
  ├─ quantity_on_hand += variance (adjust up/down)
  └─ Auto-create journal entry (if variance > 0)
```

---

### **7. ACCOUNTING & METRICS**

```
accounts (Chart of Accounts)
    ├─ account_code: 1110, 1120, 1200, 1300, 2100, 5100, 5200, 6100
    ├─ account_name
    ├─ account_type: Asset, Liability, Revenue, Expense
    ├─ normal_balance: Debit or Credit
    └─ status

journal_entries (Auto-created from transactions)
    ├─ entry_number (AUTO: JE-2024-0001)
    ├─ entry_date
    ├─ reference_type: SO, PO, DO, GR, ADJ, INVOICE
    ├─ reference_id (link back to transaction)
    ├─ status: draft, posted
    └─ journal_entry_lines:
       ├─ account_id → accounts
       ├─ line_sequence
       ├─ debit_amount, credit_amount
       └─ description

daily_metrics (aggregated daily)
    ├─ metric_date
    ├─ total_sales_revenue (SUM SO amount)
    ├─ total_cost (SUM sales_order_lines.cost_price * qty)
    ├─ total_profit ⚙️ = revenue - cost
    ├─ profit_margin_percent ⚙️ = (profit / revenue) * 100
    ├─ total_purchase_spent (SUM PO amount)
    ├─ orders_created (COUNT SO)
    ├─ orders_delivered (COUNT SO.status='delivered')
    ├─ leads_created, leads_converted
    ├─ top_product_id → products (best selling)
    └─ top_customer_id → customers (highest spending)

product_sales_metrics (per product per period)
    ├─ product_id → products
    ├─ period_start_date, period_end_date
    ├─ total_quantity_sold
    ├─ total_revenue (SUM SO line total)
    ├─ total_cost ⚙️ (SUM qty * cost_price)
    ├─ total_profit ⚙️ = revenue - cost
    ├─ average_selling_price
    └─ times_sold (transaction count)

customer_metrics (per customer per period)
    ├─ customer_id → customers
    ├─ total_orders (COUNT SO)
    ├─ total_spent (SUM SO amount)
    ├─ average_order_value ⚙️ = total_spent / total_orders
    ├─ last_purchase_date
    └─ status: active, inactive, vip, at_risk

supplier_metrics (per supplier per period)
    ├─ supplier_id → suppliers
    ├─ total_orders (COUNT PO)
    ├─ total_spent (SUM PO amount)
    ├─ on_time_delivery_percent (GR received on time / total GRs)
    ├─ average_lead_time_days (AVG actual vs required)
    └─ defect_rate_percent (defective items / total received)
```

---

## 📋 KEY FOREIGN KEY RELATIONSHIPS

```
┌─────────────────────────────────────────────────────────────┐
│ FK INTEGRITY CONSTRAINTS                                    │
└─────────────────────────────────────────────────────────────┘

users
├─ department_id → departments (SET NULL if deleted)
└─ Many: created_by_id, approved_by_id, manager_id, owner_id

products
├─ category_id → product_categories (RESTRICT - can't delete category w/ products)
└─ uom_id → units_of_measure (RESTRICT)

leads
├─ stage_id → lead_stages (RESTRICT)
└─ owner_id → users (SET NULL if user deleted)

activities
├─ lead_id → leads (CASCADE - delete lead → delete activities)
├─ activity_type_id → activity_types (RESTRICT)
└─ assigned_to_id → users (SET NULL)

customers
├─ lead_id → leads (SET NULL)
└─ created_by_id → users (SET NULL)

quotations
├─ customer_id → customers (RESTRICT)
├─ created_by_id → users (SET NULL)
└─ approved_by_id → users (SET NULL)

quotation_lines
├─ quotation_id → quotations (CASCADE)
└─ product_id → products (RESTRICT)

sales_orders
├─ quotation_id → quotations (SET NULL)
├─ customer_id → customers (RESTRICT)
└─ sales_person_id → users (SET NULL)

sales_order_lines
├─ sales_order_id → sales_orders (CASCADE)
└─ product_id → products (RESTRICT)

suppliers
├─ supplier_type_id → supplier_types (RESTRICT)
└─ created_by_id → users (SET NULL)

rfqs
├─ created_by_id → users (RESTRICT)

purchase_orders
├─ supplier_id → suppliers (RESTRICT)
├─ rfq_id → rfqs (SET NULL)
└─ created_by_id → users (SET NULL)

purchase_order_lines
├─ purchase_order_id → purchase_orders (CASCADE)
└─ product_id → products (RESTRICT)

warehouses
├─ manager_id → users (SET NULL)

bin_locations
├─ warehouse_id → warehouses (CASCADE)
└─ zone_id → warehouse_zones (SET NULL)

stock_levels
├─ product_id → products (CASCADE)
└─ warehouse_id → warehouses (CASCADE)

stock_in_bins
├─ bin_location_id → bin_locations (CASCADE)
└─ product_id → products (CASCADE)

delivery_orders
├─ sales_order_id → sales_orders (RESTRICT)
├─ warehouse_id → warehouses (RESTRICT)
└─ carrier_id → carriers (SET NULL)

delivery_order_lines
├─ delivery_order_id → delivery_orders (CASCADE)
├─ sales_order_line_id → sales_order_lines (RESTRICT)
├─ product_id → products (RESTRICT)
└─ bin_location_id → bin_locations (SET NULL)

goods_receipts
├─ purchase_order_id → purchase_orders (RESTRICT)
├─ warehouse_id → warehouses (RESTRICT)
└─ verified_by_id → users (SET NULL)

goods_receipt_lines
├─ goods_receipt_id → goods_receipts (CASCADE)
├─ purchase_order_line_id → purchase_order_lines (RESTRICT)
├─ product_id → products (RESTRICT)
└─ bin_location_id → bin_locations (SET NULL)

inventory_adjustments
├─ warehouse_id → warehouses (RESTRICT)
├─ created_by_id → users (SET NULL)
└─ approved_by_id → users (SET NULL)

inventory_adjustment_lines
├─ adjustment_id → inventory_adjustments (CASCADE)
├─ product_id → products (RESTRICT)
└─ bin_location_id → bin_locations (SET NULL)

journal_entries
├─ created_by_id → users (SET NULL)
└─ posted_by_id → users (SET NULL)

journal_entry_lines
├─ journal_entry_id → journal_entries (CASCADE)
└─ account_id → accounts (RESTRICT)

daily_metrics / product_sales_metrics / customer_metrics / supplier_metrics
└─ (All metric tables reference their main entities but with SET NULL/CASCADE)
```

---

## 🎯 DATA FLOW EXAMPLES

### **Example 1: Complete Sales Cycle**

```
1. CRM Lead Created
   lead {id, company_name, stage=new, probability=10%}

2. Activities Logged
   activities {activity_type=site_survey, assigned_to=SalesManager1}
   activities {activity_type=quotation, outcome="Sent"}

3. Lead → Customer (Converted)
   customer {name, lead_id=lead.id, credit_limit=100M}

4. Quotation Created (from Lead)
   quotation {customer_id=cust.id, status=draft}
   quotation_lines {product_id, qty=50, unit_price=8.5M}
                    {product_id, qty=100, unit_price=5M}
   -- total_amount calculated auto

5. Quotation Sent (status → sent)
   lead.stage → proposition (probability → 60%)

6. Quotation Accepted (status → accepted)
   lead.stage → won (probability → 100%)

7. Convert to Sales Order
   sales_order {so_number=SO-0001, customer_id, quotation_id}
   sales_order_lines {copy from quotation_lines}
   -- total_cost calculated (qty * cost_price)
   -- estimated_profit calculated
   -- stock reserved: stock_levels.quantity_reserved += qty

8. Auto-create Delivery Order
   delivery_order {do_number=DO-0001, so_id, status=draft}

9. Picking Phase
   delivery_order.status → picked
   bin_locations selected for picking

10. Shipping Phase
    delivery_order.status → shipped
    carrier assigned, tracking number
    stock_levels.quantity_on_hand -= qty_shipped
    stock_levels.quantity_reserved -= qty_shipped

11. Delivered Confirmation
    delivery_order.status → delivered
    sales_order.actual_delivery_date = today
    auto-create invoice (if accounting enabled)
    daily_metrics updated (total_revenue, total_profit, etc.)

RESULT:
├─ Lead: converted, closed (won)
├─ Customer: created, credit_used updated
├─ Quotation: accepted → stored as reference
├─ Sales Order: confirmed & delivered
├─ Stock Levels: reduced by delivered qty
├─ Metrics: revenue & profit recorded
└─ Audit Log: all changes tracked
```

---

### **Example 2: Complete Purchase Cycle**

```
1. Stock Check (Warehouse Manager)
   stock_levels {product_id=Camera, quantity_on_hand=50}
   reorder_level=100 → ALERT: understocked

2. RFQ Created
   rfq {rfq_number=RFQ-0001}
   rfq_lines {product_id=Camera, qty=500}
   
3. Send to 5 Suppliers
   rfq_supplier_quotations
   ├─ supp1: quoted_price=8M, lead_time=7 days
   ├─ supp2: quoted_price=7.8M, lead_time=14 days
   ├─ supp3: quoted_price=8.5M, lead_time=5 days
   ├─ supp4: quoted_price=7.5M, lead_time=21 days
   └─ supp5: quoted_price=8.2M, lead_time=10 days

4. Compare & Select
   supp2 selected (best price + good lead time)
   rfq_supplier_quotation.is_selected = TRUE

5. Create PO
   po {po_number=PO-0001, supplier_id=supp2}
   po_lines {product_id=Camera, qty=500, unit_price=7.8M}
   status=draft

6. Approve PO
   po.status → confirmed
   po.approved_by = ProcurementMgr1

7. Wait for Delivery
   Wait 14 days...

8. Goods Receipt Created
   gr {gr_number=GR-0001, po_id=PO-0001}
   gr_lines {product_id=Camera, qty_received=500, quality_status=good}
   gr.status → received
   bin_location selected: putaway to A1

9. Verify & Accept
   gr.status → verified
   Auto-update:
   ├─ stock_levels.quantity_on_hand += 500
   ├─ stock_in_bins {bin_id=A1, product_id=Camera, qty=500, batch_number=B123}
   ├─ stock_levels.quantity_in_transit -= qty
   ├─ po.status → received
   └─ supplier_metrics.on_time_delivery_percent updated

RESULT:
├─ RFQ: sent to 5 suppliers, quotations received
├─ PO: created from best quotation, approved
├─ Stock: received & verified, now available for sales
├─ Supplier Metrics: delivery tracked, quality recorded
└─ Audit Log: all approvals logged

(If 10% of items defective:
   Auto-create Debit Note
   Request 50% refund from supplier)
```

---

## 📊 QUERY EXAMPLES FOR ANALYTICS

```sql
-- Daily Dashboard
SELECT 
  m.metric_date,
  m.total_sales_revenue,
  m.total_cost,
  m.total_profit,
  m.profit_margin_percent,
  m.orders_delivered
FROM daily_metrics m
ORDER BY m.metric_date DESC
LIMIT 30;

-- Top Selling Products (This Month)
SELECT 
  p.id, p.sku, p.name,
  psm.total_quantity_sold,
  psm.total_revenue,
  psm.total_profit,
  psm.average_selling_price
FROM product_sales_metrics psm
JOIN products p ON psm.product_id = p.id
WHERE psm.period_start_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY psm.total_revenue DESC
LIMIT 10;

-- Customer Spending (Top 10)
SELECT 
  c.id, c.customer_number, c.name,
  cm.total_orders,
  cm.total_spent,
  cm.average_order_value,
  cm.status
FROM customer_metrics cm
JOIN customers c ON cm.customer_id = c.id
WHERE cm.period_start_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY cm.total_spent DESC
LIMIT 10;

-- Supplier Performance
SELECT 
  s.id, s.supplier_number, s.name,
  sm.total_orders,
  sm.total_spent,
  sm.on_time_delivery_percent,
  sm.average_lead_time_days,
  sm.defect_rate_percent
FROM supplier_metrics sm
JOIN suppliers s ON sm.supplier_id = s.id
WHERE sm.period_start_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY sm.on_time_delivery_percent DESC;

-- Low Stock Alert
SELECT 
  p.id, p.sku, p.name,
  sl.quantity_on_hand,
  p.reorder_level,
  p.reorder_quantity,
  w.warehouse_code
FROM stock_levels sl
JOIN products p ON sl.product_id = p.id
JOIN warehouses w ON sl.warehouse_id = w.id
WHERE sl.quantity_on_hand < p.reorder_level
ORDER BY sl.quantity_on_hand ASC;

-- Sales Profit Margin by Month
SELECT 
  DATE_TRUNC('month', so.order_date) as month,
  COUNT(so.id) as order_count,
  SUM(so.total_amount) as total_revenue,
  SUM(so.total_cost) as total_cost,
  SUM(so.estimated_profit) as total_profit,
  AVG(so.profit_margin_percent) as avg_profit_margin_percent
FROM sales_orders so
WHERE so.is_deleted = FALSE
  AND so.status = 'delivered'
GROUP BY DATE_TRUNC('month', so.order_date)
ORDER BY month DESC;
```

---

**Status: ✅ Complete Relationship Mapping**

Tây hệ thống sẵn sàng cho:
- ✅ Complex queries & analytics
- ✅ Real-time dashboards
- ✅ Profit tracking & margin analysis
- ✅ Supplier/Customer performance monitoring
- ✅ Inventory management & reordering
- ✅ Complete audit trail

