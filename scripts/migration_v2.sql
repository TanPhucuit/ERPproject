-- ============================================================
-- NOVATECH ERP - MIGRATION SCRIPT v2.0
-- Run this in Supabase SQL Editor to reset + create new schema
-- ============================================================
-- Câu lệnh xóa bảng cũ (drop if exists để tránh lỗi)
DROP TABLE IF EXISTS device_warranty_alerts CASCADE;
DROP TABLE IF EXISTS warranty_tracking CASCADE;
DROP TABLE IF EXISTS device_registrations CASCADE;
DROP TABLE IF EXISTS mac_serial_mapping CASCADE;
DROP TABLE IF EXISTS bom_components CASCADE;
DROP TABLE IF EXISTS bom_packages CASCADE;
DROP TABLE IF EXISTS stock_in_bins CASCADE;
DROP TABLE IF EXISTS bin_locations CASCADE;
DROP TABLE IF EXISTS stock_levels CASCADE;
DROP TABLE IF EXISTS inventory_adjustments CASCADE;
DROP TABLE IF EXISTS inventory_adjustment_lines CASCADE;
DROP TABLE IF EXISTS goods_receipt_lines CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS delivery_order_lines CASCADE;
DROP TABLE IF EXISTS delivery_orders CASCADE;
DROP TABLE IF EXISTS carriers CASCADE;
DROP TABLE IF EXISTS warehouse_zones CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS credit_notes CASCADE;
DROP TABLE IF EXISTS debit_notes CASCADE;
DROP TABLE IF EXISTS vendor_bills CASCADE;
DROP TABLE IF EXISTS customer_invoices CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS purchase_order_lines CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS rfq_supplier_quotations CASCADE;
DROP TABLE IF EXISTS rfq_lines CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS sales_order_lines CASCADE;
DROP TABLE IF EXISTS quotation_lines CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS activity_types CASCADE;
DROP TABLE IF EXISTS lead_stages CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS units_of_measure CASCADE;
DROP TABLE IF EXISTS supplier_types CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS daily_metrics CASCADE;
DROP TABLE IF EXISTS product_sales_metrics CASCADE;
DROP TABLE IF EXISTS customer_metrics CASCADE;
DROP TABLE IF EXISTS supplier_metrics CASCADE;
DROP TYPE IF EXISTS lead_source_enum;
DROP TYPE IF EXISTS lead_rating_enum;
DROP TYPE IF EXISTS quotation_status_enum;
DROP TYPE IF EXISTS sales_order_status_enum;
DROP TYPE IF EXISTS rfq_status_enum;
DROP TYPE IF EXISTS purchase_order_status_enum;
DROP TYPE IF EXISTS delivery_status_enum;
DROP TYPE IF EXISTS goods_receipt_status_enum;
DROP TYPE IF EXISTS adjustment_status_enum;
DROP TYPE IF EXISTS invoice_status_enum;
DROP TYPE IF EXISTS bill_status_enum;
DROP TYPE IF EXISTS note_status_enum;
DROP TYPE IF EXISTS customer_type_enum;
DROP TYPE IF EXISTS device_activation_status_enum;

-- ============================================================
-- PART 1: MASTER DATA (Dữ liệu nền tảng)
-- ============================================================

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (5 người)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '123456',
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  department_id UUID REFERENCES departments(id),
  role VARCHAR(50) NOT NULL CHECK (role IN ('CEO', 'Sales_Manager', 'Purchasing_Manager', 'Warehouse_Manager', 'Accountant', 'Admin', 'user')),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units of Measure
CREATE TABLE units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  code VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Categories (Camera, Sensor, Robot, etc.)
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (500+ thiết bị SmartHome)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  uom_id UUID REFERENCES units_of_measure(id),
  barcode VARCHAR(100),
  image_url TEXT,
  list_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  profit_margin_percent NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN list_price > 0 THEN ((list_price - cost_price) / list_price * 100) ELSE 0 END) STORED,
  reorder_level INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  supplier_lead_time_days INTEGER DEFAULT 7,
  is_iot_device BOOLEAN DEFAULT FALSE,  -- True for camera, robot, smart lock
  requires_serial_scan BOOLEAN DEFAULT FALSE,  -- IoT devices require Serial/MAC scanning
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'prototype')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier Types (Equipment, Logistics, etc.)
CREATE TABLE supplier_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers (1000 khách hàng)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(10) DEFAULT 'B2C' CHECK (customer_type IN ('B2B', 'B2C')),
  company_tax_id VARCHAR(50),
  contact_person_name VARCHAR(200),
  contact_person_email VARCHAR(255),
  contact_person_phone VARCHAR(50),
  billing_address TEXT,
  shipping_address TEXT,
  shipping_same_as_billing BOOLEAN DEFAULT TRUE,
  credit_limit NUMERIC(18,2) DEFAULT 0,
  payment_terms VARCHAR(20) DEFAULT 'NET30' CHECK (payment_terms IN ('NET30', 'NET45', 'NET60', 'COD', 'Prepaid')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers (1000 nhà cung cấp)
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_number VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  supplier_type_id UUID REFERENCES supplier_types(id),
  company_tax_id VARCHAR(50),
  contact_person_name VARCHAR(200),
  contact_person_email VARCHAR(255),
  contact_person_phone VARCHAR(50),
  company_address TEXT,
  company_city VARCHAR(100),
  company_province VARCHAR(100),
  company_postal_code VARCHAR(20),
  company_website VARCHAR(255),
  logo_url TEXT,
  payment_terms VARCHAR(20) DEFAULT 'NET30' CHECK (payment_terms IN ('NET30', 'NET45', 'NET60', 'COD', 'Prepaid')),
  average_lead_time_days INTEGER DEFAULT 7,
  quality_rating NUMERIC(3,2) DEFAULT 5.0,
  is_preferred BOOLEAN DEFAULT FALSE,
  total_spent NUMERIC(18,2) DEFAULT 0,
  average_response_time_hours NUMERIC(10,2),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouses (3 kho lớn)
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  location_address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  manager_id UUID REFERENCES users(id),
  capacity_sqm NUMERIC(12,2) DEFAULT 0,
  current_occupancy_sqm NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouse Zones
CREATE TABLE warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  zone_code VARCHAR(10) NOT NULL,
  zone_name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bin Locations (30 tọa độ mỗi kho)
CREATE TABLE bin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  zone_id UUID REFERENCES warehouse_zones(id),
  bin_code VARCHAR(30) NOT NULL,
  description TEXT,
  capacity_units INTEGER DEFAULT 0,
  current_occupancy_units INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'reserve')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, bin_code)
);

