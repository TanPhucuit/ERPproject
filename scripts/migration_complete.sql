-- =============================================================================
-- NovaTech ERP v2 - COMPLETE MIGRATION SCRIPT
-- Run this script in Supabase SQL Editor to recreate the entire database.
-- WARNING: This drops and recreates ALL tables, triggers, and functions.
-- =============================================================================
-- Last updated: 2026-05-12

-- ============================================================
-- STEP 0: DROP ALL EXISTING OBJECTS
-- ============================================================
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT routine_schema, routine_name, routine_type
             FROM information_schema.routines
             WHERE routine_schema = 'public'
               AND routine_name NOT LIKE 'uuid_%'
               AND routine_name NOT LIKE 'gen_random_uuid')
  LOOP
    IF r.routine_type = 'FUNCTION' THEN
      EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_schema) || '.' || quote_ident(r.routine_name) || ' CASCADE';
    END IF;
  END LOOP;

  FOR r IN (SELECT table_schema, table_name, trigger_name
             FROM information_schema.triggers
             WHERE table_schema = 'public')
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name)
         || ' ON ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name);
  END LOOP;

  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- ============================================================
-- STEP 1: REFERENCE TABLES (Tier 0)
-- ============================================================

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
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  probability_percent INTEGER DEFAULT 50,
  is_won BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(20) NOT NULL UNIQUE,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_id UUID REFERENCES accounts(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE carrier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(20) UNIQUE,
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  website VARCHAR(255),
  cost_per_km NUMERIC(12,2) DEFAULT 0,
  average_delivery_time_hours NUMERIC(8,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed reference data
INSERT INTO departments (id, name, description) VALUES
  (gen_random_uuid(), 'Ban Giam Doc', 'CEO va Ban Dieu hanh'),
  (gen_random_uuid(), 'Kinh Doanh', 'Phong Kinh Doanh & Marketing'),
  (gen_random_uuid(), 'Mua Hang', 'Phong Procurement'),
  (gen_random_uuid(), 'Kho Van', 'Phong Kho & Logistics'),
  (gen_random_uuid(), 'Ke Toan', 'Phong Ke Toan Tai Chinh');

INSERT INTO units_of_measure (id, name, code) VALUES
  (gen_random_uuid(), 'Cai', 'pcs'),
  (gen_random_uuid(), 'Bo', 'set'),
  (gen_random_uuid(), 'Met', 'm'),
  (gen_random_uuid(), 'Kg', 'kg'),
  (gen_random_uuid(), 'Lit', 'l'),
  (gen_random_uuid(), 'Thung', 'box'),
  (gen_random_uuid(), 'Cuon', 'roll');

INSERT INTO supplier_types (id, name, description) VALUES
  (gen_random_uuid(), 'Equipment & Product Suppliers', 'Nha cung cap thiet bi va san pham'),
  (gen_random_uuid(), 'Component & Part Suppliers', 'Nha cung cap linh kien va phu tung'),
  (gen_random_uuid(), 'Logistics & Transportation', 'Don vi van chuyen va logistics'),
  (gen_random_uuid(), 'Service Providers', 'Nha cung cap dich vu'),
  (gen_random_uuid(), 'Maintenance & Repair Services', 'Dich vu bao tri va sua chua');

INSERT INTO lead_stages (id, name, display_name, probability_percent, is_won, is_lost, sequence) VALUES
  (gen_random_uuid(), 'new', 'Moi tiep nhan', 10, FALSE, FALSE, 1),
  (gen_random_uuid(), 'site_survey', 'Khao sat cong trinh', 30, FALSE, FALSE, 2),
  (gen_random_uuid(), 'proposition', 'Bao gia', 60, FALSE, FALSE, 3),
  (gen_random_uuid(), 'won', 'Da ky hop dong', 100, TRUE, FALSE, 4),
  (gen_random_uuid(), 'lost', 'Mat khach', 0, FALSE, TRUE, 5);

INSERT INTO activity_types (id, name, icon, color) VALUES
  (gen_random_uuid(), 'Call', 'phone', 'blue'),
  (gen_random_uuid(), 'Email', 'mail', 'green'),
  (gen_random_uuid(), 'Meeting', 'users', 'purple'),
  (gen_random_uuid(), 'Site Visit', 'map-pin', 'orange'),
  (gen_random_uuid(), 'Quote Sent', 'file-text', 'teal');

INSERT INTO accounts (id, account_code, account_name, account_type) VALUES
  (gen_random_uuid(), '1000', 'Tien mat', 'asset'),
  (gen_random_uuid(), '1100', 'Ngan hang', 'asset'),
  (gen_random_uuid(), '1200', 'Phai thu khach hang', 'asset'),
  (gen_random_uuid(), '1300', 'Hang ton kho', 'asset'),
  (gen_random_uuid(), '1400', 'Tai san co dinh', 'asset'),
  (gen_random_uuid(), '2000', 'Phai tra nguoi ban', 'liability'),
  (gen_random_uuid(), '2100', 'Vay ngan han', 'liability'),
  (gen_random_uuid(), '2200', 'Thue phai nop', 'liability'),
  (gen_random_uuid(), '3000', 'Von gop', 'equity'),
  (gen_random_uuid(), '3100', 'Loi nhuan chua phan phoi', 'equity'),
  (gen_random_uuid(), '4000', 'Doanh thu ban hang', 'revenue'),
  (gen_random_uuid(), '4100', 'Doanh thu dich vu', 'revenue'),
  (gen_random_uuid(), '5000', 'Gia von hang ban', 'expense'),
  (gen_random_uuid(), '5100', 'Chi phi ban hang', 'expense'),
  (gen_random_uuid(), '5200', 'Chi phi quan ly', 'expense');

INSERT INTO carrier (id, name, code, contact_phone, is_active) VALUES
  (gen_random_uuid(), 'Viettel Post', 'VTP', '19008008', TRUE),
  (gen_random_uuid(), 'GHTK', 'GHTK', '19006066', TRUE),
  (gen_random_uuid(), 'GHN Express', 'GHN', '19006066', TRUE),
  (gen_random_uuid(), 'Ninja Van', 'NJV', '19002020', TRUE),
  (gen_random_uuid(), 'J&T Express', 'JT', '19001010', TRUE);

-- ============================================================
-- STEP 2: MASTER DATA TABLES (Tier 1)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) DEFAULT '123456',
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  department_id UUID REFERENCES departments(id),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('CEO','Sales_Manager','Purchasing_Manager','Warehouse_Manager','Accountant','Admin','user')),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  is_deleted BOOLEAN DEFAULT FALSE,
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
  is_auto_bom BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','discontinued','prototype')),
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id UUID NOT NULL REFERENCES products(id),
  component_product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_product_id, component_product_id)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(10) DEFAULT 'B2C' CHECK (customer_type IN ('B2B','B2C')),
  company_tax_id VARCHAR(50),
  contact_person_name VARCHAR(200),
  contact_person_email VARCHAR(255),
  contact_person_phone VARCHAR(50),
  billing_address TEXT,
  shipping_address TEXT,
  shipping_same_as_billing BOOLEAN DEFAULT TRUE,
  payment_terms VARCHAR(20) DEFAULT 'NET30' CHECK (payment_terms IN ('NET30','NET45','NET60','COD','Prepaid')),
  credit_limit NUMERIC(18,2) DEFAULT 0,
  credit_used NUMERIC(18,2) DEFAULT 0,
  lead_id UUID,
  created_by_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_number VARCHAR(50) UNIQUE,
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
  payment_terms VARCHAR(20) DEFAULT 'NET30' CHECK (payment_terms IN ('NET30','NET45','NET60','COD','Prepaid')),
  average_lead_time_days INTEGER DEFAULT 7,
  is_preferred BOOLEAN DEFAULT FALSE,
  total_spent NUMERIC(18,2) DEFAULT 0,
  average_response_time_hours NUMERIC(10,2),
  quality_rating NUMERIC(3,2) DEFAULT 5.0,
  on_time_delivery_percent NUMERIC(5,2) DEFAULT 100.0,
  is_deleted BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  location_address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  manager_id UUID REFERENCES users(id),
  capacity_sqm NUMERIC(12,2) DEFAULT 0,
  current_occupancy_sqm NUMERIC(12,2) GENERATED ALWAYS AS (
    COALESCE((
      SELECT SUM(p.physical_size_sqm * sib.quantity)
      FROM stock_in_bins sib
      JOIN products p ON sib.product_id = p.id
      WHERE sib.warehouse_id = warehouses.id
    ), 0)
  ) STORED,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','maintenance','closed')),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  zone_code VARCHAR(10) NOT NULL,
  zone_name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES warehouse_zones(id),
  bin_code VARCHAR(30) NOT NULL,
  description TEXT,
  capacity_units INTEGER DEFAULT 100,
  current_occupancy_units INTEGER GENERATED ALWAYS AS (
    COALESCE((SELECT SUM(quantity) FROM stock_in_bins WHERE bin_location_id = bin_locations.id), 0)
  ) STORED,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','maintenance','reserve')),
  is_deleted BOOLEAN DEFAULT FALSE,
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
  reorder_status VARCHAR(20) DEFAULT 'optimal' CHECK (reorder_status IN ('optimal','understocked','overstocked','critical','out_of_stock')),
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
  bin_location_id UUID REFERENCES bin_locations(id),
  quantity NUMERIC(12,3) DEFAULT 0,
  batch_number VARCHAR(100),
  expiry_date DATE,
  received_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id, bin_location_id, batch_number)
);

CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  source_warehouse_id UUID REFERENCES warehouses(id),
  destination_warehouse_id UUID REFERENCES warehouses(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','validated','done','cancelled')),
  transfer_date DATE,
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  from_bin_location_id UUID REFERENCES bin_locations(id),
  to_bin_location_id UUID REFERENCES bin_locations(id),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: CRM TABLES (Tier 2)
-- ============================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number VARCHAR(50) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_person_name VARCHAR(200),
  contact_person_phone VARCHAR(50),
  contact_person_email VARCHAR(255),
  company_address TEXT,
  company_tax_id VARCHAR(50),
  source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('website','referral','showroom','architect','cold_call','social_media','auto_request')),
  lead_rating VARCHAR(10) CHECK (lead_rating IN ('hot','warm','cold')),
  stage_id UUID REFERENCES lead_stages(id) DEFAULT (SELECT id FROM lead_stages WHERE name = 'new'),
  owner_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),
  tax_percent NUMERIC(5,2) DEFAULT 10.0,
  estimated_value NUMERIC(18,2) DEFAULT 0,
  probability_percent INTEGER DEFAULT 50,
  expected_close_date DATE,
  notes TEXT,
  is_auto_request BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  product_sku VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE(quantity, 0) * COALESCE(unit_price, 0) * (1 - COALESCE(discount_percent, 0) / 100)
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type_id UUID REFERENCES activity_types(id),
  description TEXT NOT NULL,
  outcome TEXT,
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  performed_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 4: SALES TABLES (Tier 3)
-- ============================================================

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  issued_date DATE DEFAULT CURRENT_DATE,
  valid_until_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  subtotal NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE((SELECT SUM(quantity * unit_price * (1 - discount_percent / 100)) FROM quotation_lines WHERE quotation_id = quotations.id), 0)
  ) STORED,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    subtotal * discount_percent / 100
  ) STORED,
  tax_percent NUMERIC(5,2) DEFAULT 10.0,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    (subtotal - discount_amount) * tax_percent / 100
  ) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    subtotal - discount_amount + tax_amount
  ) STORED,
  notes TEXT,
  internal_notes TEXT,
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
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
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE(quantity, 0) * COALESCE(unit_price, 0) * (1 - COALESCE(discount_percent, 0) / 100)
  ) STORED,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_number VARCHAR(50) UNIQUE NOT NULL,
  quotation_id UUID REFERENCES quotations(id),
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  order_date DATE DEFAULT CURRENT_DATE,
  required_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','confirmed','processing','shipped','delivered','cancelled','completed')),
  subtotal NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE((SELECT SUM(quantity * unit_price * (1 - discount_percent / 100)) FROM sales_order_lines WHERE sales_order_id = sales_orders.id), 0)
  ) STORED,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    subtotal * discount_percent / 100
  ) STORED,
  tax_percent NUMERIC(5,2) DEFAULT 10.0,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    (subtotal - discount_amount) * tax_percent / 100
  ) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    subtotal - discount_amount + tax_amount
  ) STORED,
  total_cost NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE((SELECT SUM(COALESCE(quantity,0) * COALESCE(cost_price,0)) FROM sales_order_lines WHERE sales_order_id = sales_orders.id), 0)
  ) STORED,
  estimated_profit NUMERIC(18,2) GENERATED ALWAYS AS (
    (subtotal - discount_amount + tax_amount) - total_cost
  ) STORED,
  profit_margin_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN (subtotal - discount_amount + tax_amount) > 0
    THEN ((subtotal - discount_amount + tax_amount - total_cost) / (subtotal - discount_amount + tax_amount) * 100)
    ELSE 0 END
  ) STORED,
  payment_terms VARCHAR(20) DEFAULT 'NET30',
  notes TEXT,
  internal_notes TEXT,
  sales_person_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity_ordered NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_delivered NUMERIC(12,3) DEFAULT 0,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(18,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE(quantity_ordered, 0) * COALESCE(unit_price, 0) * (1 - COALESCE(discount_percent, 0) / 100)
  ) STORED,
  line_profit NUMERIC(18,2) GENERATED ALWAYS AS (
    (COALESCE(quantity_ordered, 0) * COALESCE(unit_price, 0) * (1 - COALESCE(discount_percent, 0) / 100))
    - (COALESCE(quantity_ordered, 0) * COALESCE(cost_price, 0))
  ) STORED,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  carrier_id UUID REFERENCES carrier(id),
  tracking_number VARCHAR(100),
  scheduled_delivery_date DATE,
  actual_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','ready','picked','shipped','delivered','cancelled')),
  shipping_address TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 5: PURCHASE TABLES (Tier 3)
