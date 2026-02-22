-- Product page block order per product
CREATE TABLE IF NOT EXISTS public.product_page_block_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  block_order text[] NOT NULL DEFAULT ARRAY['customization_options','unit_price','fulfillment','shipping']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_page_block_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage product page block orders"
ON public.product_page_block_orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view product page block orders"
ON public.product_page_block_orders
FOR SELECT
USING (true);

-- updated_at trigger (reuse existing public.update_updated_at_column if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_product_page_block_orders_updated_at'
  ) THEN
    CREATE TRIGGER trg_product_page_block_orders_updated_at
    BEFORE UPDATE ON public.product_page_block_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Optional: index for queries by product_id
CREATE INDEX IF NOT EXISTS idx_product_page_block_orders_product_id
  ON public.product_page_block_orders (product_id);

-- Global default order in app_settings (fallback)
INSERT INTO public.app_settings (key, value)
VALUES (
  'product_page_block_order_default',
  '["customization_options","unit_price","fulfillment","shipping"]'
)
ON CONFLICT (key)
DO NOTHING;