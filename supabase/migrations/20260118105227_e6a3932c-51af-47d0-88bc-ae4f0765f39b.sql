-- TEMPORARY: Public write access for catalog + mockups (as requested). Remove or tighten before launch.

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tmp_public_insert_products"
ON public.products
FOR INSERT
WITH CHECK (true);

CREATE POLICY "tmp_public_update_products"
ON public.products
FOR UPDATE
USING (true);

CREATE POLICY "tmp_public_delete_products"
ON public.products
FOR DELETE
USING (true);

-- Product views
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tmp_public_insert_product_views"
ON public.product_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "tmp_public_update_product_views"
ON public.product_views
FOR UPDATE
USING (true);

CREATE POLICY "tmp_public_delete_product_views"
ON public.product_views
FOR DELETE
USING (true);

-- Product colors
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tmp_public_insert_product_colors"
ON public.product_colors
FOR INSERT
WITH CHECK (true);

CREATE POLICY "tmp_public_update_product_colors"
ON public.product_colors
FOR UPDATE
USING (true);

CREATE POLICY "tmp_public_delete_product_colors"
ON public.product_colors
FOR DELETE
USING (true);

-- Product color variants
ALTER TABLE public.product_color_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tmp_public_insert_product_color_variants"
ON public.product_color_variants
FOR INSERT
WITH CHECK (true);

CREATE POLICY "tmp_public_update_product_color_variants"
ON public.product_color_variants
FOR UPDATE
USING (true);

CREATE POLICY "tmp_public_delete_product_color_variants"
ON public.product_color_variants
FOR DELETE
USING (true);

-- Product view color mockups
ALTER TABLE public.product_view_color_mockups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tmp_public_insert_product_view_color_mockups"
ON public.product_view_color_mockups
FOR INSERT
WITH CHECK (true);

CREATE POLICY "tmp_public_update_product_view_color_mockups"
ON public.product_view_color_mockups
FOR UPDATE
USING (true);

CREATE POLICY "tmp_public_delete_product_view_color_mockups"
ON public.product_view_color_mockups
FOR DELETE
USING (true);

-- Storage: allow anyone to upload to product-mockups bucket (temporary)
CREATE POLICY "tmp_public_upload_product_mockups"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-mockups');

CREATE POLICY "tmp_public_update_product_mockups"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-mockups');

CREATE POLICY "tmp_public_delete_product_mockups"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-mockups');
