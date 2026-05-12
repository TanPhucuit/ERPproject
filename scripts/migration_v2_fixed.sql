-- ============================================================================
-- NOVATECH ERP - MIGRATION SCRIPT v2.1 (FIXED)
-- Complete rebuild: drop old -> create new -> add triggers -> seed
-- Run this in Supabase SQL Editor (sequential execution)
-- Last updated: 2026-05-12
-- ============================================================================

-- STEP 0: Drop all existing tables (to start clean)
DROP TABLE IF EXISTS device_warranty_alerts CASCADE;
DROP TABLE IF EXISTS warranty_tracking CASCADE;
DROP TABLE IF EXISTS device_registrations CASCADE;
DROP TABLE IF EXISTS mac_serial_mapping CASCADE;
DROP TABLE IF EXISTS bom_components CASCADE;
DROP TABLE IF EXISTS bom_packages CASCADE;
DROP TABLE IF EXISTS stock_in_bins CASCADE;
DROP TABLE IF EXISTS stock_transfer_lines CASCADE;
DROP TABLE IF EXISTS stock_transfers CASCADE;
DROP TABLE IF EXISTS bin_locations CASCADE;
DROP TABLE IF EXISTS stock_levels CASCADE;
DROP TABLE IF EXISTS inventory_adjustment_lines CASCADE;
DROP TABLE IF EXISTS inventory_adjustments CASCADE;
DROP TABLE IF EXISTS goods_receipt_lines CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS delivery_order_lines CASCADE;
DROP TABLE IF EXISTS delivery_orders CASCADE;
DROP TABLE IF EXISTS carriers CASCADE;
DROP TABLE IF EXISTS warehouse_zones CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS credit_notes CASCADE;
DROP TABLE IF EXISTS debit_notes CASCADE;
DROP TABLE IF EXISTS vendor_bill_lines CASCADE;
DROP TABLE IF EXISTS vendor_bills CASCADE;
DROP TABLE IF EXISTS customer_invoice_lines CASCADE;
DROP TABLE IF EXISTS customer_invoices CASCADE;
DROP TABLE IF EXISTS customer_payments CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
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
DROP TABLE IF EXISTS lead_products CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS activity_types CASCADE;
DROP TABLE IF EXISTS lead_stages CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS supplier_types CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS units_of_measure CASCADE;
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

-- ============================================================================
-- TIER 0: REFERENCE TABLES
-- ============================================================================

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  code VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  probability_percent INTEGER DEFAULT 0,
  is_won BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(30) CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 1: MASTER DATA
-- ============================================================================

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
  profit_margin_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN list_price > 0 THEN ((list_price - cost_price) / list_price * 100) ELSE 0 END
  ) STORED,
  physical_size_sqm NUMERIC(10,4) DEFAULT 1.0,
  reorder_level INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  supplier_lead_time_days INTEGER DEFAULT 7,
  is_iot_device BOOLEAN DEFAULT FALSE,
  requires_serial_scan BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'prototype')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  credit_used NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  is_preferred BOOLEAN DEFAULT FALSE,
  total_spent NUMERIC(18,2) DEFAULT 0,
  average_response_time_hours NUMERIC(10,2),
  quality_rating NUMERIC(3,2) DEFAULT 5.0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  zone_code VARCHAR(10) NOT NULL,
  zone_name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  bin_location_id UUID REFERENCES bin_locations(id),
  quantity_on_hand NUMERIC(12,3) DEFAULT 0,
  quantity_reserved NUMERIC(12,3) DEFAULT 0,
  quantity_available NUMERIC(12,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  quantity_in_transit NUMERIC(12,3) DEFAULT 0,
  reorder_status VARCHAR(20) DEFAULT 'optimal' CHECK (reorder_status IN ('optimal', 'understocked', 'overstocked', 'critical', 'out_of_stock')),
  last_counted_at TIMESTAMPTZ,
  last_adjusted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id, bin_location_id)
);

CREATE TABLE stock_in_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  bin_location_id UUID NOT NULL REFERENCES bin_locations(id),
  quantity NUMERIC(12,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 2: CRM
-- ============================================================================

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
  customer_id UUID REFERENCES customers(id),
  estimated_value NUMERIC(18,2) DEFAULT 0,
  probability_percent INTEGER DEFAULT 50,
  expected_close_date DATE,
  notes TEXT,
  customer_type VARCHAR(10),
  billing_address TEXT,
  shipping_address TEXT,
  tax_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  activity_type_id UUID REFERENCES activity_types(id),
  description TEXT NOT NULL,
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  performed_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 3: SALES
-- ============================================================================

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  issued_date DATE DEFAULT CURRENT_DATE,
  valid_until_date DATE,
  sales_person_id UUID REFERENCES users(id),
  subtotal NUMERIC(18,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal - subtotal * discount_percent / 100 + subtotal * tax_percent / 100) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  internal_notes TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  discount_amount NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal - subtotal * discount_percent / 100 + subtotal * tax_percent / 100) STORED,
  total_cost NUMERIC(18,2) DEFAULT 0,
  estimated_profit NUMERIC(18,2) GENERATED ALWAYS AS (subtotal - subtotal * discount_percent / 100 + subtotal * tax_percent / 100 - total_cost) STORED,
  profit_margin_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN (subtotal - subtotal * discount_percent / 100 + subtotal * tax_percent / 100) != 0
    THEN ((subtotal - subtotal * discount_percent / 100 + subtotal * tax_percent / 100 - total_cost) /
          (subtotal - subtotal * discount_percent / 100 + subtotal * tax_percent / 100) * 100)
    ELSE 0 END
  ) STORED,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partially_shipped', 'shipped', 'delivered', 'cancelled')),
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================================================
-- TIER 3: PURCHASE
-- ============================================================================

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

