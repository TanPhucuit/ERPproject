-- ============================================================================
-- NOVATECH DISTRIBUTION - ERP SYSTEM SEED DATA
-- For: Smart Home & IoT Equipment Distribution
-- Database: PostgreSQL (Supabase)
-- Purpose: Seed data for lookup/reference tables
-- ============================================================================

-- ============================================================================
-- 1. DEPARTMENTS (Required by Users)
-- ============================================================================

INSERT INTO departments (name, description) VALUES
  ('Administration', 'General administration and management'),
  ('Sales', 'Sales and marketing department'),
  ('Purchasing', 'Procurement and supplier management'),
  ('Warehouse', 'Warehouse and logistics operations'),
  ('Finance', 'Finance and accounting'),
  ('IT', 'Information technology and systems'),
  ('Customer Service', 'Customer support and after-sales service'),
  ('Human Resources', 'HR and recruitment')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. UNITS OF MEASURE (Required by Products)
-- ============================================================================

INSERT INTO units_of_measure (code, name, conversion_factor) VALUES
  ('pcs', 'Pieces', 1.0000),
  ('box', 'Box', 1.0000),
  ('pack', 'Pack', 1.0000),
  ('set', 'Set', 1.0000),
  ('kit', 'Kit', 1.0000),
  ('unit', 'Unit', 1.0000),
  ('pair', 'Pair', 2.0000),
  ('dozen', 'Dozen', 12.0000),
  ('kg', 'Kilogram', 1.0000),
  ('g', 'Gram', 0.0010),
  ('l', 'Liter', 1.0000),
  ('ml', 'Milliliter', 0.0010),
  ('m', 'Meter', 1.0000),
  ('cm', 'Centimeter', 0.0100),
  ('sqm', 'Square Meter', 1.0000),
  ('roll', 'Roll', 1.0000),
  ('roll_m', 'Roll (Meter)', 50.0000),
  ('carton', 'Carton', 1.0000),
  ('pallet', 'Pallet', 1.0000),
  ('bundle', 'Bundle', 1.0000)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. SUPPLIER TYPES (Already seeded in schema, re-confirm for clarity)
-- ============================================================================

INSERT INTO supplier_types (name, description) VALUES
  ('equipment', 'Equipment & Product Suppliers'),
  ('components', 'Component & Part Suppliers'),
  ('logistics', 'Logistics & Transportation'),
  ('services', 'Service Providers (Packaging, Office Supply, etc.)'),
  ('maintenance', 'Maintenance & Repair Services')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. LEAD STAGES (CRM Pipeline Stages)
-- ============================================================================

INSERT INTO lead_stages (name, display_order, color_code, probability_percent) VALUES
  ('new', 1, '#808080', 10),
  ('site_survey', 2, '#4A90E2', 30),
  ('proposition', 3, '#F5A623', 60),
  ('won', 4, '#7ED321', 100),
  ('lost', 5, '#D0021B', 0)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. ACTIVITY TYPES (CRM Activities)
-- ============================================================================

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
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. PAYMENT METHODS (For Customer and Supplier Payments)
-- ============================================================================

