-- Fix historical RFQ -> PO duplicates.
-- purchase_order_items is the PO line table; do not create a second PO_line table.
--
-- Business rule:
--   1 accepted RFQ -> 1 active purchase_orders header -> many purchase_order_items lines.
--
-- Run this in Supabase SQL Editor after deploying the frontend/service changes.

BEGIN;

-- Rebuild the earliest active PO for each RFQ from the RFQ lines.
WITH ranked AS (
  SELECT
    po.id,
    po.rfq_id,
    ROW_NUMBER() OVER (PARTITION BY po.rfq_id ORDER BY po.order_date, po.order_number, po.id) AS rn
  FROM purchase_orders po
  WHERE po.rfq_id IS NOT NULL
    AND po.status <> 'cancelled'
),
primary_pos AS (
  SELECT id, rfq_id
  FROM ranked
  WHERE rn = 1
),
primary_lines_deleted AS (
  DELETE FROM purchase_order_items poi
  USING primary_pos pp
  WHERE poi.purchase_order_id = pp.id
  RETURNING poi.id
)
INSERT INTO purchase_order_items (
  purchase_order_id,
  supplier_products_id,
  quantity,
  unit_price
)
SELECT
  pp.id,
  ri.supplier_products_id,
  ri.quantity,
  sp.price
FROM primary_pos pp
JOIN rfq_items ri ON ri.rfq_id = pp.rfq_id
JOIN supplier_products sp ON sp.id = ri.supplier_products_id;

-- Keep a valid header supplier for legacy schema, but the UI must not use it as PO owner.
WITH first_supplier AS (
  SELECT DISTINCT ON (po.id)
    po.id AS purchase_order_id,
    sp.supplier_id
  FROM purchase_orders po
  JOIN rfq_items ri ON ri.rfq_id = po.rfq_id
  JOIN supplier_products sp ON sp.id = ri.supplier_products_id
  WHERE po.rfq_id IS NOT NULL
    AND po.status <> 'cancelled'
  ORDER BY po.id, ri.id
)
UPDATE purchase_orders po
SET vendor_id = fs.supplier_id
FROM first_supplier fs
WHERE po.id = fs.purchase_order_id;

-- Remove duplicate dependent records where no irreversible business event happened.
WITH ranked AS (
  SELECT
    po.id,
    ROW_NUMBER() OVER (PARTITION BY po.rfq_id ORDER BY po.order_date, po.order_number, po.id) AS rn
  FROM purchase_orders po
  WHERE po.rfq_id IS NOT NULL
    AND po.status <> 'cancelled'
),
duplicates AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
),
safe_duplicates AS (
  SELECT d.id
  FROM duplicates d
  WHERE NOT EXISTS (
    SELECT 1 FROM receipts r
    WHERE r.purchase_order_id = d.id
      AND r.status = 'received'
  )
  AND NOT EXISTS (
    SELECT 1 FROM vendor_bills vb
    WHERE vb.purchase_order_id = d.id
      AND vb.status = 'paid'
  )
),
deleted_receipts AS (
  DELETE FROM receipts r
  USING safe_duplicates d
  WHERE r.purchase_order_id = d.id
  RETURNING r.id
),
deleted_bills AS (
  DELETE FROM vendor_bills vb
  USING safe_duplicates d
  WHERE vb.purchase_order_id = d.id
  RETURNING vb.id
),
deleted_lines AS (
  DELETE FROM purchase_order_items poi
  USING safe_duplicates d
  WHERE poi.purchase_order_id = d.id
  RETURNING poi.id
)
DELETE FROM purchase_orders po
USING safe_duplicates d
WHERE po.id = d.id;

-- If a duplicate already has paid/received downstream records, keep an audit trail but make it inactive.
WITH ranked AS (
  SELECT
    po.id,
    ROW_NUMBER() OVER (PARTITION BY po.rfq_id ORDER BY po.order_date, po.order_number, po.id) AS rn
  FROM purchase_orders po
  WHERE po.rfq_id IS NOT NULL
    AND po.status <> 'cancelled'
),
duplicates AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE purchase_orders po
SET
  status = 'cancelled',
  notes = COALESCE(po.notes || E'\n', '') || 'Cancelled by RFQ duplicate cleanup. RFQ must have exactly one active PO.'
FROM duplicates d
WHERE po.id = d.id;

-- Recompute vendor bills for remaining active RFQ purchase orders.
WITH po_totals AS (
  SELECT
    po.id AS purchase_order_id,
    COALESCE(SUM(poi.quantity * poi.unit_price), 0) AS subtotal
  FROM purchase_orders po
  LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
  WHERE po.rfq_id IS NOT NULL
    AND po.status <> 'cancelled'
  GROUP BY po.id
)
UPDATE vendor_bills vb
SET
  subtotal = pt.subtotal,
  tax_amount = ROUND(pt.subtotal * 0.10, 2),
  total = ROUND(pt.subtotal * 1.10, 2)
FROM po_totals pt
WHERE vb.purchase_order_id = pt.purchase_order_id
  AND vb.status <> 'paid';

-- Create missing vendor bills for active RFQ purchase orders.
WITH po_totals AS (
  SELECT
    po.id AS purchase_order_id,
    COALESCE(SUM(poi.quantity * poi.unit_price), 0) AS subtotal
  FROM purchase_orders po
  LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
  WHERE po.rfq_id IS NOT NULL
    AND po.status <> 'cancelled'
  GROUP BY po.id
)
INSERT INTO vendor_bills (
  purchase_order_id,
  issue_date,
  due_date,
  status,
  subtotal,
  tax_amount,
  total,
  notes
)
SELECT
  pt.purchase_order_id,
  CURRENT_DATE,
  CURRENT_DATE + 30,
  'posted',
  pt.subtotal,
  ROUND(pt.subtotal * 0.10, 2),
  ROUND(pt.subtotal * 1.10, 2),
  'Auto-created by RFQ duplicate cleanup.'
FROM po_totals pt
WHERE NOT EXISTS (
  SELECT 1
  FROM vendor_bills vb
  WHERE vb.purchase_order_id = pt.purchase_order_id
);

-- Create missing goods receipts for active RFQ purchase orders.
INSERT INTO receipts (
  purchase_order_id,
  receipt_date,
  status,
  notes
)
SELECT
  po.id,
  CURRENT_DATE,
  'ready',
  'Auto-created by RFQ duplicate cleanup.'
FROM purchase_orders po
WHERE po.rfq_id IS NOT NULL
  AND po.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1
    FROM receipts r
    WHERE r.purchase_order_id = po.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS uniq_purchase_orders_one_active_per_rfq
  ON purchase_orders(rfq_id)
  WHERE rfq_id IS NOT NULL AND status <> 'cancelled';

COMMIT;
