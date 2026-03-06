ALTER TABLE public.quote_requests ADD COLUMN brand_user_id UUID REFERENCES auth.users(id);

-- Gerekirse RLS (Row Level Security) politikası ekleyin ki markalar sadece kendi tekliflerini görebilsin
CREATE POLICY "Brands can view their own quotes" ON public.quote_requests
  FOR SELECT USING (auth.uid() = brand_user_id);