CREATE TABLE rfq_supplier_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_line_id UUID NOT NULL REFERENCES rfq_lines(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  quoted_price NUMERIC(18,2),
  quoted_lead_time_days INTEGER,
  valid_until_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal + subtotal * tax_percent / 100) STORED,
  received_amount NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partial_received', 'received', 'cancelled')),
  created_by_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================================================
-- TIER 3: INVENTORY DELIVERY & RECEIPT
-- ============================================================================

CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  contact_phone VARCHAR(50),
  tracking_url_template TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE delivery_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  sales_order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  bin_location_id UUID REFERENCES bin_locations(id),
  quantity_ordered NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_delivered NUMERIC(12,3) DEFAULT 0,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id UUID REFERENCES purchase_order_lines(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  bin_location_id UUID REFERENCES bin_locations(id),
  quantity_expected NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_received NUMERIC(12,3) DEFAULT 0,
  quantity_accepted NUMERIC(12,3) DEFAULT 0,
  quantity_rejected NUMERIC(12,3) DEFAULT 0,
  unit_cost NUMERIC(18,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity_received * unit_cost) STORED,
  requires_serial_scan BOOLEAN DEFAULT FALSE,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  approved_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_adjustment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  bin_location_id UUID REFERENCES bin_locations(id),
  quantity_before NUMERIC(12,3) DEFAULT 0,
  quantity_after NUMERIC(12,3) DEFAULT 0,
  variance NUMERIC(12,3) GENERATED ALWAYS AS (quantity_after - quantity_before) STORED,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STOCK TRANSFER (between warehouses or bins)
-- Transfer flow: draft -> validated -> done
-- When validated: stock moves from source bin to destination bin
-- ============================================================================

CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  source_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  dest_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'done', 'cancelled')),
  transfer_date DATE DEFAULT CURRENT_DATE,
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(255),
  from_bin_location_id UUID REFERENCES bin_locations(id),
  to_bin_location_id UUID REFERENCES bin_locations(id),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 4: ACCOUNTING
-- ============================================================================

