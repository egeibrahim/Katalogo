# Galeri sırası – kontrol listesi

## 1. Tablo yapısı ✓
`product_gallery_images`: **id**, **product_id**, **image_url**, **sort_order**, **created_at**  
Sütun adı: **sort_order** (position/index değil).

## 2. Frontend UPDATE ✓
- Admin edit: `supabase.from("product_gallery_images").update({ sort_order: index }).eq("id", row.id).eq("product_id", pid)` → **PATCH** gider.
- Network sekmesinde: `PATCH /rest/v1/product_gallery_images?id=eq.<uuid>&product_id=eq.<uuid>` ve body `{"sort_order": 0}` vb. görünmeli.

## 3. ORDER BY ✓
Galeri okunan her yerde **ORDER BY sort_order ASC** var:
- AdminProductEdit: `.order("sort_order", { ascending: true })`
- usePublicProduct: `.order("sort_order", { ascending: true })`
- ProductDesigner: `.order("sort_order", { ascending: true })`
- Katalog sayfaları: `foreignTable: "product_gallery_images"` ile `sort_order` ascending.

## 4. RLS – test policy (geçici)
Supabase SQL Editor’de çalıştır:

```sql
DROP POLICY IF EXISTS "temp allow all update" ON public.product_gallery_images;

CREATE POLICY "temp allow all update"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

- Bu çalışıyorsa (sıra kaydediliyorsa) → problem **RLS logic** (admin/role koşulu).
- Bu da çalışmıyorsa → Network’te PATCH gidiyor mu, 200/403/404 ne dönüyor kontrol et.

## 5. Kalıcı policy (admin only)
Test sonrası geçici policy’yi kaldırıp admin policy kullan:

```sql
DROP POLICY IF EXISTS "temp allow all update" ON public.product_gallery_images;

CREATE POLICY "Admin update gallery"
ON public.product_gallery_images
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);
```

**Özet:** %90 RLS (UPDATE policy veya WITH CHECK eksikliği). Supabase’te admin olmak sadece frontend state değil; DB policy izin vermezse update yazılmaz.
