-- Abonelik seçip ödeme yapmadan giriş yapan kullanıcıları engellemek için pending_plan/pending_interval.
-- create-checkout-session çağrıldığında set edilir, Stripe webhook veya iptal URL'de temizlenir.

ALTER TABLE public.user_memberships
  ADD COLUMN IF NOT EXISTS pending_plan TEXT,
  ADD COLUMN IF NOT EXISTS pending_interval TEXT;

COMMENT ON COLUMN public.user_memberships.pending_plan IS 'Seçilip ödenmemiş plan: individual | brand. Ödeme tamamlanınca veya iptal edilince null.';
COMMENT ON COLUMN public.user_memberships.pending_interval IS 'Seçilip ödenmemiş dönem: monthly | yearly.';