-- Stock Levels (tồn kho)
CREATE TABLE stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  bin_location_id UUID REFERENCES bin_locations(id),
  quantity_on_hand NUMERIC(12,3) DEFAULT 0,
  quantity_reserved NUMERIC(12,3) DEFAULT 0,
  quantity_available NUMERIC(12,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  quantity_in_transit NUMERIC(12,3) DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  reorder_status VARCHAR(20) DEFAULT 'normal' CHECK (reorder_status IN ('normal', 'low', 'critical', 'out_of_stock')),
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id, bin_location_id)
);

-- Stock in Bins
CREATE TABLE stock_in_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  bin_location_id UUID NOT NULL REFERENCES bin_locations(id),
  quantity NUMERIC(12,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 2: CRM - Lead & Customer Acquisition
-- ============================================================

-- Lead Stages (New → Site Survey → Quotation → Won/Lost)
CREATE TABLE lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  probability_percent INTEGER DEFAULT 0,
  is_won BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO lead_stages (name, display_name, probability_percent, is_won, is_lost, sequence) VALUES
  ('new', 'Mới tiếp nhận', 10, FALSE, FALSE, 1),
  ('site_survey', 'Khảo sát công trình', 30, FALSE, FALSE, 2),
  ('proposition', 'Báo giá', 60, FALSE, FALSE, 3),
  ('won', 'Đã ký hợp đồng', 100, TRUE, FALSE, 4),
  ('lost', 'Mất khách', 0, FALSE, TRUE, 5);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number VARCHAR(50) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_person_name VARCHAR(200),
  contact_person_phone VARCHAR(50),
  contact_person_email VARCHAR(255),
  company_address TEXT,
  company_tax_id VARCHAR(50),
  source VARCHAR(50) CHECK (source IN ('website', 'referral', 'showroom', 'architect', 'cold_call', 'social_media', 'auto_request')),
  lead_rating VARCHAR(10) CHECK (lead_rating IN ('hot', 'warm', 'cold')),
  stage_id UUID REFERENCES lead_stages(id),
  owner_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),  -- Sau khi convert từ lead
  estimated_value NUMERIC(18,2) DEFAULT 0,
  probability_percent INTEGER DEFAULT 50,
  expected_close_date DATE,
  notes TEXT,
  -- Thông tin khách hàng tự động fill khi convert
  customer_type VARCHAR(10),
  billing_address TEXT,
  shipping_address TEXT,
  tax_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Products (sản phẩm yêu cầu trong lead)
CREATE TABLE lead_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),  -- Lưu tên nếu product_id chưa có
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Types
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO activity_types (name, icon, color) VALUES
  ('Call', 'phone', 'blue'),
  ('Email', 'mail', 'green'),
  ('Meeting', 'users', 'purple'),
  ('Site Visit', 'map-pin', 'orange'),
  ('Quote Sent', 'file-text', 'teal');

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  activity_type_id UUID REFERENCES activity_types(id),
  description TEXT NOT NULL,
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  performed_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 3: SALES - Quotations & Sales Orders
-- ============================================================