CREATE TABLE customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal + subtotal * tax_percent / 100) STORED,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  outstanding_amount NUMERIC(18,2) GENERATED ALWAYS AS ((subtotal + subtotal * tax_percent / 100) - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled')),
  payment_terms VARCHAR(20),
  issued_by_id UUID REFERENCES users(id),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
  sales_order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity NUMERIC(12,3) DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  bill_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (subtotal + subtotal * tax_percent / 100) STORED,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  outstanding_amount NUMERIC(18,2) GENERATED ALWAYS AS ((subtotal + subtotal * tax_percent / 100) - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'verified', 'partial_paid', 'paid', 'overdue', 'cancelled')),
  payment_terms VARCHAR(20),
  received_by_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  purchase_order_line_id UUID REFERENCES purchase_order_lines(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity NUMERIC(12,3) DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_id UUID REFERENCES customer_invoices(id),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  reference VARCHAR(100),
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  bill_id UUID REFERENCES vendor_bills(id),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  reference VARCHAR(100),
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 2-3: IoT DEVICE TRACKING
-- ============================================================================

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
  warehouse_id UUID REFERENCES warehouses(id),
  bin_location_id UUID REFERENCES bin_locations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  related_crm_lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIER 5: ANALYTICS & AUDIT
-- ============================================================================

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

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_leads_stage ON leads(stage_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX idx_stock_in_bins_product ON stock_in_bins(product_id);
CREATE INDEX idx_stock_in_bins_bin ON stock_in_bins(bin_location_id);
CREATE INDEX idx_stock_transfers_source ON stock_transfers(source_warehouse_id);
CREATE INDEX idx_stock_transfers_dest ON stock_transfers(dest_warehouse_id);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX idx_stock_transfer_lines_transfer ON stock_transfer_lines(transfer_id);
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
CREATE INDEX idx_rfq_lines_rfq ON rfq_lines(rfq_id);
CREATE INDEX idx_rfq_supplier_quotations_line ON rfq_supplier_quotations(rfq_line_id);
CREATE INDEX idx_rfq_supplier_quotations_supplier ON rfq_supplier_quotations(supplier_id);

-- ============================================================================
-- AUTO-UPDATED_AT TRIGGER
-- ============================================================================

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
CREATE TRIGGER update_customer_invoices_updated_at BEFORE UPDATE ON customer_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_bills_updated_at BEFORE UPDATE ON vendor_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bin_locations_updated_at BEFORE UPDATE ON bin_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON stock_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_in_bins_updated_at BEFORE UPDATE ON stock_in_bins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON stock_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_transfer_lines_updated_at BEFORE UPDATE ON stock_transfer_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goods_receipts_updated_at BEFORE UPDATE ON goods_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mac_serial_mapping_updated_at BEFORE UPDATE ON mac_serial_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranty_tracking_updated_at BEFORE UPDATE ON warranty_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_warranty_alerts_updated_at BEFORE UPDATE ON device_warranty_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-CALCULATION TRIGGERS
-- ============================================================================

-- Trigger 1: Bin occupancy = SUM(stock_in_bins.quantity)
CREATE OR REPLACE FUNCTION recalc_bin_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bin_locations
    SET current_occupancy_units = (
      SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins WHERE bin_location_id = NEW.bin_location_id
    )
    WHERE id = NEW.bin_location_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE bin_locations
    SET current_occupancy_units = (
      SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins WHERE bin_location_id = NEW.bin_location_id
    )
    WHERE id = NEW.bin_location_id;
    IF OLD.bin_location_id != NEW.bin_location_id THEN
      UPDATE bin_locations
      SET current_occupancy_units = (
        SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins WHERE bin_location_id = OLD.bin_location_id
      )
      WHERE id = OLD.bin_location_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bin_locations
    SET current_occupancy_units = (
      SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins WHERE bin_location_id = OLD.bin_location_id
    )
    WHERE id = OLD.bin_location_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_bin_occupancy ON stock_in_bins;
CREATE TRIGGER trigger_recalc_bin_occupancy
AFTER INSERT OR UPDATE OR DELETE ON stock_in_bins
FOR EACH ROW EXECUTE FUNCTION recalc_bin_occupancy();

-- Trigger 2: Warehouse occupancy = SUM(bin.current_occupancy_units * product.physical_size_sqm)
CREATE OR REPLACE FUNCTION recalc_warehouse_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  v_warehouse_id := COALESCE(NEW.warehouse_id, OLD.warehouse_id);
  UPDATE warehouses
  SET current_occupancy_sqm = (
    SELECT COALESCE(SUM(COALESCE(sib.quantity, 0) * COALESCE(p.physical_size_sqm, 1.0)), 0)
    FROM stock_in_bins sib
    JOIN bin_locations bl ON sib.bin_location_id = bl.id
    LEFT JOIN products p ON sib.product_id = p.id
    WHERE bl.warehouse_id = v_warehouse_id
  )
  WHERE id = v_warehouse_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_warehouse_occupancy_bin ON bin_locations;
CREATE TRIGGER trigger_recalc_warehouse_occupancy_bin
AFTER INSERT OR UPDATE OR DELETE ON bin_locations
FOR EACH ROW EXECUTE FUNCTION recalc_warehouse_occupancy();

DROP TRIGGER IF EXISTS trigger_recalc_warehouse_occupancy_stock ON stock_in_bins;
CREATE TRIGGER trigger_recalc_warehouse_occupancy_stock
AFTER INSERT OR UPDATE OR DELETE ON stock_in_bins
FOR EACH ROW EXECUTE FUNCTION recalc_warehouse_occupancy();

-- Trigger 3: Stock reorder_status from quantity_on_hand vs product.reorder_level
CREATE OR REPLACE FUNCTION recalc_stock_reorder_status()
RETURNS TRIGGER AS $$
DECLARE
  v_reorder_level INTEGER;
BEGIN
  SELECT reorder_level INTO v_reorder_level FROM products WHERE id = NEW.product_id;
  IF v_reorder_level IS NULL THEN v_reorder_level := 10; END IF;
  NEW.reorder_status := CASE
    WHEN NEW.quantity_on_hand <= 0 THEN 'out_of_stock'
    WHEN v_reorder_level > 0 AND NEW.quantity_on_hand < v_reorder_level THEN 'understocked'
    WHEN v_reorder_level > 0 AND NEW.quantity_on_hand < (v_reorder_level * 0.5) THEN 'critical'
    WHEN v_reorder_level > 0 AND NEW.quantity_on_hand > (v_reorder_level * 3) THEN 'overstocked'
    ELSE 'optimal'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_stock_reorder_status ON stock_levels;
CREATE TRIGGER trigger_recalc_stock_reorder_status
BEFORE INSERT OR UPDATE ON stock_levels
FOR EACH ROW EXECUTE FUNCTION recalc_stock_reorder_status();

-- Trigger 4: Customer credit_used from unpaid invoices
CREATE OR REPLACE FUNCTION recalc_customer_credit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET credit_used = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM customer_invoices
      WHERE customer_id = NEW.customer_id
        AND status NOT IN ('cancelled', 'paid')
    )
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL THEN
    UPDATE customers
    SET credit_used = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM customer_invoices
      WHERE customer_id = OLD.customer_id
        AND status NOT IN ('cancelled', 'paid')
    )
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_customer_credit_invoice ON customer_invoices;
CREATE TRIGGER trigger_recalc_customer_credit_invoice
AFTER INSERT OR UPDATE OR DELETE ON customer_invoices
FOR EACH ROW EXECUTE FUNCTION recalc_customer_credit();

DROP TRIGGER IF EXISTS trigger_recalc_customer_credit_payment ON customer_payments;
CREATE TRIGGER trigger_recalc_customer_credit_payment
AFTER INSERT OR UPDATE OR DELETE ON customer_payments
FOR EACH ROW EXECUTE FUNCTION recalc_customer_credit();

-- Trigger 5: Supplier total_spent from paid bills
CREATE OR REPLACE FUNCTION recalc_supplier_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET total_spent = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM vendor_bills
      WHERE supplier_id = NEW.supplier_id
        AND status IN ('received', 'verified', 'partial_paid', 'paid')
    )
    WHERE id = NEW.supplier_id;
  ELSIF TG_OP = 'DELETE' AND OLD.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET total_spent = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM vendor_bills
      WHERE supplier_id = OLD.supplier_id
        AND status IN ('received', 'verified', 'partial_paid', 'paid')
    )
    WHERE id = OLD.supplier_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_supplier_total_spent ON vendor_bills;
