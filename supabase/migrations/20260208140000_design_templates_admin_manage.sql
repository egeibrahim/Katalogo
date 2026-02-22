-- Admins (and store managers) can insert, update, delete design_templates (Ready-made designs)
-- Regular users can only SELECT active templates (existing policy)

CREATE POLICY "Admins can insert design_templates"
  ON public.design_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update design_templates"
  ON public.design_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete design_templates"
  ON public.design_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
