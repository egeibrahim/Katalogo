-- Product-level shipping overrides
CREATE TABLE IF NOT EXISTS public.product_shipping_overrides (
  product_id uuid PRIMARY KEY,
  shipping_tip text,
  shipping_method_name text,
  shipping_price_text text,
  shipping_additional_price_text text,
  production_time_text text,
  shipping_time_text text,
  total_fulfillment_time_text text,
  estimated_delivery_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to products
ALTER TABLE public.product_shipping_overrides
  DROP CONSTRAINT IF EXISTS product_shipping_overrides_product_id_fkey;
ALTER TABLE public.product_shipping_overrides
  ADD CONSTRAINT product_shipping_overrides_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.product_shipping_overrides ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view product shipping overrides" ON public.product_shipping_overrides;
CREATE POLICY "Public can view product shipping overrides"
ON public.product_shipping_overrides
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage product shipping overrides" ON public.product_shipping_overrides;
CREATE POLICY "Admins can manage product shipping overrides"
ON public.product_shipping_overrides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger function exists in schema (public.update_updated_at_column)
DROP TRIGGER IF EXISTS trg_product_shipping_overrides_updated_at ON public.product_shipping_overrides;
CREATE TRIGGER trg_product_shipping_overrides_updated_at
BEFORE UPDATE ON public.product_shipping_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_product_shipping_overrides_product_id
  ON public.product_shipping_overrides(product_id);
