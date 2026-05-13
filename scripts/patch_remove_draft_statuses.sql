-- Patch: remove draft/confirmed workflow states and align sales-delivery-payment flow.

-- Convert existing data before tightening constraints where possible.
UPDATE quotations SET status = 'sent' WHERE status = 'draft';
UPDATE delivery_orders SET status = 'ready' WHERE status = 'draft';
UPDATE invoices SET status = 'sent' WHERE status = 'draft';
UPDATE vendor_bills SET status = 'posted' WHERE status = 'draft';
UPDATE rfqs SET status = 'sent' WHERE status = 'draft';
UPDATE purchase_orders SET status = 'sent' WHERE status IN ('draft','confirmed');
UPDATE receipts SET status = 'completed' WHERE status = 'draft';

-- Sales order had old constraint that blocks ready/delivering.
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
UPDATE sales_orders SET status = 'ready' WHERE status IN ('draft','confirmed');
ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_status_check
  CHECK (status IN ('ready','delivering','delivered','cancelled'));
ALTER TABLE sales_orders ALTER COLUMN status SET DEFAULT 'ready';

ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('sent','accepted','rejected'));
ALTER TABLE quotations ALTER COLUMN status SET DEFAULT 'sent';

-- Keep one active quotation per lead before creating the unique index.
-- Priority: accepted quotation first, otherwise the newest sent quotation.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY lead_id
      ORDER BY
        CASE status WHEN 'accepted' THEN 1 WHEN 'sent' THEN 2 ELSE 3 END,
        created_at DESC,
        id DESC
    ) AS rn
  FROM quotations
  WHERE lead_id IS NOT NULL
    AND status <> 'rejected'
)
UPDATE quotations q
SET
  status = 'rejected',
  notes = CONCAT_WS(E'\n', NULLIF(q.notes, ''), 'Auto-rejected by patch because this lead already has another active quotation.')
FROM ranked r
WHERE q.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS uniq_quotations_one_open_per_lead;
CREATE UNIQUE INDEX uniq_quotations_one_open_per_lead
ON quotations(lead_id)
WHERE lead_id IS NOT NULL AND status <> 'rejected';

ALTER TABLE delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_status_check;
ALTER TABLE delivery_orders
  ADD CONSTRAINT delivery_orders_status_check
  CHECK (status IN ('ready','delivering','delivered'));
ALTER TABLE delivery_orders ALTER COLUMN status SET DEFAULT 'ready';

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('sent','partial_paid','paid','overdue','cancelled'));
ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'sent';

ALTER TABLE vendor_bills DROP CONSTRAINT IF EXISTS vendor_bills_status_check;
ALTER TABLE vendor_bills
  ADD CONSTRAINT vendor_bills_status_check
  CHECK (status IN ('posted','partial_paid','paid','overdue','cancelled'));
ALTER TABLE vendor_bills ALTER COLUMN status SET DEFAULT 'posted';

ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS rfqs_status_check;
ALTER TABLE rfqs
  ADD CONSTRAINT rfqs_status_check
  CHECK (status IN ('sent','closed','cancelled'));
ALTER TABLE rfqs ALTER COLUMN status SET DEFAULT 'sent';

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('sent','received','cancelled'));
ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'sent';

ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
ALTER TABLE receipts
  ADD CONSTRAINT receipts_status_check
  CHECK (status IN ('completed','cancelled'));
ALTER TABLE receipts ALTER COLUMN status SET DEFAULT 'completed';

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
    IF paid_total >= doc_total THEN
      UPDATE delivery_orders d
      SET status = 'delivering'
      FROM invoices i
      WHERE i.id = NEW.invoice_id
        AND d.sales_order_id = i.sales_order_id
        AND d.status = 'ready';
      UPDATE sales_orders so
      SET status = 'delivering'
      FROM invoices i
      WHERE i.id = NEW.invoice_id
        AND so.id = i.sales_order_id
        AND so.status = 'ready';
    END IF;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO paid_total FROM payments WHERE vendor_bill_id = NEW.vendor_bill_id;
    SELECT total INTO doc_total FROM vendor_bills WHERE id = NEW.vendor_bill_id;
    UPDATE vendor_bills SET status = CASE WHEN paid_total >= doc_total THEN 'paid' ELSE 'partial_paid' END WHERE id = NEW.vendor_bill_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