-- ============================================================

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number VARCHAR(50) UNIQUE NOT NULL,
  issued_date DATE DEFAULT CURRENT_DATE,
  closing_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','closed')),
  total_estimated_cost NUMERIC(18,2) DEFAULT 0,
  notes TEXT,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rfq_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity_needed NUMERIC(12,3) NOT NULL DEFAULT 1,
  target_price NUMERIC(18,2),
  target_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rfq_supplier_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_line_id UUID NOT NULL REFERENCES rfq_lines(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  lead_time_days INTEGER,
  min_order_quantity NUMERIC(12,3) DEFAULT 1,
  notes TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_number VARCHAR(50) UNIQUE NOT NULL,
  rfq_id UUID REFERENCES rfqs(id),
  supplier_id UUID REFERENCES suppliers(id),
  order_date DATE DEFAULT CURRENT_DATE,
  required_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','confirmed','partial_received','received','cancelled')),
  subtotal NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE((SELECT SUM(quantity_ordered * unit_price * (1 - discount_percent / 100)) FROM purchase_order_lines WHERE purchase_order_id = purchase_orders.id), 0)
  ) STORED,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    subtotal * discount_percent / 100
  ) STORED,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    (subtotal - discount_amount) * tax_percent / 100
  ) STORED,
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (
    subtotal - discount_amount + tax_amount
  ) STORED,
  notes TEXT,
  internal_notes TEXT,
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  rfq_supplier_quotation_id UUID REFERENCES rfq_supplier_quotations(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  description TEXT,
  quantity_ordered NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_received NUMERIC(12,3) DEFAULT 0,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE(quantity_ordered, 0) * COALESCE(unit_price, 0) * (1 - COALESCE(discount_percent, 0) / 100)
  ) STORED,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  warehouse_id UUID REFERENCES warehouses(id),
  received_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','received','verified','completed','cancelled')),
  notes TEXT,
  received_by_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
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
  quantity_accepted NUMERIC(12,3) DEFAULT 0,
  quantity_rejected NUMERIC(12,3) DEFAULT 0,
  quality_status VARCHAR(20) DEFAULT 'good' CHECK (quality_status IN ('good','defective','damaged','wrong_item')),
  batch_number VARCHAR(100),
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id),
  adjustment_type VARCHAR(30) DEFAULT 'stock_count' CHECK (adjustment_type IN ('stock_count','cycle_count','damage','theft','other')),
  count_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','counted','approved','cancelled')),
  reason TEXT,
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE adjustment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  bin_location_id UUID REFERENCES bin_locations(id),
  quantity_system NUMERIC(12,3) DEFAULT 0,
  quantity_actual NUMERIC(12,3) DEFAULT 0,
  quantity_variance NUMERIC(12,3) GENERATED ALWAYS AS (quantity_actual - quantity_system) STORED,
  variance_reason VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 6: ACCOUNTING TABLES (Tier 3)
