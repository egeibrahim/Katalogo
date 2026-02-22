-- Add sort_order columns for admin drag&drop ordering
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill deterministic ordering for existing rows (newest first)
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM public.categories
)
UPDATE public.categories c
SET sort_order = r.rn
FROM ranked r
WHERE r.id = c.id;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM public.products
)
UPDATE public.products p
SET sort_order = r.rn
FROM ranked r
WHERE r.id = p.id;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories (sort_order);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products (sort_order);