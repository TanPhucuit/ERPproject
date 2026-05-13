-- ============================================================================
-- NEW ERP SCHEMA - destructive rebuild for Supabase/PostgreSQL
-- Run this before scripts/seed_new_erp.sql.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;

  FOR r IN (
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
  END LOOP;
END $$;

-- ============================================================================
-- Helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION make_doc_number(prefix text, seq_name text)
RETURNS text AS $$
BEGIN
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', seq_name);
  RETURN prefix || '-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval(seq_name)::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.quotation_number, '') = '' THEN
    NEW.quotation_number = make_doc_number('QT', 'quotation_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_sales_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.order_number, '') = '' THEN
    NEW.order_number = make_doc_number('SO', 'sales_order_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.invoice_number, '') = '' THEN
    NEW.invoice_number = make_doc_number('INV', 'invoice_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_purchase_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.order_number, '') = '' THEN
    NEW.order_number = make_doc_number('PO', 'purchase_order_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_vendor_bill_number()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.bill_number, '') = '' THEN
    NEW.bill_number = make_doc_number('VB', 'vendor_bill_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Users and CRM
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','sales','purchasing','warehouse','accountant','manager')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  source TEXT NOT NULL DEFAULT 'referral' CHECK (source IN ('referral','auto_request','website','phone','email','event','other')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','won','lost')),
  probability NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type_id UUID REFERENCES activity_types(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  company_name TEXT,
  tax_id TEXT,
  customer_type TEXT NOT NULL DEFAULT 'individual' CHECK (customer_type IN ('individual','company')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Products and suppliers
-- ============================================================================

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  sku TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  uom TEXT NOT NULL DEFAULT 'pcs',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  warranty_period INTEGER NOT NULL DEFAULT 365,
  repair_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT UNIQUE NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  UNIQUE (supplier_id, sku)
);

-- ============================================================================
-- Sales
-- ============================================================================

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  quotation_number TEXT UNIQUE NOT NULL DEFAULT '',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','rejected')),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_number TEXT UNIQUE NOT NULL DEFAULT '',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','delivering','delivered','cancelled')),
  shipping_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','delivering','delivered')),
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Inventory
-- ============================================================================

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_name TEXT UNIQUE NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  location_code TEXT NOT NULL,
  location_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, location_code)
);

CREATE TABLE stock_in_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bin_location_id UUID NOT NULL REFERENCES bin_locations(id) ON DELETE CASCADE,
  quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  available NUMERIC(14,2) NOT NULL DEFAULT 0,
  UNIQUE (product_id, bin_location_id)
);

CREATE TABLE stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity_on_hand NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  available NUMERIC(14,2) NOT NULL DEFAULT 0,
  new_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  reorder_status TEXT NOT NULL DEFAULT 'normal' CHECK (reorder_status IN ('normal','low','out')),
  UNIQUE (product_id, warehouse_id)
);

CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  src_bin_location_id UUID REFERENCES bin_locations(id) ON DELETE SET NULL,
  target_bin_location_id UUID NOT NULL REFERENCES bin_locations(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  bin_location_id UUID NOT NULL REFERENCES bin_locations(id) ON DELETE RESTRICT,
  quantity_requested NUMERIC(14,2) NOT NULL CHECK (quantity_requested > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Accounting and warranty
-- ============================================================================

CREATE TABLE warranty_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT
);

CREATE TABLE warranty_order_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_orders_id UUID NOT NULL REFERENCES warranty_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  warranty_status TEXT NOT NULL DEFAULT 'unknown' CHECK (warranty_status IN ('in_warranty','expired','unknown')),
  repair_fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL DEFAULT '',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','partial_paid','paid','overdue','cancelled')),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  warranty_orders_id UUID REFERENCES warranty_orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoices_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT UNIQUE NOT NULL,
  bank TEXT,
  name TEXT NOT NULL,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID,
  bill_number TEXT UNIQUE NOT NULL DEFAULT '',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','partial_paid','paid','overdue','cancelled')),
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  vendor_bill_id UUID REFERENCES vendor_bills(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','bank_transfer','card','other')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_account UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  target_account UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((invoice_id IS NOT NULL AND vendor_bill_id IS NULL) OR (invoice_id IS NULL AND vendor_bill_id IS NOT NULL)),
  CHECK (
    (payment_method = 'cash' AND payment_account IS NULL AND target_account IS NULL)
    OR (payment_method <> 'cash' AND payment_account IS NOT NULL AND target_account IS NOT NULL)
  )
);

-- ============================================================================
-- Purchase, declared after vendor_bills dependency fix target is created below
-- ============================================================================

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','closed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_products_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0)
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_number TEXT UNIQUE NOT NULL DEFAULT '',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_arrival_date DATE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','received','cancelled')),
  notes TEXT
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_products_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','delivering','received','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_bills_id UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0
);

