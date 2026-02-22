-- Remove restrictive admin-only policies that block public catalog operations.
-- Keep public SELECT policies as-is; rely on newly added "Anyone can ..." policies.

-- products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- product_colors
DROP POLICY IF EXISTS "Admins can insert product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Admins can update product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Admins can delete product colors" ON public.product_colors;

-- product_views
DROP POLICY IF EXISTS "Admins can insert product views" ON public.product_views;
DROP POLICY IF EXISTS "Admins can update product views" ON public.product_views;
DROP POLICY IF EXISTS "Admins can delete product views" ON public.product_views;

-- product_color_variants
DROP POLICY IF EXISTS "Admins can insert product color variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "Admins can update product color variants" ON public.product_color_variants;
DROP POLICY IF EXISTS "Admins can delete product color variants" ON public.product_color_variants;

-- product_details
DROP POLICY IF EXISTS "Admins can insert product details" ON public.product_details;
DROP POLICY IF EXISTS "Admins can update product details" ON public.product_details;
DROP POLICY IF EXISTS "Admins can delete product details" ON public.product_details;

-- product_specs
DROP POLICY IF EXISTS "Admins can insert product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Admins can update product specs" ON public.product_specs;
DROP POLICY IF EXISTS "Admins can delete product specs" ON public.product_specs;

-- product_view_color_mockups
DROP POLICY IF EXISTS "Admins can insert color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Admins can update color mockups" ON public.product_view_color_mockups;
DROP POLICY IF EXISTS "Admins can delete color mockups" ON public.product_view_color_mockups;
