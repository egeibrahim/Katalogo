-- membership_plan enum'a 'free' ekle (ayrı migration: aynı tx'te yeni enum değeri kullanılamaz)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'membership_plan' AND e.enumlabel = 'free'
  ) THEN
    ALTER TYPE public.membership_plan ADD VALUE 'free';
  END IF;
END
$$;
