-- ============================================================================
-- Reset and seed NovaTech ERP demo data to the project requirements.
-- Intended to be run through Supabase MCP SQL/apply_migration.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'operating',
  ADD COLUMN IF NOT EXISTS is_novatech_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('company','user','lead','customer','supplier','cash','operating'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_check1;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_direction_accounts_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_direction_accounts_check
  CHECK (
    (payment_method = 'cash' AND payment_account IS NULL AND target_account IS NULL)
    OR (
      payment_method <> 'cash'
      AND (
        (invoice_id IS NOT NULL AND vendor_bill_id IS NULL AND refund_request_id IS NULL AND target_account IS NOT NULL)
        OR
        (invoice_id IS NULL AND vendor_bill_id IS NOT NULL AND refund_request_id IS NULL AND payment_account IS NOT NULL AND target_account IS NOT NULL)
        OR
        (invoice_id IS NULL AND vendor_bill_id IS NULL AND refund_request_id IS NOT NULL AND payment_account IS NOT NULL AND target_account IS NOT NULL)
      )
    )
  );

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  bin_location_id uuid REFERENCES public.bin_locations(id) ON DELETE SET NULL,
  counted_quantity numeric(14,2) NOT NULL DEFAULT 0,
  system_quantity numeric(14,2) NOT NULL DEFAULT 0,
  variance_quantity numeric(14,2) NOT NULL DEFAULT 0,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

TRUNCATE TABLE
  public.payments,
  public.debit_notes,
  public.credit_notes,
  public.vendor_bills,
  public.receipts,
  public.purchase_order_items,
  public.purchase_orders,
  public.rfq_items,
  public.rfqs,
  public.refund_requests,
  public.sales_return_items,
  public.sales_returns,
  public.warranty_order_products,
  public.warranty_orders,
  public.invoices,
  public.delivery_order_items,
  public.delivery_orders,
  public.sales_order_items,
  public.sales_orders,
  public.quotation_items,
  public.quotations,
  public.activities,
  public.activity_types,
  public.stock_transfers,
  public.stock_counts,
  public.stock_in_bins,
  public.stock_levels,
  public.supplier_products,
  public.products,
  public.product_categories,
  public.bin_locations,
  public.warehouses,
  public.leads,
  public.customers,
  public.suppliers,
  public.users,
  public.accounts
RESTART IDENTITY CASCADE;

ALTER SEQUENCE IF EXISTS quotation_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_order_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS invoice_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchase_order_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vendor_bill_number_seq RESTART WITH 1;

DO $$
DECLARE
  category_names text[] := ARRAY[
    'Control Hubs','Environmental Sensors','Cameras & Vision','Access Control','Power & Energy',
    'Switches & Automation','Safety & Monitoring','Connectivity','Smart Lighting','HVAC Control',
    'Industrial IoT','Building Automation','Security Panels','Audio Intercom','Network Gateways',
    'Meters & Monitoring','Smart Appliances','Installation Accessories','Spare Parts','Software Licenses'
  ];
  user_emails text[] := ARRAY[
    '23520145@gm.uit.edu.vn',
    '23520647@gm.uit.edu.vn',
    '23521197@gm.uit.edu.vn',
    '22521315@gm.uit.edu.vn',
    '23520719@gm.uit.edu.vn'
  ];
  user_names text[] := ARRAY[
    'Võ Phạm Châu Gia Bảo',
    'Trần Lê Nhật Huy',
    'Huỳnh Tấn Phúc',
    'Đoàn Quốc Thái',
    'Nguyễn Đỗ Công Khanh'
  ];
  user_roles text[] := ARRAY['admin','sales','purchasing','warehouse','accountant'];
  category_ids uuid[] := ARRAY[]::uuid[];
  product_ids uuid[] := ARRAY[]::uuid[];
  supplier_ids uuid[] := ARRAY[]::uuid[];
  supplier_product_ids uuid[] := ARRAY[]::uuid[];
  customer_ids uuid[] := ARRAY[]::uuid[];
  lead_ids uuid[] := ARRAY[]::uuid[];
  user_ids uuid[] := ARRAY[]::uuid[];
  warehouse_ids uuid[] := ARRAY[]::uuid[];
  bin_ids uuid[] := ARRAY[]::uuid[];
  quotation_ids uuid[] := ARRAY[]::uuid[];
  sales_order_ids uuid[] := ARRAY[]::uuid[];
  invoice_ids uuid[] := ARRAY[]::uuid[];
  rfq_ids uuid[] := ARRAY[]::uuid[];
  purchase_order_ids uuid[] := ARRAY[]::uuid[];
  vendor_bill_ids uuid[] := ARRAY[]::uuid[];
  company_bank_id uuid;
  cash_account_id uuid;
  account_id_val uuid;
  new_id uuid;
  line_product uuid;
  line_supplier_product uuid;
  line_total numeric(14,2);
  subtotal_val numeric(14,2);
  tax_val numeric(14,2);
  total_val numeric(14,2);
  qty_val numeric(14,2);
  price_val numeric(14,2);
  i integer;
  j integer;
BEGIN
  INSERT INTO public.accounts (account_number, bank, name, balance, account_type, is_novatech_default)
  VALUES ('NT-BANK-001', 'NovaTech Bank', 'NovaTech Operating Bank Account', 1000000000, 'company', true)
  RETURNING id INTO company_bank_id;

  INSERT INTO public.accounts (account_number, bank, name, balance, account_type, is_novatech_default)
  VALUES ('NT-CASH-001', 'Cash Office', 'NovaTech Cash Account', 250000000, 'cash', false)
  RETURNING id INTO cash_account_id;

  FOR i IN 1..5 LOOP
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES ('USR-' || split_part(user_emails[i], '@', 1), 'Employee Bank', user_names[i] || ' Bank Account', 100000000, 'user')
    RETURNING id INTO account_id_val;

    INSERT INTO public.users (username, email, password_hash, full_name, role, is_active, account_id)
    VALUES (split_part(user_emails[i], '@', 1), user_emails[i], 'demo-password-hash', user_names[i], user_roles[i], true, account_id_val)
    RETURNING id INTO new_id;
    user_ids := array_append(user_ids, new_id);
  END LOOP;

  INSERT INTO public.activity_types (type_name, icon)
  VALUES ('Call','phone'), ('Email','mail'), ('Meeting','users'), ('Demo','monitor'), ('Follow-up','calendar');

  FOR i IN 1..20 LOOP
    INSERT INTO public.product_categories (category_name)
    VALUES (category_names[i])
    RETURNING id INTO new_id;
    category_ids := array_append(category_ids, new_id);
  END LOOP;

  FOR i IN 1..500 LOOP
    INSERT INTO public.products (
      category_id, sku, product_name, description, unit_price, cost_price, uom, warranty_period, repair_fee
    )
    VALUES (
      category_ids[((i - 1) % 20) + 1],
      'NT-PROD-' || lpad(i::text, 4, '0'),
      'NovaTech Device ' || lpad(i::text, 4, '0'),
      'Demo product for ERP operational dataset',
      450000 + (i % 75) * 12000,
      300000 + (i % 75) * 8000,
      'pcs',
      CASE WHEN i % 4 = 0 THEN 730 ELSE 365 END,
      80000 + (i % 25) * 5000
    )
    RETURNING id INTO new_id;
    product_ids := array_append(product_ids, new_id);
  END LOOP;

  FOR i IN 1..1000 LOOP
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES ('CUS-' || lpad(i::text, 5, '0'), 'Customer Bank', 'Customer ' || lpad(i::text, 5, '0') || ' Bank Account', 100000000, 'customer')
    RETURNING id INTO account_id_val;

    INSERT INTO public.customers (full_name, email, phone, address, company_name, tax_id, customer_type, account_id)
    VALUES (
      'Customer ' || lpad(i::text, 5, '0'),
      'customer' || lpad(i::text, 5, '0') || '@demo.novatech.vn',
      '09' || lpad(i::text, 8, '0'),
      (10 + i) || ' Demo Street, Ho Chi Minh City',
      CASE WHEN i % 3 = 0 THEN 'Customer Company ' || lpad(i::text, 5, '0') ELSE NULL END,
      'CUST-TAX-' || lpad(i::text, 5, '0'),
      CASE WHEN i % 3 = 0 THEN 'company' ELSE 'individual' END,
      account_id_val
    )
    RETURNING id INTO new_id;
    customer_ids := array_append(customer_ids, new_id);
  END LOOP;

  FOR i IN 1..1000 LOOP
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES ('SUP-' || lpad(i::text, 5, '0'), 'Supplier Bank', 'Supplier ' || lpad(i::text, 5, '0') || ' Bank Account', 100000000, 'supplier')
    RETURNING id INTO account_id_val;

    INSERT INTO public.suppliers (supplier_name, contact_name, email, phone, address, tax_id, account_id)
    VALUES (
      'Supplier ' || lpad(i::text, 5, '0'),
      'Supplier Contact ' || lpad(i::text, 5, '0'),
      'supplier' || lpad(i::text, 5, '0') || '@vendor.novatech.vn',
      '08' || lpad(i::text, 8, '0'),
      (20 + i) || ' Vendor Avenue, Binh Duong',
      'SUP-TAX-' || lpad(i::text, 5, '0'),
      account_id_val
    )
    RETURNING id INTO new_id;
    supplier_ids := array_append(supplier_ids, new_id);
  END LOOP;

  FOR i IN 1..500 LOOP
    FOR j IN 0..1 LOOP
      INSERT INTO public.supplier_products (supplier_id, product_id, sku, price)
      VALUES (
        supplier_ids[((i + j * 37 - 1) % 1000) + 1],
        product_ids[i],
        'SP-' || lpad(i::text, 4, '0') || '-' || (j + 1),
        290000 + (i % 75) * 7500 + j * 5000
      )
      RETURNING id INTO new_id;
      supplier_product_ids := array_append(supplier_product_ids, new_id);
    END LOOP;
  END LOOP;

  FOR i IN 1..3 LOOP
    INSERT INTO public.warehouses (warehouse_name, address, is_active)
    VALUES ('Warehouse ' || i, 'Warehouse address ' || i || ', Ho Chi Minh City', true)
    RETURNING id INTO new_id;
    warehouse_ids := array_append(warehouse_ids, new_id);

    FOR j IN 1..10 LOOP
      INSERT INTO public.bin_locations (warehouse_id, location_code, location_name, is_active)
      VALUES (new_id, 'W' || i || '-B' || lpad(j::text, 2, '0'), 'Warehouse ' || i || ' Bin ' || lpad(j::text, 2, '0'), true)
      RETURNING id INTO account_id_val;
      bin_ids := array_append(bin_ids, account_id_val);
    END LOOP;
  END LOOP;

  FOR i IN 1..500 LOOP
    FOR j IN 1..3 LOOP
      qty_val := 480 + ((i + j) % 120);
      INSERT INTO public.stock_levels (product_id, warehouse_id, quantity_on_hand, total_quantity, available, new_quantity, reorder_status)
      VALUES (product_ids[i], warehouse_ids[j], qty_val, qty_val, qty_val, 0, 'normal');

      INSERT INTO public.stock_in_bins (product_id, bin_location_id, quantity, available)
      VALUES (product_ids[i], bin_ids[((j - 1) * 10) + ((i - 1) % 10) + 1], qty_val, qty_val);
    END LOOP;
  END LOOP;

  FOR i IN 1..100 LOOP
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES ('LEAD-' || lpad(i::text, 5, '0'), 'Customer Bank', 'Lead ' || lpad(i::text, 5, '0') || ' Bank Account', 100000000, 'lead')
    RETURNING id INTO account_id_val;

    INSERT INTO public.leads (
      first_name, last_name, email, phone, company, source, status, probability, assigned_to_id, account_id
    )
    VALUES (
      'Lead',
      lpad(i::text, 5, '0'),
      'lead' || lpad(i::text, 5, '0') || '@demo.novatech.vn',
      '07' || lpad(i::text, 8, '0'),
      'Lead Company ' || lpad(i::text, 5, '0'),
      CASE WHEN i % 4 = 0 THEN 'website' WHEN i % 4 = 1 THEN 'referral' WHEN i % 4 = 2 THEN 'email' ELSE 'phone' END,
      CASE WHEN i <= 34 THEN 'new' WHEN i <= 67 THEN 'won' ELSE 'lost' END,
      CASE WHEN i <= 34 THEN 25 WHEN i <= 67 THEN 100 ELSE 0 END,
      user_ids[((i - 1) % 5) + 1],
      account_id_val
    )
    RETURNING id INTO new_id;
    lead_ids := array_append(lead_ids, new_id);
  END LOOP;

  FOR i IN 1..100 LOOP
    INSERT INTO public.activities (lead_id, activity_type_id, description, activity_date, performed_by_id)
    SELECT lead_ids[i], id, 'Demo CRM activity for lead ' || i, now() - (i || ' days')::interval, user_ids[((i - 1) % 5) + 1]
    FROM public.activity_types
    ORDER BY type_name
    OFFSET ((i - 1) % 5)
    LIMIT 1;
  END LOOP;

  FOR i IN 1..100 LOOP
    INSERT INTO public.quotations (lead_id, customer_id, issue_date, valid_until, status, notes)
    VALUES (
      lead_ids[i],
      customer_ids[((i - 1) % 1000) + 1],
      CURRENT_DATE - ((100 - i) || ' days')::interval,
      CURRENT_DATE + ((30 + (i % 15)) || ' days')::interval,
      CASE WHEN i <= 50 THEN 'accepted' WHEN i <= 75 THEN 'sent' ELSE 'rejected' END,
      'Seeded quotation ' || i
    )
    RETURNING id INTO new_id;
    quotation_ids := array_append(quotation_ids, new_id);

    FOR j IN 1..2 LOOP
      line_product := product_ids[((i * 3 + j - 1) % 500) + 1];
      SELECT unit_price INTO price_val FROM public.products WHERE id = line_product;
      INSERT INTO public.quotation_items (quotation_id, product_id, quantity, unit_price, discount_percent, tax_amount)
      VALUES (new_id, line_product, 1 + ((i + j) % 4), price_val, CASE WHEN j = 2 THEN 5 ELSE 0 END, round(price_val * 0.1, 2));
    END LOOP;
  END LOOP;

  FOR i IN 1..50 LOOP
    INSERT INTO public.sales_orders (quotation_id, customer_id, order_date, status, shipping_address, notes)
    VALUES (quotation_ids[i], customer_ids[((i - 1) % 1000) + 1], CURRENT_DATE - ((55 - i) || ' days')::interval, 'ready', 'Customer delivery address ' || i, 'Seeded sales order ' || i)
    RETURNING id INTO new_id;
    sales_order_ids := array_append(sales_order_ids, new_id);

    FOR j IN 1..2 LOOP
      line_product := product_ids[((i * 5 + j - 1) % 500) + 1];
      SELECT unit_price INTO price_val FROM public.products WHERE id = line_product;
      INSERT INTO public.sales_order_items (sales_order_id, product_id, quantity, unit_price)
      VALUES (new_id, line_product, 2 + ((i + j) % 4), price_val);
    END LOOP;
  END LOOP;

  UPDATE public.delivery_orders
  SET status = CASE WHEN ranked.row_number <= 35 THEN 'delivered' WHEN ranked.row_number <= 45 THEN 'delivering' ELSE 'ready' END,
      tracking_number = 'TRK-' || lpad(ranked.row_number::text, 5, '0')
  FROM (
    SELECT id, row_number() OVER (ORDER BY created_at, id) AS row_number
    FROM public.delivery_orders
  ) ranked
  WHERE delivery_orders.id = ranked.id;

  FOR i IN 1..50 LOOP
    SELECT COALESCE(SUM(quantity * unit_price), 0) INTO subtotal_val
    FROM public.sales_order_items
    WHERE sales_order_id = sales_order_ids[i];
    tax_val := round(subtotal_val * 0.1, 2);
    total_val := subtotal_val + tax_val;

    INSERT INTO public.invoices (sales_order_id, issue_date, due_date, status, total_amount, tax_amount, net_amount, notes)
    VALUES (
      sales_order_ids[i],
      CURRENT_DATE - ((50 - i) || ' days')::interval,
      CURRENT_DATE + ((10 + i) || ' days')::interval,
      CASE WHEN i <= 20 THEN 'paid' WHEN i <= 35 THEN 'partial_paid' ELSE 'sent' END,
      total_val,
      tax_val,
      subtotal_val,
      'Seeded customer invoice ' || i
    )
    RETURNING id INTO new_id;
    invoice_ids := array_append(invoice_ids, new_id);
  END LOOP;

  FOR i IN 1..20 LOOP
    INSERT INTO public.payments (invoice_id, payment_date, payment_method, amount, payment_account, target_account, reference_number, notes)
    VALUES (invoice_ids[i], CURRENT_DATE - ((20 - i) || ' days')::interval, 'bank_transfer', (SELECT total_amount FROM public.invoices WHERE id = invoice_ids[i]), NULL, company_bank_id, 'RCPT-' || lpad(i::text, 5, '0'), 'Seeded customer payment');
  END LOOP;

  FOR i IN 21..35 LOOP
    INSERT INTO public.payments (invoice_id, payment_date, payment_method, amount, payment_account, target_account, reference_number, notes)
    VALUES (invoice_ids[i], CURRENT_DATE - ((35 - i) || ' days')::interval, 'bank_transfer', round((SELECT total_amount FROM public.invoices WHERE id = invoice_ids[i]) * 0.5, 2), NULL, company_bank_id, 'RCPT-' || lpad(i::text, 5, '0'), 'Seeded partial customer payment');
  END LOOP;

  FOR i IN 1..10 LOOP
    INSERT INTO public.credit_notes (invoices_id, reason, total_amount)
    VALUES (invoice_ids[i], 'Customer discount / return adjustment', round((SELECT total_amount FROM public.invoices WHERE id = invoice_ids[i]) * 0.1, 2));
  END LOOP;

  FOR i IN 1..100 LOOP
    INSERT INTO public.rfqs (issue_date, deadline, status)
    VALUES (
      CURRENT_DATE - ((120 - i) || ' days')::interval,
      CURRENT_DATE + ((15 + (i % 20)) || ' days')::interval,
      CASE WHEN i <= 50 THEN 'accepted' WHEN i <= 85 THEN 'new' ELSE 'denied' END
    )
    RETURNING id INTO new_id;
    rfq_ids := array_append(rfq_ids, new_id);

    FOR j IN 1..2 LOOP
      line_supplier_product := supplier_product_ids[((i * 4 + j - 1) % array_length(supplier_product_ids, 1)) + 1];
      INSERT INTO public.rfq_items (rfq_id, supplier_products_id, quantity)
      VALUES (new_id, line_supplier_product, 8 + ((i + j) % 10));
    END LOOP;
  END LOOP;

  FOR i IN 1..50 LOOP
    SELECT supplier_id INTO account_id_val
    FROM public.supplier_products
    WHERE id = supplier_product_ids[((i * 4) % array_length(supplier_product_ids, 1)) + 1];

    INSERT INTO public.purchase_orders (rfq_id, vendor_id, order_date, expected_arrival_date, status, notes)
    VALUES (rfq_ids[i], account_id_val, CURRENT_DATE - ((60 - i) || ' days')::interval, CURRENT_DATE + ((7 + (i % 10)) || ' days')::interval, CASE WHEN i <= 35 THEN 'received' ELSE 'sent' END, 'Seeded purchase order ' || i)
    RETURNING id INTO new_id;
    purchase_order_ids := array_append(purchase_order_ids, new_id);

    FOR j IN 1..2 LOOP
      line_supplier_product := supplier_product_ids[((i * 4 + j - 1) % array_length(supplier_product_ids, 1)) + 1];
      SELECT price INTO price_val FROM public.supplier_products WHERE id = line_supplier_product;
      INSERT INTO public.purchase_order_items (purchase_order_id, supplier_products_id, quantity, unit_price)
      VALUES (new_id, line_supplier_product, 10 + ((i + j) % 12), price_val);
    END LOOP;

    INSERT INTO public.receipts (purchase_order_id, receipt_date, status, notes)
    VALUES (new_id, CURRENT_DATE - ((50 - i) || ' days')::interval, CASE WHEN i <= 35 THEN 'received' WHEN i <= 45 THEN 'delivering' ELSE 'ready' END, 'Seeded goods receipt ' || i);
  END LOOP;

  FOR i IN 1..50 LOOP
    SELECT COALESCE(SUM(quantity * unit_price), 0) INTO subtotal_val
    FROM public.purchase_order_items
    WHERE purchase_order_id = purchase_order_ids[i];
    tax_val := round(subtotal_val * 0.1, 2);
    total_val := subtotal_val + tax_val;

    INSERT INTO public.vendor_bills (purchase_order_id, issue_date, due_date, status, subtotal, tax_amount, total, notes)
    VALUES (
      purchase_order_ids[i],
      CURRENT_DATE - ((48 - i) || ' days')::interval,
      CURRENT_DATE + ((12 + i) || ' days')::interval,
      CASE WHEN i <= 15 THEN 'paid' WHEN i <= 30 THEN 'partial_paid' ELSE 'posted' END,
      subtotal_val,
      tax_val,
      total_val,
      'Seeded vendor bill ' || i
    )
    RETURNING id INTO new_id;
    vendor_bill_ids := array_append(vendor_bill_ids, new_id);
  END LOOP;

  FOR i IN 1..15 LOOP
    INSERT INTO public.payments (vendor_bill_id, payment_date, payment_method, amount, payment_account, target_account, reference_number, notes)
    VALUES (
      vendor_bill_ids[i],
      CURRENT_DATE - ((15 - i) || ' days')::interval,
      'bank_transfer',
      (SELECT total FROM public.vendor_bills WHERE id = vendor_bill_ids[i]),
      company_bank_id,
      (SELECT account_id FROM public.suppliers s JOIN public.purchase_orders po ON po.vendor_id = s.id WHERE po.id = purchase_order_ids[i]),
      'PAY-' || lpad(i::text, 5, '0'),
      'Seeded supplier payment'
    );
  END LOOP;

  FOR i IN 16..30 LOOP
    INSERT INTO public.payments (vendor_bill_id, payment_date, payment_method, amount, payment_account, target_account, reference_number, notes)
    VALUES (
      vendor_bill_ids[i],
      CURRENT_DATE - ((30 - i) || ' days')::interval,
      'bank_transfer',
      round((SELECT total FROM public.vendor_bills WHERE id = vendor_bill_ids[i]) * 0.5, 2),
      company_bank_id,
      (SELECT account_id FROM public.suppliers s JOIN public.purchase_orders po ON po.vendor_id = s.id WHERE po.id = purchase_order_ids[i]),
      'PAY-' || lpad(i::text, 5, '0'),
      'Seeded partial supplier payment'
    );
  END LOOP;

  FOR i IN 1..10 LOOP
    INSERT INTO public.debit_notes (vendor_bills_id, reason, total_amount)
    VALUES (vendor_bill_ids[i], 'Supplier price/quality adjustment', round((SELECT total FROM public.vendor_bills WHERE id = vendor_bill_ids[i]) * 0.08, 2));
  END LOOP;

  FOR i IN 1..30 LOOP
    INSERT INTO public.stock_counts (
      product_id, warehouse_id, bin_location_id, counted_quantity, system_quantity, variance_quantity, count_date, status, notes
    )
    VALUES (
      product_ids[i],
      warehouse_ids[((i - 1) % 3) + 1],
      bin_ids[((i - 1) % 30) + 1],
      480 + (i % 120),
      480 + (i % 120),
      0,
      CURRENT_DATE - ((30 - i) || ' days')::interval,
      'completed',
      'Seeded stock count record ' || i
    );
  END LOOP;
END $$;

COMMIT;
