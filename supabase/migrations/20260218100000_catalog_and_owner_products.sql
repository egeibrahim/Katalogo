-- Platform katalog: admin oluşturduğu ürünler (is_catalog_product = true).
-- Mağaza ürünleri: copy ile eklenen, owner_user_id = mağaza kullanıcısı.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_catalog_product boolean NOT NULL DEFAULT false;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL;
COMMENT ON COLUMN public.products.is_catalog_product IS 'true = platform kataloğunda (admin oluşturur); false = mağazanın kendi ürünü (copy ile)';
COMMENT ON COLUMN public.products.owner_user_id IS 'null = platform katalog ürünü; dolu = bu kullanıcının (mağaza) ürünü';
