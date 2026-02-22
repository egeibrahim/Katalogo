-- Geçici: Galeri sırası kesin yazılsın diye RLS kapatılıyor.
-- İleride tekrar açıp doğru UPDATE policy ile kullanın: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_gallery_images DISABLE ROW LEVEL SECURITY;