INSERT INTO payment_methods (name, description, is_active) VALUES
  ('Bank Transfer', 'Direct bank transfer / Electronic fund transfer', true),
  ('Check', 'Cheque payment', true),
  ('Cash', 'Cash payment in hand', true),
  ('Credit Card', 'Credit card payment', true),
  ('Digital Wallet', 'E-wallet or digital payment (MoMo, ZaloPay, VNPay)', true),
  ('Other', 'Other payment method', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. ACCOUNTS (Chart of Accounts for Accounting)
-- ============================================================================

INSERT INTO accounts (account_code, account_name, account_type, account_subtype, description, normal_balance) VALUES
  ('1110', 'Cash - VND', 'Asset', 'Current Asset', 'Cash in hand - Vietnamese Dong', 'Debit'),
  ('1120', 'Bank - Vietcombank', 'Asset', 'Current Asset', 'Bank account - Vietcombank', 'Debit'),
  ('1121', 'Bank - BIDV', 'Asset', 'Current Asset', 'Bank account - BIDV', 'Debit'),
  ('1122', 'Bank - ACB', 'Asset', 'Current Asset', 'Bank account - ACB', 'Debit'),
  ('1200', 'Accounts Receivable', 'Asset', 'Current Asset', 'Customer invoices outstanding', 'Debit'),
  ('1300', 'Inventory', 'Asset', 'Current Asset', 'Stock of goods', 'Debit'),
  ('1500', 'Prepaid Expenses', 'Asset', 'Current Asset', 'Prepaid rent, insurance, etc.', 'Debit'),
  ('1600', 'Fixed Assets', 'Asset', 'Fixed Asset', 'Equipment, vehicles, furniture', 'Debit'),
  ('2100', 'Accounts Payable', 'Liability', 'Current Liability', 'Supplier invoices payable', 'Credit'),
  ('2200', 'Taxes Payable', 'Liability', 'Current Liability', 'VAT and other taxes', 'Credit'),
  ('2300', 'Accrued Expenses', 'Liability', 'Current Liability', 'Accrued salaries, utilities', 'Credit'),
  ('3000', 'Owner Equity', 'Equity', 'Equity', 'Owner investment and retained earnings', 'Credit'),
  ('4000', 'Sales Revenue', 'Revenue', 'Operating Revenue', 'Sales of products', 'Credit'),
  ('4100', 'Service Revenue', 'Revenue', 'Operating Revenue', 'Service and installation fees', 'Credit'),
  ('4200', 'Other Revenue', 'Revenue', 'Other Revenue', 'Miscellaneous income', 'Credit'),
  ('5000', 'Cost of Goods Sold', 'Expense', 'COGS', 'Cost of products sold', 'Debit'),
  ('5100', 'Cost of Services', 'Expense', 'COGS', 'Cost of services rendered', 'Debit'),
  ('6100', 'Operating Expenses', 'Expense', 'Operating Expense', 'Salary, utilities, rent', 'Debit'),
  ('6200', 'Marketing Expenses', 'Expense', 'Operating Expense', 'Advertising and promotion', 'Debit'),
  ('6300', 'Administrative Expenses', 'Expense', 'Operating Expense', 'Office supplies, software', 'Debit'),
  ('6400', 'Transportation Expenses', 'Expense', 'Operating Expense', 'Delivery and shipping costs', 'Debit'),
  ('6500', 'Depreciation Expense', 'Expense', 'Non-Operating Expense', 'Asset depreciation', 'Debit')
ON CONFLICT (account_code) DO NOTHING;

-- ============================================================================
-- 8. COMPANY SETTINGS (System Configuration)
-- ============================================================================

INSERT INTO company_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name', 'NovaTech Distribution', 'string', 'Official company name'),
  ('company_tax_id', '0123456789', 'string', 'Company tax identification number'),
  ('company_address', '123 Nguyen Hue Street, District 1, Ho Chi Minh City', 'string', 'Company address'),
  ('company_phone', '028 1234 5678', 'string', 'Company phone number'),
  ('company_email', 'contact@novatech.vn', 'string', 'Company email'),
  ('default_tax_rate', '10', 'number', 'Default tax rate in percent'),
  ('currency_code', 'VND', 'string', 'Default currency'),
  ('quotation_prefix', 'QTN', 'string', 'Prefix for quotation numbers'),
  ('quotation_validity_days', '30', 'number', 'Default quotation validity in days'),
  ('sales_order_prefix', 'SO', 'string', 'Prefix for sales order numbers'),
  ('purchase_order_prefix', 'PO', 'string', 'Prefix for purchase order numbers'),
  ('invoice_prefix', 'INV', 'string', 'Prefix for customer invoices'),
  ('vendor_bill_prefix', 'BILL', 'string', 'Prefix for vendor bills'),
  ('enable_credit_hold', 'true', 'boolean', 'Block orders if customer exceeds credit limit'),
  ('low_stock_threshold', '10', 'number', 'Low stock warning quantity'),
  ('default_payment_terms', 'NET30', 'string', 'Default payment terms for new customers')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- 9. CARRIERS (Delivery/Shipping Partners)
-- ============================================================================

INSERT INTO carriers (name, contact_person_name, contact_person_phone, contact_person_email, company_address, cost_per_km, average_delivery_time_days, status) VALUES
  ('GHTK', 'Nguyen Van A', '0901234567', 'ghtk@partner.vn', 'Ho Chi Minh City', 3500, 2, 'active'),
  ('GHN', 'Tran Thi B', '0912345678', 'ghn@partner.vn', 'Ho Chi Minh City', 3800, 2, 'active'),
  ('ViettelPost', 'Le Van C', '0923456789', 'vtpost@partner.vn', 'Hanoi', 4000, 3, 'active'),
  ('VNPost', 'Pham Thi D', '0934567890', 'vnpost@partner.vn', 'Hanoi', 3000, 5, 'active'),
  ('J&T Express', 'Hoang Van E', '0945678901', 'jt@partner.vn', 'Ho Chi Minh City', 3600, 2, 'active'),
  ('Ninja Van', 'Duong Thi F', '0956789012', 'ninja@partner.vn', 'Ho Chi Minh City', 3200, 2, 'active'),
  ('Best Express', 'Vu Van G', '0967890123', 'best@partner.vn', 'Hanoi', 3700, 3, 'active'),
  ('Self Delivery', 'Internal', '02812345678', 'warehouse@novatech.vn', 'NovaTech HQ', 0, 1, 'active')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 10. LEAD SOURCES (CRM Lead Sources)
-- ============================================================================

-- Note: If you have a lead_sources table, add it here
-- For now, leads.source is free-text, but common values:
-- 'Direct', 'Website', 'Referral', 'Event', 'Cold Call', 'Email Campaign', 'Social Media', 'Partner'

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
-- 
-- TO IMPORT THIS DATA:
-- 1. Open Supabase SQL Editor or psql
-- 2. Copy and paste this entire file
-- 3. Execute all statements
-- 4. Verify with: SELECT * FROM units_of_measure;
-- ============================================================================
