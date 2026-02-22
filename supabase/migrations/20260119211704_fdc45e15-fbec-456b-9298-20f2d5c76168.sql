-- Disable RLS for catalog tables so product management works without any admin/auth.

ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_colors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_view_color_mockups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_color_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_details DISABLE ROW LEVEL SECURITY;