CREATE TRIGGER trigger_recalc_supplier_total_spent
AFTER INSERT OR UPDATE OR DELETE ON vendor_bills
FOR EACH ROW EXECUTE FUNCTION recalc_supplier_total_spent();

-- Trigger 6: Supplier average_response_time_hours from RFQ responses
CREATE OR REPLACE FUNCTION recalc_supplier_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET average_response_time_hours = (
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (rsq.created_at - rfq.issued_date)) / 3600), 0
      )
      FROM rfq_supplier_quotations rsq
      JOIN rfq_lines rfl ON rsq.rfq_line_id = rfl.id
      JOIN rfqs rfq ON rfl.rfq_id = rfq.id
      WHERE rsq.supplier_id = NEW.supplier_id
    )
    WHERE id = NEW.supplier_id;
  ELSIF TG_OP = 'DELETE' AND OLD.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET average_response_time_hours = (
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (rsq.created_at - rfq.issued_date)) / 3600), 0
      )
      FROM rfq_supplier_quotations rsq
      JOIN rfq_lines rfl ON rsq.rfq_line_id = rfl.id
      JOIN rfqs rfq ON rfl.rfq_id = rfq.id
      WHERE rsq.supplier_id = OLD.supplier_id
    )
    WHERE id = OLD.supplier_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_supplier_response_time ON rfq_supplier_quotations;
CREATE TRIGGER trigger_recalc_supplier_response_time
AFTER INSERT OR UPDATE OR DELETE ON rfq_supplier_quotations
FOR EACH ROW EXECUTE FUNCTION recalc_supplier_response_time();

-- Trigger 7: Supplier quality_rating from goods_receipt_lines defect rate
CREATE OR REPLACE FUNCTION recalc_supplier_quality_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_id UUID;
BEGIN
  SELECT gr.purchase_order_id INTO v_supplier_id
  FROM goods_receipts gr
  WHERE gr.id = COALESCE(NEW.goods_receipt_id, OLD.goods_receipt_id);
  IF v_supplier_id IS NOT NULL THEN
    UPDATE suppliers s
    SET quality_rating = GREATEST(0, LEAST(5,
      5.0 - (
        SELECT COALESCE(
          CASE WHEN SUM(grl2.quantity_expected) > 0
          THEN (SUM(grl2.quantity_rejected) * 100.0 / SUM(grl2.quantity_expected))
          ELSE 0 END, 0
        )
        FROM goods_receipt_lines grl2
        JOIN goods_receipts gr2 ON grl2.goods_receipt_id = gr2.id
        JOIN purchase_orders po ON gr2.purchase_order_id = po.id
        WHERE po.supplier_id = (SELECT supplier_id FROM purchase_orders WHERE id = v_supplier_id)
      )
    ))
    WHERE id = (SELECT supplier_id FROM purchase_orders WHERE id = v_supplier_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_supplier_quality ON goods_receipt_lines;
CREATE TRIGGER trigger_recalc_supplier_quality
AFTER INSERT OR UPDATE OR DELETE ON goods_receipt_lines
FOR EACH ROW EXECUTE FUNCTION recalc_supplier_quality_rating();

-- ============================================================================
-- STOCK RESERVATION & MOVEMENT TRIGGERS
-- ============================================================================

-- Trigger 8: Reserve stock when Sales Order is CONFIRMED
-- quantity_reserved in stock_levels increases by SO line quantity
CREATE OR REPLACE FUNCTION reserve_stock_on_so_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    SELECT warehouse_id INTO v_warehouse_id
    FROM delivery_orders
    WHERE sales_order_id = NEW.id
    LIMIT 1;

    IF v_warehouse_id IS NOT NULL THEN
      INSERT INTO stock_levels (product_id, warehouse_id, bin_location_id, quantity_on_hand, quantity_reserved)
      SELECT sqli.product_id, v_warehouse_id, NULL::UUID, 0, sqli.quantity
      FROM sales_order_lines sqli
      WHERE sqli.sales_order_id = NEW.id
      ON CONFLICT (product_id, warehouse_id, bin_location_id)
      DO UPDATE SET quantity_reserved = stock_levels.quantity_reserved + EXCLUDED.quantity_reserved;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reserve_stock_on_so_confirm ON sales_orders;
CREATE TRIGGER trigger_reserve_stock_on_so_confirm
AFTER UPDATE OF status ON sales_orders
FOR EACH ROW EXECUTE FUNCTION reserve_stock_on_so_confirm();

-- Trigger 9: Deduct stock when Delivery Order is SHIPPED
-- quantity_on_hand in stock_levels decreases by DO line quantity
-- Also updates quantity_delivered in sales_order_lines
CREATE OR REPLACE FUNCTION deduct_stock_on_do_ship()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('shipped', 'delivered') AND (OLD.status IS NULL OR OLD.status IN ('draft','ready','picked')) THEN
    UPDATE stock_levels sl
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - COALESCE(doli.quantity_delivered, doli.quantity_ordered)),
        quantity_reserved = GREATEST(0, quantity_reserved - COALESCE(doli.quantity_delivered, doli.quantity_ordered))
    FROM delivery_order_lines doli
    WHERE doli.delivery_order_id = NEW.id
      AND doli.product_id = sl.product_id
      AND sl.warehouse_id = NEW.warehouse_id
      AND sl.bin_location_id IS NULL;

    -- Update quantity_delivered in sales_order_lines
    UPDATE sales_order_lines sol
    SET quantity_delivered = COALESCE(sol.quantity_delivered, 0) + COALESCE(
      (SELECT SUM(doli2.quantity_delivered) FROM delivery_order_lines doli2
       WHERE doli2.sales_order_line_id = sol.id AND doli2.delivery_order_id = NEW.id), 0)
    FROM delivery_orders do2
    WHERE do2.sales_order_id = sol.sales_order_id
      AND do2.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_stock_on_do_ship ON delivery_orders;
