-- Tighten catalog editing to admin-only by removing temporary open policies

-- product_details
DROP POLICY IF EXISTS "tmp_role_insert_product_details" ON public.product_details;
DROP POLICY IF EXISTS "tmp_role_update_product_details" ON public.product_details;
DROP POLICY IF EXISTS "tmp_role_delete_product_details" ON public.product_details;

-- product_specs
DROP POLICY IF EXISTS "tmp_role_insert_product_specs" ON public.product_specs;
DROP POLICY IF EXISTS "tmp_role_update_product_specs" ON public.product_specs;
DROP POLICY IF EXISTS "tmp_role_delete_product_specs" ON public.product_specs;

-- products
DROP POLICY IF EXISTS "tmp_role_insert_products" ON public.products;
DROP POLICY IF EXISTS "tmp_role_update_products" ON public.products;
DROP POLICY IF EXISTS "tmp_role_delete_products" ON public.products;
DROP POLICY IF EXISTS "tmp_role_select_products" ON public.products;

-- product_colors
DROP POLICY IF EXISTS "tmp_role_insert_product_colors" ON public.product_colors;
DROP POLICY IF EXISTS "tmp_role_update_product_colors" ON public.product_colors;
DROP POLICY IF EXISTS "tmp_role_delete_product_colors" ON public.product_colors;

-- product_color_variants
DROP POLICY IF EXISTS "tmp_role_insert_product_color_variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "tmp_role_update_product_color_variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "tmp_role_delete_product_color_variants" ON public.product_color_variants;

-- product_views
DROP POLICY IF EXISTS "tmp_role_insert_product_views" ON public.product_views;
DROP POLICY IF EXISTS "tmp_role_update_product_views" ON public.product_views;
DROP POLICY IF EXISTS "tmp_role_delete_product_views" ON public.product_views;

-- product_view_color_mockups
DROP POLICY IF EXISTS "tmp_role_insert_product_view_color_mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "tmp_role_update_product_view_color_mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "tmp_role_delete_product_view_color_mockups" ON public.product_view_color_mockups;

-- Ensure RLS is enabled (safe/no-op if already enabled)
ALTER TABLE public.product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_color_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_view_color_mockups ENABLE ROW LEVEL SECURITY;