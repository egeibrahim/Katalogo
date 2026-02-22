-- Admin-imported CSV files registry
CREATE TABLE IF NOT EXISTS public.import_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logical_name text NOT NULL, -- e.g. products.export.csv
  table_name text NOT NULL,
  variant text NOT NULL DEFAULT 'export', -- 'export' | 'csv'
  storage_path text NOT NULL,
  original_name text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_files_logical_name_created_at
  ON public.import_files (logical_name, created_at DESC);

ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;

-- Admins can manage import file registry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'import_files' AND policyname = 'Admins can manage import files'
  ) THEN
    CREATE POLICY "Admins can manage import files"
    ON public.import_files
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin-only access to imports bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can read import files'
  ) THEN
    CREATE POLICY "Admins can read import files"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'imports' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload import files'
  ) THEN
    CREATE POLICY "Admins can upload import files"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'imports' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update import files'
  ) THEN
    CREATE POLICY "Admins can update import files"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'imports' AND has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (bucket_id = 'imports' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete import files'
  ) THEN
    CREATE POLICY "Admins can delete import files"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'imports' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;