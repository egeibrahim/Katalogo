-- Accessories and Home Living subcategory attributes for product edit and filters.
-- category_id = NULL so they appear globally; assign in Admin > Filters to restrict by category if needed.

-- ========== ACCESSORIES ==========

-- 1) Tote Bags: type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'accessory_bag_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Bag type', 'accessory_bag_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Tote Bag', 0, true), (aid, 'Shopper', 1, true), (aid, 'Canvas Bag', 2, true),
      (aid, 'Market Bag', 3, true), (aid, 'Other', 4, true);
  END IF;
END $$;

-- 2) Hats / Caps: type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'accessory_hat_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Hat type', 'accessory_hat_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Dad Hat', 0, true), (aid, 'Trucker Hat', 1, true), (aid, 'Beanie', 2, true),
      (aid, 'Snapback', 3, true), (aid, 'Bucket Hat', 4, true), (aid, 'Other', 5, true);
  END IF;
END $$;

-- 3) Phone Cases: device model
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'accessory_phone_model' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Device model', 'accessory_phone_model', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'iPhone 15', 0, true), (aid, 'iPhone 14', 1, true), (aid, 'iPhone 13', 2, true),
      (aid, 'iPhone SE', 3, true), (aid, 'Samsung S24', 4, true), (aid, 'Samsung S23', 5, true),
      (aid, 'Samsung A series', 6, true), (aid, 'Other', 7, true);
  END IF;
END $$;

-- 4) Socks: type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'accessory_sock_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Sock type', 'accessory_sock_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Ankle', 0, true), (aid, 'Crew', 1, true), (aid, 'Knee-high', 2, true),
      (aid, 'No-show', 3, true), (aid, 'Other', 4, true);
  END IF;
END $$;

-- ========== HOME LIVING (Pillows, Blankets, Candles; Wall Art already in 20260220100000) ==========

-- 5) Pillows: type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'pillow_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Pillow type', 'pillow_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Square', 0, true), (aid, 'Rectangular', 1, true), (aid, 'Lumbar', 2, true),
      (aid, 'Round', 3, true), (aid, 'Other', 4, true);
  END IF;
END $$;

-- 6) Pillows: size
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'pillow_size' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Pillow size', 'pillow_size', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Small', 0, true), (aid, 'Medium', 1, true), (aid, 'Large', 2, true),
      (aid, '18x18"', 3, true), (aid, '20x20"', 4, true), (aid, '12x20"', 5, true),
      (aid, 'Other', 6, true);
  END IF;
END $$;

-- 7) Blankets: type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'blanket_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Blanket type', 'blanket_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Throw', 0, true), (aid, 'Afghan', 1, true), (aid, 'Fleece', 2, true),
      (aid, 'Weighted', 3, true), (aid, 'Other', 4, true);
  END IF;
END $$;

-- 8) Blankets: size
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'blanket_size' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Blanket size', 'blanket_size', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Small', 0, true), (aid, 'Medium', 1, true), (aid, 'Large', 2, true),
      (aid, '50x60"', 3, true), (aid, '60x80"', 4, true), (aid, 'Other', 5, true);
  END IF;
END $$;

-- 9) Candles: type
DO $$
DECLARE aid uuid; ord int;
BEGIN
  SELECT id INTO aid FROM public.attributes WHERE key = 'candle_type' LIMIT 1;
  IF aid IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO ord FROM public.attributes;
    INSERT INTO public.attributes (name, key, type, sort_order, is_active)
    VALUES ('Candle type', 'candle_type', 'multiselect', ord, true)
    RETURNING id INTO aid;
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active) VALUES
      (aid, 'Jar', 0, true), (aid, 'Pillar', 1, true), (aid, 'Tealight', 2, true),
      (aid, 'Votive', 3, true), (aid, 'Taper', 4, true), (aid, 'Other', 5, true);
  END IF;
END $$;
