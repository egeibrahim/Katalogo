-- TEMP: allow reading draft products as well (needed because create uses INSERT ... returning representation)
DROP POLICY IF EXISTS "tmp_role_select_products" ON public.products;
CREATE POLICY "tmp_role_select_products"
ON public.products
FOR SELECT
USING (auth.role() IN ('anon','authenticated'));

-- Ensure upsert works for color mockups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_view_color_mockups_unique_view_color'
  ) THEN
    ALTER TABLE public.product_view_color_mockups
      ADD CONSTRAINT product_view_color_mockups_unique_view_color
      UNIQUE (product_view_id, color_id);
  END IF;
END $$;
