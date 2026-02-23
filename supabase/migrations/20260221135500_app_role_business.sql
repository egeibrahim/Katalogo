-- app_role enum'a 'business' ekle (ayrı migration: PostgreSQL aynı transaction'da yeni enum değeri kullanılamaz 55P04)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'business'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'business';
  END IF;
END
$$;
