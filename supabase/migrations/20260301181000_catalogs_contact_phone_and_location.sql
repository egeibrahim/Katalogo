-- Add optional contact fields for brand profile settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.catalogs ADD COLUMN contact_phone text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'contact_location'
  ) THEN
    ALTER TABLE public.catalogs ADD COLUMN contact_location text NULL;
  END IF;
END $$;
