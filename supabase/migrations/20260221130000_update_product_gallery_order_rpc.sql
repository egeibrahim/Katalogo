-- Galeri sırası RLS sorununu aşmak: sadece admin'in çağırabileceği SECURITY DEFINER RPC.
-- Parametre sırası: PostgREST schema cache (p_orders, p_product_id) ile uyumlu olsun diye jsonb önce.
-- p_orders: [{"id": "uuid1"}, {"id": "uuid2"}, ...] — sıra dizin = sort_order.
CREATE OR REPLACE FUNCTION public.update_product_gallery_order(
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
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
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

-- RPC'yi anon/authenticated çağırabilsin (RLS fonksiyon içinde kontrol ediliyor)
GRANT EXECUTE ON FUNCTION public.update_product_gallery_order(jsonb, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.update_product_gallery_order(jsonb, uuid) TO authenticated;
