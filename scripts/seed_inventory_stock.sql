-- Seed and repair Inventory stock data.
-- Run in Supabase SQL editor after master data (warehouses, bin_locations, products) exists.

BEGIN;

-- Keep CRM stages to the requested business states: new, won, lost.
INSERT INTO lead_stages (name, display_order, color_code, probability_percent)
VALUES
  ('new', 1, '#3b82f6', 10),
  ('won', 2, '#16a34a', 100),
  ('lost', 3, '#dc2626', 0)
ON CONFLICT (name) DO UPDATE SET
  probability_percent = EXCLUDED.probability_percent;

UPDATE leads
SET stage_id = (SELECT id FROM lead_stages WHERE name = 'new' LIMIT 1)
WHERE stage_id IN (
  SELECT id FROM lead_stages WHERE name NOT IN ('new', 'won', 'lost')
);

DELETE FROM lead_stages WHERE name NOT IN ('new', 'won', 'lost');

ALTER TABLE stock_in_bins
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

UPDATE stock_in_bins sib
SET warehouse_id = bl.warehouse_id
FROM bin_locations bl
WHERE sib.bin_location_id = bl.id
  AND sib.warehouse_id IS NULL;

ALTER TABLE stock_levels
  ADD COLUMN IF NOT EXISTS bin_location_id UUID REFERENCES bin_locations(id);

DROP INDEX IF EXISTS idx_stock_levels_unique;
ALTER TABLE stock_levels
  DROP CONSTRAINT IF EXISTS stock_levels_product_id_warehouse_id_bin_location_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_product_warehouse_bin
ON stock_levels(product_id, warehouse_id, COALESCE(bin_location_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Seed stock into up to 3 bins per warehouse for up to 20 active products.
WITH ranked_bins AS (
  SELECT bl.*, ROW_NUMBER() OVER (PARTITION BY bl.warehouse_id ORDER BY bl.bin_code) AS rn
  FROM bin_locations bl
),
seed_bins AS (
  SELECT * FROM ranked_bins WHERE rn <= 3
),
seed_products AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY name) AS rn
  FROM products
  WHERE COALESCE(status, 'active') = 'active'
  ORDER BY name
  LIMIT 20
),
seed_rows AS (
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    b.warehouse_id,
    b.id AS bin_location_id,
    (8 + ((p.rn + b.rn) % 12))::numeric AS quantity
  FROM seed_products p
  CROSS JOIN seed_bins b
)
INSERT INTO stock_in_bins (product_id, warehouse_id, bin_location_id, quantity, notes)
SELECT product_id, warehouse_id, bin_location_id, quantity, 'Seeded inventory opening balance'
FROM seed_rows s
WHERE NOT EXISTS (
  SELECT 1
  FROM stock_in_bins sib
  WHERE sib.product_id = s.product_id
    AND sib.warehouse_id = s.warehouse_id
    AND sib.bin_location_id = s.bin_location_id
);

-- Rebuild bin-level stock_levels from stock_in_bins.
WITH bin_totals AS (
  SELECT product_id, warehouse_id, bin_location_id, SUM(quantity)::numeric AS qty
  FROM stock_in_bins
  GROUP BY product_id, warehouse_id, bin_location_id
)
UPDATE stock_levels sl
SET quantity_on_hand = bt.qty,
    quantity_in_transit = 0,
    last_adjusted_at = NOW(),
    reorder_status = 'optimal'
FROM bin_totals bt
WHERE sl.product_id = bt.product_id
  AND sl.warehouse_id = bt.warehouse_id
  AND sl.bin_location_id = bt.bin_location_id;

WITH bin_totals AS (
  SELECT product_id, warehouse_id, bin_location_id, SUM(quantity)::numeric AS qty
  FROM stock_in_bins
  GROUP BY product_id, warehouse_id, bin_location_id
)
INSERT INTO stock_levels (
  product_id, warehouse_id, bin_location_id,
  quantity_on_hand, quantity_reserved, quantity_in_transit,
  reorder_status, last_adjusted_at
)
SELECT bt.product_id, bt.warehouse_id, bt.bin_location_id, bt.qty, 0, 0, 'optimal', NOW()
FROM bin_totals bt
WHERE NOT EXISTS (
  SELECT 1
  FROM stock_levels sl
  WHERE sl.product_id = bt.product_id
    AND sl.warehouse_id = bt.warehouse_id
    AND sl.bin_location_id = bt.bin_location_id
);

-- Aggregate warehouse-level stock_levels are kept for reservation/order checks.
WITH warehouse_totals AS (
  SELECT product_id, warehouse_id, SUM(quantity)::numeric AS qty
  FROM stock_in_bins
  GROUP BY product_id, warehouse_id
)
UPDATE stock_levels sl
SET quantity_on_hand = wt.qty,
    last_adjusted_at = NOW(),
    reorder_status = 'optimal'
FROM warehouse_totals wt
WHERE sl.product_id = wt.product_id
  AND sl.warehouse_id = wt.warehouse_id
  AND sl.bin_location_id IS NULL;

WITH warehouse_totals AS (
  SELECT product_id, warehouse_id, SUM(quantity)::numeric AS qty
  FROM stock_in_bins
  GROUP BY product_id, warehouse_id
)
INSERT INTO stock_levels (
  product_id, warehouse_id, bin_location_id,
  quantity_on_hand, quantity_reserved, quantity_in_transit,
  reorder_status, last_adjusted_at
)
SELECT wt.product_id, wt.warehouse_id, NULL, wt.qty, 0, 0, 'optimal', NOW()
FROM warehouse_totals wt
WHERE NOT EXISTS (
  SELECT 1
  FROM stock_levels sl
  WHERE sl.product_id = wt.product_id
    AND sl.warehouse_id = wt.warehouse_id
    AND sl.bin_location_id IS NULL
);

-- Reserved stock: confirmed/open sales orders.
WITH reserved AS (
  SELECT sol.product_id, so.warehouse_id, SUM(COALESCE(sol.quantity, sol.quantity_ordered, 0))::numeric AS qty
  FROM sales_order_lines sol
  JOIN sales_orders so ON so.id = sol.sales_order_id
  WHERE so.status IN ('confirmed', 'partial_delivered', 'partial_shipped')
    AND so.warehouse_id IS NOT NULL
  GROUP BY sol.product_id, so.warehouse_id
)
UPDATE stock_levels sl
SET quantity_reserved = COALESCE(r.qty, 0)
FROM reserved r
WHERE sl.product_id = r.product_id
  AND sl.warehouse_id = r.warehouse_id
  AND sl.bin_location_id IS NULL;

-- In transit: draft/validated transfers counted at destination stock level.
WITH in_transit AS (
  SELECT stl.product_id, st.dest_warehouse_id AS warehouse_id, stl.to_bin_location_id AS bin_location_id,
         SUM(stl.quantity)::numeric AS qty
  FROM stock_transfer_lines stl
  JOIN stock_transfers st ON st.id = stl.transfer_id
  WHERE st.status IN ('draft', 'validated')
  GROUP BY stl.product_id, st.dest_warehouse_id, stl.to_bin_location_id
)
UPDATE stock_levels sl
SET quantity_in_transit = it.qty
FROM in_transit it
WHERE sl.product_id = it.product_id
  AND sl.warehouse_id = it.warehouse_id
  AND sl.bin_location_id = it.bin_location_id;

COMMIT;
