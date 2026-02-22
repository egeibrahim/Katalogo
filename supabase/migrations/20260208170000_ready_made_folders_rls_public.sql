-- Galeri klasörleri: RLS politikalarında public.has_role kullan (diğer admin tablolarıyla uyumlu)
DROP POLICY IF EXISTS "Admins can insert ready_made_folders" ON public.ready_made_folders;
DROP POLICY IF EXISTS "Admins can update ready_made_folders" ON public.ready_made_folders;
DROP POLICY IF EXISTS "Admins can delete ready_made_folders" ON public.ready_made_folders;

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
