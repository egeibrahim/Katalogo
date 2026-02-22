-- Replace overly-permissive temp policies with role-scoped ones (still public-ish, but not USING(true))

-- Helper predicate
-- We intentionally allow both anon + authenticated for now.

-- PRODUCTS
DROP POLICY IF EXISTS "tmp_public_insert_products" ON public.products;
DROP POLICY IF EXISTS "tmp_public_update_products" ON public.products;
DROP POLICY IF EXISTS "tmp_public_delete_products" ON public.products;

CREATE POLICY "tmp_role_insert_products"
ON public.products
FOR INSERT
WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_update_products"
ON public.products
FOR UPDATE
USING (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_delete_products"
ON public.products
FOR DELETE
USING (auth.role() IN ('anon','authenticated'));

-- PRODUCT_VIEWS
DROP POLICY IF EXISTS "tmp_public_insert_product_views" ON public.product_views;
DROP POLICY IF EXISTS "tmp_public_update_product_views" ON public.product_views;
DROP POLICY IF EXISTS "tmp_public_delete_product_views" ON public.product_views;

CREATE POLICY "tmp_role_insert_product_views"
ON public.product_views
FOR INSERT
WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_update_product_views"
ON public.product_views
FOR UPDATE
USING (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_delete_product_views"
ON public.product_views
FOR DELETE
USING (auth.role() IN ('anon','authenticated'));

-- PRODUCT_COLORS
DROP POLICY IF EXISTS "tmp_public_insert_product_colors" ON public.product_colors;
DROP POLICY IF EXISTS "tmp_public_update_product_colors" ON public.product_colors;
DROP POLICY IF EXISTS "tmp_public_delete_product_colors" ON public.product_colors;

CREATE POLICY "tmp_role_insert_product_colors"
ON public.product_colors
FOR INSERT
WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_update_product_colors"
ON public.product_colors
FOR UPDATE
USING (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_delete_product_colors"
ON public.product_colors
FOR DELETE
USING (auth.role() IN ('anon','authenticated'));

-- PRODUCT_COLOR_VARIANTS
DROP POLICY IF EXISTS "tmp_public_insert_product_color_variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "tmp_public_update_product_color_variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "tmp_public_delete_product_color_variants" ON public.product_color_variants;

CREATE POLICY "tmp_role_insert_product_color_variants"
ON public.product_color_variants
FOR INSERT
WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_update_product_color_variants"
ON public.product_color_variants
FOR UPDATE
USING (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_delete_product_color_variants"
ON public.product_color_variants
FOR DELETE
USING (auth.role() IN ('anon','authenticated'));

-- PRODUCT_VIEW_COLOR_MOCKUPS
DROP POLICY IF EXISTS "tmp_public_insert_product_view_color_mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "tmp_public_update_product_view_color_mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "tmp_public_delete_product_view_color_mockups" ON public.product_view_color_mockups;

CREATE POLICY "tmp_role_insert_product_view_color_mockups"
ON public.product_view_color_mockups
FOR INSERT
WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_update_product_view_color_mockups"
ON public.product_view_color_mockups
FOR UPDATE
USING (auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_delete_product_view_color_mockups"
ON public.product_view_color_mockups
FOR DELETE
USING (auth.role() IN ('anon','authenticated'));

-- STORAGE OBJECTS (product-mockups)
DROP POLICY IF EXISTS "tmp_public_upload_product_mockups" ON storage.objects;
DROP POLICY IF EXISTS "tmp_public_update_product_mockups" ON storage.objects;
DROP POLICY IF EXISTS "tmp_public_delete_product_mockups" ON storage.objects;

CREATE POLICY "tmp_role_upload_product_mockups"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-mockups' AND auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_update_product_mockups"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-mockups' AND auth.role() IN ('anon','authenticated'));

CREATE POLICY "tmp_role_delete_product_mockups"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-mockups' AND auth.role() IN ('anon','authenticated'));
