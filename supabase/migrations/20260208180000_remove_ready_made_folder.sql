-- Ready-made klasörünü kaldır: tasarımları Galeri'ye taşı, sonra klasörü sil
UPDATE public.design_templates
SET folder_id = (SELECT id FROM public.ready_made_folders WHERE name = 'Galeri' LIMIT 1)
WHERE folder_id = (SELECT id FROM public.ready_made_folders WHERE name = 'Ready-made' LIMIT 1);

DELETE FROM public.ready_made_folders WHERE name = 'Ready-made';