-- Quotations
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  issued_date DATE DEFAULT CURRENT_DATE,
  valid_until_date DATE,
  sales_person_id UUID REFERENCES users(id),
  subtotal NUMERIC(18,2) DEFAULT 0,  -- Auto-calculated: Σ(quantity × unit_price × (1 - discount%))
  discount_percent NUMERIC(5,2) DEFAULT 0,  -- Discount chung
  discount_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal * discount_percent / 100) STORED,
  tax_percent NUMERIC(5,2) DEFAULT 0,  -- User input: chỉ nhập tax%
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal * tax_percent / 100) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal - discount_amount + tax_amount) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  requires_approval BOOLEAN DEFAULT FALSE,  -- Discount > 15% cần duyệt
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  internal_notes TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotation Lines
CREATE TABLE quotation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  uom_id UUID REFERENCES units_of_measure(id),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100)) STORED,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Orders
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_number VARCHAR(50) UNIQUE NOT NULL,
  quotation_id UUID REFERENCES quotations(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  sales_person_id UUID REFERENCES users(id),
  order_date DATE DEFAULT CURRENT_DATE,
  required_delivery_date DATE,
  actual_delivery_date DATE,
  subtotal NUMERIC(18,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal * discount_percent / 100) STORED,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal * tax_percent / 100) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal - discount_amount + tax_amount) STORED,
  total_cost NUMERIC(18,2) DEFAULT 0,  -- Tổng giá vốn
  estimated_profit NUMERIC(18,2) GENERATED ALWAYS AS (total_amount - total_cost) STORED,
  profit_margin_percent NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN total_amount > 0 THEN ((total_amount - total_cost) / total_amount * 100) ELSE 0 END) STORED,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partially_shipped', 'shipped', 'delivered', 'cancelled')),
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Order Lines
CREATE TABLE sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  uom_id UUID REFERENCES units_of_measure(id),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(18,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100)) STORED,
  line_cost NUMERIC(18,2) GENERATED ALWAYS AS (quantity * cost_price) STORED,
  quantity_delivered NUMERIC(12,3) DEFAULT 0,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 4: PURCHASE - RFQ & Purchase Orders
-- ============================================================

-- RFQs
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number VARCHAR(50) UNIQUE NOT NULL,
  issued_date DATE DEFAULT CURRENT_DATE,
  closing_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed', 'cancelled')),
  total_estimated_cost NUMERIC(18,2) DEFAULT 0,
  created_by_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RFQ Lines
CREATE TABLE rfq_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  target_price NUMERIC(18,2),
  description TEXT,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RFQ Supplier Quotations (phản hồi từ nhà cung cấp)
CREATE TABLE rfq_supplier_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  quoted_amount NUMERIC(18,2),
  lead_time_days INTEGER,
  valid_until_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_number VARCHAR(50) UNIQUE NOT NULL,
  rfq_id UUID REFERENCES rfqs(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_date DATE DEFAULT CURRENT_DATE,
  required_delivery_date DATE,
  actual_delivery_date DATE,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal * tax_percent / 100) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal + tax_amount) STORED,
  received_amount NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partial_received', 'received', 'cancelled')),
  created_by_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Lines
CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  quantity_received NUMERIC(12,3) DEFAULT 0,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 5: INVENTORY - Stock, Delivery, Receipt
-- ============================================================

-- Carriers
CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  contact_phone VARCHAR(50),
  tracking_url_template TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Orders
CREATE TABLE delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  carrier_id UUID REFERENCES carriers(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'picked', 'shipped', 'in_transit', 'delivered', 'cancelled')),
  scheduled_delivery_date DATE,
  actual_delivery_date DATE,
  tracking_number VARCHAR(100),
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Order Lines
CREATE TABLE delivery_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity_ordered NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_delivered NUMERIC(12,3) DEFAULT 0,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goods Receipts
CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  received_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'verified', 'completed', 'cancelled')),
  verified_by_id UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goods Receipt Lines (có Serial/MAC scanning cho IoT devices)
CREATE TABLE goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity_expected NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_received NUMERIC(12,3) DEFAULT 0,
  unit_cost NUMERIC(18,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity_received * unit_cost) STORED,
  requires_serial_scan BOOLEAN DEFAULT FALSE,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Adjustments
CREATE TABLE inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  bin_location_id UUID REFERENCES bin_locations(id),
  adjustment_type VARCHAR(30) DEFAULT 'stock_count' CHECK (adjustment_type IN ('stock_count', 'cycle_count', 'damage', 'loss', 'found', 'transfer')),
  count_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
  reason TEXT,
  notes TEXT,
  approved_by_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Adjustment Lines
CREATE TABLE inventory_adjustment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity_before NUMERIC(12,3) DEFAULT 0,
  quantity_after NUMERIC(12,3) DEFAULT 0,
  variance NUMERIC(12,3) GENERATED ALWAYS AS (quantity_after - quantity_before) STORED,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 6: ACCOUNTING - Invoices, Bills, Notes
-- ============================================================

-- Chart of Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(30) CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  journal_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit NUMERIC(18,2) DEFAULT 0,
  credit NUMERIC(18,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Invoices
CREATE TABLE customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal * tax_percent / 100) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal + tax_amount) STORED,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  outstanding_amount NUMERIC(18,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled')),
  payment_terms VARCHAR(20),
  issued_by_id UUID REFERENCES users(id),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Bills
CREATE TABLE vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  bill_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal * tax_percent / 100) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal + tax_amount) STORED,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  outstanding_amount NUMERIC(18,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'verified', 'partial_paid', 'paid', 'overdue', 'cancelled')),
  payment_terms VARCHAR(20),
  received_by_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Notes (khách trả hàng lỗi)
CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_id UUID REFERENCES customer_invoices(id),
  reason TEXT,
  credit_date DATE DEFAULT CURRENT_DATE,
  total_amount NUMERIC(18,2) DEFAULT 0,
  applied_amount NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'applied')),
  description TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debit Notes (trả hàng lỗi cho nhà cung cấp)
CREATE TABLE debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  bill_id UUID REFERENCES vendor_bills(id),
  reason TEXT,
  debit_date DATE DEFAULT CURRENT_DATE,
  total_amount NUMERIC(18,2) DEFAULT 0,
  applied_amount NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'applied')),
  description TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 7: AUTO-BOM (Bill of Materials)
-- ============================================================

-- BOM Packages (gợi ý gói thiết bị)
CREATE TABLE bom_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  package_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  target_property VARCHAR(100),  -- e.g., 'Căn hộ 2PN', 'Nhà phố 3 tầng'
  estimated_area_min NUMERIC(12,2),  -- Diện tích tối thiểu (m2)
  estimated_area_max NUMERIC(12,2),  -- Diện tích tối đa (m2)
  subtotal NUMERIC(18,2) DEFAULT 0,  -- Auto-calculated from components
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOM Components (sản phẩm trong gói)
CREATE TABLE bom_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_package_id UUID NOT NULL REFERENCES bom_packages(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_optional BOOLEAN DEFAULT FALSE,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 8: IoT LIFECYCLE - Device Tracking & Warranty
-- ============================================================

-- MAC/Serial Mapping (thiết bị IoT)
CREATE TABLE mac_serial_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  mac_address VARCHAR(100) UNIQUE,
  imei VARCHAR(100),
  activation_status VARCHAR(30) DEFAULT 'not_activated' CHECK (activation_status IN ('not_activated', 'activated', 'deactivated', 'expired')),
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  warranty_start_date DATE,
  warranty_end_date DATE,
  customer_id UUID REFERENCES customers(id),
  sales_order_id UUID REFERENCES sales_orders(id),
  bin_location_id UUID REFERENCES bin_locations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Registrations (kích hoạt bảo hành)
CREATE TABLE device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES mac_serial_mapping(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registered_by_id UUID REFERENCES users(id),
  installation_address TEXT,
  installation_date DATE,
  installation_technician VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warranty Tracking
CREATE TABLE warranty_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES mac_serial_mapping(id),
  warranty_type VARCHAR(50) DEFAULT 'standard' CHECK (warranty_type IN ('standard', 'extended', 'battery', 'installation')),
  warranty_start_date DATE NOT NULL,
  warranty_end_date DATE NOT NULL,
  warranty_status VARCHAR(20) DEFAULT 'active' CHECK (warranty_status IN ('active', 'expiring_soon', 'expired', 'void')),
  is_active BOOLEAN DEFAULT TRUE,
  coverage_details TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Warranty Alerts (tự động tạo khi hết bảo hành/pin yếu)
CREATE TABLE device_warranty_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES mac_serial_mapping(id),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('warranty_expiring', 'warranty_expired', 'low_battery', 'connection_lost', 'maintenance_due')),
  alert_title VARCHAR(200) NOT NULL,
  alert_message TEXT,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by_id UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  related_crm_lead_id UUID REFERENCES leads(id),  -- Tự sinh đơn hàng CRM chăm sóc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 9: ANALYTICS & AUDIT
-- ============================================================

-- Daily Metrics
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_sales_revenue NUMERIC(18,2) DEFAULT 0,
  total_purchase_cost NUMERIC(18,2) DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  invoices_issued INTEGER DEFAULT 0,
  payments_received NUMERIC(18,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Sales Metrics
CREATE TABLE product_sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  metric_year INTEGER NOT NULL,
  metric_month INTEGER NOT NULL,
  total_quantity_sold NUMERIC(12,3) DEFAULT 0,
  total_revenue NUMERIC(18,2) DEFAULT 0,
  total_profit NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, metric_year, metric_month)
);

-- Customer Metrics
CREATE TABLE customer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  metric_year INTEGER NOT NULL,
  metric_month INTEGER NOT NULL,
  total_spent NUMERIC(18,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, metric_year, metric_month)
);

