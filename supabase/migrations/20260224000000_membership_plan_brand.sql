-- membership_plan enum'a 'brand' ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'membership_plan' AND e.enumlabel = 'brand'
  ) THEN
    ALTER TYPE public.membership_plan ADD VALUE 'brand';
  END IF;
END
$$;