ALTER TABLE vendor_bills
  ADD CONSTRAINT vendor_bills_purchase_order_id_fkey
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- ============================================================================
-- Business triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION recalc_quotation_total()
RETURNS TRIGGER AS $$
DECLARE
  qid UUID;
BEGIN
  qid := COALESCE(NEW.quotation_id, OLD.quotation_id);
  UPDATE quotations
  SET total_amount = COALESCE((SELECT SUM(subtotal) FROM quotation_items WHERE quotation_id = qid), 0),
      updated_at = NOW()
  WHERE id = qid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION before_quotation_item_calc()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal = ROUND((NEW.quantity * NEW.unit_price * (1 - COALESCE(NEW.discount_percent, 0) / 100)) + COALESCE(NEW.tax_amount, 0), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION accept_quotation_to_customer()
RETURNS TRIGGER AS $$
DECLARE
  lead_row leads%ROWTYPE;
  customer_id_val UUID;
  sales_order_id_val UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    customer_id_val := NEW.customer_id;

    IF customer_id_val IS NULL AND NEW.lead_id IS NOT NULL THEN
      SELECT * INTO lead_row FROM leads WHERE id = NEW.lead_id;
      SELECT id INTO customer_id_val FROM customers WHERE email = lead_row.email LIMIT 1;
      IF customer_id_val IS NULL THEN
        INSERT INTO customers (full_name, email, phone, company_name, customer_type)
        VALUES (trim(lead_row.first_name || ' ' || lead_row.last_name), lead_row.email, lead_row.phone, lead_row.company, CASE WHEN lead_row.company IS NULL OR lead_row.company = '' THEN 'individual' ELSE 'company' END)
        RETURNING id INTO customer_id_val;
      END IF;
      UPDATE quotations SET customer_id = customer_id_val WHERE id = NEW.id;
    END IF;

    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads SET status = 'won', probability = 100, updated_at = NOW() WHERE id = NEW.lead_id;
    END IF;

    IF customer_id_val IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sales_orders WHERE quotation_id = NEW.id) THEN
      INSERT INTO sales_orders (quotation_id, customer_id, order_date, status, notes)
      VALUES (NEW.id, customer_id_val, CURRENT_DATE, 'ready', 'Auto-created from accepted quotation.')
      RETURNING id INTO sales_order_id_val;

      INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price)
      SELECT sales_order_id_val, product_id, quantity, unit_price
      FROM quotation_items
      WHERE quotation_id = NEW.id;
    END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE leads SET status = 'lost', probability = 0, updated_at = NOW() WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reserve_stock_for_sales_order_item()
RETURNS TRIGGER AS $$
DECLARE
  remaining_qty NUMERIC(14,2);
  allocate_qty NUMERIC(14,2);
  bin_row RECORD;
  delivery_order_id_val UUID;
