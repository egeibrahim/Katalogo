-- Galeri upsert'i RLS bypass ile: SECURITY DEFINER RPC.
-- Sadece admin veya ilgili ürünün sahibi (owner_user_id) çağırabilir.
CREATE OR REPLACE FUNCTION public.upsert_product_gallery_images(p_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR pid IN
    SELECT DISTINCT (elem->>'product_id')::uuid
    FROM jsonb_array_elements(p_rows) AS elem
    WHERE elem->>'product_id' IS NOT NULL
  LOOP
    IF NOT (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = pid AND p.owner_user_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Admin or product owner only';
    END IF;
  END LOOP;

  INSERT INTO public.product_gallery_images (id, product_id, image_url, sort_order)
  SELECT
    (elem->>'id')::uuid,
    (elem->>'product_id')::uuid,
    elem->>'image_url',
    COALESCE((elem->>'sort_order')::int, 0)
  FROM jsonb_array_elements(p_rows) AS elem
  WHERE elem->>'id' IS NOT NULL AND elem->>'product_id' IS NOT NULL AND elem->>'image_url' IS NOT NULL
  ON CONFLICT (id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    image_url = EXCLUDED.image_url,
    sort_order = EXCLUDED.sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_product_gallery_images(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_product_gallery_images(jsonb) TO authenticated;

-- PostgREST schema cache yenileme (Supabase Dashboard SQL'de fonksiyon oluşturduktan sonra çalıştırın):
-- NOTIFY pgrst, 'reload schema';
-- SELECT pg_notification_queue_usage();
