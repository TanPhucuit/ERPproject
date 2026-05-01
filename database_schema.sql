-- ============================================================================
-- NOVATECH DISTRIBUTION - ERP SYSTEM DATABASE SCHEMA
-- For: Smart Home & IoT Equipment Distribution
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- ============================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ORGANIZATIONS & SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_departments_name ON departments(name);

-- ============================================================================
-- 2. USERS & AUTHENTICATION (Simplified - No JWT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),  -- Profile image URL (link)
  role VARCHAR(50) NOT NULL DEFAULT 'user',  -- CEO, Sales_Manager, Purchasing_Manager, Warehouse_Manager, Accountant, Admin
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',  -- active, inactive, suspended, deleted
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_is_deleted ON users(is_deleted);

-- ============================================================================
-- 3. PRODUCT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  image_url VARCHAR(500),
  display_order INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_product_categories_name ON product_categories(name);
CREATE INDEX idx_product_categories_parent_id ON product_categories(parent_id);

CREATE TABLE IF NOT EXISTS units_of_measure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) NOT NULL UNIQUE,  -- pcs, box, pack, kg, m, etc.
  name VARCHAR(100) NOT NULL,
  conversion_factor DECIMAL(10, 4) DEFAULT 1.0,  -- For future multi-unit support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_units_of_measure_code ON units_of_measure(code);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
  image_url VARCHAR(500),  -- Product image URL (link)
  list_price DECIMAL(15, 2) NOT NULL,  -- Selling price
  cost_price DECIMAL(15, 2) NOT NULL,  -- Cost/Purchase price
  profit_margin_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN list_price = 0 THEN 0
      ELSE ((list_price - cost_price) / list_price * 100)
    END
  ) STORED,  -- Auto-calculated profit margin %
  reorder_level INT DEFAULT 10,  -- Minimum stock level
  reorder_quantity INT DEFAULT 50,  -- Quantity to order when stock is low
  supplier_lead_time_days INT DEFAULT 7,  -- Average lead time from supplier
  status VARCHAR(50) DEFAULT 'active',  -- active, discontinued, prototype
  barcode VARCHAR(100),  -- For future barcode scanning
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_deleted ON products(is_deleted);

-- ============================================================================
-- 4. CRM MODULE - Leads & Opportunities
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  color_code VARCHAR(7),  -- HEX color for UI
  probability_percent INT DEFAULT 50,  -- Default probability for this stage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO lead_stages (name, display_order, color_code, probability_percent) VALUES
  ('new', 1, '#808080', 10),
  ('site_survey', 2, '#4A90E2', 30),
  ('proposition', 3, '#F5A623', 60),
  ('won', 4, '#7ED321', 100),
  ('lost', 5, '#D0021B', 0)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'LEAD-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  company_name VARCHAR(255) NOT NULL,
  contact_person_name VARCHAR(255) NOT NULL,
  contact_person_phone VARCHAR(20),
  contact_person_email VARCHAR(255),
  company_address TEXT,
  company_tax_id VARCHAR(50),
  stage_id UUID NOT NULL REFERENCES lead_stages(id) ON DELETE RESTRICT,
  source VARCHAR(100),  -- Direct, Website, Referral, Event, Cold Call, Email, etc.
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Sales Manager
  estimated_value DECIMAL(15, 2),  -- Expected contract value (VNĐ)
  probability_percent INT DEFAULT 50,  -- Win probability (%)
  expected_close_date DATE,
  closed_date DATE,
  lead_rating VARCHAR(10),  -- Hot, Warm, Cold
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_leads_company_name ON leads(company_name);
CREATE INDEX idx_leads_stage_id ON leads(stage_id);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_is_deleted ON leads(is_deleted);
CREATE INDEX idx_leads_created_at ON leads(created_at);

