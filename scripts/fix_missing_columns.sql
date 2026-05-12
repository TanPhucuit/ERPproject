-- Migration: Add missing columns
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This fixes: "Could not find the 'is_deleted' column of 'users' in the schema cache"
--             "Could not find the 'login_attempts' column of 'users' in the schema cache"
--             "Could not find the 'is_auto_request' column of 'leads' in the schema cache"

-- ============================================================
-- 1. Add is_deleted to users if missing
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 2. Add login lockout columns to users if missing
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ============================================================
-- 3. Add is_auto_request to leads if missing
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_auto_request BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 4. Add auto-BOM columns to products if missing
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_auto_bom BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_sqm NUMERIC(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_sqm NUMERIC(10,2) DEFAULT 9999;

-- ============================================================
-- 5. Add is_active to product_categories if missing
-- ============================================================
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================
-- 6. Refresh schema cache so Supabase client sees new columns
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT 'users.is_deleted' AS column_check, COUNT(*) AS cnt
FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_deleted'
UNION ALL
SELECT 'users.login_attempts', COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'login_attempts'
UNION ALL
SELECT 'leads.is_auto_request', COUNT(*) FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'is_auto_request'
UNION ALL
SELECT 'products.is_auto_bom', COUNT(*) FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_auto_bom'
UNION ALL
SELECT 'product_categories.is_active', COUNT(*) FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'is_active';
