-- Drinkware (Aksesuar > Kupa, bardak, termos) and Wall Art & Prints (Home Living) attributes.
-- category_id = NULL so they appear globally; assign in Admin > Filters to restrict by category if needed.

-- 1) Drinkware: product type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'drinkware_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Drinkware type', 'drinkware_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Mug', 0, true), (aid, 'Tumbler', 1, true), (aid, 'Travel Mug', 2, true),
      (aid, 'Thermos', 3, true), (aid, 'Water Bottle', 4, true), (aid, 'Tea Cup', 5, true),
      (aid, 'Coffee Cup', 6, true), (aid, 'Kids Cup', 7, true), (aid, 'Other', 8, true);
  END IF;
END $$;

-- 2) Drinkware: capacity
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'drinkware_capacity' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Capacity', 'drinkware_capacity', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, '250 ml', 0, true), (aid, '350 ml', 1, true), (aid, '400 ml', 2, true),
      (aid, '500 ml', 3, true), (aid, '750 ml', 4, true), (aid, '1 L', 5, true),
      (aid, '12 oz', 6, true), (aid, '16 oz', 7, true), (aid, '20 oz', 8, true),
      (aid, '24 oz', 9, true), (aid, '32 oz', 10, true), (aid, 'Other', 11, true);
  END IF;
END $$;

-- 3) Drinkware: lid type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'drinkware_lid_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Lid type', 'drinkware_lid_type', 'select', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'No Lid', 0, true), (aid, 'Push Lid', 1, true), (aid, 'Screw Lid', 2, true),
      (aid, 'Straw Lid', 3, true), (aid, 'Flip Lid', 4, true), (aid, 'Leak-Proof Lid', 5, true),
      (aid, 'Other', 6, true);
  END IF;
END $$;

-- 4) Wall Art: product type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'wall_art_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Wall art type', 'wall_art_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Poster', 0, true), (aid, 'Canvas Print', 1, true), (aid, 'Framed Print', 2, true),
      (aid, 'Art Print', 3, true), (aid, 'Photographic Print', 4, true), (aid, 'Metal Print', 5, true),
      (aid, 'Wood Print', 6, true), (aid, 'Sticker', 7, true), (aid, 'Other', 8, true);
  END IF;
END $$;

-- 5) Wall Art: size
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'wall_art_size' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Wall art size', 'wall_art_size', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'A4', 0, true), (aid, 'A3', 1, true), (aid, 'A2', 2, true), (aid, 'A1', 3, true),
      (aid, '8x10"', 4, true), (aid, '12x16"', 5, true), (aid, '18x24"', 6, true), (aid, '20x28"', 7, true),
      (aid, 'Small', 8, true), (aid, 'Medium', 9, true), (aid, 'Large', 10, true), (aid, 'Other', 11, true);
  END IF;
END $$;

-- 6) Wall Art: orientation
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'wall_art_orientation' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Orientation', 'wall_art_orientation', 'select', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Portrait', 0, true), (aid, 'Landscape', 1, true), (aid, 'Square', 2, true);
  END IF;
END $$;

-- 7) Wall Art: frame style
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'wall_art_frame_style' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Frame style', 'wall_art_frame_style', 'select', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Unframed', 0, true), (aid, 'Black Frame', 1, true), (aid, 'White Frame', 2, true),
      (aid, 'Wood Frame', 3, true), (aid, 'Natural Wood', 4, true), (aid, 'Silver Frame', 5, true),
      (aid, 'Gold Frame', 6, true), (aid, 'Other', 7, true);
  END IF;
END $$;
