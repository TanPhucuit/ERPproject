BEGIN;

ALTER TABLE rfqs
  DROP CONSTRAINT IF EXISTS rfqs_status_check;

UPDATE rfqs
SET status = CASE status
  WHEN 'sent' THEN 'new'
  WHEN 'closed' THEN 'accepted'
  WHEN 'cancelled' THEN 'denied'
  WHEN 'rejected' THEN 'denied'
  ELSE status
END;

ALTER TABLE rfqs
  ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE rfqs
  ADD CONSTRAINT rfqs_status_check
  CHECK (status IN ('new','accepted','denied'));

CREATE OR REPLACE FUNCTION public.normalize_rfq_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status = CASE NEW.status
    WHEN 'sent' THEN 'new'
    WHEN 'closed' THEN 'accepted'
    WHEN 'cancelled' THEN 'denied'
    WHEN 'rejected' THEN 'denied'
    WHEN NULL THEN 'new'
    ELSE NEW.status
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_rfq_status_before_insert_update ON public.rfqs;
CREATE TRIGGER normalize_rfq_status_before_insert_update
BEFORE INSERT OR UPDATE OF status ON public.rfqs
FOR EACH ROW
EXECUTE FUNCTION public.normalize_rfq_status();

ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS receipts_status_check;

ALTER TABLE receipts
  ALTER COLUMN status SET DEFAULT 'ready';

ALTER TABLE receipts
  ADD CONSTRAINT receipts_status_check
  CHECK (status IN ('ready','delivering','received','completed','cancelled'));

COMMIT;
