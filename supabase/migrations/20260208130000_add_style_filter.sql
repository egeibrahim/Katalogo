-- Add Style to admin Filters (attributes + attribute_values).
-- Options: Casual, Street, Basics, Preppy, Sporty, Vintage, Sexy, Elegant, Cute, Glamorous, Business.
DO $$
DECLARE
  aid uuid;
  ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'style' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Style', 'style', 'multiselect', ord, true)
    RETURNING id INTO aid;

    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active)
    VALUES
      (aid, 'Casual', 0, true),
      (aid, 'Street', 1, true),
      (aid, 'Basics', 2, true),
      (aid, 'Preppy', 3, true),
      (aid, 'Sporty', 4, true),
      (aid, 'Vintage', 5, true),
      (aid, 'Sexy', 6, true),
      (aid, 'Elegant', 7, true),
      (aid, 'Cute', 8, true),
      (aid, 'Glamorous', 9, true),
      (aid, 'Business', 10, true);
  END IF;
END $$;
