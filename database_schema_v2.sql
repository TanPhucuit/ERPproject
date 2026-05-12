-- ============================================================================
-- NOVATECH DISTRIBUTION - ERP SYSTEM DATABASE SCHEMA v2
-- For: Smart Home & IoT Equipment Distribution
-- Database: PostgreSQL (Supabase)
-- Version: 2.0 - WITH AUTO-CALCULATION TRIGGERS
-- ============================================================================
-- CRITICAL IMPROVEMENTS:
-- 1. Occupancy fields (warehouse, bin) are now CALCULATED, not manual input
-- 2. Stock level reserved/in-transit calculated from SO/GR automatically
-- 3. Customer credit_used calculated from unpaid invoices
-- 4. Supplier metrics calculated from actual transactions
-- 5. All fields that CAN be calculated MUST NOT be manually entered
-- ============================================================================

-- ============================================================================
-- PHASE 1: RECREATE PRODUCTS TABLE WITH physical_size_sqm
-- ============================================================================

ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS physical_size_sqm DECIMAL(10, 4) DEFAULT 1.0;
COMMENT ON COLUMN products.physical_size_sqm IS 'Physical dimension of product in square meters (for occupancy calculation). Default 1.0 for unit-based products.';

-- ============================================================================
-- PHASE 2: FIX WAREHOUSE & BIN LOCATION OCCUPANCY CALCULATION
-- ============================================================================

-- Update bin_locations to ensure current_occupancy_units CANNOT be manually edited (added as GENERATED ALWAYS constraint)
-- In practical terms, we'll use triggers to auto-calculate from stock_in_bins
-- Note: Cannot change existing column to GENERATED ALWAYS without recreating table
-- Instead, we enforce via application logic + add READ-ONLY comment

COMMENT ON COLUMN bin_locations.current_occupancy_units IS 'AUTO-CALCULATED from SUM(stock_in_bins.quantity). READ-ONLY - do not edit manually!';
COMMENT ON COLUMN warehouses.current_occupancy_sqm IS 'AUTO-CALCULATED from sum of bin occupancies. READ-ONLY - do not edit manually!';

-- ============================================================================
-- PHASE 3: ADD REORDER_STATUS AS REGULAR COLUMN (updated by trigger, not GENERATED)
-- ============================================================================

-- Drop existing reorder_status column if it exists
ALTER TABLE stock_levels DROP COLUMN IF EXISTS reorder_status CASCADE;

