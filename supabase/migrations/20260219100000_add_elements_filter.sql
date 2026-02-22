-- Elements filtresini admin Filters'a yükle (attributes + attribute_values).
-- Seçenekler: None, Snow Wash, Washed, Frayed, Pocket, Elastic Waist, Drawstring, Zipper,
-- Patchwork, Ripped, Slit, Pleated, Button, Elastic Straps, Knotted, Hollow Out, Asymmetrical.
DO $$
DECLARE
  aid uuid;
  ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'elements' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Elements', 'elements', 'multiselect', ord, true)
    RETURNING id INTO aid;

    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active)
    VALUES
      (aid, 'None', 0, true),
      (aid, 'Snow Wash', 1, true),
      (aid, 'Washed', 2, true),
      (aid, 'Frayed', 3, true),
      (aid, 'Pocket', 4, true),
      (aid, 'Elastic Waist', 5, true),
      (aid, 'Drawstring', 6, true),
      (aid, 'Zipper', 7, true),
      (aid, 'Patchwork', 8, true),
      (aid, 'Ripped', 9, true),
      (aid, 'Slit', 10, true),
      (aid, 'Pleated', 11, true),
      (aid, 'Button', 12, true),
      (aid, 'Elastic Straps', 13, true),
      (aid, 'Knotted', 14, true),
      (aid, 'Hollow Out', 15, true),
      (aid, 'Asymmetrical', 16, true);
  END IF;
END $$;
