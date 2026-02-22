-- Galeri için ready_made_folders tablosu (tek seferlik çalıştırma)
-- Supabase Dashboard → SQL Editor → New query → yapıştırıp Run

-- 1) Tablo
CREATE TABLE IF NOT EXISTS public.ready_made_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ready_made_folders ENABLE ROW LEVEL SECURITY;

-- 2) Politikalar (önce varsa kaldır, sonra oluştur)
DROP POLICY IF EXISTS "Anyone can view ready_made_folders" ON public.ready_made_folders;
DROP POLICY IF EXISTS "Admins can insert ready_made_folders" ON public.ready_made_folders;
DROP POLICY IF EXISTS "Admins can update ready_made_folders" ON public.ready_made_folders;
DROP POLICY IF EXISTS "Admins can delete ready_made_folders" ON public.ready_made_folders;

CREATE POLICY "Anyone can view ready_made_folders"
  ON public.ready_made_folders FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert ready_made_folders"
  ON public.ready_made_folders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update ready_made_folders"
  ON public.ready_made_folders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete ready_made_folders"
  ON public.ready_made_folders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) design_templates'a folder_id (varsa atla)
ALTER TABLE public.design_templates
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.ready_made_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_design_templates_folder_id ON public.design_templates(folder_id);

-- 4) Sabit Galeri klasörü
INSERT INTO public.ready_made_folders (name, sort_order)
SELECT 'Galeri', 0
WHERE NOT EXISTS (SELECT 1 FROM public.ready_made_folders WHERE name = 'Galeri');
