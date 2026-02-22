-- Lock down product catalog modifications to admins only

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive policies
DROP POLICY IF EXISTS "Anyone can view all products" ON public.products;
DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;

-- Public read access (intentional)
CREATE POLICY "Public can view products"
ON public.products
FOR SELECT
TO public
USING (true);

-- Admin-only writes (server-side role check)
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
