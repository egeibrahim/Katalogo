-- Galeri RLS tamamen kapat: Tüm bilinen policy'leri sil, RLS disable.
-- Supabase Dashboard > SQL Editor'da bu dosyanın içeriğini yapıştırıp çalıştırın (uygulamanın bağlı olduğu projede).

DROP POLICY IF EXISTS "Public can view product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins can insert product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins can delete product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins can update product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admins or owner can update product gallery images" ON public.product_gallery_images;
DROP POLICY IF EXISTS "product_gallery_images_update_admin_or_owner" ON public.product_gallery_images;
DROP POLICY IF EXISTS "product_gallery_images_authenticated_can_update" ON public.product_gallery_images;
DROP POLICY IF EXISTS "Admin can update gallery" ON public.product_gallery_images;
DROP POLICY IF EXISTS "temp allow all update" ON public.product_gallery_images;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_gallery_images'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.product_gallery_images', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.product_gallery_images DISABLE ROW LEVEL SECURITY;
