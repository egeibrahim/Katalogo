-- Product details (Tapstitch-like)

-- 1) Table
CREATE TABLE IF NOT EXISTS public.product_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'link' | 'list'
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_details_product_id ON public.product_details(product_id);
CREATE INDEX IF NOT EXISTS idx_product_details_sort ON public.product_details(product_id, sort_order, created_at);

-- 2) RLS
ALTER TABLE public.product_details ENABLE ROW LEVEL SECURITY;

-- Anyone can view product details (shown in designer DETAILS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_details' AND policyname='Anyone can view product details'
  ) THEN
    CREATE POLICY "Anyone can view product details"
    ON public.product_details
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Admin manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_details' AND policyname='Admins can insert product details'
  ) THEN
    CREATE POLICY "Admins can insert product details"
    ON public.product_details
    FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_details' AND policyname='Admins can update product details'
  ) THEN
    CREATE POLICY "Admins can update product details"
    ON public.product_details
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_details' AND policyname='Admins can delete product details'
  ) THEN
    CREATE POLICY "Admins can delete product details"
    ON public.product_details
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 3) updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_details_updated_at'
  ) THEN
    CREATE TRIGGER update_product_details_updated_at
    BEFORE UPDATE ON public.product_details
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;