-- Mockup görselinin alanda nasıl gösterileceği: 'contain' = sığdır, 'cover' = kapla
ALTER TABLE public.product_views
ADD COLUMN IF NOT EXISTS mockup_object_fit TEXT NOT NULL DEFAULT 'contain'
CHECK (mockup_object_fit IN ('contain', 'cover'));

COMMENT ON COLUMN public.product_views.mockup_object_fit IS 'contain: sığdır, cover: alanı kapla';