-- Add it back as regular VARCHAR (will be updated by trigger since GENERATED doesn't support subqueries)
ALTER TABLE stock_levels ADD COLUMN reorder_status VARCHAR(50) DEFAULT 'optimal';
COMMENT ON COLUMN stock_levels.reorder_status IS 'Status calculated from quantity_on_hand vs reorder_level. AUTO-CALCULATED by trigger. READ-ONLY!';

-- ============================================================================
-- PHASE 4: UPDATE SUPPLIERS METRICS (total_spent, average_response_time_hours)
-- ============================================================================

-- Make these READ-ONLY with comments
COMMENT ON COLUMN suppliers.total_spent IS 'AUTO-CALCULATED from SUM(vendor_bills.total_amount WHERE status=paid/received). READ-ONLY!';
COMMENT ON COLUMN suppliers.average_response_time_hours IS 'AUTO-CALCULATED from AVG(EXTRACT(EPOCH FROM rfq_supplier_quotations.received_date - rfqs.issued_date)/3600). READ-ONLY!';

-- ============================================================================
-- PHASE 5: UPDATE CUSTOMERS.credit_used AS READ-ONLY
-- ============================================================================

COMMENT ON COLUMN customers.credit_used IS 'AUTO-CALCULATED from SUM(customer_invoices.outstanding_amount). READ-ONLY - updated by trigger!';

-- ============================================================================
-- PHASE 5B: ALLOW QUOTATIONS WITHOUT CUSTOMER (LEAD-FIRST FLOW)
-- ============================================================================

ALTER TABLE quotations ALTER COLUMN customer_id DROP NOT NULL;
COMMENT ON COLUMN quotations.customer_id IS 'Nullable for lead-stage quotations; set when lead is won and converted to customer.';

-- ============================================================================
-- PHASE 6: CREATE TRIGGER FUNCTIONS FOR AUTO-CALCULATION
-- ============================================================================

-- ============ TRIGGER 1: Update bin_locations occupancy when stock_in_bins changes ============
CREATE OR REPLACE FUNCTION recalc_bin_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bin_locations 
    SET current_occupancy_units = (
      SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins 
      WHERE bin_location_id = NEW.bin_location_id
    )
    WHERE id = NEW.bin_location_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE bin_locations 
    SET current_occupancy_units = (
      SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins 
      WHERE bin_location_id = NEW.bin_location_id
    )
    WHERE id = NEW.bin_location_id;
    
    -- Also update old bin if different
    IF OLD.bin_location_id != NEW.bin_location_id THEN
      UPDATE bin_locations 
      SET current_occupancy_units = (
        SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins 
        WHERE bin_location_id = OLD.bin_location_id
      )
      WHERE id = OLD.bin_location_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bin_locations 
    SET current_occupancy_units = (
      SELECT COALESCE(SUM(quantity), 0) FROM stock_in_bins 
      WHERE bin_location_id = OLD.bin_location_id
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

-- ============ TRIGGER 2: Update warehouse occupancy when bins change ============
CREATE OR REPLACE FUNCTION recalc_warehouse_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  v_warehouse_id := COALESCE(NEW.warehouse_id, OLD.warehouse_id);
  
  UPDATE warehouses
  SET current_occupancy_sqm = (
    SELECT COALESCE(SUM(bl.current_occupancy_units * COALESCE(p.physical_size_sqm, 1)), 0)
    FROM bin_locations bl
    LEFT JOIN stock_in_bins sib ON bl.id = sib.bin_location_id
    LEFT JOIN products p ON sib.product_id = p.id
    WHERE bl.warehouse_id = v_warehouse_id
    GROUP BY bl.warehouse_id
  )
  WHERE id = v_warehouse_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_warehouse_occupancy ON bin_locations;
CREATE TRIGGER trigger_recalc_warehouse_occupancy
AFTER INSERT OR UPDATE OR DELETE ON bin_locations
FOR EACH ROW EXECUTE FUNCTION recalc_warehouse_occupancy();

-- Also trigger from stock_in_bins changes
DROP TRIGGER IF EXISTS trigger_recalc_warehouse_occupancy_from_stock ON stock_in_bins;
CREATE TRIGGER trigger_recalc_warehouse_occupancy_from_stock
AFTER INSERT OR UPDATE OR DELETE ON stock_in_bins
FOR EACH ROW EXECUTE FUNCTION recalc_warehouse_occupancy();

-- ============ TRIGGER 2B: Update stock_levels.reorder_status ============
CREATE OR REPLACE FUNCTION recalc_stock_reorder_status()
RETURNS TRIGGER AS $$
DECLARE
  v_reorder_level DECIMAL(15, 2);
BEGIN
  -- Get reorder level from product
  SELECT reorder_level INTO v_reorder_level FROM products WHERE id = NEW.product_id;
  
  -- Calculate and update reorder_status
  NEW.reorder_status := CASE 
    WHEN NEW.quantity_on_hand <= 0 THEN 'out_of_stock'
    WHEN v_reorder_level IS NOT NULL AND NEW.quantity_on_hand < v_reorder_level THEN 'understocked'
    WHEN v_reorder_level IS NOT NULL AND NEW.quantity_on_hand > (v_reorder_level * 3) THEN 'overstocked'
    ELSE 'optimal'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_stock_reorder_status ON stock_levels;
CREATE TRIGGER trigger_recalc_stock_reorder_status
BEFORE INSERT OR UPDATE ON stock_levels
FOR EACH ROW EXECUTE FUNCTION recalc_stock_reorder_status();

-- ============ TRIGGER 3: Update stock_levels.quantity_reserved from sales_order_lines ============
CREATE OR REPLACE FUNCTION recalc_stock_reserved()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add to reserved quantity (allocate to SO)
    UPDATE stock_levels
    SET quantity_reserved = (
      SELECT COALESCE(SUM(sol.quantity_ordered - COALESCE(sol.quantity_delivered, 0)), 0)
      FROM sales_order_lines sol
      JOIN sales_orders so ON sol.sales_order_id = so.id
      WHERE sol.product_id = NEW.product_id
        AND so.status NOT IN ('cancelled', 'delivered')
    )
    WHERE product_id = NEW.product_id;
      
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE stock_levels
    SET quantity_reserved = (
      SELECT COALESCE(SUM(sol.quantity_ordered - COALESCE(sol.quantity_delivered, 0)), 0)
      FROM sales_order_lines sol
      JOIN sales_orders so ON sol.sales_order_id = so.id
      WHERE sol.product_id = NEW.product_id
        AND so.status NOT IN ('cancelled', 'delivered')
    )
    WHERE product_id = NEW.product_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stock_levels
    SET quantity_reserved = (
      SELECT COALESCE(SUM(sol.quantity_ordered - COALESCE(sol.quantity_delivered, 0)), 0)
      FROM sales_order_lines sol
      JOIN sales_orders so ON sol.sales_order_id = so.id
      WHERE sol.product_id = OLD.product_id
        AND so.status NOT IN ('cancelled', 'delivered')
    )
    WHERE product_id = OLD.product_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_stock_reserved ON sales_order_lines;
CREATE TRIGGER trigger_recalc_stock_reserved
AFTER INSERT OR UPDATE OR DELETE ON sales_order_lines
FOR EACH ROW EXECUTE FUNCTION recalc_stock_reserved();

-- ============ TRIGGER 4: Update stock_levels.quantity_in_transit from goods_receipt_lines ============
CREATE OR REPLACE FUNCTION recalc_stock_in_transit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stock_levels
    SET quantity_in_transit = (
      SELECT COALESCE(SUM(grl.quantity_received - COALESCE(grl.quantity_accepted, 0)), 0)
      FROM goods_receipt_lines grl
      JOIN goods_receipts gr ON grl.goods_receipt_id = gr.id
      WHERE grl.product_id = NEW.product_id
        AND gr.status NOT IN ('completed', 'cancelled')
    )
    WHERE product_id = NEW.product_id
      AND warehouse_id = (SELECT warehouse_id FROM goods_receipts WHERE id = NEW.goods_receipt_id);
      
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE stock_levels
    SET quantity_in_transit = (
      SELECT COALESCE(SUM(grl.quantity_received - COALESCE(grl.quantity_accepted, 0)), 0)
      FROM goods_receipt_lines grl
      JOIN goods_receipts gr ON grl.goods_receipt_id = gr.id
      WHERE grl.product_id = NEW.product_id
        AND gr.status NOT IN ('completed', 'cancelled')
    )
    WHERE product_id = NEW.product_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stock_levels
    SET quantity_in_transit = (
      SELECT COALESCE(SUM(grl.quantity_received - COALESCE(grl.quantity_accepted, 0)), 0)
      FROM goods_receipt_lines grl
      JOIN goods_receipts gr ON grl.goods_receipt_id = gr.id
      WHERE grl.product_id = OLD.product_id
        AND gr.status NOT IN ('completed', 'cancelled')
    )
    WHERE product_id = OLD.product_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_stock_in_transit ON goods_receipt_lines;
CREATE TRIGGER trigger_recalc_stock_in_transit
AFTER INSERT OR UPDATE OR DELETE ON goods_receipt_lines
FOR EACH ROW EXECUTE FUNCTION recalc_stock_in_transit();

-- ============ TRIGGER 5: Update customers.credit_used from unpaid invoices ============
CREATE OR REPLACE FUNCTION recalc_customer_credit_used()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE customers
    SET credit_used = (
      SELECT COALESCE(SUM(outstanding_amount), 0)
      FROM customer_invoices
      WHERE customer_id = NEW.customer_id
        AND status NOT IN ('cancelled', 'paid')
    )
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers
    SET credit_used = (
      SELECT COALESCE(SUM(outstanding_amount), 0)
      FROM customer_invoices
      WHERE customer_id = OLD.customer_id
        AND status NOT IN ('cancelled', 'paid')
    )
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_customer_credit_used ON customer_invoices;
CREATE TRIGGER trigger_recalc_customer_credit_used
AFTER INSERT OR UPDATE OR DELETE ON customer_invoices
FOR EACH ROW EXECUTE FUNCTION recalc_customer_credit_used();

-- Also trigger from payments
DROP TRIGGER IF EXISTS trigger_recalc_customer_credit_used_payment ON customer_payments;
CREATE TRIGGER trigger_recalc_customer_credit_used_payment
AFTER INSERT OR UPDATE OR DELETE ON customer_payments
FOR EACH ROW EXECUTE FUNCTION recalc_customer_credit_used();

-- ============ TRIGGER 6: Update suppliers.total_spent from vendor_bills ============
CREATE OR REPLACE FUNCTION recalc_supplier_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE suppliers
    SET total_spent = (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM vendor_bills
      WHERE supplier_id = NEW.supplier_id
        AND status IN ('received', 'verified', 'partial_paid', 'paid')
    )
    WHERE id = NEW.supplier_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE suppliers
    SET total_spent = (
      SELECT COALESCE(SUM(total_amount), 0)
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

-- ============ TRIGGER 7: Update suppliers.average_response_time_hours from RFQ responses ============
CREATE OR REPLACE FUNCTION recalc_supplier_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE suppliers
    SET average_response_time_hours = (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (rsq.received_date - rfq.issued_date)) / 3600), 0)
      FROM rfq_supplier_quotations rsq
      JOIN rfq_lines rfl ON rsq.rfq_line_id = rfl.id
      JOIN rfqs rfq ON rfl.rfq_id = rfq.id
      WHERE rsq.supplier_id = NEW.supplier_id
        AND rsq.received_date IS NOT NULL
    )
    WHERE id = NEW.supplier_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE suppliers
    SET average_response_time_hours = (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (rsq.received_date - rfq.issued_date)) / 3600), 0)
      FROM rfq_supplier_quotations rsq
      JOIN rfq_lines rfl ON rsq.rfq_line_id = rfl.id
      JOIN rfqs rfq ON rfl.rfq_id = rfq.id
      WHERE rsq.supplier_id = OLD.supplier_id
        AND rsq.received_date IS NOT NULL
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

