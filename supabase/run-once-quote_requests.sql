-- Teklif talepleri tablosu – Supabase Dashboard > SQL Editor'da bu dosyayı çalıştırın (bir kez).
-- Proje: .env içindeki VITE_SUPABASE_URL ile aynı proje.

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text,
  contact_name text,
  email text NOT NULL,
  phone text,
  address text,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE public.quote_requests IS 'Teklif iste formundan gönderilen talepler; items içinde ürün detayları ve designData.';

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri kaldır (tekrar çalıştırırsanız hata vermesin)
DROP POLICY IF EXISTS "quote_requests_insert_anon" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_select_admin" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_select_authenticated" ON public.quote_requests;

-- Herkes (giriş yapmadan da) teklif gönderebilsin
CREATE POLICY "quote_requests_insert_anon"
  ON public.quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Giriş yapmış kullanıcılar (ve ileride sadece admin) listeyi görebilsin
CREATE POLICY "quote_requests_select_authenticated"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (true);
