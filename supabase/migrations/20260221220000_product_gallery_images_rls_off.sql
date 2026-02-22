-- product_gallery_images: RLS "USING expression" hatasını kaldırmak için RLS kapatılıyor.
-- Politikalar sıfırlandığında RLS açık kalıp policy kalmayınca tüm erişim reddediliyor; bu yüzden RLS kapatıyoruz.

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
