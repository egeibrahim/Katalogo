-- Allow everyone to read all products (needed because inserts use return=representation and drafts have is_active=false)
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Anyone can view all products"
ON public.products
FOR SELECT
USING (true);