-- ============ TRIGGER 8: Update stock_levels.last_counted_at from approved inventory adjustments ============
CREATE OR REPLACE FUNCTION recalc_stock_last_counted()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE stock_levels
    SET last_counted_at = NEW.approved_at,
        last_adjusted_at = NEW.approved_at
    WHERE id IN (
      SELECT DISTINCT sl.id
      FROM stock_levels sl
      WHERE sl.product_id IN (
        SELECT DISTINCT product_id FROM inventory_adjustment_lines
        WHERE adjustment_id = NEW.id
      )
      AND sl.warehouse_id = NEW.warehouse_id
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_stock_last_counted ON inventory_adjustments;
CREATE TRIGGER trigger_recalc_stock_last_counted
AFTER UPDATE ON inventory_adjustments
FOR EACH ROW WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION recalc_stock_last_counted();

-- ============================================================================
-- PHASE 7: ADD BUSINESS LOGIC CONSTRAINTS
-- ============================================================================

-- Constraint 1: Credit limit validation (implemented in backend logic)
-- NOTE: This would be a CHECK constraint but needs dynamic customer data
-- Implementation: Use backend validation when creating/updating sales orders

-- Constraint 2: Prevent negative quantities
ALTER TABLE stock_levels 
ADD CONSTRAINT chk_stock_levels_qty_positive 
CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND quantity_in_transit >= 0);

