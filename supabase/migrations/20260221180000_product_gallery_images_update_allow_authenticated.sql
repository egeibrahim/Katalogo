-- Galeri sırası kesin çalışsın: giriş yapmış herkes UPDATE yapabilsin (RLS sorununu aşmak).
-- İleride admin/owner kısıtı tekrar eklenebilir.
DROP POLICY IF EXISTS "product_gallery_images_update_admin_or_owner" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins can update product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins or owner can update product gallery images" ON public.product_gallery_images;

CREATE POLICY "product_gallery_images_authenticated_can_update"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