BEGIN
  remaining_qty := NEW.quantity;

  SELECT id INTO delivery_order_id_val
  FROM delivery_orders
  WHERE sales_order_id = NEW.sales_order_id
    AND status IN ('ready','delivering')
  ORDER BY created_at
  LIMIT 1;

  IF delivery_order_id_val IS NULL THEN
    INSERT INTO delivery_orders (sales_order_id, delivery_date, status, notes)
    VALUES (NEW.sales_order_id, CURRENT_DATE, 'ready', 'Auto-created for reserved sales order stock.')
    RETURNING id INTO delivery_order_id_val;
  END IF;

  FOR bin_row IN
    SELECT
      sib.id,
      sib.bin_location_id,
      sib.available,
      bl.warehouse_id
    FROM stock_in_bins sib
    JOIN bin_locations bl ON bl.id = sib.bin_location_id
    WHERE sib.product_id = NEW.product_id
      AND sib.available > 0
    ORDER BY sib.available DESC, sib.quantity DESC
  LOOP
    EXIT WHEN remaining_qty <= 0;
    allocate_qty := LEAST(remaining_qty, bin_row.available);

    UPDATE stock_in_bins
    SET available = available - allocate_qty
    WHERE id = bin_row.id;

    INSERT INTO delivery_order_items (delivery_order_id, product_id, bin_location_id, quantity_requested)
    VALUES (delivery_order_id_val, NEW.product_id, bin_row.bin_location_id, allocate_qty);

    UPDATE stock_levels
    SET quantity_on_hand = quantity_on_hand + allocate_qty,
        available = GREATEST(available - allocate_qty, 0),
        reorder_status = CASE WHEN GREATEST(available - allocate_qty, 0) <= 0 THEN 'out'
                              WHEN GREATEST(available - allocate_qty, 0) < 10 THEN 'low'
                              ELSE 'normal' END
    WHERE product_id = NEW.product_id
      AND warehouse_id = bin_row.warehouse_id;

    remaining_qty := remaining_qty - allocate_qty;
  END LOOP;

  IF remaining_qty > 0 THEN
    RAISE EXCEPTION 'Insufficient available stock for product %. Missing quantity: %', NEW.product_id, remaining_qty;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_auto_quotation_for_lead()
RETURNS TRIGGER AS $$
DECLARE
  qid UUID;
  product_row RECORD;
BEGIN
  IF NEW.source = 'auto_request' THEN
    INSERT INTO quotations (lead_id, issue_date, valid_until, status, notes)
    VALUES (NEW.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '15 days', 'sent', 'Auto quotation generated from auto-request lead.')
    RETURNING id INTO qid;

    FOR product_row IN
      SELECT id, unit_price FROM products WHERE is_active = TRUE ORDER BY created_at LIMIT 3
    LOOP
      INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount_percent, tax_amount)
      VALUES (qid, product_row.id, 1, product_row.unit_price, 0, ROUND(product_row.unit_price * 0.1, 2));
    END LOOP;

    UPDATE leads SET status = 'quoted', updated_at = NOW() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apply_payment_effects()
RETURNS TRIGGER AS $$
DECLARE
  paid_total NUMERIC(14,2);
  doc_total NUMERIC(14,2);
BEGIN
  IF NEW.payment_method <> 'cash' THEN
    IF NEW.vendor_bill_id IS NOT NULL AND NEW.payment_account IS NOT NULL THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.payment_account;
    END IF;
    IF NEW.invoice_id IS NOT NULL AND NEW.target_account IS NOT NULL THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.target_account;
    END IF;
  END IF;

  IF NEW.invoice_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO paid_total FROM payments WHERE invoice_id = NEW.invoice_id;
    SELECT total_amount INTO doc_total FROM invoices WHERE id = NEW.invoice_id;
    UPDATE invoices SET status = CASE WHEN paid_total >= doc_total THEN 'paid' ELSE 'partial_paid' END WHERE id = NEW.invoice_id;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO paid_total FROM payments WHERE vendor_bill_id = NEW.vendor_bill_id;
    SELECT total INTO doc_total FROM vendor_bills WHERE id = NEW.vendor_bill_id;
    UPDATE vendor_bills SET status = CASE WHEN paid_total >= doc_total THEN 'paid' ELSE 'partial_paid' END WHERE id = NEW.vendor_bill_id;
    IF paid_total >= doc_total THEN
      UPDATE receipts r
      SET status = 'delivering'
      FROM vendor_bills vb
      WHERE vb.id = NEW.vendor_bill_id
        AND r.purchase_order_id = vb.purchase_order_id
        AND r.status = 'ready';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apply_receipt_to_new_quantity()