-- ============================================================

CREATE TABLE customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','partial_paid','overdue','cancelled')),
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) DEFAULT 0,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  payment_terms VARCHAR(20) DEFAULT 'NET30',
  description TEXT,
  notes TEXT,
  issued_by_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
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
  payment_method VARCHAR(30) DEFAULT 'bank_transfer',
  reference VARCHAR(100),
  notes TEXT,
  received_by_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  bill_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','received','verified','partial_paid','paid','cancelled')),
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) DEFAULT 0,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  payment_terms VARCHAR(20) DEFAULT 'NET30',
  notes TEXT,
  received_by_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  bill_id UUID REFERENCES vendor_bills(id),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30) DEFAULT 'bank_transfer',
  reference VARCHAR(100),
  notes TEXT,
  performed_by_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_id UUID REFERENCES customer_invoices(id),
  customer_id UUID REFERENCES customers(id),
  reason TEXT,
  credit_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','applied','cancelled')),
  total_amount NUMERIC(18,2) DEFAULT 0,
  applied_amount NUMERIC(18,2) DEFAULT 0,
  description TEXT,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_number VARCHAR(50) UNIQUE NOT NULL,
  bill_id UUID REFERENCES vendor_bills(id),
  goods_receipt_id UUID REFERENCES goods_receipts(id),
  supplier_id UUID REFERENCES suppliers(id),
  reason TEXT,
  debit_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','applied','cancelled')),
  total_amount NUMERIC(18,2) DEFAULT 0,
  applied_amount NUMERIC(18,2) DEFAULT 0,
  description TEXT,
  created_by_id UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 7: IoT LIFECYCLE TABLES
-- ============================================================

CREATE TABLE mac_serial_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  mac_address VARCHAR(50),
  product_id UUID REFERENCES products(id),
  delivery_order_line_id UUID REFERENCES delivery_order_lines(id),
  customer_id UUID REFERENCES customers(id),
  warranty_expiry_date DATE,
  activation_status VARCHAR(20) DEFAULT 'inactive' CHECK (activation_status IN ('inactive','active','expired','defective')),
  activated_at TIMESTAMPTZ,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warranty_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mac_serial_id UUID NOT NULL REFERENCES mac_serial_mapping(id),
  event_type VARCHAR(50) NOT NULL,
  event_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  performed_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE device_warranty_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mac_serial_id UUID REFERENCES mac_serial_mapping(id),
  alert_type VARCHAR(50) NOT NULL,
  message TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 8: METRICS & AUDIT
-- ============================================================

CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_sales_revenue NUMERIC(18,2) DEFAULT 0,
  total_cost NUMERIC(18,2) DEFAULT 0,
  total_profit NUMERIC(18,2) DEFAULT 0,
  profit_margin_percent NUMERIC(5,2) DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  orders_delivered INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  top_product_id UUID,
  top_customer_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_quantity_sold NUMERIC(12,3) DEFAULT 0,
  total_revenue NUMERIC(18,2) DEFAULT 0,
  total_cost NUMERIC(18,2) DEFAULT 0,
  total_profit NUMERIC(18,2) DEFAULT 0,
  average_selling_price NUMERIC(18,2) DEFAULT 0,
  times_sold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, period_start, period_end)
);

CREATE TABLE customer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(18,2) DEFAULT 0,
  average_order_value NUMERIC(18,2) DEFAULT 0,
  last_purchase_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, period_start, period_end)
);

