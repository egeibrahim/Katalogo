-- Add sort_order to attributes for manual ordering in Admin
ALTER TABLE public.attributes
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill: keep stable ordering based on creation time
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM public.attributes
)
UPDATE public.attributes a
SET sort_order = r.rn,
    updated_at = now()
FROM ranked r
WHERE a.id = r.id;

CREATE INDEX IF NOT EXISTS idx_attributes_sort_order
ON public.attributes (sort_order);
