-- Sabit varsayılan klasör: Galeri (yoksa oluştur)
INSERT INTO public.ready_made_folders (name, sort_order)
SELECT 'Galeri', 0
WHERE NOT EXISTS (SELECT 1 FROM public.ready_made_folders WHERE name = 'Galeri');