RETURNS TRIGGER AS $$
DECLARE
  row_item RECORD;
  product_id_val UUID;
  warehouse_id_val UUID;
BEGIN
  IF NEW.status IN ('received', 'completed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT id INTO warehouse_id_val FROM warehouses WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
    FOR row_item IN
      SELECT poi.* FROM purchase_order_items poi WHERE poi.purchase_order_id = NEW.purchase_order_id
    LOOP
      SELECT product_id INTO product_id_val FROM supplier_products WHERE id = row_item.supplier_products_id;
      INSERT INTO stock_levels (product_id, warehouse_id, new_quantity, total_quantity, quantity_on_hand, available)
      VALUES (product_id_val, warehouse_id_val, row_item.quantity, row_item.quantity, 0, 0)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE
      SET new_quantity = stock_levels.new_quantity + EXCLUDED.new_quantity,
          total_quantity = stock_levels.total_quantity + EXCLUDED.new_quantity;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION execute_stock_transfer()
RETURNS TRIGGER AS $$
DECLARE
  target_warehouse UUID;
  source_warehouse UUID;
  source_quantity NUMERIC(14,2);
  source_available NUMERIC(14,2);
  source_new_quantity NUMERIC(14,2);
BEGIN
  SELECT warehouse_id INTO target_warehouse FROM bin_locations WHERE id = NEW.target_bin_location_id;

  IF NEW.src_bin_location_id IS NULL THEN
    SELECT COALESCE(new_quantity, 0)
    INTO source_new_quantity
    FROM stock_levels
    WHERE product_id = NEW.product_id AND warehouse_id = target_warehouse;

    IF source_new_quantity < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient new quantity for product %. Available new quantity: %, requested: %',
        NEW.product_id, COALESCE(source_new_quantity, 0), NEW.quantity;
    END IF;

    UPDATE stock_levels
    SET new_quantity = GREATEST(new_quantity - NEW.quantity, 0),
        available = available + NEW.quantity
    WHERE product_id = NEW.product_id AND warehouse_id = target_warehouse;
  ELSE
    SELECT warehouse_id INTO source_warehouse FROM bin_locations WHERE id = NEW.src_bin_location_id;
    SELECT quantity, available
    INTO source_quantity, source_available
    FROM stock_in_bins
    WHERE product_id = NEW.product_id AND bin_location_id = NEW.src_bin_location_id;

    IF COALESCE(source_available, 0) < NEW.quantity OR COALESCE(source_quantity, 0) < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient bin stock for product %. Available: %, quantity: %, requested: %',
        NEW.product_id, COALESCE(source_available, 0), COALESCE(source_quantity, 0), NEW.quantity;
    END IF;

    UPDATE stock_in_bins
    SET quantity = GREATEST(quantity - NEW.quantity, 0), available = GREATEST(available - NEW.quantity, 0)
    WHERE product_id = NEW.product_id AND bin_location_id = NEW.src_bin_location_id;
    UPDATE stock_levels
    SET available = GREATEST(available - NEW.quantity, 0),
        total_quantity = GREATEST(total_quantity - NEW.quantity, 0)
    WHERE product_id = NEW.product_id AND warehouse_id = source_warehouse;
  END IF;

  INSERT INTO stock_in_bins (product_id, bin_location_id, quantity, available)
  VALUES (NEW.product_id, NEW.target_bin_location_id, NEW.quantity, NEW.quantity)
  ON CONFLICT (product_id, bin_location_id) DO UPDATE
  SET quantity = stock_in_bins.quantity + EXCLUDED.quantity,
      available = stock_in_bins.available + EXCLUDED.available;

  IF NEW.src_bin_location_id IS NULL THEN
    INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, total_quantity, available, new_quantity)
    VALUES (NEW.product_id, target_warehouse, 0, NEW.quantity, NEW.quantity, 0)
    ON CONFLICT (product_id, warehouse_id) DO NOTHING;
  ELSE
    INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, total_quantity, available, new_quantity)
    VALUES (NEW.product_id, target_warehouse, 0, NEW.quantity, NEW.quantity, 0)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE
    SET total_quantity = stock_levels.total_quantity + EXCLUDED.total_quantity,
        available = stock_levels.available + EXCLUDED.available;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deduct_stock_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE sales_orders SET status = 'delivered' WHERE id = NEW.sales_order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calc_warranty_line()
