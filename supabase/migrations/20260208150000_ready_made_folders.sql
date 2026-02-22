-- Ready-made designs klasör sistemi (Upload alanıyla aynı işlevsellik)
-- Klasörler sistem genelinde; sadece admin yönetir, kullanıcılar sadece görüntüleyip kullanır.

CREATE TABLE IF NOT EXISTS public.ready_made_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ready_made_folders ENABLE ROW LEVEL SECURITY;

-- Herkes aktif klasörleri görebilir
CREATE POLICY "Anyone can view ready_made_folders"
  ON public.ready_made_folders FOR SELECT
  USING (true);

-- Sadece admin ekleyebilir/güncelleyebilir/silebilir
CREATE POLICY "Admins can insert ready_made_folders"
  ON public.ready_made_folders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ready_made_folders"
  ON public.ready_made_folders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ready_made_folders"
  ON public.ready_made_folders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- design_templates'a folder_id ekle
ALTER TABLE public.design_templates
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.ready_made_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_design_templates_folder_id ON public.design_templates(folder_id);