CREATE TABLE supplier_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(18,2) DEFAULT 0,
  on_time_delivery_percent NUMERIC(5,2) DEFAULT 100.0,
  average_lead_time_days NUMERIC(8,2) DEFAULT 0,
  defect_rate_percent NUMERIC(5,2) DEFAULT 0,
  quality_rating NUMERIC(3,2) DEFAULT 5.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, period_start, period_end)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 9: TRIGGERS — updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_of_measure_updated_at BEFORE UPDATE ON units_of_measure FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_types_updated_at BEFORE UPDATE ON supplier_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_stages_updated_at BEFORE UPDATE ON lead_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_types_updated_at BEFORE UPDATE ON activity_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carrier_updated_at BEFORE UPDATE ON carrier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_at_column();
CREATE TRIGGER update_warehouse_zones_updated_at BEFORE UPDATE ON warehouse_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bin_locations_updated_at BEFORE UPDATE ON bin_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON stock_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_in_bins_updated_at BEFORE UPDATE ON stock_in_bins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON stock_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_products_updated_at BEFORE UPDATE ON lead_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotation_lines_updated_at BEFORE UPDATE ON quotation_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_order_lines_updated_at BEFORE UPDATE ON sales_order_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_order_lines_updated_at BEFORE UPDATE ON delivery_order_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfq_lines_updated_at BEFORE UPDATE ON rfq_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfq_supplier_quotations_updated_at BEFORE UPDATE ON rfq_supplier_quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_lines_updated_at BEFORE UPDATE ON purchase_order_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goods_receipts_updated_at BEFORE UPDATE ON goods_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goods_receipt_lines_updated_at BEFORE UPDATE ON goods_receipt_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_adjustments_updated_at BEFORE UPDATE ON adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_invoices_updated_at BEFORE UPDATE ON customer_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_payments_updated_at BEFORE UPDATE ON customer_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_bills_updated_at BEFORE UPDATE ON vendor_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_payments_updated_at BEFORE UPDATE ON vendor_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debit_notes_updated_at BEFORE UPDATE ON debit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mac_serial_mapping_updated_at BEFORE UPDATE ON mac_serial_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranty_tracking_updated_at BEFORE UPDATE ON warranty_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_warranty_alerts_updated_at BEFORE UPDATE ON device_warranty_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_bom_updated_at BEFORE UPDATE ON product_bom FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER 1: Bin occupancy = SUM(stock_in_bins.quantity)
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_bin_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bin_locations
    SET current_occupancy_units = COALESCE(current_occupancy_units, 0) + NEW.quantity
    WHERE id = NEW.bin_location_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE bin_locations SET current_occupancy_units = current_occupancy_units - OLD.quantity WHERE id = OLD.bin_location_id;
    UPDATE bin_locations SET current_occupancy_units = COALESCE(current_occupancy_units, 0) + NEW.quantity WHERE id = NEW.bin_location_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bin_locations SET current_occupancy_units = GREATEST(0, COALESCE(current_occupancy_units, 0) - OLD.quantity) WHERE id = OLD.bin_location_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_bin_occupancy
AFTER INSERT OR UPDATE OR DELETE ON stock_in_bins
FOR EACH ROW EXECUTE FUNCTION recalc_bin_occupancy();

-- ============================================================
-- TRIGGER 2: Warehouse occupancy = SUM(bin.current_occupancy_units * product.physical_size_sqm)
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_warehouse_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN v_warehouse_id := OLD.warehouse_id;
  ELSE v_warehouse_id := NEW.warehouse_id;
  END IF;
  UPDATE warehouses SET current_occupancy_sqm = COALESCE(
    (SELECT SUM(p.physical_size_sqm * sib.quantity)
     FROM stock_in_bins sib
     JOIN products p ON sib.product_id = p.id
     WHERE sib.warehouse_id = v_warehouse_id), 0)
  WHERE id = v_warehouse_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_warehouse_occupancy_bin
AFTER INSERT OR UPDATE OR DELETE ON bin_locations
FOR EACH ROW EXECUTE FUNCTION recalc_warehouse_occupancy();

CREATE TRIGGER trigger_recalc_warehouse_occupancy_stock
AFTER INSERT OR UPDATE OR DELETE ON stock_in_bins
FOR EACH ROW EXECUTE FUNCTION recalc_warehouse_occupancy();

-- ============================================================
-- TRIGGER 3: Stock reorder_status from quantity_on_hand vs product.reorder_level
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_stock_reorder_status()
RETURNS TRIGGER AS $$
DECLARE
  v_reorder_level INTEGER;
BEGIN
  SELECT reorder_level INTO v_reorder_level FROM products WHERE id = NEW.product_id;
  IF v_reorder_level IS NULL THEN v_reorder_level := 10; END IF;
  NEW.reorder_status := CASE
    WHEN COALESCE(NEW.quantity_on_hand, 0) <= 0 THEN 'out_of_stock'
    WHEN v_reorder_level > 0 AND COALESCE(NEW.quantity_on_hand, 0) < v_reorder_level THEN 'understocked'
    WHEN v_reorder_level > 0 AND COALESCE(NEW.quantity_on_hand, 0) < (v_reorder_level * 0.5) THEN 'critical'
    WHEN v_reorder_level > 0 AND COALESCE(NEW.quantity_on_hand, 0) > (v_reorder_level * 3) THEN 'overstocked'
    ELSE 'optimal'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_stock_reorder_status
BEFORE INSERT OR UPDATE ON stock_levels
FOR EACH ROW EXECUTE FUNCTION recalc_stock_reorder_status();