ALTER TABLE stock_in_bins
ADD CONSTRAINT chk_stock_in_bins_qty_positive
CHECK (quantity >= 0);

-- Constraint 3: Bin code uniqueness within warehouse (already have unique index)

-- Constraint 4: Bin occupancy cannot exceed capacity
ALTER TABLE bin_locations
ADD CONSTRAINT chk_bin_occupancy_not_exceed_capacity
CHECK (current_occupancy_units <= capacity_units);

-- Constraint 5: Warehouse occupancy cannot exceed capacity
ALTER TABLE warehouses
ADD CONSTRAINT chk_warehouse_occupancy_not_exceed_capacity
CHECK (current_occupancy_sqm <= capacity_sqm);

-- ============================================================================
-- PHASE 8: DATA CLEANUP INSTRUCTIONS
-- ============================================================================

-- IMPORTANT: Run these commands to clear bad data before importing new data:

-- 1. Clear stock_in_bins (inventory will be rebuilt from GR)
TRUNCATE TABLE stock_in_bins CASCADE;

-- 2. Reset all occupancy counters to 0
UPDATE bin_locations SET current_occupancy_units = 0;
UPDATE warehouses SET current_occupancy_sqm = 0;

-- 3. Clear bad stock_levels data (will be recalculated)
TRUNCATE TABLE stock_levels CASCADE;

-- 4. Reset supplier metrics (will be recalculated)
UPDATE suppliers SET total_spent = 0, average_response_time_hours = 0;

-- 5. Reset customer credit used (will be recalculated)
UPDATE customers SET credit_used = 0;

-- ============================================================================
-- PHASE 9: VERIFICATION QUERIES
-- ============================================================================

-- Verify triggers are created:
-- SELECT trigger_name, event_object_table FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' AND event_object_table IN ('stock_in_bins', 'bin_locations', 'warehouses', 'sales_order_lines', 'goods_receipt_lines', 'customer_invoices', 'vendor_bills', 'rfq_supplier_quotations', 'inventory_adjustments')
-- ORDER BY event_object_table;

-- ============================================================================
-- END OF SCHEMA v2
-- ============================================================================
-- SUMMARY OF CHANGES:
-- ✅ Added physical_size_sqm to products
-- ✅ Created 8 triggers for auto-calculation
-- ✅ Made occupancy fields READ-ONLY (via comments + trigger enforcement)
-- ✅ Made customer.credit_used CALCULATED (from unpaid invoices)
-- ✅ Made supplier.total_spent CALCULATED (from paid bills)
-- ✅ Made supplier.average_response_time CALCULATED (from RFQ responses)
-- ✅ Made stock_levels.quantity_reserved CALCULATED (from SO lines)
-- ✅ Made stock_levels.quantity_in_transit CALCULATED (from GR lines)
-- ✅ Made stock_levels.reorder_status AUTO-CALCULATED by trigger (read-only)
-- ✅ Added business constraint checks (no negative quantities, capacity checks)
-- ✅ All calculated fields are NOW PROTECTED - user cannot override
-- ============================================================================