CREATE TRIGGER trigger_deduct_stock_on_do_ship
AFTER UPDATE OF status ON delivery_orders
FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_do_ship();

-- NOTE: Stock levels (warehouse-level, bin_location_id = NULL) are initialized
-- in application code when products are created (see erpApi.ts createProduct).
-- GR completion uses a direct UPSERT into stock_levels below.

-- Trigger 10: Add stock to bins when Goods Receipt is COMPLETED
-- Creates/updates stock_in_bins record, which cascades to
-- bin_locations.current_occupancy_units and warehouses.current_occupancy_sqm via Triggers 1 & 2
CREATE OR REPLACE FUNCTION add_stock_on_gr_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status IN ('draft','received','verified')) THEN
    -- Upsert stock_in_bins for each GR line
    INSERT INTO stock_in_bins (product_id, warehouse_id, bin_location_id, quantity)
    SELECT
      grli.product_id,
      gr.warehouse_id,
      grli.bin_location_id,
      grli.quantity_accepted
    FROM goods_receipt_lines grli
    JOIN goods_receipts gr ON grli.goods_receipt_id = gr.id
    WHERE grli.goods_receipt_id = NEW.id
      AND grli.bin_location_id IS NOT NULL
    ON CONFLICT (product_id, warehouse_id, bin_location_id)
    DO UPDATE SET quantity = stock_in_bins.quantity + EXCLUDED.quantity;

    -- Upsert stock_levels (warehouse-level aggregate: quantity_on_hand increases)
    -- Uses INSERT ... ON CONFLICT to handle case where row doesn't exist yet
    INSERT INTO stock_levels (product_id, warehouse_id, bin_location_id, quantity_on_hand, quantity_reserved)
    SELECT
      grli.product_id,
      gr.warehouse_id,
      NULL::UUID,
      SUM(grli.quantity_accepted),
      0
    FROM goods_receipt_lines grli
    JOIN goods_receipts gr ON grli.goods_receipt_id = gr.id
    WHERE gr.id = NEW.id
    GROUP BY grli.product_id, gr.warehouse_id
    ON CONFLICT (product_id, warehouse_id, bin_location_id)
    DO UPDATE SET quantity_on_hand = stock_levels.quantity_on_hand + EXCLUDED.quantity_on_hand;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_stock_on_gr_complete ON goods_receipts;
CREATE TRIGGER trigger_add_stock_on_gr_complete
AFTER UPDATE OF status ON goods_receipts
FOR EACH ROW EXECUTE FUNCTION add_stock_on_gr_complete();

-- NOTE: Trigger 3 (recalc_stock_reorder_status) already auto-updates
-- stock_levels.reorder_status on INSERT/UPDATE of stock_levels.
-- No duplicate trigger needed.

-- Trigger 12: Release reservation when Sales Order is CANCELLED
CREATE OR REPLACE FUNCTION release_reservation_on_so_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE stock_levels sl
    SET quantity_reserved = GREATEST(0, quantity_reserved - COALESCE(soli.quantity, 0))
    FROM sales_order_lines soli
    WHERE soli.sales_order_id = NEW.id
      AND soli.product_id = sl.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_release_reservation_on_so_cancel ON sales_orders;
CREATE TRIGGER trigger_release_reservation_on_so_cancel
AFTER UPDATE OF status ON sales_orders
FOR EACH ROW EXECUTE FUNCTION release_reservation_on_so_cancel();

-- Trigger 13: Execute stock transfer when status = 'done'
-- Moves stock from source bin to destination bin in stock_in_bins
-- Cascades to update bin_locations and warehouse occupancy via Triggers 1 & 2
CREATE OR REPLACE FUNCTION execute_stock_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status IN ('draft', 'validated') THEN
    -- Deduct from source bin
    UPDATE stock_in_bins sib
    SET quantity = GREATEST(0, sib.quantity - COALESCE(stl.quantity, 0))
    FROM stock_transfer_lines stl
    JOIN stock_transfers st ON stl.transfer_id = st.id
    WHERE stl.transfer_id = NEW.id
      AND stl.product_id = sib.product_id
      AND stl.from_bin_location_id = sib.bin_location_id
      AND sib.warehouse_id = st.source_warehouse_id;

    -- Add to destination bin (upsert)
    INSERT INTO stock_in_bins (product_id, warehouse_id, bin_location_id, quantity)
    SELECT
      stl.product_id,
      st.dest_warehouse_id,
      stl.to_bin_location_id,
      stl.quantity
    FROM stock_transfer_lines stl
    JOIN stock_transfers st ON stl.transfer_id = st.id
    WHERE stl.transfer_id = NEW.id
      AND stl.to_bin_location_id IS NOT NULL
    ON CONFLICT (product_id, warehouse_id, bin_location_id)
    DO UPDATE SET quantity = stock_in_bins.quantity + EXCLUDED.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_execute_stock_transfer ON stock_transfers;
