-- Supabase Dashboard → SQL Editor'da çalıştırın (Galeri klasörü yoksa oluşturur)
-- https://supabase.com/dashboard → Projeniz → SQL Editor → New query → yapıştırın → Run

INSERT INTO public.ready_made_folders (name, sort_order)
SELECT 'Galeri', 0
WHERE NOT EXISTS (SELECT 1 FROM public.ready_made_folders WHERE name = 'Galeri');
