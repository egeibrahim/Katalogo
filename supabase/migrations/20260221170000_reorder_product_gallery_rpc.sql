-- Tek istekte galeri sırasını güncellemek: N yerine 1 round-trip.
-- Parametre sırası: PostgREST schema cache (p_orders, p_product_id) ile uyumlu — jsonb önce.
-- p_orders: [{"id": "uuid1"}, {"id": "uuid2"}, ...] — sıra = dizin.
CREATE OR REPLACE FUNCTION public.reorder_product_gallery(
  p_orders jsonb,
  p_product_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord jsonb;
  idx int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_product_id AND p.owner_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Admin or product owner only';
  END IF;

  FOR ord IN SELECT * FROM jsonb_array_elements(p_orders)
  LOOP
    UPDATE public.product_gallery_images
    SET sort_order = idx
    WHERE id = (ord->>'id')::uuid
      AND product_id = p_product_id;
    idx := idx + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_product_gallery(jsonb, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.reorder_product_gallery(jsonb, uuid) TO authenticated;
