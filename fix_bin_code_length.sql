-- ==============================================
-- Fix: Increase bin_code column length
-- Run this in Supabase SQL Editor
-- ==============================================

-- Increase bin_code from VARCHAR(20) to VARCHAR(50) to support longer codes
ALTER TABLE bin_locations 
ALTER COLUMN bin_code TYPE VARCHAR(50);

-- Also increase warehouse_code if needed
ALTER TABLE warehouses 
ALTER COLUMN warehouse_code TYPE VARCHAR(50);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name IN ('bin_locations', 'warehouses') 
AND column_name IN ('bin_code', 'warehouse_code');