RETURNS TRIGGER AS $$
DECLARE
  delivery_date_val DATE;
  warranty_days INTEGER;
  fee NUMERIC(14,2);
  order_date_val DATE;
BEGIN
  SELECT wo.date INTO order_date_val FROM warranty_orders wo WHERE wo.id = NEW.warranty_orders_id;
  SELECT MAX(delivery_date) INTO delivery_date_val
  FROM delivery_orders doo
  JOIN warranty_orders wo ON wo.sales_order_id = doo.sales_order_id
  WHERE wo.id = NEW.warranty_orders_id AND doo.status = 'delivered';

  SELECT warranty_period, repair_fee INTO warranty_days, fee FROM products WHERE id = NEW.product_id;
  IF delivery_date_val IS NOT NULL AND order_date_val <= delivery_date_val + warranty_days THEN
    NEW.warranty_status = 'in_warranty';
    NEW.repair_fee_amount = 0;
  ELSE
    NEW.warranty_status = 'expired';
    NEW.repair_fee_amount = COALESCE(fee, 0) * NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quotation_number BEFORE INSERT ON quotations FOR EACH ROW EXECUTE FUNCTION set_quotation_number();
CREATE TRIGGER set_sales_order_number BEFORE INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION set_sales_order_number();
CREATE TRIGGER set_invoice_number BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
CREATE TRIGGER set_purchase_order_number BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_purchase_order_number();
CREATE TRIGGER set_vendor_bill_number BEFORE INSERT ON vendor_bills FOR EACH ROW EXECUTE FUNCTION set_vendor_bill_number();

CREATE TRIGGER before_quotation_item_calc BEFORE INSERT OR UPDATE ON quotation_items FOR EACH ROW EXECUTE FUNCTION before_quotation_item_calc();
CREATE TRIGGER recalc_quotation_total_after_item AFTER INSERT OR UPDATE OR DELETE ON quotation_items FOR EACH ROW EXECUTE FUNCTION recalc_quotation_total();
CREATE TRIGGER quotation_acceptance AFTER UPDATE OF status ON quotations FOR EACH ROW EXECUTE FUNCTION accept_quotation_to_customer();
CREATE TRIGGER reserve_stock_after_sales_order_item AFTER INSERT ON sales_order_items FOR EACH ROW EXECUTE FUNCTION reserve_stock_for_sales_order_item();
CREATE TRIGGER auto_quotation_after_lead AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION create_auto_quotation_for_lead();
CREATE TRIGGER apply_payment_after_insert AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION apply_payment_effects();
CREATE TRIGGER apply_receipt_after_complete AFTER UPDATE OF status ON receipts FOR EACH ROW EXECUTE FUNCTION apply_receipt_to_new_quantity();
CREATE TRIGGER execute_stock_transfer_after_insert AFTER INSERT ON stock_transfers FOR EACH ROW EXECUTE FUNCTION execute_stock_transfer();
CREATE TRIGGER deduct_stock_after_delivery AFTER UPDATE OF status ON delivery_orders FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_delivery();
CREATE TRIGGER calc_warranty_line_before_insert BEFORE INSERT OR UPDATE ON warranty_order_products FOR EACH ROW EXECUTE FUNCTION calc_warranty_line();

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_quotations_lead ON quotations(lead_id);
CREATE UNIQUE INDEX uniq_quotations_one_open_per_lead ON quotations(lead_id) WHERE lead_id IS NOT NULL AND status <> 'rejected';
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_delivery_orders_sales_order ON delivery_orders(sales_order_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_vendor_bill ON payments(vendor_bill_id);
CREATE INDEX idx_stock_levels_product_warehouse ON stock_levels(product_id, warehouse_id);

COMMIT;