CREATE TRIGGER trigger_execute_stock_transfer
AFTER UPDATE OF status ON stock_transfers
FOR EACH ROW EXECUTE FUNCTION execute_stock_transfer();

-- ============================================================================
-- CONSTRAINT CHECKS
-- ============================================================================

ALTER TABLE stock_levels
ADD CONSTRAINT chk_stock_levels_qty_positive
CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND quantity_in_transit >= 0);

ALTER TABLE stock_in_bins
ADD CONSTRAINT chk_stock_in_bins_qty_positive
CHECK (quantity >= 0);

ALTER TABLE bin_locations
ADD CONSTRAINT chk_bin_occupancy_not_exceed_capacity
CHECK (current_occupancy_units <= capacity_units);

ALTER TABLE warehouses
ADD CONSTRAINT chk_warehouse_occupancy_not_exceed_capacity
CHECK (current_occupancy_sqm <= capacity_sqm);

-- ============================================================================
-- SEED DATA: Reference Tables
-- ============================================================================

INSERT INTO departments (name, description) VALUES
  ('Ban Giam Doc', 'CEO va Ban Dieu hanh'),
  ('Kinh Doanh', 'Phong Kinh Doanh & Marketing'),
  ('Mua Hang', 'Phong Procurement'),
  ('Kho Van', 'Phong Kho & Logistics'),
  ('Ke Toan', 'Phong Ke Toan Tai Chinh');

INSERT INTO units_of_measure (name, code) VALUES
  ('Cai', 'pcs'),
  ('Bo', 'set'),
  ('Met', 'm'),
  ('Kg', 'kg'),
  ('Lit', 'l'),
  ('Thung', 'box'),
  ('Cuon', 'roll');

INSERT INTO supplier_types (name, description) VALUES
  ('Equipment & Product Suppliers', 'Nha cung cap thiet bi va san pham'),
  ('Component & Part Suppliers', 'Nha cung cap linh kien va phu tung'),
  ('Logistics & Transportation', 'Don vi van chuyen va logistics'),
  ('Service Providers', 'Nha cung cap dich vu'),
  ('Maintenance & Repair Services', 'Dich vu bao tri va sua chua');

INSERT INTO lead_stages (name, display_name, probability_percent, is_won, is_lost, sequence) VALUES
  ('new', 'Moi tiep nhan', 10, FALSE, FALSE, 1),
  ('site_survey', 'Khao sat cong trinh', 30, FALSE, FALSE, 2),
  ('proposition', 'Bao gia', 60, FALSE, FALSE, 3),
  ('won', 'Da ky hop dong', 100, TRUE, FALSE, 4),
  ('lost', 'Mat khach', 0, FALSE, TRUE, 5);

INSERT INTO activity_types (name, icon, color) VALUES
  ('Call', 'phone', 'blue'),
  ('Email', 'mail', 'green'),
  ('Meeting', 'users', 'purple'),
  ('Site Visit', 'map-pin', 'orange'),
  ('Quote Sent', 'file-text', 'teal');

INSERT INTO accounts (account_code, account_name, account_type) VALUES
  ('1000', 'Tien mat', 'asset'),
  ('1100', 'Ngan hang', 'asset'),
  ('1200', 'Phai thu khach hang', 'asset'),
  ('1300', 'Hang ton kho', 'asset'),
  ('1400', 'Tai san co dinh', 'asset'),
  ('2000', 'Phai tra nguoi ban', 'liability'),
  ('2100', 'Vay ngan han', 'liability'),
  ('2200', 'Thue phai nop', 'liability'),
  ('3000', 'Von gop', 'equity'),
  ('3100', 'Loi nhuan chua phan phoi', 'equity'),
  ('4000', 'Doanh thu ban hang', 'revenue'),
  ('4100', 'Doanh thu dich vu', 'revenue'),
  ('5000', 'Gia von hang ban', 'expense'),
  ('5100', 'Chi phi ban hang', 'expense'),
  ('5200', 'Chi phi quan ly', 'expense');

-- ============================================================================
-- SEED DATA: Master Data
-- ============================================================================

INSERT INTO product_categories (name, parent_id, display_order, description) VALUES
  ('Smart Home', NULL, 1, 'Thiet bi va he thong SmartHome'),
  ('Security', NULL, 2, 'An ninh va giam sat'),
  ('Networking', NULL, 3, 'Thiet bi mang'),
  ('Accessories', NULL, 4, 'Cap, dau noi va phu kien');

INSERT INTO product_categories (name, parent_id, display_order, description) VALUES
  ('Smart Hubs', (SELECT id FROM product_categories WHERE name = 'Smart Home'), 10, 'Bo dieu khien trung tam'),
  ('Smart Sensors', (SELECT id FROM product_categories WHERE name = 'Smart Home'), 11, 'Cam bien thong minh'),
  ('Smart Cameras', (SELECT id FROM product_categories WHERE name = 'Security'), 20, 'Camera IP'),
  ('Smart Locks', (SELECT id FROM product_categories WHERE name = 'Security'), 21, 'Khoa thong minh'),
  ('Network Equipment', (SELECT id FROM product_categories WHERE name = 'Networking'), 30, 'Router, switch, mesh'),
  ('Cables & Connectors', (SELECT id FROM product_categories WHERE name = 'Accessories'), 40, 'HDMI, USB, mang');

