-- Align column names with app_settings keys
ALTER TABLE public.product_shipping_overrides
  RENAME COLUMN shipping_price_text TO shipping_method_cost_from_text;

ALTER TABLE public.product_shipping_overrides
  RENAME COLUMN shipping_additional_price_text TO shipping_method_additional_item_text;

ALTER TABLE public.product_shipping_overrides
  ADD COLUMN IF NOT EXISTS shipping_method_time_text text;
