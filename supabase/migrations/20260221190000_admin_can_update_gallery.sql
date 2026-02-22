-- UPDATE için hem USING hem WITH CHECK şart (sadece USING ile DB reject edebilir).
-- auth.role() = 'authenticated' + user_roles'da admin (projede users yok, user_roles var).
DROP POLICY IF EXISTS "product_gallery_images_authenticated_can_update" ON public.product_gallery_images;
DROP POLICY IF EXISTS "product_gallery_images_update_admin_or_owner" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins can update product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins or owner can update product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admin can update gallery" ON public.product_gallery_images;

CREATE POLICY "Admin update gallery"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::public.app_role
  )
);
