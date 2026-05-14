-- Adds owned bank accounts for users/suppliers, pins NovaTech's operating bank,
-- normalizes payment direction, and expands product categories.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'operating',
  ADD COLUMN IF NOT EXISTS is_novatech_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('company','user','supplier','cash','operating'));

UPDATE public.accounts
SET account_type = CASE
  WHEN account_number = 'CASH-001' THEN 'cash'
  WHEN account_number LIKE 'SUP-%' THEN 'supplier'
  ELSE 'company'
END,
is_novatech_default = (account_number = 'VCB-102938');

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.slug_account_text(value text)
RETURNS text AS $$
BEGIN
  RETURN upper(regexp_replace(coalesce(value, 'ACCOUNT'), '[^A-Za-z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.ensure_user_bank_account()
RETURNS TRIGGER AS $$
DECLARE new_account_id uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES ('USR-' || public.slug_account_text(NEW.username), 'Employee Bank', NEW.full_name || ' Bank Account', 0, 'user')
    ON CONFLICT (account_number) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO new_account_id;
    NEW.account_id := new_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_user_bank_account_before_insert ON public.users;
CREATE TRIGGER ensure_user_bank_account_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_user_bank_account();

CREATE OR REPLACE FUNCTION public.ensure_supplier_bank_account()
RETURNS TRIGGER AS $$
DECLARE new_account_id uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES ('SUP-' || public.slug_account_text(NEW.supplier_name), NEW.supplier_name || ' Bank', NEW.supplier_name || ' Bank Account', 0, 'supplier')
    ON CONFLICT (account_number) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO new_account_id;
    NEW.account_id := new_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_supplier_bank_account_before_insert ON public.suppliers;
CREATE TRIGGER ensure_supplier_bank_account_before_insert
BEFORE INSERT ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.ensure_supplier_bank_account();

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_check1;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_direction_accounts_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_direction_accounts_check
  CHECK (
    (payment_method = 'cash' AND payment_account IS NULL AND target_account IS NULL)
    OR (
      payment_method <> 'cash'
      AND (
        (invoice_id IS NOT NULL AND vendor_bill_id IS NULL AND payment_account IS NULL AND target_account IS NOT NULL)
        OR
        (invoice_id IS NULL AND vendor_bill_id IS NOT NULL AND payment_account IS NOT NULL AND target_account IS NOT NULL)
      )
    )
  );

INSERT INTO public.product_categories (category_name)
VALUES
  ('Control Hubs'),
  ('Environmental Sensors'),
  ('Cameras & Vision'),
  ('Access Control'),
  ('Power & Energy'),
  ('Switches & Automation'),
  ('Safety & Monitoring'),
  ('Connectivity')
ON CONFLICT (category_name) DO NOTHING;