-- ============================================================
-- TRIGGER 4: Customer credit_used from unpaid invoices
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_customer_credit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET credit_used = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM customer_invoices
      WHERE customer_id = NEW.customer_id
        AND status IN ('sent', 'paid', 'partial_paid')
    )
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL THEN
    UPDATE customers
    SET credit_used = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM customer_invoices
      WHERE customer_id = OLD.customer_id
        AND status IN ('sent', 'paid', 'partial_paid')
    )
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_customer_credit_invoice
AFTER INSERT OR UPDATE OR DELETE ON customer_invoices
FOR EACH ROW EXECUTE FUNCTION recalc_customer_credit();

CREATE TRIGGER trigger_recalc_customer_credit_payment
AFTER INSERT OR UPDATE OR DELETE ON customer_payments
FOR EACH ROW EXECUTE FUNCTION recalc_customer_credit();

-- ============================================================
-- TRIGGER 5: Supplier total_spent from paid bills
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_supplier_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers SET total_spent = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM vendor_bills WHERE supplier_id = NEW.supplier_id AND status IN ('received','verified','partial_paid','paid')
    ) WHERE id = NEW.supplier_id;
  ELSIF TG_OP = 'DELETE' AND OLD.supplier_id IS NOT NULL THEN
    UPDATE suppliers SET total_spent = (
      SELECT COALESCE(SUM(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)), 0)
      FROM vendor_bills WHERE supplier_id = OLD.supplier_id AND status IN ('received','verified','partial_paid','paid')
    ) WHERE id = OLD.supplier_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_supplier_total_spent ON vendor_bills
AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW EXECUTE FUNCTION recalc_supplier_total_spent();

-- ============================================================
-- TRIGGER 6: Supplier avg_response_time from RFQ responses
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_supplier_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers SET average_response_time_hours = (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (rsq.created_at - rfq.issued_date)) / 3600), 0)
      FROM rfq_supplier_quotations rsq
      JOIN rfq_lines rfl ON rsq.rfq_line_id = rfl.id
      JOIN rfqs rfq ON rfl.rfq_id = rfq.id
      WHERE rsq.supplier_id = NEW.supplier_id
    ) WHERE id = NEW.supplier_id;
  ELSIF TG_OP = 'DELETE' AND OLD.supplier_id IS NOT NULL THEN
    UPDATE suppliers SET average_response_time_hours = (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (rsq.created_at - rfq.issued_date)) / 3600), 0)
      FROM rfq_supplier_quotations rsq
      JOIN rfq_lines rfl ON rsq.rfq_line_id = rfl.id
      JOIN rfqs rfq ON rfl.rfq_id = rfq.id
      WHERE rsq.supplier_id = OLD.supplier_id
    ) WHERE id = OLD.supplier_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_supplier_response_time ON rfq_supplier_quotations
AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW EXECUTE FUNCTION recalc_supplier_response_time();

-- ============================================================
-- TRIGGER 7: Supplier quality_rating from GR defect rate
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_supplier_quality_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_id UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_supplier_id := (SELECT supplier_id FROM purchase_orders WHERE id =
      (SELECT purchase_order_id FROM purchase_order_lines WHERE id = NEW.purchase_order_line_id));
  ELSIF TG_OP = 'DELETE' THEN
    v_supplier_id := (SELECT supplier_id FROM purchase_orders WHERE id =
      (SELECT purchase_order_id FROM purchase_order_lines WHERE id = OLD.purchase_order_line_id));
  END IF;
  IF v_supplier_id IS NOT NULL THEN
    UPDATE suppliers SET quality_rating = COALESCE(
      (SELECT GREATEST(0, LEAST(5.0,
        5.0 - (CASE WHEN SUM(grl2.quantity_expected) > 0
          THEN (SUM(grl2.quantity_rejected) * 100.0 / SUM(grl2.quantity_expected))
          ELSE 0 END)
      ))
      FROM goods_receipt_lines grl2
      JOIN goods_receipts gr2 ON grl2.goods_receipt_id = gr2.id
      JOIN purchase_orders po ON gr2.purchase_order_id = po.id
      WHERE po.supplier_id = v_supplier_id
    ) WHERE id = v_supplier_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_supplier_quality ON goods_receipt_lines
AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW EXECUTE FUNCTION recalc_supplier_quality_rating();

-- ============================================================
-- TRIGGER 8: Reserve stock when Sales Order is CONFIRMED
-- ============================================================
CREATE OR REPLACE FUNCTION reserve_stock_on_so_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    SELECT warehouse_id INTO v_warehouse_id
    FROM delivery_orders WHERE sales_order_id = NEW.id LIMIT 1;
    IF v_warehouse_id IS NOT NULL THEN
      INSERT INTO stock_levels (product_id, warehouse_id, bin_location_id, quantity_on_hand, quantity_reserved)
      SELECT sqli.product_id, v_warehouse_id, NULL::UUID, 0, sqli.quantity_ordered
      FROM sales_order_lines sqli
      WHERE sqli.sales_order_id = NEW.id
      ON CONFLICT (product_id, warehouse_id, bin_location_id)
      DO UPDATE SET quantity_reserved = stock_levels.quantity_reserved + EXCLUDED.quantity_reserved;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reserve_stock_on_so_confirm ON sales_orders
AFTER UPDATE OF status FOR EACH ROW EXECUTE FUNCTION reserve_stock_on_so_confirm();

-- ============================================================
-- TRIGGER 9: Deduct stock when Delivery Order is SHIPPED
-- ============================================================
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_stock_on_do_ship ON delivery_orders
AFTER UPDATE OF status FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_do_ship();

-- ============================================================
-- TRIGGER 10: Add stock to bins when Goods Receipt is COMPLETED
-- ============================================================
CREATE OR REPLACE FUNCTION add_stock_on_gr_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status IN ('draft','received','verified')) THEN
    INSERT INTO stock_in_bins (product_id, warehouse_id, bin_location_id, quantity, batch_number, expiry_date, received_date)
    SELECT grli.product_id, gr.warehouse_id, grli.bin_location_id, grli.quantity_accepted, grli.batch_number, grli.expiry_date, gr.received_date
    FROM goods_receipt_lines grli
    JOIN goods_receipts gr ON grli.goods_receipt_id = gr.id
    WHERE grli.goods_receipt_id = NEW.id
      AND grli.bin_location_id IS NOT NULL
    ON CONFLICT (product_id, warehouse_id, bin_location_id, batch_number)
    DO UPDATE SET quantity = stock_in_bins.quantity + EXCLUDED.quantity;

    INSERT INTO stock_levels (product_id, warehouse_id, bin_location_id, quantity_on_hand, quantity_reserved)
    SELECT grli.product_id, gr.warehouse_id, NULL::UUID, SUM(grli.quantity_accepted), 0
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