INSERT INTO products (sku, name, category_id, uom_id, list_price, cost_price, is_iot_device, requires_serial_scan, status, description, physical_size_sqm)
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
  p.description,
  CASE
    WHEN p.name ILIKE '%robot%' OR p.name ILIKE '%hub%' THEN 2.0
    WHEN p.name ILIKE '%camera%' OR p.name ILIKE '%lock%' THEN 0.5
    WHEN p.name ILIKE '%sensor%' OR p.name ILIKE '%switch%' OR p.name ILIKE '%plug%' OR p.name ILIKE '%socket%' THEN 0.2
    ELSE 1.0
  END
FROM (VALUES
  ('CAM-IP-001', 'Camera IP 2MP HIKVISION', 'Camera IP hong ngoai 30m', TRUE, TRUE, 1500000, 900000),
  ('CAM-IP-002', 'Camera IP 4MP HIKVISION', 'Camera IP 4MP WDR', TRUE, TRUE, 2200000, 1400000),
  ('CAM-DOME-001', 'Camera Dome 2MP DAHUA', 'Camera dome trong nha 2MP', TRUE, TRUE, 1300000, 780000),
  ('CAM-PTZ-001', 'Camera PTZ 5MP HIKVISION', 'Camera xoay 5MP zoom 30x', TRUE, TRUE, 4500000, 3000000),
  ('SEN-MOT-001', 'Cam bien chuyen dong PIR', 'Cam bien PIR phat hien chuyen dong', TRUE, FALSE, 250000, 120000),
  ('SEN-DRW-001', 'Cam bien cua/so', 'Cam bien tu cho cua', TRUE, FALSE, 180000, 90000),
  ('SEN-TEMP-001', 'Cam bien nhiet do & do am', 'Cam bien da chuc nang', TRUE, FALSE, 350000, 180000),
  ('ROB-VAC-001', 'Robot hut bui Roborock S7', 'Robot hut bui va lau nha', TRUE, TRUE, 8500000, 5500000),
  ('ROB-VAC-002', 'Robot hut bui Dreame D9', 'Robot hut bui LDS navigation', TRUE, TRUE, 7200000, 4600000),
  ('SLO-CT-001', 'Khoa cua thong minh Yale', 'Khoa cua van tay mat ma', TRUE, TRUE, 4500000, 2800000),
  ('SLO-CT-002', 'Khoa cua thong minh Samsung', 'Khoa cua thong minh Samsung', TRUE, TRUE, 5200000, 3300000),
  ('HUB-001', 'Hub dieu khien SmartHome', 'Gateway trung tam Zigbee', TRUE, FALSE, 1800000, 1100000),
  ('HUB-002', 'Hub dieu khien WiFi Mesh', 'Hub WiFi mesh 3-band', TRUE, FALSE, 2200000, 1400000),
  ('SW-001', 'Cong tac thong minh 1 nut', 'Cong tac WiFi 1 nut', FALSE, FALSE, 380000, 200000),
  ('SW-002', 'Cong tac thong minh 2 nut', 'Cong tac WiFi 2 nut', FALSE, FALSE, 480000, 260000),
  ('SOC-001', 'O cam thong minh WiFi', 'O cam co do dien nang', FALSE, FALSE, 280000, 150000),
  ('LIGHT-001', 'Bong den thong minh RGB', 'Bong LED RGB WiFi', FALSE, FALSE, 220000, 120000),
  ('LIGHT-002', 'Den LED strip thong minh', 'Den LED strip WiFi 5m', FALSE, FALSE, 450000, 250000),
  ('ACC-CAB-001', 'Day cap mang CAT6 100m', 'Cable CAT6 cho camera IP', FALSE, FALSE, 1200000, 800000),
  ('ACC-POE-001', 'Switch PoE 8 port', 'Switch PoE 8 port 120W', FALSE, FALSE, 1800000, 1100000)
) p(sku, name, description, is_iot, is_serial, list_price, cost_price)
JOIN product_categories c ON (
  (p.name ILIKE '%camera%' AND c.name = 'Smart Cameras') OR
  (p.name ILIKE '%sensor%' AND c.name = 'Smart Sensors') OR
  (p.name ILIKE '%robot%' AND c.name = 'Smart Home') OR
  (p.name ILIKE '%lock%' AND c.name = 'Smart Locks') OR
  (p.name ILIKE '%hub%' AND c.name = 'Smart Hubs') OR
  (p.name ILIKE '%switch%' AND c.name = 'Accessories') OR
  (p.name ILIKE '%socket%' AND c.name = 'Accessories') OR
  (p.name ILIKE '%light%' AND c.name = 'Accessories') OR
  (p.name ILIKE '%cable%' AND c.name = 'Accessories') OR
  (p.name ILIKE '%poe%' AND c.name = 'Accessories')
)
JOIN units_of_measure u ON u.code = 'pcs';

INSERT INTO users (email, password_hash, full_name, department_id, role, status) VALUES
  ('admin@novatech.vn', '123456', 'Nguyen Van Sep', (SELECT id FROM departments WHERE name = 'Ban Giam Doc'), 'CEO', 'active'),
  ('sales@novatech.vn', '123456', 'Tran Thi Sales', (SELECT id FROM departments WHERE name = 'Kinh Doanh'), 'Sales_Manager', 'active'),
  ('purchase@novatech.vn', '123456', 'Le Van Mua', (SELECT id FROM departments WHERE name = 'Mua Hang'), 'Purchasing_Manager', 'active'),
  ('warehouse@novatech.vn', '123456', 'Pham Thi Kho', (SELECT id FROM departments WHERE name = 'Kho Van'), 'Warehouse_Manager', 'active'),
  ('accountant@novatech.vn', '123456', 'Hoang Van Ke', (SELECT id FROM departments WHERE name = 'Ke Toan'), 'Accountant', 'active');

