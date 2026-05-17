-- ============================================================================
-- NEW ERP MASTER DATA SEED
-- Run after scripts/migration_new_erp.sql.
-- This seed only inserts master/setup data. Transactional flows such as leads,
-- quotations, sales orders, invoices, RFQs, purchase orders, receipts and
-- payments are intentionally left empty for manual testing.
-- ============================================================================

BEGIN;

-- Users
INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000101','admin','admin@erp.local','admin123','Alice Admin','admin'),
  ('00000000-0000-0000-0000-000000000102','sarah.sales','sarah.sales@erp.local','demo123','Sarah Sales','sales'),
  ('00000000-0000-0000-0000-000000000103','peter.purchase','peter.purchase@erp.local','demo123','Peter Purchase','purchasing'),
  ('00000000-0000-0000-0000-000000000104','wendy.warehouse','wendy.warehouse@erp.local','demo123','Wendy Warehouse','warehouse'),
  ('00000000-0000-0000-0000-000000000105','adam.accounting','adam.accounting@erp.local','demo123','Adam Accounting','accountant')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = TRUE;

-- Bank/cash accounts
INSERT INTO accounts (id, account_number, bank, name, balance) VALUES
  ('00000000-0000-0000-0000-000000000201','CASH-001',NULL,'Cash Drawer',50000000),
  ('00000000-0000-0000-0000-000000000202','VCB-102938','Vietcombank','Main Operating Bank',100000000),
  ('00000000-0000-0000-0000-000000000203','ACB-556677','ACB','Secondary Bank',100000000),
  ('00000000-0000-0000-0000-000000000204','SUP-APEX','Apex Bank','Apex Supplier Account',100000000),
  ('00000000-0000-0000-0000-000000000205','SUP-SVF','SecureVision Bank','SecureVision Supplier Account',100000000)
ON CONFLICT (id) DO UPDATE SET
  account_number = EXCLUDED.account_number,
  bank = EXCLUDED.bank,
  name = EXCLUDED.name,
  balance = EXCLUDED.balance;

-- Product categories
INSERT INTO product_categories (id, category_name, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000301','Smart Home',NULL),
  ('00000000-0000-0000-0000-000000000302','Security',NULL),
  ('00000000-0000-0000-0000-000000000303','Sensors','00000000-0000-0000-0000-000000000301')
ON CONFLICT (id) DO UPDATE SET
  category_name = EXCLUDED.category_name,
  parent_id = EXCLUDED.parent_id;

-- Products
INSERT INTO products (id, category_id, sku, product_name, description, unit_price, cost_price, uom, warranty_period, repair_fee, is_active) VALUES
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','HUB-PRO-01','Smart Hub Pro','Central home automation hub',3500000,2100000,'pcs',730,900000,TRUE),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000303','SEN-DOOR-01','Door Sensor','Wireless open-close sensor',450000,220000,'pcs',365,150000,TRUE),
  ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000303','SEN-MOTION-01','Motion Sensor','PIR motion sensor',650000,330000,'pcs',365,180000,TRUE),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000302','CAM-IN-01','Indoor Camera','Wi-Fi indoor camera',1500000,850000,'pcs',365,400000,TRUE),
  ('00000000-0000-0000-0000-000000000405','00000000-0000-0000-0000-000000000302','CAM-OUT-01','Outdoor Camera','Weatherproof camera',2400000,1350000,'pcs',730,650000,TRUE),
  ('00000000-0000-0000-0000-000000000406','00000000-0000-0000-0000-000000000301','LOCK-SMART-01','Smart Lock','Fingerprint smart lock',4200000,2600000,'pcs',365,1200000,TRUE),
  ('00000000-0000-0000-0000-000000000407','00000000-0000-0000-0000-000000000301','SWITCH-02','Smart Switch 2 Gang','Two gang smart switch',720000,350000,'pcs',365,200000,TRUE),
  ('00000000-0000-0000-0000-000000000408','00000000-0000-0000-0000-000000000301','PLUG-01','Smart Plug','Energy monitoring smart plug',390000,180000,'pcs',365,120000,TRUE)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  sku = EXCLUDED.sku,
  product_name = EXCLUDED.product_name,
  description = EXCLUDED.description,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  uom = EXCLUDED.uom,
  warranty_period = EXCLUDED.warranty_period,
  repair_fee = EXCLUDED.repair_fee,
  is_active = TRUE;

-- Warehouses and bins
INSERT INTO warehouses (id, warehouse_name, address, is_active) VALUES
  ('00000000-0000-0000-0000-000000000501','Main Warehouse','District 7, Ho Chi Minh City',TRUE),
  ('00000000-0000-0000-0000-000000000502','North Warehouse','Long Bien, Hanoi',TRUE)
ON CONFLICT (id) DO UPDATE SET
  warehouse_name = EXCLUDED.warehouse_name,
  address = EXCLUDED.address,
  is_active = TRUE;

INSERT INTO bin_locations (id, warehouse_id, location_code, location_name, is_active) VALUES
  ('00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000501','A-01','Main Aisle A-01',TRUE),
  ('00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000501','A-02','Main Aisle A-02',TRUE),
  ('00000000-0000-0000-0000-000000000513','00000000-0000-0000-0000-000000000501','B-01','Main Aisle B-01',TRUE),
  ('00000000-0000-0000-0000-000000000521','00000000-0000-0000-0000-000000000502','N-01','North Aisle N-01',TRUE),
  ('00000000-0000-0000-0000-000000000522','00000000-0000-0000-0000-000000000502','N-02','North Aisle N-02',TRUE),
  ('00000000-0000-0000-0000-000000000523','00000000-0000-0000-0000-000000000502','N-03','North Aisle N-03',TRUE)