CREATE TRIGGER trigger_add_stock_on_gr_complete ON goods_receipts
AFTER UPDATE OF status FOR EACH ROW EXECUTE FUNCTION add_stock_on_gr_complete();

-- ============================================================
-- TRIGGER 11: Release reservation when Sales Order is CANCELLED
-- ============================================================
CREATE OR REPLACE FUNCTION release_reservation_on_so_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE stock_levels sl
    SET quantity_reserved = GREATEST(0, quantity_reserved - COALESCE(soli.quantity_ordered, 0))
    FROM sales_order_lines soli
    WHERE soli.sales_order_id = NEW.id
      AND soli.product_id = sl.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_release_reservation_on_so_cancel ON sales_orders
AFTER UPDATE OF status FOR EACH ROW EXECUTE FUNCTION release_reservation_on_so_cancel();

-- ============================================================
-- TRIGGER 12: Execute stock transfer when status = 'done'
-- ============================================================
CREATE OR REPLACE FUNCTION execute_stock_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status IN ('draft', 'validated') THEN
    UPDATE stock_in_bins sib
    SET quantity = GREATEST(0, sib.quantity - COALESCE(stl.quantity, 0))
    FROM stock_transfer_lines stl
    JOIN stock_transfers st ON stl.transfer_id = st.id
    WHERE stl.transfer_id = NEW.id
      AND stl.product_id = sib.product_id
      AND stl.from_bin_location_id = sib.bin_location_id
      AND sib.warehouse_id = st.source_warehouse_id;

    INSERT INTO stock_in_bins (product_id, warehouse_id, bin_location_id, quantity, received_date)
    SELECT stl.product_id, st.destination_warehouse_id, stl.to_bin_location_id, stl.quantity, CURRENT_DATE
    FROM stock_transfer_lines stl
    JOIN stock_transfers st ON stl.transfer_id = st.id
    WHERE stl.transfer_id = NEW.id
    ON CONFLICT (product_id, warehouse_id, bin_location_id, batch_number)
    DO UPDATE SET quantity = stock_in_bins.quantity + EXCLUDED.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_execute_stock_transfer ON stock_transfers
AFTER UPDATE OF status FOR EACH ROW EXECUTE FUNCTION execute_stock_transfer();

-- ============================================================
-- TRIGGER 13: Apply adjustment when APPROVED
-- ============================================================
CREATE OR REPLACE FUNCTION apply_adjustment_on_approve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IN ('draft', 'counted') THEN
    UPDATE stock_levels sl
    SET quantity_on_hand = GREATEST(0, sl.quantity_on_hand + COALESCE(al.quantity_variance, 0)),
        last_adjusted_at = NOW()
    FROM adjustment_lines al
    JOIN adjustments a ON al.adjustment_id = a.id
    WHERE al.adjustment_id = NEW.id
      AND al.product_id = sl.product_id
      AND a.warehouse_id = sl.warehouse_id
      AND sl.bin_location_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_apply_adjustment ON adjustments
AFTER UPDATE OF status FOR EACH ROW EXECUTE FUNCTION apply_adjustment_on_approve();

