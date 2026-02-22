-- Unit price tiers per product
CREATE TABLE IF NOT EXISTS public.product_unit_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  min_qty integer NOT NULL DEFAULT 1,
  max_qty integer NULL,
  unit_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_unit_price_tiers_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT product_unit_price_tiers_min_qty_check CHECK (min_qty >= 1),
  CONSTRAINT product_unit_price_tiers_max_qty_check CHECK (max_qty IS NULL OR max_qty >= min_qty),
  CONSTRAINT product_unit_price_tiers_unit_price_check CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_product_unit_price_tiers_product_sort
ON public.product_unit_price_tiers (product_id, sort_order);

ALTER TABLE public.product_unit_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view unit price tiers"
ON public.product_unit_price_tiers
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage unit price tiers"
ON public.product_unit_price_tiers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- keep updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'touch_product_unit_price_tiers_updated_at'
  ) THEN
    CREATE TRIGGER touch_product_unit_price_tiers_updated_at
    BEFORE UPDATE ON public.product_unit_price_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;
