-- Ürün oluşturma yetkisi: admin ve business (marka) hesaplara tanımlanır.
-- 'business' app_role değeri 20260221135500_app_role_business.sql ile eklenir (aynı tx'te kullanılamaz).

-- 1) products tablosu RLS: mevcut admin-only policy'leri kaldır, admin + business / owner kuralları ekle
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- INSERT: admin her zaman; business sadece owner_user_id = kendisi veya null ile ekleyebilir
CREATE POLICY "Admins or business can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'business'::public.app_role)
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  )
);

-- UPDATE: admin tüm ürünler; diğerleri sadece kendi sahibi oldukları (owner_user_id = auth.uid())
CREATE POLICY "Admins or owner can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR owner_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR owner_user_id = auth.uid()
);

-- DELETE: admin tüm ürünler; diğerleri sadece kendi sahibi oldukları
CREATE POLICY "Admins or owner can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR owner_user_id = auth.uid()
);

-- 2) product_gallery_images: business kendi ürünlerine galeri ekleyebilir (kopyalama vb.)
DROP POLICY IF EXISTS "Admins can insert product gallery images" ON public.product_gallery_images;
CREATE POLICY "Admins or business can insert product gallery images"
ON public.product_gallery_images
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'business'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_user_id = auth.uid())
  )
);

-- product_gallery_images UPDATE: admin veya ürün sahibi
DROP POLICY IF EXISTS "Admins can update product gallery images" ON public.product_gallery_images;
CREATE POLICY "Admins or owner can update product gallery images"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete product gallery images" ON public.product_gallery_images;
CREATE POLICY "Admins or owner can delete product gallery images"
ON public.product_gallery_images
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_user_id = auth.uid())
);

-- 3) update_product_gallery_order RPC: admin veya ürün sahibi (business) çağırabilir. Parametre sırası (p_orders, p_product_id) schema cache ile uyumlu.
CREATE OR REPLACE FUNCTION public.update_product_gallery_order(
  p_orders jsonb,
  p_product_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord jsonb;
  idx int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NULL; -- ok
  ELSIF public.has_role(auth.uid(), 'business'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_product_id AND p.owner_user_id = auth.uid()) THEN
    NULL; -- ok: kendi ürünü
  ELSE
    RAISE EXCEPTION 'Admin only or product owner';
  END IF;

  FOR ord IN SELECT * FROM jsonb_array_elements(p_orders)
  LOOP
    UPDATE public.product_gallery_images
    SET sort_order = idx
    WHERE id = (ord->>'id')::uuid
      AND product_id = p_product_id;
    idx := idx + 1;
  END LOOP;
END;
$$;
