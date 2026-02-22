-- product_gallery_images: Galeri sırası (sort_order) güncellenebilsin diye UPDATE policy kesin çalışır hale getir.
-- Tüm mevcut UPDATE policy'leri kaldır, tek bir net policy ekle.

DROP POLICY IF EXISTS "Admins can update product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins or owner can update product gallery images" ON public.product_gallery_images;

CREATE POLICY "product_gallery_images_update_admin_or_owner"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_gallery_images.product_id
    AND p.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_gallery_images.product_id
    AND p.owner_user_id = auth.uid()
  )
);
