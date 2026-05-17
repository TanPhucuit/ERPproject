-- Normalize default owned bank accounts.
-- Lead, customer, NovaTech, and supplier bank accounts start with 100,000,000 VND.

CREATE OR REPLACE FUNCTION public.ensure_lead_bank_account()
RETURNS TRIGGER AS $$
DECLARE new_account_id uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES (
      'LEAD-' || upper(substr(md5(COALESCE(NEW.id, gen_random_uuid())::text), 1, 10)),
      'Customer Bank',
      trim(COALESCE(NEW.company, trim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), 'Lead') || ' Bank Account'),
      100000000,
      'lead'
    )
    RETURNING id INTO new_account_id;
    NEW.account_id := new_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.ensure_customer_bank_account()
RETURNS TRIGGER AS $$
DECLARE new_account_id uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES (
      'CUS-' || upper(substr(md5(COALESCE(NEW.id, gen_random_uuid())::text), 1, 10)),
      'Customer Bank',
      COALESCE(NULLIF(NEW.full_name, ''), NULLIF(NEW.company_name, ''), 'Customer') || ' Bank Account',
      100000000,
      'customer'
    )
    RETURNING id INTO new_account_id;
    NEW.account_id := new_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.ensure_supplier_bank_account()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES ('SUP-' || public.slug_account_text(NEW.supplier_name), NEW.supplier_name || ' Bank', NEW.supplier_name || ' Bank Account', 100000000, 'supplier')
    ON CONFLICT (account_number) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO new_account_id;
    NEW.account_id := new_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE public.accounts
SET balance = 100000000
WHERE account_type IN ('lead', 'customer', 'supplier')
   OR is_novatech_default = TRUE;
