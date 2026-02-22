-- Apply admin-only writes + public read to catalog tables

-- product_colors
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active colors" ON public.product_colors;
DROP POLICY IF EXISTS "Anyone can insert product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Anyone can update product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Anyone can delete product colors" ON public.product_colors;

CREATE POLICY "Public can view active colors"
ON public.product_colors
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can insert product colors"
ON public.product_colors
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update product colors"
ON public.product_colors
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete product colors"
ON public.product_colors
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- product_views
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product views" ON public.product_views;
DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;
DROP POLICY IF EXISTS "Anyone can update product views" ON public.product_views;
DROP POLICY IF EXISTS "Anyone can delete product views" ON public.product_views;

CREATE POLICY "Public can view product views"
ON public.product_views
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert product views"
ON public.product_views
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update product views"
ON public.product_views
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete product views"
ON public.product_views
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- product_specs
ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Anyone can insert product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Anyone can update product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Anyone can delete product specs" ON public.product_specs;

CREATE POLICY "Public can view product specs"
ON public.product_specs
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert product specs"
ON public.product_specs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update product specs"
ON public.product_specs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete product specs"
ON public.product_specs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- product_view_color_mockups
ALTER TABLE public.product_view_color_mockups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Anyone can insert product view color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Anyone can update product view color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Anyone can delete product view color mockups" ON public.product_view_color_mockups;

CREATE POLICY "Public can view color mockups"
ON public.product_view_color_mockups
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert product view color mockups"
ON public.product_view_color_mockups
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update product view color mockups"
ON public.product_view_color_mockups
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete product view color mockups"
ON public.product_view_color_mockups
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
