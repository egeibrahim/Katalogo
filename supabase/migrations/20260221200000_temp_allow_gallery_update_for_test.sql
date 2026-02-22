-- TEST: Geçici olarak tüm authenticated kullanıcılara UPDATE izni.
-- Bu çalışıyorsa problem kesin RLS logic (admin/role kontrolü).
-- Test sonrası bu policy'yi DROP edip "Admin update gallery" kullanın.
DROP POLICY IF EXISTS "temp allow all update" ON public.product_gallery_images;

CREATE POLICY "temp allow all update"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