INSERT INTO warehouses (warehouse_code, name, city, province, capacity_sqm, status) VALUES
  ('WH-HN', 'Kho Ha Noi', 'Ha Noi', 'Ha Noi', 500, 'active'),
  ('WH-HCM', 'Kho TP.HCM', 'TP. Ho Chi Minh', 'TP.HCM', 600, 'active'),
  ('WH-BH', 'Kho Bao Hanh', 'Ha Noi', 'Ha Noi', 100, 'active');

INSERT INTO warehouse_zones (warehouse_id, zone_code, zone_name) VALUES
  ((SELECT id FROM warehouses WHERE warehouse_code = 'WH-HN'), 'A', 'Khu A - Camera'),
  ((SELECT id FROM warehouses WHERE warehouse_code = 'WH-HN'), 'B', 'Khu B - Robot'),
  ((SELECT id FROM warehouses WHERE warehouse_code = 'WH-HN'), 'C', 'Khu C - Phu kien'),
  ((SELECT id FROM warehouses WHERE warehouse_code = 'WH-HCM'), 'A', 'Khu A - Camera'),
  ((SELECT id FROM warehouses WHERE warehouse_code = 'WH-HCM'), 'B', 'Khu B - Robot'),
  ((SELECT id FROM warehouses WHERE warehouse_code = 'WH-HCM'), 'C', 'Khu C - Phu kien'),
  ((SELECT id FROM warehouses WHERE warehouse_code = 'WH-BH'), 'A', 'Khu A - Bao hanh');

INSERT INTO bin_locations (warehouse_id, zone_id, bin_code, capacity_units)
SELECT
  w.id,
  wz.id,
  wz.zone_code || '-' || LPAD(gs::text, 2, '0') || '-L1',
  50
FROM warehouses w
JOIN warehouse_zones wz ON wz.warehouse_id = w.id
CROSS JOIN generate_series(1, 10) AS gs;

INSERT INTO customers (name, customer_type, contact_person_name, contact_person_email, contact_person_phone, billing_address, payment_terms, status) VALUES
  ('Cong ty TNHH ABC', 'B2B', 'Nguyen A', 'contact@abc.vn', '0901234567', '123 Duong ABC, Quan 1, TP.HCM', 'NET30', 'active'),
  ('Nguyen Van Khach', 'B2C', 'Nguyen Van Khach', 'khach@gmail.com', '0902345678', '456 Duong XYZ, Ba Dinh, Ha Noi', 'COD', 'active'),
  ('Cong ty CP XYZ', 'B2B', 'Tran B', 'info@xyz.com.vn', '0903456789', '789 Duong XYZ, Cau Giay, Ha Noi', 'NET45', 'active'),
  ('Chi Lan B', 'B2C', 'Lan B', 'lanb@gmail.com', '0904567890', '101 Duong 123, Thu Duc, TP.HCM', 'Prepaid', 'active'),
  ('Cong ty TNHH SmartHome Pro', 'B2B', 'Ky Su Minh', 'minh@smarthomepro.vn', '0905678901', '202 Duong Smart, Tan Binh, TP.HCM', 'NET30', 'active');

INSERT INTO suppliers (name, supplier_type_id, contact_person_name, contact_person_email, contact_person_phone, company_city, payment_terms, is_preferred, status) VALUES
  ('HIKVISION Vietnam', (SELECT id FROM supplier_types WHERE name LIKE '%Equipment%'), 'Mr. Tuan', 'tuan@hikvision.vn', '02812345678', 'TP.HCM', 'NET30', TRUE, 'active'),
  ('DAHUA Technology', (SELECT id FROM supplier_types WHERE name LIKE '%Equipment%'), 'Ms. Lan', 'lan@dahuatech.vn', '02823456789', 'TP.HCM', 'NET30', TRUE, 'active'),
  ('Roborock Vietnam', (SELECT id FROM supplier_types WHERE name LIKE '%Equipment%'), 'Mr. Hung', 'hung@roborock.vn', '02834567890', 'TP.HCM', 'NET45', TRUE, 'active'),
  ('Viettel Logistics', (SELECT id FROM supplier_types WHERE name LIKE '%Logistics%'), 'Mr. Phong', 'phong@viettel-logistics.vn', '02456789012', 'Ha Noi', 'NET30', FALSE, 'active'),
  ('GHN Express', (SELECT id FROM supplier_types WHERE name LIKE '%Logistics%'), 'Ms. Huong', 'huong@ghn.vn', '02876543210', 'TP.HCM', 'COD', FALSE, 'active');

INSERT INTO carriers (name, code, contact_phone, status) VALUES
  ('Viettel Post', 'VTP', '19008008', 'active'),
  ('GHTK', 'GHTK', '19006066', 'active'),
  ('GHN', 'GHN', '19006066', 'active'),
  ('Ninja Van', 'NJV', '19002020', 'active'),
  ('J&T Express', 'JT', '19001010', 'active');

INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand)
SELECT p.id, w.id, 0
FROM products p
CROSS JOIN warehouses w
WHERE w.status = 'active';

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 'NovaTech ERP v2.1 Migration COMPLETED successfully!' AS status;
SELECT 'Tables: ' || COUNT(*) AS info FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Triggers: ' || COUNT(*) AS info FROM information_schema.triggers WHERE trigger_schema = 'public';
