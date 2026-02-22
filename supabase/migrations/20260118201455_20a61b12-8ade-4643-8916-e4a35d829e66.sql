-- Open catalog management (products + colors) to everyone (no admin/auth required)
-- NOTE: These tables contain no PII in this project.

-- PRODUCTS
CREATE POLICY "Anyone can insert products"
ON public.products
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update products"
ON public.products
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete products"
ON public.products
FOR DELETE
USING (true);

-- PRODUCT COLORS
CREATE POLICY "Anyone can insert product colors"
ON public.product_colors
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update product colors"
ON public.product_colors
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete product colors"
ON public.product_colors
FOR DELETE
USING (true);

-- PRODUCT VIEWS
CREATE POLICY "Anyone can insert product views"
ON public.product_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update product views"
ON public.product_views
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete product views"
ON public.product_views
FOR DELETE
USING (true);

-- PRODUCT COLOR VARIANTS
CREATE POLICY "Anyone can insert product color variants"
ON public.product_color_variants
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update product color variants"
ON public.product_color_variants
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete product color variants"
ON public.product_color_variants
FOR DELETE
USING (true);

-- PRODUCT DETAILS
CREATE POLICY "Anyone can insert product details"
ON public.product_details
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update product details"
ON public.product_details
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete product details"
ON public.product_details
FOR DELETE
USING (true);

-- PRODUCT SPECS
CREATE POLICY "Anyone can insert product specs"
ON public.product_specs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update product specs"
ON public.product_specs
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete product specs"
ON public.product_specs
FOR DELETE
USING (true);

-- PRODUCT VIEW COLOR MOCKUPS
CREATE POLICY "Anyone can insert product view color mockups"
ON public.product_view_color_mockups
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update product view color mockups"
ON public.product_view_color_mockups
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete product view color mockups"
ON public.product_view_color_mockups
FOR DELETE
USING (true);
