-- Add helper function to prevent deleting attributes used by products
CREATE OR REPLACE FUNCTION public.is_attribute_used(_attribute_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.product_attributes pa
    WHERE pa.data ? _attribute_key
      AND (
        CASE jsonb_typeof(pa.data -> _attribute_key)
          WHEN 'null' THEN false
          WHEN 'string' THEN length(trim(pa.data ->> _attribute_key)) > 0
          WHEN 'array' THEN jsonb_array_length(pa.data -> _attribute_key) > 0
          ELSE true
        END
      )
  );
$$;