-- ============================================================
-- TRIGGER 14: Auto-create customer from WON lead
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_customer_on_lead_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage_id IS NOT NULL AND (
    SELECT is_won FROM lead_stages WHERE id = NEW.stage_id
  ) = TRUE
  AND (OLD.stage_id IS NULL OR (SELECT is_won FROM lead_stages WHERE id = OLD.stage_id) = FALSE
  ) THEN
    IF NEW.customer_id IS NULL AND NEW.contact_person_email IS NOT NULL THEN
      INSERT INTO customers (name, customer_type, contact_person_name, contact_person_email, contact_person_phone, billing_address, shipping_address, company_tax_id, lead_id, status)
      VALUES (
        NEW.company_name,
        COALESCE(NEW.customer_type, 'B2C'),
        COALESCE(NEW.contact_person_name, NEW.company_name),
        NEW.contact_person_email,
        NEW.contact_person_phone,
        NEW.company_address,
        NEW.company_address,
        NEW.company_tax_id,
        NEW.id,
        'active'
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_customer_on_lead_won
BEFORE UPDATE OF stage_id ON leads
FOR EACH ROW EXECUTE FUNCTION auto_create_customer_on_lead_won();

-- ============================================================
-- TRIGGER 15: Create auto-quotation for auto_request leads
-- ============================================================
CREATE OR REPLACE FUNCTION create_auto_quotation_on_lead_proposition()
RETURNS TRIGGER AS $$
DECLARE
  v_is_auto BOOLEAN;
  v_stage_name VARCHAR(50);
  v_won BOOLEAN;
BEGIN
  v_stage_name := (SELECT name FROM lead_stages WHERE id = NEW.stage_id);
  v_won := (SELECT is_won FROM lead_stages WHERE id = NEW.stage_id);
  v_is_auto := NEW.is_auto_request = TRUE;

  IF v_stage_name = 'proposition' AND v_is_auto = TRUE AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO quotations (quotation_number, lead_id, customer_id, issued_date, valid_until_date, status, tax_percent, notes, created_by_id)
    SELECT
      'QTN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('quotation_seq')::TEXT, 4, '0'),
      NEW.id,
      NEW.customer_id,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      'sent',
      COALESCE(NEW.tax_percent, 10.0),
      'Auto-generated quotation from lead. Lead contact: ' || COALESCE(NEW.contact_person_email, ''),
      NEW.owner_id
    RETURNING id INTO NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Disabled by default. Enable only after testing:
-- CREATE TRIGGER trigger_create_auto_quotation_on_lead_proposition
-- AFTER UPDATE OF stage_id ON leads
-- FOR EACH ROW EXECUTE FUNCTION create_auto_quotation_on_lead_proposition();

-- ============================================================
-- STEP 10: INDEXES
-- ============================================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_gin ON products USING GIN (name gin_trgm_ops);

CREATE INDEX idx_customers_email ON customers(contact_person_email);
CREATE INDEX idx_customers_lead ON customers(lead_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name_gin ON customers USING GIN (name gin_trgm_ops);

CREATE INDEX idx_suppliers_type ON suppliers(supplier_type_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_name_gin ON suppliers USING GIN (name gin_trgm_ops);

CREATE INDEX idx_leads_stage ON leads(stage_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_customer ON leads(customer_id);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_name_gin ON leads USING GIN (company_name gin_trgm_ops);

CREATE INDEX idx_lead_products_lead ON lead_products(lead_id);
CREATE INDEX idx_lead_products_product ON lead_products(product_id);

CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_type ON activities(activity_type_id);
CREATE INDEX idx_activities_performed ON activities(performed_by_id);

CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_lead ON quotations(lead_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_date ON quotations(issued_date);

CREATE INDEX idx_quotation_lines_quotation ON quotation_lines(quotation_id);
CREATE INDEX idx_quotation_lines_product ON quotation_lines(product_id);

CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_lead ON sales_orders(lead_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);

CREATE INDEX idx_sales_order_lines_order ON sales_order_lines(sales_order_id);
CREATE INDEX idx_sales_order_lines_product ON sales_order_lines(product_id);

CREATE INDEX idx_delivery_orders_so ON delivery_orders(sales_order_id);
CREATE INDEX idx_delivery_orders_warehouse ON delivery_orders(warehouse_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);

CREATE INDEX idx_goods_receipts_po ON goods_receipts(purchase_order_id);
CREATE INDEX idx_goods_receipts_warehouse ON goods_receipts(warehouse_id);
CREATE INDEX idx_goods_receipts_status ON goods_receipts(status);

CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX idx_stock_levels_bin ON stock_levels(bin_location_id);

CREATE INDEX idx_stock_in_bins_product ON stock_in_bins(product_id);
CREATE INDEX idx_stock_in_bins_warehouse ON stock_in_bins(warehouse_id);
CREATE INDEX idx_stock_in_bins_bin ON stock_in_bins(bin_location_id);

CREATE INDEX idx_customer_invoices_customer ON customer_invoices(customer_id);
CREATE INDEX idx_customer_invoices_status ON customer_invoices(status);

CREATE INDEX idx_vendor_bills_supplier ON vendor_bills(supplier_id);
CREATE INDEX idx_vendor_bills_status ON vendor_bills(status);

CREATE INDEX idx_mac_serial_product ON mac_serial_mapping(product_id);
CREATE INDEX idx_mac_serial_customer ON mac_serial_mapping(customer_id);
CREATE INDEX idx_mac_serial_serial ON mac_serial_mapping(serial_number);

-- ============================================================
-- STEP 11: AUTO-BOM SEED DATA (Sample packages)
-- ============================================================

-- Apartment SmartHome package BOM
-- Parent products are marked is_auto_bom = TRUE
