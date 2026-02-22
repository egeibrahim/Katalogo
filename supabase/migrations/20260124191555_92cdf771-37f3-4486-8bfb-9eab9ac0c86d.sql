-- Ensure the fulfillment_from attribute exists
INSERT INTO public.attributes (key, name, type, sort_order, is_active)
SELECT 'fulfillment_from', 'Fulfillment From', 'multiselect'::public.attribute_type, 0, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.attributes WHERE key = 'fulfillment_from'
);

-- Mirror region -> fulfillment_from so both lists stay identical.
-- This is one-way on purpose (region remains the single source of truth).
CREATE OR REPLACE FUNCTION public.mirror_region_attribute_values_to_fulfillment_from()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_region_attr_id uuid;
  v_fulfill_attr_id uuid;
  v_existing_id uuid;
  v_value text;
  v_sort int;
  v_active boolean;
BEGIN
  SELECT id INTO v_region_attr_id FROM public.attributes WHERE key = 'region' LIMIT 1;
  SELECT id INTO v_fulfill_attr_id FROM public.attributes WHERE key = 'fulfillment_from' LIMIT 1;

  -- If either attribute is missing, do nothing.
  IF v_region_attr_id IS NULL OR v_fulfill_attr_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.attribute_id <> v_region_attr_id THEN
      RETURN OLD;
    END IF;

    DELETE FROM public.attribute_values
    WHERE attribute_id = v_fulfill_attr_id
      AND value = OLD.value;

    RETURN OLD;
  END IF;

  -- INSERT / UPDATE
  IF NEW.attribute_id <> v_region_attr_id THEN
    RETURN NEW;
  END IF;

  v_value := NEW.value;
  v_sort := NEW.sort_order;
  v_active := NEW.is_active;

  -- Handle rename on UPDATE
  IF TG_OP = 'UPDATE' AND NEW.value IS DISTINCT FROM OLD.value THEN
    UPDATE public.attribute_values
    SET value = NEW.value,
        sort_order = NEW.sort_order,
        is_active = NEW.is_active
    WHERE attribute_id = v_fulfill_attr_id
      AND value = OLD.value;

    -- If we updated something, we're done.
    IF FOUND THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Upsert by (attribute_id, value) semantics (no unique constraint in schema).
  SELECT id INTO v_existing_id
  FROM public.attribute_values
  WHERE attribute_id = v_fulfill_attr_id
    AND value = v_value
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active)
    VALUES (v_fulfill_attr_id, v_value, COALESCE(v_sort, 0), COALESCE(v_active, true));
  ELSE
    UPDATE public.attribute_values
    SET sort_order = COALESCE(v_sort, sort_order),
        is_active = COALESCE(v_active, is_active)
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_region_attribute_values_to_fulfillment_from ON public.attribute_values;
CREATE TRIGGER trg_mirror_region_attribute_values_to_fulfillment_from
AFTER INSERT OR UPDATE OR DELETE ON public.attribute_values
FOR EACH ROW
EXECUTE FUNCTION public.mirror_region_attribute_values_to_fulfillment_from();

-- Initial copy: replace fulfillment_from values with region values
DO $$
DECLARE
  v_region_attr_id uuid;
  v_fulfill_attr_id uuid;
BEGIN
  SELECT id INTO v_region_attr_id FROM public.attributes WHERE key = 'region' LIMIT 1;
  SELECT id INTO v_fulfill_attr_id FROM public.attributes WHERE key = 'fulfillment_from' LIMIT 1;

  IF v_region_attr_id IS NULL OR v_fulfill_attr_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.attribute_values WHERE attribute_id = v_fulfill_attr_id;

  INSERT INTO public.attribute_values (attribute_id, value, sort_order, is_active)
  SELECT v_fulfill_attr_id, value, sort_order, is_active
  FROM public.attribute_values
  WHERE attribute_id = v_region_attr_id
  ORDER BY sort_order ASC, created_at ASC;
END;
$$;