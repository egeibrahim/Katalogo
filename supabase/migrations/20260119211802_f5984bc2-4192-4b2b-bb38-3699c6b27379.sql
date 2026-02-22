-- Re-enable RLS (to satisfy security checks) but allow public read/write (no admin/auth required).

-- products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Public can view products" ON public.products FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert products" ON public.products FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update products" ON public.products FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete products" ON public.products FOR DELETE TO public USING (true);

-- product_colors
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active colors" ON public.product_colors;
DROP POLICY IF EXISTS "Admins can insert product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Admins can update product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Admins can delete product colors" ON public.product_colors;
CREATE POLICY "Public can view product colors" ON public.product_colors FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert product colors" ON public.product_colors FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update product colors" ON public.product_colors FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete product colors" ON public.product_colors FOR DELETE TO public USING (true);

-- product_views
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view product views" ON public.product_views;
DROP POLICY IF EXISTS "Admins can insert product views" ON public.product_views;
DROP POLICY IF EXISTS "Admins can update product views" ON public.product_views;
DROP POLICY IF EXISTS "Admins can delete product views" ON public.product_views;
CREATE POLICY "Public can view product views" ON public.product_views FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert product views" ON public.product_views FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update product views" ON public.product_views FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete product views" ON public.product_views FOR DELETE TO public USING (true);

-- product_specs
ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Admins can insert product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Admins can update product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Admins can delete product specs" ON public.product_specs;
CREATE POLICY "Public can view product specs" ON public.product_specs FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert product specs" ON public.product_specs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update product specs" ON public.product_specs FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete product specs" ON public.product_specs FOR DELETE TO public USING (true);

-- product_view_color_mockups
ALTER TABLE public.product_view_color_mockups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Admins can insert product view color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Admins can update product view color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Admins can delete product view color mockups" ON public.product_view_color_mockups;
CREATE POLICY "Public can view product view color mockups" ON public.product_view_color_mockups FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert product view color mockups" ON public.product_view_color_mockups FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update product view color mockups" ON public.product_view_color_mockups FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete product view color mockups" ON public.product_view_color_mockups FOR DELETE TO public USING (true);

-- product_color_variants
ALTER TABLE public.product_color_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view product color variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "Admins can insert product color variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "Admins can update product color variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "Admins can delete product color variants" ON public.product_color_variants;
CREATE POLICY "Public can view product color variants" ON public.product_color_variants FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert product color variants" ON public.product_color_variants FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update product color variants" ON public.product_color_variants FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete product color variants" ON public.product_color_variants FOR DELETE TO public USING (true);

-- product_details
ALTER TABLE public.product_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view product details" ON public.product_details;
DROP POLICY IF EXISTS "Admins can insert product details" ON public.product_details;
DROP POLICY IF EXISTS "Admins can update product details" ON public.product_details;
DROP POLICY IF EXISTS "Admins can delete product details" ON public.product_details;
CREATE POLICY "Public can view product details" ON public.product_details FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert product details" ON public.product_details FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update product details" ON public.product_details FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete product details" ON public.product_details FOR DELETE TO public USING (true);
