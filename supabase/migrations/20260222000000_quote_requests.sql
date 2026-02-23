-- Teklif talepleri: sepetteki ürünler + adetler + tasarımlar + iletişim bilgileri
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

-- Anonim ve giriş yapmış kullanıcılar teklif gönderebilsin (sadece insert)
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_requests_insert_anon" ON public.quote_requests;
CREATE POLICY "quote_requests_insert_anon"
  ON public.quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Sadece admin okuyabilsin (liste/detay için ayrı policy gerekebilir)
DROP POLICY IF EXISTS "quote_requests_select_admin" ON public.quote_requests;
CREATE POLICY "quote_requests_select_admin"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );
