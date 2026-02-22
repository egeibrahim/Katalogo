-- Fix migration (Postgres doesn't support CREATE POLICY IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.product_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  sku text,
  sizes text,
  technique text,
  guideline_url text,
  supported_file_types text DEFAULT 'PNG,JPG',
  max_upload_mb integer DEFAULT 50,
  print_dpi integer DEFAULT 150,
  print_areas jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_specs_product_id ON public.product_specs(product_id);

ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_specs' AND policyname='Anyone can view product specs'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view product specs" ON public.product_specs FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_specs' AND policyname='Admins can insert product specs'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can insert product specs" ON public.product_specs FOR INSERT WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_specs' AND policyname='Admins can update product specs'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update product specs" ON public.product_specs FOR UPDATE USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_specs' AND policyname='Admins can delete product specs'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete product specs" ON public.product_specs FOR DELETE USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_product_specs_updated_at'
  ) THEN
    CREATE TRIGGER update_product_specs_updated_at
    BEFORE UPDATE ON public.product_specs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;