-- Join table: catalogs <-> products
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL,
  product_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_products_unique UNIQUE (catalog_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_products_catalog_id ON public.catalog_products(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_product_id ON public.catalog_products(product_id);

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

-- Owner can manage catalog products for catalogs they own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalog_products' AND policyname='Owner can manage own catalog products'
  ) THEN
    CREATE POLICY "Owner can manage own catalog products"
    ON public.catalog_products
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.catalogs c
        WHERE c.id = catalog_products.catalog_id
          AND c.owner_user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.catalogs c
        WHERE c.id = catalog_products.catalog_id
          AND c.owner_user_id = auth.uid()
      )
    );
  END IF;

  -- Admin can manage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalog_products' AND policyname='Admins can manage catalog products'
  ) THEN
    CREATE POLICY "Admins can manage catalog products"
    ON public.catalog_products
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_catalog_products_updated_at'
  ) THEN
    CREATE TRIGGER update_catalog_products_updated_at
    BEFORE UPDATE ON public.catalog_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