ON CONFLICT (id) DO UPDATE SET
  warehouse_id = EXCLUDED.warehouse_id,
  location_code = EXCLUDED.location_code,
  location_name = EXCLUDED.location_name,
  is_active = TRUE;

-- Initial stock by bin. quantity = physical stock, available = free stock.
-- quantity_on_hand in stock_levels remains 0 until sales orders reserve stock.
INSERT INTO stock_in_bins (product_id, bin_location_id, quantity, available) VALUES
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000511',25,25),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000511',100,100),
  ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000512',80,80),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000512',40,40),
  ('00000000-0000-0000-0000-000000000405','00000000-0000-0000-0000-000000000513',35,35),
  ('00000000-0000-0000-0000-000000000406','00000000-0000-0000-0000-000000000521',20,20),
  ('00000000-0000-0000-0000-000000000407','00000000-0000-0000-0000-000000000522',90,90),
  ('00000000-0000-0000-0000-000000000408','00000000-0000-0000-0000-000000000523',120,120)
ON CONFLICT (product_id, bin_location_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  available = EXCLUDED.available;

INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, total_quantity, available, new_quantity, reorder_status)
SELECT
  sib.product_id,
  bl.warehouse_id,
  0,
  SUM(sib.quantity),
  SUM(sib.available),
  0,
  CASE WHEN SUM(sib.available) <= 0 THEN 'out'
       WHEN SUM(sib.available) < 10 THEN 'low'
       ELSE 'normal' END
FROM stock_in_bins sib
JOIN bin_locations bl ON bl.id = sib.bin_location_id
GROUP BY sib.product_id, bl.warehouse_id
ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  total_quantity = EXCLUDED.total_quantity,
  available = EXCLUDED.available,
  new_quantity = EXCLUDED.new_quantity,
  reorder_status = EXCLUDED.reorder_status;

-- Suppliers and supplier catalog
INSERT INTO suppliers (id, supplier_name, contact_name, email, phone, address, tax_id, is_active) VALUES
  ('00000000-0000-0000-0000-000000000601','Apex Smart Devices','Olivia Chen','sales@apexsmart.example','+862012345678','Shenzhen, China','CN-APEX-001',TRUE),
  ('00000000-0000-0000-0000-000000000602','SecureVision Factory','Mark Lee','export@securevision.example','+862076543210','Guangzhou, China','CN-SVF-002',TRUE),
  ('00000000-0000-0000-0000-000000000603','HomeLink Components','Nina Park','contact@homelink.example','+82212345678','Seoul, Korea','KR-HLC-003',TRUE)
ON CONFLICT (id) DO UPDATE SET
  supplier_name = EXCLUDED.supplier_name,
  contact_name = EXCLUDED.contact_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  tax_id = EXCLUDED.tax_id,
  is_active = TRUE;

-- supplier_products are selected directly in RFQ and purchase order lines.
-- product_id is kept as an optional internal stock mapping for receipt/inventory updates.
INSERT INTO supplier_products (id, supplier_id, product_id, sku, price) VALUES
  ('00000000-0000-0000-0000-000000000611','00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000401','HUB-PRO-01',2050000),
  ('00000000-0000-0000-0000-000000000612','00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000402','SEN-DOOR-01',210000),
  ('00000000-0000-0000-0000-000000000613','00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000403','SEN-MOTION-01',315000),
  ('00000000-0000-0000-0000-000000000614','00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000404','CAM-IN-01',830000),
  ('00000000-0000-0000-0000-000000000615','00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000405','CAM-OUT-01',1320000),
  ('00000000-0000-0000-0000-000000000616','00000000-0000-0000-0000-000000000603','00000000-0000-0000-0000-000000000406','LOCK-SMART-01',2550000),
  ('00000000-0000-0000-0000-000000000617','00000000-0000-0000-0000-000000000603','00000000-0000-0000-0000-000000000407','SWITCH-02',340000),
  ('00000000-0000-0000-0000-000000000618','00000000-0000-0000-0000-000000000603','00000000-0000-0000-0000-000000000408','PLUG-01',175000)
ON CONFLICT (id) DO UPDATE SET
  supplier_id = EXCLUDED.supplier_id,
  product_id = EXCLUDED.product_id,
  sku = EXCLUDED.sku,
  price = EXCLUDED.price;

-- Activity types
INSERT INTO activity_types (id, type_name, icon) VALUES
  ('00000000-0000-0000-0000-000000000701','Call','phone'),
  ('00000000-0000-0000-0000-000000000702','Email','mail'),
  ('00000000-0000-0000-0000-000000000703','Meeting','users'),
  ('00000000-0000-0000-0000-000000000704','Quotation Sent','file-text')
ON CONFLICT (id) DO UPDATE SET
  type_name = EXCLUDED.type_name,
  icon = EXCLUDED.icon;

-- Customer master data only. No leads/orders/invoices are seeded here.
INSERT INTO customers (id, full_name, email, phone, address, company_name, tax_id, customer_type, is_active) VALUES
  ('00000000-0000-0000-0000-000000000801','Michael Tran','michael.tran@example.com','0901001001','Thao Dien, Ho Chi Minh City',NULL,NULL,'individual',TRUE),
  ('00000000-0000-0000-0000-000000000802','Grace Office Admin','admin@graceoffice.example','0902002002','District 1, Ho Chi Minh City','Grace Office Co','0312345678','company',TRUE),
  ('00000000-0000-0000-0000-000000000803','Liam Hotel Buyer','buyer@liamhotel.example','0903003003','Da Nang','Liam Boutique Hotel','0409876543','company',TRUE)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  company_name = EXCLUDED.company_name,
  tax_id = EXCLUDED.tax_id,
  customer_type = EXCLUDED.customer_type,
  is_active = TRUE;

COMMIT;
