-- ============================================================
-- Fix: Customer bank account trigger + payment constraints
-- Issues fixed:
--   1. 'customer' and 'lead' not in accounts_account_type_check → inserts fail silently
--   2. ensure_customer_bank_account trigger missing on customers table
--   3. payments_direction_accounts_check too strict for card/other methods
--   4. Backfill missing bank accounts for existing customers
-- ============================================================

-- Step 1: Expand account_type constraint to include 'customer' and 'lead'
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('company', 'user', 'supplier', 'cash', 'operating', 'customer', 'lead'));

-- Step 2: Re-create ensure_customer_bank_account with ON CONFLICT safety
CREATE OR REPLACE FUNCTION public.ensure_customer_bank_account()
RETURNS TRIGGER AS $$
DECLARE new_account_id uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES (
      'CUS-' || upper(substr(md5(COALESCE(NEW.id::text, gen_random_uuid()::text)), 1, 10)),
      'Customer Bank',
      COALESCE(NULLIF(trim(NEW.full_name), ''), NULLIF(trim(NEW.company_name), ''), 'Customer') || ' Bank Account',
      100000000,
      'customer'
    )
    ON CONFLICT (account_number) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO new_account_id;
    NEW.account_id := new_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Attach trigger to customers table (was missing!)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS ensure_customer_bank_account_before_insert ON public.customers;
CREATE TRIGGER ensure_customer_bank_account_before_insert
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.ensure_customer_bank_account();

-- Step 4: Relax the payments direction constraint to handle card/other methods
--   Old rule was too strict: required payment_account IS NULL for invoice payments
--   and both accounts NOT NULL for vendor bills — breaks on card/other
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_direction_accounts_check;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_check1;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_direction_accounts_check
  CHECK (
    -- Cash: no accounts at all
    (payment_method = 'cash' AND payment_account IS NULL AND target_account IS NULL)
    OR
    -- Card: no source account (terminal), target account optional but allowed
    (payment_method = 'card' AND payment_account IS NULL)
    OR
    -- Bank transfer / other: accounts optional (informational), target preferred
    (payment_method NOT IN ('cash', 'card'))
  );

-- Step 5: Backfill bank accounts for existing customers that have none
DO $$
DECLARE
  cust RECORD;
  new_account_id uuid;
  acct_number text;
BEGIN
  FOR cust IN
    SELECT id, full_name, company_name
    FROM public.customers
    WHERE account_id IS NULL
  LOOP
    acct_number := 'CUS-' || upper(substr(md5(cust.id::text), 1, 10));

    -- Check if account already exists with this number
    SELECT id INTO new_account_id FROM public.accounts WHERE account_number = acct_number;

    IF new_account_id IS NULL THEN
      INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
      VALUES (
        acct_number,
        'Customer Bank',
        COALESCE(NULLIF(trim(cust.full_name), ''), NULLIF(trim(cust.company_name), ''), 'Customer') || ' Bank Account',
        100000000,
        'customer'
      )
      RETURNING id INTO new_account_id;
    END IF;

    UPDATE public.customers SET account_id = new_account_id WHERE id = cust.id;
  END LOOP;
END;
$$;

-- Step 6: Also fix ensure_lead_bank_account to use valid account_type
CREATE OR REPLACE FUNCTION public.ensure_lead_bank_account()
RETURNS TRIGGER AS $$
DECLARE new_account_id uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    INSERT INTO public.accounts (account_number, bank, name, balance, account_type)
    VALUES (
      'LEAD-' || upper(substr(md5(COALESCE(NEW.id::text, gen_random_uuid()::text)), 1, 10)),
      'Customer Bank',
      trim(COALESCE(NEW.company, trim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), 'Lead') || ' Bank Account'),
      100000000,
      'lead'
    )
    ON CONFLICT (account_number) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO new_account_id;
    NEW.account_id := new_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify: show customer count vs those with accounts
SELECT
  COUNT(*) AS total_customers,
  COUNT(account_id) AS customers_with_account,
  COUNT(*) - COUNT(account_id) AS missing_accounts
FROM public.customers;
