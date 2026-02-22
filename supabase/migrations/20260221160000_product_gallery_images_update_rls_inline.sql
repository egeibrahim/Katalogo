-- RLS içinde has_role() bazen farklı çalışabildiği için, doğrudan user_roles kontrolü ile policy.
DROP POLICY IF EXISTS "product_gallery_images_update_admin_or_owner" ON public.product_gallery_images;

CREATE POLICY "product_gallery_images_update_admin_or_owner"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (
  -- Admin: user_roles'da admin kaydı var mı
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  )
  OR
  -- Ürün sahibi: bu galeri satırının product'ı benim
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_gallery_images.product_id
    AND p.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  )
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_gallery_images.product_id
    AND p.owner_user_id = auth.uid()
  )
);
