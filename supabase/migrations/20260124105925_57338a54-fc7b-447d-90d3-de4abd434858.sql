-- 1) Table
CREATE TABLE IF NOT EXISTS public.catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  contact_email text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  logo_url text NULL,
  cover_image_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Constraints / Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'catalogs_slug_key'
  ) THEN
    ALTER TABLE public.catalogs ADD CONSTRAINT catalogs_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_catalogs_owner_user_id ON public.catalogs(owner_user_id);

-- 3) RLS
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

-- 4) Policies
DO $$
BEGIN
  -- Owner: full access to own catalogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogs' AND policyname='Owner can manage own catalogs'
  ) THEN
    CREATE POLICY "Owner can manage own catalogs"
    ON public.catalogs
    FOR ALL
    USING (owner_user_id = auth.uid())
    WITH CHECK (owner_user_id = auth.uid());
  END IF;

  -- Public: view only published catalogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogs' AND policyname='Public can view published catalogs'
  ) THEN
    CREATE POLICY "Public can view published catalogs"
    ON public.catalogs
    FOR SELECT
    USING (is_public = true);
  END IF;

  -- Admin: full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogs' AND policyname='Admins can manage catalogs'
  ) THEN
    CREATE POLICY "Admins can manage catalogs"
    ON public.catalogs
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- 5) updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_catalogs_updated_at'
  ) THEN
    CREATE TRIGGER update_catalogs_updated_at
    BEFORE UPDATE ON public.catalogs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
