-- Allow everyone to read catalog_products rows that belong to public catalogs
-- so /brand/:slug pages can list products without authentication.
DROP POLICY IF EXISTS "Public can view catalog products" ON public.catalog_products;

CREATE POLICY "Public can view catalog products"
ON public.catalog_products
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.catalogs c
    WHERE c.id = catalog_products.catalog_id
      AND c.is_public = true
  )
);