-- Supplier Metrics
CREATE TABLE supplier_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  metric_year INTEGER NOT NULL,
  metric_month INTEGER NOT NULL,
  total_spent NUMERIC(18,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  on_time_delivery_rate NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, metric_year, metric_month)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_leads_stage ON leads(stage_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_status ON leads(company_name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_customer_invoices_customer ON customer_invoices(customer_id);
CREATE INDEX idx_customer_invoices_status ON customer_invoices(status);
CREATE INDEX idx_vendor_bills_supplier ON vendor_bills(supplier_id);
CREATE INDEX idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX idx_mac_serial_product ON mac_serial_mapping(product_id);
CREATE INDEX idx_mac_serial_customer ON mac_serial_mapping(customer_id);
CREATE INDEX idx_mac_serial_warranty ON mac_serial_mapping(warranty_end_date);
CREATE INDEX idx_warranty_alerts_device ON device_warranty_alerts(device_id);
CREATE INDEX idx_warranty_alerts_status ON device_warranty_alerts(status);
CREATE INDEX idx_warranty_alerts_type ON device_warranty_alerts(alert_type);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_invoices_updated_at BEFORE UPDATE ON customer_invoices FOR EACH ROW EXECUTE TIME BEFORE UPDATE ON customer_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_bills_updated_at BEFORE UPDATE ON vendor_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bin_locations_updated_at BEFORE UPDATE ON bin_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON stock_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mac_serial_mapping_updated_at BEFORE UPDATE ON mac_serial_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranty_tracking_updated_at BEFORE UPDATE ON warranty_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_warranty_alerts_updated_at BEFORE UPDATE ON device_warranty_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Departments
INSERT INTO departments (name, description) VALUES
  ('Ban Giám Đốc', 'CEO và Ban Điều hành'),
  ('Kinh Doanh', 'Phòng Kinh Doanh & Marketing'),
  ('Mua Hàng', 'Phòng Procurement'),
  ('Kho Vận', 'Phòng Kho & Logistics'),
  ('Kế Toán', 'Phòng Kế Toán Tài Chính');

-- Units of Measure
INSERT INTO units_of_measure (name, code) VALUES
  ('Cái', 'pcs'),
  ('Bộ', 'set'),
  ('Mét', 'm'),
  ('Kg', 'kg'),
  ('Lít', 'l'),
  ('Thùng', 'box'),
  ('Cuộn', 'roll');

-- Supplier Types
INSERT INTO supplier_types (name, description) VALUES
  ('Equipment & Product Suppliers', 'Nhà cung cấp thiết bị và sản phẩm'),
  ('Component & Part Suppliers', 'Nhà cung cấp linh kiện và phụ tùng'),
  ('Logistics & Transportation', 'Đơn vị vận chuyển và logistics'),
  ('Service Providers', 'Nhà cung cấp dịch vụ'),
  ('Maintenance & Repair Services', 'Dịch vụ bảo trì và sửa chữa');

-- Product Categories
INSERT INTO product_categories (name, parent_id, display_order, description) VALUES
  ('Camera', NULL, 1, 'Camera an ninh và giám sát'),
  ('Sensor', NULL, 2, 'Cảm biến thông minh'),
  ('Robot', NULL, 3, 'Robot hút bụi và lau nhà'),
  ('Smart Lock', NULL, 4, 'Khóa cửa thông minh'),
  ('Hub & Gateway', NULL, 5, 'Bộ điều khiển trung tâm'),
  ('Switch & Socket', NULL, 6, 'Công tắc và ổ cắm thông minh'),
  ('Lighting', NULL, 7, 'Đèn chiếu sáng thông minh'),
  ('Accessory', NULL, 8, 'Phụ kiện SmartHome'),
  ('IP Camera', 'Camera', 10, 'Camera IP'),
  ('Dome Camera', 'Camera', 11, 'Camera trần'),
  ('PTZ Camera', 'Camera', 12, 'Camera xoay PTZ'),
  ('Motion Sensor', 'Sensor', 20, 'Cảm biến chuyển động'),
  ('Door/Window Sensor', 'Sensor', 21, 'Cảm biến cửa'),
  ('Temperature Sensor', 'Sensor', 22, 'Cảm biến nhiệt độ');

-- Warehouses (3 kho lớn)
INSERT INTO warehouses (warehouse_code, name, city, province, capacity_sqm, status) VALUES
  ('WH-HN', 'Kho Hà Nội', 'Hà Nội', 'Hà Nội', 500, 'active'),
  ('WH-HCM', 'Kho TP.HCM', 'TP. Hồ Chí Minh', 'TP.HCM', 600, 'active'),
  ('WH-BH', 'Kho Bảo Hành', 'Hà Nội', 'Hà Nội', 100, 'active');

-- Warehouse Zones for each warehouse
INSERT INTO warehouse_zones (warehouse_id, zone_code, zone_name) VALUES
  ((SELECT id FROM warehouses WHERE warehouse_code='WH-HN'), 'A', 'Khu vực A - Camera'),
  ((SELECT id FROM warehouses WHERE warehouse_code='WH-HN'), 'B', 'Khu vực B - Robot'),
  ((SELECT id FROM warehouses WHERE warehouse_code='WH-HN'), 'C', 'Khu vực C - Phụ kiện'),
  ((SELECT id FROM warehouses WHERE warehouse_code='WH-HCM'), 'A', 'Khu vực A - Camera'),
  ((SELECT id FROM warehouses WHERE warehouse_code='WH-HCM'), 'B', 'Khu vực B - Robot'),
  ((SELECT id FROM warehouses WHERE warehouse_code='WH-HCM'), 'C', 'Khu vực C - Phụ kiện'),
  ((SELECT id FROM warehouses WHERE warehouse_code='WH-BH'), 'A', 'Khu vực A - Bảo hành');

-- Bin Locations (30 bins per warehouse)
INSERT INTO bin_locations (warehouse_id, zone_id, bin_code, capacity_units)
SELECT 
  w.id,
  wz.id,
  wz.zone_code || '-' || LPAD(gs::text, 2, '0'),
  50
FROM warehouses w
JOIN warehouse_zones wz ON wz.warehouse_id = w.id
CROSS JOIN generate_series(1, 10) AS gs;

-- Accounts (Chart of Accounts)
INSERT INTO accounts (account_code, account_name, account_type) VALUES
  ('1000', 'Tiền mặt', 'asset'),
  ('1100', 'Ngân hàng', 'asset'),
  ('1200', 'Phải thu khách hàng', 'asset'),
  ('1300', 'Hàng tồn kho', 'asset'),
  ('1400', 'Tài sản cố định', 'asset'),
  ('2000', 'Phải trả người bán', 'liability'),
  ('2100', 'Vay ngắn hạn', 'liability'),
  ('2200', 'Thuế phải nộp', 'liability'),
  ('3000', 'Vốn góp', 'equity'),
  ('3100', 'Lợi nhuận chưa phân phối', 'equity'),
  ('4000', 'Doanh thu bán hàng', 'revenue'),
  ('4100', 'Doanh thu dịch vụ', 'revenue'),
  ('5000', 'Giá vốn hàng bán', 'expense'),
  ('5100', 'Chi phí bán hàng', 'expense'),
  ('5200', 'Chi phí quản lý', 'expense');

-- Sample Products
INSERT INTO products (sku, name, category_id, uom_id, list_price, cost_price, is_iot_device, requires_serial_scan, status, description)
SELECT 
  p.sku,
  p.name,
  c.id,
  u.id,
  p.list_price,
  p.cost_price,
  p.is_iot,
  p.is_iot,
  'active',
  p.description
FROM (
  VALUES
    ('CAM-IP-001', 'Camera IP 2MP - HIKVISION', NULL, NULL, 1500000, 900000, TRUE, TRUE, 'Camera IP 2MP, hồng ngoại 30m'),
    ('CAM-IP-002', 'Camera IP 4MP - HIKVISION', NULL, NULL, 2200000, 1400000, TRUE, TRUE, 'Camera IP 4MP, WDR'),
    ('CAM-DOME-001', 'Camera Dome 2MP - DAHUA', NULL, NULL, 1300000, 780000, TRUE, TRUE, 'Camera dome trong nhà 2MP'),
    ('CAM-PTZ-001', 'Camera PTZ 5MP - HIKVISION', NULL, NULL, 4500000, 3000000, TRUE, TRUE, 'Camera xoay 5MP, zoom 30x'),
    ('SEN-MOT-001', 'Cảm biến chuyển động PIR', NULL, NULL, 250000, 120000, TRUE, FALSE, 'Cảm biến PIR phát hiện chuyển động'),
    ('SEN-DRW-001', 'Cảm biến cửa/đ window', NULL, NULL, 180000, 90000, TRUE, FALSE, 'Cảm biến từ cho cửa'),
    ('SEN-TEMP-001', 'Cảm biến nhiệt độ & độ ẩm', NULL, NULL, 350000, 180000, TRUE, FALSE, 'Cảm biến đa chức năng'),
    ('ROB-VAC-001', 'Robot hút bụi Roborock S7', NULL, NULL, 8500000, 5500000, TRUE, TRUE, 'Robot hút bụi và lau nhà'),
    ('ROB-VAC-002', 'Robot hút bụi Dreame D9', NULL, NULL, 7200000, 4600000, TRUE, TRUE, 'Robot hút bụi LDS navigation'),
    ('SLO-CT-001', 'Khóa cửa thông minh - Yale', NULL, NULL, 4500000, 2800000, TRUE, TRUE, 'Khóa cửa vân tay, mật mã'),
    ('SLO-CT-002', 'Khóa cửa thông minh - Samsung', NULL, NULL, 5200000, 3300000, TRUE, TRUE, 'Khóa cửa thông minh Samsung'),
    ('HUB-001', 'Hub điều khiển SmartHome', NULL, NULL, 1800000, 1100000, TRUE, FALSE, 'Gateway trung tâm Zigbee'),
    ('HUB-002', 'Hub điều khiển WiFi Mesh', NULL, NULL, 2200000, 1400000, TRUE, FALSE, 'Hub WiFi mesh 3-band'),
    ('SW-001', 'Công tắc thông minh 1 nút', NULL, NULL, 380000, 200000, FALSE, FALSE, 'Công tắc WiFi 1 nút'),
    ('SW-002', 'Công tắc thông minh 2 nút', NULL, NULL, 480000, 260000, FALSE, FALSE, 'Công tắc WiFi 2 nút'),
    ('SOC-001', 'Ổ cắm thông minh WiFi', NULL, NULL, 280000, 150000, FALSE, FALSE, 'Ổ cắm có đo điện năng'),
    ('LIGHT-001', 'Bóng đèn thông minh RGB', NULL, NULL, 220000, 120000, FALSE, FALSE, 'Bóng LED RGB WiFi'),
    ('LIGHT-002', 'Đèn n墙 thông minh LED', NULL, NULL, 450000, 250000, FALSE, FALSE, 'Đèn LED strip WiFi 5m'),
    ('ACC-CAB-001', 'Dây cáp mạng CAT6 (100m)', NULL, NULL, 1200000, 800000, FALSE, FALSE, 'Cable CAT6 cho camera IP'),
    ('ACC-POE-001', 'Switch PoE 8 port', NULL, NULL, 1800000, 1100000, FALSE, FALSE, 'Switch PoE 8 port, 120W')
) p(sku, name, list_price, cost_price, is_iot, description)
JOIN product_categories c ON c.name = SPLIT_PART(p.name, ' ', 1) AND c.parent_id IS NULL
JOIN units_of_measure u ON u.code = 'pcs'
WHERE c.name IN ('Camera', 'Sensor', 'Robot', 'Smart Lock', 'Hub & Gateway', 'Switch & Socket', 'Lighting', 'Accessory');

-- Fallback: insert products with NULL category if category not found
INSERT INTO products (sku, name, uom_id, list_price, cost_price, is_iot_device, requires_serial_scan, status, description)
SELECT 
  p.sku,
  p.name,
  u.id,
  p.list_price,
  p.cost_price,
  p.is_iot,
  p.is_iot,
  'active',
  p.description
FROM (
  VALUES
    ('CAM-IP-001', 'Camera IP 2MP - HIKVISION', 1500000, 900000, TRUE, 'Camera IP 2MP, hồng ngoại 30m'),
    ('CAM-IP-002', 'Camera IP 4MP - HIKVISION', 2200000, 1400000, TRUE, 'Camera IP 4MP, WDR'),
    ('CAM-DOME-001', 'Camera Dome 2MP - DAHUA', 1300000, 780000, TRUE, 'Camera dome trong nhà 2MP'),
    ('SEN-MOT-001', 'Cảm biến chuyển động PIR', 250000, 120000, TRUE, 'Cảm biến PIR phát hiện chuyển động'),
    ('SEN-DRW-001', 'Cảm biến cửa/đ window', 180000, 90000, TRUE, 'Cảm biến từ cho cửa'),
    ('ROB-VAC-001', 'Robot hút bụi Roborock S7', 8500000, 5500000, TRUE, 'Robot hút bụi và lau nhà'),
    ('SLO-CT-001', 'Khóa cửa thông minh - Yale', 4500000, 2800000, TRUE, 'Khóa cửa vân tay, mật mã'),
    ('SLO-CT-002', 'Khóa cửa thông minh - Samsung', 5200000, 3300000, TRUE, 'Khóa cửa thông minh Samsung'),
    ('HUB-001', 'Hub điều khiển SmartHome', 1800000, 1100000, TRUE, 'Gateway trung tâm Zigbee'),
    ('SW-001', 'Công tắc thông minh 1 nút', 380000, 200000, FALSE, 'Công tắc WiFi 1 nút'),
    ('SW-002', 'Công tắc thông minh 2 nút', 480000, 260000, FALSE, 'Công tắc WiFi 2 nút'),
    ('SOC-001', 'Ổ cắm thông minh WiFi', 280000, 150000, FALSE, 'Ổ cắm có đo điện năng'),
    ('LIGHT-001', 'Bóng đèn thông minh RGB', 220000, 120000, FALSE, 'Bóng LED RGB WiFi'),
    ('ACC-CAB-001', 'Dây cáp mạng CAT6 (100m)', 1200000, 800000, FALSE, 'Cable CAT6 cho camera IP'),
    ('ACC-POE-001', 'Switch PoE 8 port', 1800000, 1100000, FALSE, 'Switch PoE 8 port, 120W')
) p(sku, name, list_price, cost_price, is_iot, description)
JOIN units_of_measure u ON u.code = 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = p.sku);

-- Users (5 người dùng)
INSERT INTO users (email, password_hash, full_name, department_id, role, status) VALUES
  ('admin@novatech.vn', '123456', 'Nguyễn Văn Sếp', (SELECT id FROM departments WHERE name='Ban Giám Đốc'), 'CEO', 'active'),
  ('sales@novatech.vn', '123456', 'Trần Thị Sales', (SELECT id FROM departments WHERE name='Kinh Doanh'), 'Sales_Manager', 'active'),
  ('purchase@novatech.vn', '123456', 'Lê Văn Mua', (SELECT id FROM departments WHERE name='Mua Hàng'), 'Purchasing_Manager', 'active'),
  ('warehouse@novatech.vn', '123456', 'Phạm Thị Kho', (SELECT id FROM departments WHERE name='Kho Vận'), 'Warehouse_Manager', 'active'),
  ('accountant@novatech.vn', '123456', 'Hoàng Văn Kế', (SELECT id FROM departments WHERE name='Kế Toán'), 'Accountant', 'active');

-- Sample Customers
INSERT INTO customers (name, customer_type, contact_person_name, contact_person_email, contact_person_phone, billing_address, payment_terms, status) VALUES
  ('Công ty TNHH ABC', 'B2B', 'Nguyễn A', 'contact@abc.vn', '0901234567', '123 Đường ABC, Quận 1, TP.HCM', 'NET30', 'active'),
  ('Nguyễn Văn Khách', 'B2C', 'Nguyễn Văn Khách', 'khach@gmail.com', '0902345678', '456 Đường XYZ, Ba Đình, Hà Nội', 'COD', 'active'),
  ('Công ty CP XYZ', 'B2B', 'Trần B', 'info@xyz.com.vn', '0903456789', '789 Đường XYZ, Cầu Giấy, Hà Nội', 'NET45', 'active'),
  ('Chị Lan B', 'B2C', 'Lan B', 'lanb@gmail.com', '0904567890', '101 Đường 123, Thủ Đức, TP.HCM', 'Prepaid', 'active'),
  ('Công ty TNHH SmartHome Pro', 'B2B', 'Kỹ Sư Minh', 'minh@smarthomepro.vn', '0905678901', '202 Đường Smart, Tân Bình, TP.HCM', 'NET30', 'active');

-- Sample Suppliers
INSERT INTO suppliers (name, supplier_type_id, contact_person_name, contact_person_email, contact_person_phone, company_city, payment_terms, is_preferred, status) VALUES
  ('HIKVISION Vietnam', (SELECT id FROM supplier_types WHERE name='Equipment & Product Suppliers'), 'Mr. Tuấn', 'tuan@hikvision.vn', '02812345678', 'TP.HCM', 'NET30', TRUE, 'active'),
  ('DAHUA Technology', (SELECT id FROM supplier_types WHERE name='Equipment & Product Suppliers'), 'Ms. Lan', 'lan@dahuatech.vn', '02823456789', 'TP.HCM', 'NET30', TRUE, 'active'),
  ('Roborock Vietnam', (SELECT id FROM supplier_types WHERE name='Equipment & Product Suppliers'), 'Mr. Hùng', 'hung@roborock.vn', '02834567890', 'TP.HCM', 'NET45', TRUE, 'active'),
  ('Viettel Logistics', (SELECT id FROM supplier_types WHERE name='Logistics & Transportation'), 'Mr. Phong', 'phong@viettel-logistics.vn', '02456789012', 'Hà Nội', 'NET30', FALSE, 'active'),
  ('GHN Express', (SELECT id FROM supplier_types WHERE name='Logistics & Transportation'), 'Ms. Hương', 'huong@ghn.vn', '02876543210', 'TP.HCM', 'COD', FALSE, 'active');

-- BOM Packages (Auto-BOM gợi ý gói thiết bị)
INSERT INTO bom_packages (name, package_code, target_property, estimated_area_min, estimated_area_max, subtotal, description) VALUES
  ('Gói Căn hộ 1PN', 'PKG-APT-1BR', 'Căn hộ 1 phòng ngủ', 40, 60, 8500000, 'Gói đầy đủ cho căn hộ 1PN: camera, cảm biến, công tắc, hub'),
  ('Gói Căn hộ 2PN', 'PKG-APT-2BR', 'Căn hộ 2 phòng ngủ', 60, 90, 15500000, 'Gói đầy đủ cho căn hộ 2PN: camera, cảm biến, công tắc, hub, robot hút bụi'),
  ('Gói Căn hộ 3PN', 'PKG-APT-3BR', 'Căn hộ 3 phòng ngủ', 90, 130, 22000000, 'Gói đầy đủ cho căn hộ 3PN+'),
  ('Gói Nhà phố', 'PKG-HSE-TN', 'Nhà phố 3-4 tầng', 150, 300, 35000000, 'Gói đầy đủ cho nhà phố: nhiều camera, nhiều cảm biến, khóa thông minh'),
  ('Gói Biệt thự', 'PKG-VIL-LX', 'Biệt thự', 300, 1000, 65000000, 'Gói cao cấp cho biệt thự: hệ thống camera chuyên nghiệp, full cảm biến, robot');

-- BOM Components
INSERT INTO bom_components (bom_package_id, product_name, quantity, unit_price, is_optional)
SELECT 
  bp.id,
  p.name,
  1,
  p.list_price,
  FALSE
FROM bom_packages bp
CROSS JOIN LATERAL (
  VALUES 
    ('PKG-APT-1BR', 'Camera IP 2MP - HIKVISION', 1),
    ('PKG-APT-1BR', 'Cảm biến chuyển động PIR', 2),
    ('PKG-APT-1BR', 'Cảm biến cửa/đ window', 1),
    ('PKG-APT-1BR', 'Hub điều khiển SmartHome', 1),
    ('PKG-APT-1BR', 'Công tắc thông minh 1 nút', 3),
    ('PKG-APT-1BR', 'Công tắc thông minh 2 nút', 2),
    ('PKG-APT-2BR', 'Camera IP 2MP - HIKVISION', 2),
    ('PKG-APT-2BR', 'Camera Dome 2MP - DAHUA', 1),
    ('PKG-APT-2BR', 'Cảm biến chuyển động PIR', 3),
    ('PKG-APT-2BR', 'Cảm biến cửa/đ window', 2),
    ('PKG-APT-2BR', 'Hub điều khiển SmartHome', 1),
    ('PKG-APT-2BR', 'Công tắc thông minh 1 nút', 4),
    ('PKG-APT-2BR', 'Công tắc thông minh 2 nút', 3),
    ('PKG-APT-2BR', 'Robot hút bụi Roborock S7', 1)
) AS pkg(product_code, product_name, qty)
JOIN products p ON p.name = pkg.product_name
WHERE bp.package_code = pkg.product_code;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE mac_serial_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_warranty_alerts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write their own records
-- (Supabase will handle auth via JWT tokens)

-- ============================================================
-- DONE!
-- ============================================================
SELECT 'Migration completed successfully! NovaTech ERP v2.0 schema created.' AS status;
