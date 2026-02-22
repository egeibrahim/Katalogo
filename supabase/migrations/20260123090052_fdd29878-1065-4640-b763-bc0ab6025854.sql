-- Add parent_category_id to categories for 2-level hierarchy
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS parent_category_id uuid NULL;

-- Self-referential FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_parent_category_id_fkey'
  ) THEN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_parent_category_id_fkey
    FOREIGN KEY (parent_category_id)
    REFERENCES public.categories(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Prevent self-parenting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_parent_not_self'
  ) THEN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_parent_not_self
    CHECK (parent_category_id IS NULL OR parent_category_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_parent_category_id
ON public.categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_categories_parent_sort
ON public.categories(parent_category_id, sort_order);