CREATE TABLE IF NOT EXISTS activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_class VARCHAR(100),  -- For UI icons
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO activity_types (name, description) VALUES
  ('call', 'Phone Call'),
  ('email', 'Email Communication'),
  ('meeting', 'In-person or Video Meeting'),
  ('site_survey', 'Site Visit/Survey'),
  ('quotation', 'Quotation Preparation/Sending'),
  ('proposal', 'Proposal Presentation'),
  ('follow_up', 'Follow-up'),
  ('negotiation', 'Price/Terms Negotiation'),
  ('contract', 'Contract Signing'),
  ('note', 'Internal Note')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type_id UUID REFERENCES activity_types(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  actual_date TIMESTAMP WITH TIME ZONE,
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'planned',  -- planned, in_progress, done, cancelled
  outcome TEXT,  -- Result/notes after activity is done
  attachments JSONB,  -- Array of {filename, url} for documents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_assigned_to_id ON activities(assigned_to_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_scheduled_date ON activities(scheduled_date);

-- ============================================================================
-- 5. CUSTOMERS & ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'CUST-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  name VARCHAR(255) NOT NULL,
  company_tax_id VARCHAR(50) UNIQUE,
  customer_type VARCHAR(50) NOT NULL,  -- B2B, B2C
  contact_person_name VARCHAR(255),
  contact_person_email VARCHAR(255),
  contact_person_phone VARCHAR(20),
  billing_address TEXT,
  shipping_address TEXT,
  billing_city VARCHAR(100),
  billing_province VARCHAR(100),
  billing_postal_code VARCHAR(20),
  shipping_same_as_billing BOOLEAN DEFAULT TRUE,
  credit_limit DECIMAL(15, 2) DEFAULT 0,
  credit_used DECIMAL(15, 2) DEFAULT 0,  -- Current outstanding balance
  payment_terms VARCHAR(50) DEFAULT 'NET30',  -- NET30, NET60, COD, Prepaid
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Link back to original lead
  status VARCHAR(50) DEFAULT 'active',  -- active, inactive, blocked
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_customer_type ON customers(customer_type);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_is_deleted ON customers(is_deleted);
CREATE INDEX idx_customers_lead_id ON customers(lead_id);

-- ============================================================================
-- 6. SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO supplier_types (name, description) VALUES
  ('equipment', 'Equipment & Product Suppliers'),
  ('components', 'Component & Part Suppliers'),
  ('logistics', 'Logistics & Transportation'),
  ('services', 'Service Providers (Packaging, Office Supply, etc.)'),
  ('maintenance', 'Maintenance & Repair Services')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'SUPP-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  name VARCHAR(255) NOT NULL,
  company_tax_id VARCHAR(50),
  supplier_type_id UUID REFERENCES supplier_types(id) ON DELETE RESTRICT,
  contact_person_name VARCHAR(255),
  contact_person_email VARCHAR(255),
  contact_person_phone VARCHAR(20),
  company_address TEXT,
  company_city VARCHAR(100),
  company_province VARCHAR(100),
  company_postal_code VARCHAR(20),
  company_website VARCHAR(500),
  logo_url VARCHAR(500),  -- Supplier company logo/image (link)
  payment_terms VARCHAR(50) DEFAULT 'NET30',  -- NET30, NET60, COD, Prepaid
  average_lead_time_days INT DEFAULT 7,
  quality_rating DECIMAL(3, 1) DEFAULT 5.0,  -- 0-5 stars
  is_preferred BOOLEAN DEFAULT FALSE,  -- Preferred supplier flag
  status VARCHAR(50) DEFAULT 'active',  -- active, inactive, blocked
  total_spent DECIMAL(15, 2) DEFAULT 0,  -- Total purchase amount (metric)
  average_response_time_hours DECIMAL(5, 2),  -- Average time to respond (metric)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_is_preferred ON suppliers(is_preferred);
CREATE INDEX idx_suppliers_is_deleted ON suppliers(is_deleted);

-- ============================================================================
-- 7. SALES MODULE - Quotations & Sales Orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'QTN-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, sent, accepted, rejected, expired
  total_amount_before_tax DECIMAL(15, 2) DEFAULT 0,
  total_discount DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  estimated_profit DECIMAL(15, 2) DEFAULT 0,  -- Calculated: total revenue - total cost
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  internal_notes TEXT,
  attachments JSONB,  -- Array of {filename, url}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_issued_date ON quotations(issued_date);
CREATE INDEX idx_quotations_is_deleted ON quotations(is_deleted);

CREATE TABLE IF NOT EXISTS quotation_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sequence_number INT,
  quantity_quoted INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 10,
  notes TEXT,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (
    quantity_quoted * unit_price * (1 - discount_percent/100) * (1 + tax_percent/100)
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotation_lines_quotation_id ON quotation_lines(quotation_id);
CREATE INDEX idx_quotation_lines_product_id ON quotation_lines(product_id);

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'SO-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_delivery_date DATE NOT NULL,
  actual_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, confirmed, partially_shipped, shipped, delivered, cancelled
  total_amount_before_tax DECIMAL(15, 2) DEFAULT 0,
  total_discount DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,  -- Sum of (quantity * cost_price) for all items
  estimated_profit DECIMAL(15, 2) GENERATED ALWAYS AS (
    total_amount - total_cost
  ) STORED,  -- Profit = Revenue - Total Cost
  profit_margin_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN total_amount = 0 THEN 0
      ELSE ((total_amount - total_cost) / total_amount * 100)
    END
  ) STORED,
  sales_person_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  internal_notes TEXT,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_order_date ON sales_orders(order_date);
CREATE INDEX idx_sales_orders_is_deleted ON sales_orders(is_deleted);

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sequence_number INT,
  quantity_ordered INT NOT NULL,
  quantity_delivered INT DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL,  -- Selling price
  cost_price DECIMAL(15, 2) NOT NULL,  -- Purchase/Cost price at time of order
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 10,
  line_profit DECIMAL(15, 2) GENERATED ALWAYS AS (
    (quantity_ordered * unit_price - quantity_ordered * cost_price) * (1 - discount_percent/100)
  ) STORED,  -- Profit per line
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_order_lines_sales_order_id ON sales_order_lines(sales_order_id);
CREATE INDEX idx_sales_order_lines_product_id ON sales_order_lines(product_id);

-- ============================================================================
-- 8. PURCHASE MODULE - RFQ & Purchase Orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'RFQ-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closing_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, sent, closed, cancelled
  total_line_items INT DEFAULT 0,
  total_estimated_cost DECIMAL(15, 2) DEFAULT 0,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Purchasing Manager
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_issued_date ON rfqs(issued_date);
CREATE INDEX idx_rfqs_is_deleted ON rfqs(is_deleted);

CREATE TABLE IF NOT EXISTS rfq_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sequence_number INT,
  quantity_required INT NOT NULL,
  required_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rfq_lines_rfq_id ON rfq_lines(rfq_id);
CREATE INDEX idx_rfq_lines_product_id ON rfq_lines(product_id);

CREATE TABLE IF NOT EXISTS rfq_supplier_quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_line_id UUID NOT NULL REFERENCES rfq_lines(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  quoted_price DECIMAL(15, 2) NOT NULL,
  quoted_lead_time_days INT,
  minimum_order_quantity INT,
  received_date TIMESTAMP WITH TIME ZONE,
  is_selected BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rfq_supplier_quotations_rfq_line_id ON rfq_supplier_quotations(rfq_line_id);
CREATE INDEX idx_rfq_supplier_quotations_supplier_id ON rfq_supplier_quotations(supplier_id);
CREATE INDEX idx_rfq_supplier_quotations_is_selected ON rfq_supplier_quotations(is_selected);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'PO-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_delivery_date DATE NOT NULL,
  actual_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, confirmed, partial_received, received, cancelled
  total_amount_before_tax DECIMAL(15, 2) DEFAULT 0,
  total_tax DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  received_amount DECIMAL(15, 2) DEFAULT 0,  -- Amount of items actually received
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  internal_notes TEXT,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_is_deleted ON purchase_orders(is_deleted);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sequence_number INT,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_percent DECIMAL(5, 2) DEFAULT 10,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (
    quantity_ordered * unit_price * (1 + tax_percent/100)
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchase_order_lines_purchase_order_id ON purchase_order_lines(purchase_order_id);
CREATE INDEX idx_purchase_order_lines_product_id ON purchase_order_lines(product_id);

-- ============================================================================
-- 9. INVENTORY MODULE - Warehouses & Stock Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location_address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  capacity_sqm DECIMAL(10, 2),  -- Square meters
  current_occupancy_sqm DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',  -- active, maintenance, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_warehouses_warehouse_code ON warehouses(warehouse_code);
CREATE INDEX idx_warehouses_status ON warehouses(status);
CREATE INDEX idx_warehouses_is_deleted ON warehouses(is_deleted);

CREATE TABLE IF NOT EXISTS warehouse_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  zone_code VARCHAR(10) NOT NULL,  -- A, B, C, etc.
  zone_name VARCHAR(100),  -- High Value, Small Items, Bulky, etc.
  description TEXT,
  capacity_sqm DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_warehouse_zones_warehouse_id ON warehouse_zones(warehouse_id);

CREATE TABLE IF NOT EXISTS bin_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES warehouse_zones(id) ON DELETE CASCADE,
  bin_code VARCHAR(20) NOT NULL,  -- A1, A2, B1, etc.
  description TEXT,
  capacity_units INT,
  current_occupancy_units INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',  -- active, maintenance, reserve
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bin_locations_warehouse_id ON bin_locations(warehouse_id);
CREATE INDEX idx_bin_locations_bin_code ON bin_locations(bin_code);
CREATE UNIQUE INDEX idx_bin_locations_unique ON bin_locations(warehouse_id, bin_code);

CREATE TABLE IF NOT EXISTS stock_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity_on_hand INT DEFAULT 0,  -- Physical stock in warehouse
  quantity_reserved INT DEFAULT 0,  -- Allocated to SO but not yet shipped
  quantity_available INT GENERATED ALWAYS AS (
    quantity_on_hand - quantity_reserved
  ) STORED,  -- Available for sale
  quantity_in_transit INT DEFAULT 0,  -- Stock being transported (in GR)
  last_counted_at TIMESTAMP WITH TIME ZONE,
  last_adjusted_at TIMESTAMP WITH TIME ZONE,
  reorder_status VARCHAR(50),  -- optimal, overstocked, understocked, critical
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_levels_product_id ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_warehouse_id ON stock_levels(warehouse_id);
CREATE UNIQUE INDEX idx_stock_levels_unique ON stock_levels(product_id, warehouse_id);

CREATE TABLE IF NOT EXISTS stock_in_bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bin_location_id UUID NOT NULL REFERENCES bin_locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 0,
  batch_number VARCHAR(100),
  expiry_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_in_bins_bin_location_id ON stock_in_bins(bin_location_id);
CREATE INDEX idx_stock_in_bins_product_id ON stock_in_bins(product_id);
CREATE UNIQUE INDEX idx_stock_in_bins_unique ON stock_in_bins(bin_location_id, product_id, batch_number);

CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  contact_person_name VARCHAR(255),
  contact_person_phone VARCHAR(20),
  contact_person_email VARCHAR(255),
  company_address TEXT,
  cost_per_km DECIMAL(10, 2),
  average_delivery_time_days INT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_order_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'DO-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, ready, picked, shipped, in_transit, delivered, cancelled
  scheduled_delivery_date DATE,
  actual_delivery_date DATE,
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  tracking_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_delivery_orders_sales_order_id ON delivery_orders(sales_order_id);
CREATE INDEX idx_delivery_orders_warehouse_id ON delivery_orders(warehouse_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_is_deleted ON delivery_orders(is_deleted);

CREATE TABLE IF NOT EXISTS delivery_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  sales_order_line_id UUID NOT NULL REFERENCES sales_order_lines(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_to_deliver INT NOT NULL,
  quantity_delivered INT DEFAULT 0,
  bin_location_id UUID REFERENCES bin_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_delivery_order_lines_delivery_order_id ON delivery_order_lines(delivery_order_id);
CREATE INDEX idx_delivery_order_lines_product_id ON delivery_order_lines(product_id);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goods_receipt_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'GR-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, received, verified, completed, cancelled
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  verified_date DATE,
  verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_goods_receipts_purchase_order_id ON goods_receipts(purchase_order_id);
CREATE INDEX idx_goods_receipts_warehouse_id ON goods_receipts(warehouse_id);
CREATE INDEX idx_goods_receipts_status ON goods_receipts(status);
CREATE INDEX idx_goods_receipts_is_deleted ON goods_receipts(is_deleted);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id UUID NOT NULL REFERENCES purchase_order_lines(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_received INT NOT NULL,
  quantity_accepted INT DEFAULT 0,
  quantity_rejected INT DEFAULT 0,
  quality_status VARCHAR(50) DEFAULT 'good',  -- good, defective, damaged, wrong_item
  bin_location_id UUID REFERENCES bin_locations(id) ON DELETE SET NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_goods_receipt_lines_goods_receipt_id ON goods_receipt_lines(goods_receipt_id);
CREATE INDEX idx_goods_receipt_lines_product_id ON goods_receipt_lines(product_id);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjustment_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'ADJ-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  adjustment_type VARCHAR(50),  -- stock_count, damage_loss, destruction, correction
  count_date DATE,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, confirmed, completed
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_inventory_adjustments_warehouse_id ON inventory_adjustments(warehouse_id);
CREATE INDEX idx_inventory_adjustments_status ON inventory_adjustments(status);
CREATE INDEX idx_inventory_adjustments_is_deleted ON inventory_adjustments(is_deleted);

CREATE TABLE IF NOT EXISTS inventory_adjustment_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjustment_id UUID NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  bin_location_id UUID REFERENCES bin_locations(id) ON DELETE SET NULL,
  quantity_system INT,  -- Quantity according to system
  quantity_actual INT,  -- Actual physical count
  quantity_variance INT GENERATED ALWAYS AS (
    quantity_actual - quantity_system
  ) STORED,  -- Difference (positive = gain, negative = loss)
  variance_reason VARCHAR(50),  -- loss, damage, miscount, other
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_adjustment_lines_adjustment_id ON inventory_adjustment_lines(adjustment_id);
CREATE INDEX idx_inventory_adjustment_lines_product_id ON inventory_adjustment_lines(product_id);

-- ============================================================================
-- 10. ACCOUNTING MODULE (Finance) - Optional but recommended for metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_code VARCHAR(20) NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50),  -- Asset, Liability, Equity, Revenue, Expense
  account_subtype VARCHAR(50),  -- Current Asset, Fixed Asset, AP, AR, etc.
  description TEXT,
  normal_balance VARCHAR(10),  -- Debit or Credit
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO accounts (account_code, account_name, account_type, account_subtype, description, normal_balance) VALUES
  ('1110', 'Cash - VNĐ', 'Asset', 'Current Asset', 'Cash in hand - Vietnamese Dong', 'Debit'),
  ('1120', 'Bank - Vietcombank', 'Asset', 'Current Asset', 'Bank account - Vietcombank', 'Debit'),
  ('1200', 'Accounts Receivable', 'Asset', 'Current Asset', 'Customer invoices outstanding', 'Debit'),
  ('1300', 'Inventory', 'Asset', 'Current Asset', 'Stock of goods', 'Debit'),
  ('2100', 'Accounts Payable', 'Liability', 'Current Liability', 'Supplier invoices payable', 'Credit'),
  ('5100', 'Sales Revenue', 'Revenue', 'Operating Revenue', 'Sales of products', 'Credit'),
  ('5200', 'Cost of Goods Sold', 'Expense', 'COGS', 'Cost of products sold', 'Debit'),
  ('6100', 'Operating Expenses', 'Expense', 'Operating Expense', 'Salary, utilities, etc.', 'Debit')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number VARCHAR(50) NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(50),  -- SO, PO, DO, GR, ADJ, etc.
  reference_id UUID,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, posted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  line_sequence INT,
  debit_amount DECIMAL(15, 2) DEFAULT 0,
  credit_amount DECIMAL(15, 2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

-- ============================================================================
-- 11. AUDIT & LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),  -- Store email as well for deleted users
  entity_type VARCHAR(100),  -- Lead, Sales_Order, PO, Delivery, etc.
  entity_id UUID,
  entity_number VARCHAR(50),  -- QTN-001, SO-001, etc.
  action VARCHAR(50),  -- CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
  old_values JSONB,  -- Previous values (for UPDATE)
  new_values JSONB,  -- New values (for CREATE/UPDATE)
  change_summary TEXT,  -- Human-readable summary
  ip_address VARCHAR(45),  -- IPv4 or IPv6
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 12. METRICS & ANALYTICS TABLES (For Dashboard & Reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL,
  total_sales_revenue DECIMAL(15, 2) DEFAULT 0,  -- Sum of all SO totals
  total_cost DECIMAL(15, 2) DEFAULT 0,  -- Sum of COGS
  total_profit DECIMAL(15, 2) DEFAULT 0,  -- Revenue - Cost
  profit_margin_percent DECIMAL(5, 2) DEFAULT 0,  -- (Profit / Revenue) * 100
  total_purchase_spent DECIMAL(15, 2) DEFAULT 0,  -- Sum of all PO totals
  orders_created INT DEFAULT 0,  -- Number of SO created
  orders_delivered INT DEFAULT 0,  -- Number of SO delivered
  invoices_issued INT DEFAULT 0,
  leads_created INT DEFAULT 0,
  leads_converted INT DEFAULT 0,
  top_product_id UUID REFERENCES products(id) ON DELETE SET NULL,  -- Best selling product
  top_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,  -- Highest spending customer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_daily_metrics_metric_date ON daily_metrics(metric_date);

CREATE TABLE IF NOT EXISTS product_sales_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_quantity_sold INT DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  average_selling_price DECIMAL(15, 2) DEFAULT 0,
  times_sold INT DEFAULT 0,  -- Number of transactions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_sales_metrics_product_id ON product_sales_metrics(product_id);
CREATE INDEX idx_product_sales_metrics_period_start_date ON product_sales_metrics(period_start_date);

CREATE TABLE IF NOT EXISTS customer_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(15, 2) DEFAULT 0,
  average_order_value DECIMAL(15, 2) DEFAULT 0,
  total_items_purchased INT DEFAULT 0,
  last_purchase_date DATE,
  status VARCHAR(50),  -- active, inactive, vip, at_risk
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_metrics_customer_id ON customer_metrics(customer_id);
CREATE INDEX idx_customer_metrics_period_start_date ON customer_metrics(period_start_date);

CREATE TABLE IF NOT EXISTS supplier_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(15, 2) DEFAULT 0,
  on_time_delivery_percent DECIMAL(5, 2) DEFAULT 0,
  average_lead_time_days DECIMAL(5, 2) DEFAULT 0,
  defect_rate_percent DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_supplier_metrics_supplier_id ON supplier_metrics(supplier_id);
CREATE INDEX idx_supplier_metrics_period_start_date ON supplier_metrics(period_start_date);

-- ============================================================================
-- 13. SETTINGS & CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50),  -- string, number, boolean, json
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO company_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name', 'NovaTech Distribution', 'string', 'Official company name'),
  ('company_tax_id', '0123456789', 'string', 'Company tax identification number'),
  ('default_tax_rate', '10', 'number', 'Default tax rate in percent'),
  ('currency_code', 'VND', 'string', 'Default currency'),
  ('quotation_prefix', 'QTN', 'string', 'Prefix for quotation numbers'),
  ('sales_order_prefix', 'SO', 'string', 'Prefix for sales order numbers'),
  ('purchase_order_prefix', 'PO', 'string', 'Prefix for purchase order numbers'),
  ('enable_credit_hold', 'true', 'boolean', 'Block orders if customer exceeds credit limit')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to key tables
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_products_timestamp BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_leads_timestamp BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_quotations_timestamp BEFORE UPDATE ON quotations
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_sales_orders_timestamp BEFORE UPDATE ON sales_orders
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_purchase_orders_timestamp BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 15. INVOICING MODULE (CRITICAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'INV-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, issued, sent, partial_paid, paid, overdue, cancelled
  total_amount_before_tax DECIMAL(15, 2) DEFAULT 0,
  total_tax DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  paid_amount DECIMAL(15, 2) DEFAULT 0,  -- Amount already received
  outstanding_amount DECIMAL(15, 2) GENERATED ALWAYS AS (
    total_amount - paid_amount
  ) STORED,
  payment_terms VARCHAR(50),  -- NET30, NET60, etc.
  description TEXT,
  notes TEXT,
  issued_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMP WITH TIME ZONE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_customer_invoices_customer_id ON customer_invoices(customer_id);
CREATE INDEX idx_customer_invoices_sales_order_id ON customer_invoices(sales_order_id);
CREATE INDEX idx_customer_invoices_status ON customer_invoices(status);
CREATE INDEX idx_customer_invoices_invoice_date ON customer_invoices(invoice_date);
CREATE INDEX idx_customer_invoices_due_date ON customer_invoices(due_date);
CREATE INDEX idx_customer_invoices_is_deleted ON customer_invoices(is_deleted);

CREATE TABLE IF NOT EXISTS customer_invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
  sales_order_line_id UUID REFERENCES sales_order_lines(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 10,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (
    quantity * unit_price * (1 - discount_percent/100) * (1 + tax_percent/100)
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_invoice_lines_invoice_id ON customer_invoice_lines(invoice_id);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'BILL-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, received, verified, partial_paid, paid, overdue, cancelled
  total_amount_before_tax DECIMAL(15, 2) DEFAULT 0,
  total_tax DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) GENERATED ALWAYS AS (
    total_amount - paid_amount
  ) STORED,
  payment_terms VARCHAR(50),
  notes TEXT,
  received_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  received_at TIMESTAMP WITH TIME ZONE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_vendor_bills_supplier_id ON vendor_bills(supplier_id);
CREATE INDEX idx_vendor_bills_purchase_order_id ON vendor_bills(purchase_order_id);
CREATE INDEX idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX idx_vendor_bills_bill_date ON vendor_bills(bill_date);
CREATE INDEX idx_vendor_bills_is_deleted ON vendor_bills(is_deleted);

CREATE TABLE IF NOT EXISTS vendor_bill_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  purchase_order_line_id UUID REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_percent DECIMAL(5, 2) DEFAULT 10,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (
    quantity * unit_price * (1 + tax_percent/100)
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendor_bill_lines_bill_id ON vendor_bill_lines(bill_id);

-- ============================================================================
-- 16. CREDIT & DEBIT NOTES (For Returns/Adjustments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_note_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'CN-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  invoice_id UUID NOT NULL REFERENCES customer_invoices(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  reason VARCHAR(255),  -- Product defective, Wrong item shipped, Price adjustment, etc.
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, issued, applied
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX idx_credit_notes_status ON credit_notes(status);
CREATE INDEX idx_credit_notes_is_deleted ON credit_notes(is_deleted);

CREATE TABLE IF NOT EXISTS credit_note_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  reason_detail TEXT,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (
    quantity * unit_price
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_credit_note_lines_credit_note_id ON credit_note_lines(credit_note_id);

CREATE TABLE IF NOT EXISTS debit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debit_note_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'DN-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  bill_id UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  reason VARCHAR(255),  -- Defective items received, Wrong items shipped, Price adjustment, etc.
  debit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, issued, applied
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_debit_notes_bill_id ON debit_notes(bill_id);
CREATE INDEX idx_debit_notes_supplier_id ON debit_notes(supplier_id);
CREATE INDEX idx_debit_notes_status ON debit_notes(status);
CREATE INDEX idx_debit_notes_is_deleted ON debit_notes(is_deleted);

CREATE TABLE IF NOT EXISTS debit_note_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debit_note_id UUID NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  reason_detail TEXT,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (
    quantity * unit_price
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_debit_note_lines_debit_note_id ON debit_note_lines(debit_note_id);

-- ============================================================================
-- 17. PAYMENT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,  -- Bank Transfer, Check, Cash, Credit Card, etc.
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO payment_methods (name, description) VALUES
  ('Bank Transfer', 'Direct bank transfer / Electronic fund transfer'),
  ('Check', 'Cheque payment'),
  ('Cash', 'Cash payment in hand'),
  ('Credit Card', 'Credit card payment'),
  ('Digital Wallet', 'E-wallet or digital payment'),
  ('Other', 'Other payment method')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'PAY-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  invoice_id UUID NOT NULL REFERENCES customer_invoices(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  amount DECIMAL(15, 2) NOT NULL,
  reference_number VARCHAR(100),  -- Check number, Bank ref, etc.
  status VARCHAR(50) DEFAULT 'pending',  -- pending, confirmed, cleared, failed, reversed
  notes TEXT,
  received_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_payments_invoice_id ON customer_payments(invoice_id);
CREATE INDEX idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX idx_customer_payments_payment_date ON customer_payments(payment_date);
CREATE INDEX idx_customer_payments_status ON customer_payments(status);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'SPAY-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  bill_id UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  amount DECIMAL(15, 2) NOT NULL,
  reference_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, confirmed, cleared, failed, reversed
  notes TEXT,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_supplier_payments_bill_id ON supplier_payments(bill_id);
CREATE INDEX idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_payment_date ON supplier_payments(payment_date);

-- ============================================================================
-- 18. SERIAL NUMBER & WARRANTY TRACKING (For IoT/SmartHome devices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS serial_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  mac_address VARCHAR(17),  -- For IoT devices (format XX:XX:XX:XX:XX:XX)
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  purchase_order_line_id UUID REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
  goods_receipt_line_id UUID REFERENCES goods_receipt_lines(id) ON DELETE SET NULL,
  current_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  current_bin_id UUID REFERENCES bin_locations(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'in_stock',  -- in_stock, sold, warranty_claim, damaged, retired
  date_manufactured DATE,
  date_received DATE,
  date_sold DATE,
  sold_to_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_serial_numbers_serial_number ON serial_numbers(serial_number);
CREATE INDEX idx_serial_numbers_product_id ON serial_numbers(product_id);
CREATE INDEX idx_serial_numbers_status ON serial_numbers(status);
CREATE UNIQUE INDEX idx_serial_numbers_mac_address ON serial_numbers(mac_address) WHERE mac_address IS NOT NULL;

CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warranty_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'WAR-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  serial_number_id UUID NOT NULL REFERENCES serial_numbers(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  warranty_type VARCHAR(50) DEFAULT 'standard',  -- standard, extended, vip
  warranty_start_date DATE NOT NULL,
  warranty_end_date DATE NOT NULL,
  coverage_terms TEXT,  -- Detailed warranty terms
  status VARCHAR(50) DEFAULT 'active',  -- active, claimed, expired, voided
  claims_made INT DEFAULT 0,  -- Number of warranty claims
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_warranties_serial_number_id ON warranties(serial_number_id);
CREATE INDEX idx_warranties_customer_id ON warranties(customer_id);
CREATE INDEX idx_warranties_status ON warranties(status);
CREATE INDEX idx_warranties_warranty_end_date ON warranties(warranty_end_date);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number VARCHAR(50) NOT NULL UNIQUE DEFAULT 'WC-' || to_char(NOW(), 'YYYY') || '-' || floor(random() * 10000),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE RESTRICT,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'submitted',  -- submitted, approved, rejected, completed
  resolution TEXT,
  resolution_date DATE,
  notes TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_warranty_claims_warranty_id ON warranty_claims(warranty_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX idx_warranty_claims_claim_date ON warranty_claims(claim_date);

CREATE TRIGGER update_warehouses_timestamp BEFORE UPDATE ON warehouses
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_inventory_adjustments_timestamp BEFORE UPDATE ON inventory_adjustments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_delivery_orders_timestamp BEFORE UPDATE ON delivery_orders
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_goods_receipts_timestamp BEFORE UPDATE ON goods_receipts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 15. INITIAL DATA (Sample)
-- ============================================================================

-- Insert default warehouse zones
INSERT INTO warehouse_zones (warehouse_id, zone_code, zone_name)
SELECT 
  w.id, 
  'A', 
  'High Value Items'
FROM warehouses w
WHERE w.warehouse_code = 'WH-HN'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- Notes:
-- 1. All tables have uuid primary keys for better distributed system support
-- 2. Soft delete (is_deleted) is implemented for audit trail
-- 3. Automatic timestamps (created_at, updated_at) for all main entities
-- 4. Foreign key constraints are set to RESTRICT or CASCADE as appropriate
-- 5. Indexes are created on frequently queried fields
-- 6. Calculated fields use GENERATED ALWAYS ... STORED for performance
-- 7. The schema supports analytics queries with dedicated metrics tables
-- 8. Image URLs are stored as VARCHAR(500) to allow CDN links
-- 9. All amounts use DECIMAL(15,2) for precise financial calculations
-- 10. The company_settings table allows flexible configuration without schema changes
-- ============================================================================
