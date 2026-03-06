-- Allow business (brand) users to manage product_attributes rows for their own products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_attributes'
      AND policyname = 'Business can manage own product attributes'
  ) THEN
    CREATE POLICY "Business can manage own product attributes"
    ON public.product_attributes
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = product_attributes.product_id
          AND p.owner_user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = product_attributes.product_id
          AND p.owner_user_id = auth.uid()
      )
    );
  END IF;
END $$;
