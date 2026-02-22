-- Global application settings (key/value)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY "Public can view app settings" ON public.app_settings
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger
CREATE TRIGGER app_settings_touch_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Seed defaults (safe upsert)
INSERT INTO public.app_settings(key, value)
VALUES
  ('shipping_tip', 'Final shipping cost will be calculated at checkout depending on order size'),
  ('shipping_method_name', 'Special Line'),
  ('shipping_method_time_text', '9-14 days average shipping time'),
  ('shipping_method_cost_from_text', 'from $6.16'),
  ('shipping_method_additional_item_text', '+$2.66~$3.58 per additional item'),
  ('production_time_text', '1 - 3 days'),
  ('shipping_time_text', '9 - 14 days'),
  ('total_fulfillment_time_text', '10 - 17 days'),
  ('estimated_delivery_text', 'Jan 30 - Feb 06')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;