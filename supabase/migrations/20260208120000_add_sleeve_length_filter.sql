-- Add Sleeve Length to admin Filters (attributes + attribute_values).
-- Options: Sleeveless, Short Sleeve, Half Sleeve, 3/4 Sleeve, Long Sleeve, Extra Long Sleeve.
DO $$
DECLARE
  aid uuid;
  ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'sleeve_length' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Sleeve Length', 'sleeve_length', 'multiselect', ord, true)
    RETURNING id INTO aid;

    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active)
    VALUES
      (aid, 'Sleeveless', 0, true),
      (aid, 'Short Sleeve', 1, true),
      (aid, 'Half Sleeve', 2, true),
      (aid, '3/4 Sleeve', 3, true),
      (aid, 'Long Sleeve', 4, true),
      (aid, 'Extra Long Sleeve', 5, true);
  END IF;
END $$;
