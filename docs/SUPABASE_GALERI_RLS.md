# Galeri (product_gallery_images) ve RLS

## Frontend nasıl istek atıyor?
- **Client:** `@/integrations/supabase/client` → `createClient(SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)` (anon key)
- **Auth:** `localStorage` + `persistSession: true` → giriş yapmış kullanıcının JWT’si her istekte gider
- **Sonuç:** Supabase her istekte `auth.uid()` = giriş yapmış kullanıcının id’si görür. Service role kullanılmıyor (frontend’de kullanılmamalı).

## "violates row-level security policy" alıyorsanız
1. **RLS’i kapatın (kesin çözüm):** Supabase → SQL Editor:
   ```sql
   ALTER TABLE public.product_gallery_images DISABLE ROW LEVEL SECURITY;
   ```
2. **Payload kontrolü:** Upsert’te her satırda `id`, `product_id`, `image_url`, `sort_order` gönderiliyor; `product_id` ilgili ürünün id’si (Save’da `pid`, sürüklemede `productId`).

## RLS açık kalsın isterseniz
Hem **INSERT** hem **UPDATE** policy gerekir (upsert ikisini de kullanır). Örnek (authenticated + admin):

```sql
-- INSERT
CREATE POLICY "admin_insert_gallery"
ON public.product_gallery_images FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);

-- UPDATE
CREATE POLICY "admin_update_gallery"
ON public.product_gallery_images FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);
```
