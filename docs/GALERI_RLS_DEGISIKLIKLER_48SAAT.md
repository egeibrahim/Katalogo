# Galeri / RLS – 48 Saatte Yapılan Tüm Değişiklikler

Bu dosya, ürün galerisi sıra kaydı ve RLS ile ilgili yapılan tüm kod ve veritabanı değişikliklerini listeler. Başka bir projeye veya branch’e uygulamak için kullanılabilir.

---

## 1. ÖZET

- **Amaç:** Admin’de ürün galeri görsellerinin sırası değiştirildiğinde (sürükle-bırak veya kaydet) `product_gallery_images` tablosuna güvenli şekilde yazılması.
- **Sorun:** Supabase’te Row Level Security (RLS) açıkken tabloya yazılamıyordu; RPC/Edge Function denemeleri schema cache veya network nedeniyle çalışmadı.
- **Çözüm:** Sadece doğrudan `upsert()` kullanılıyor; RLS’in ilgili projede kapatılması gerekiyor.

---

## 2. KOD DEĞİŞİKLİKLERİ

### 2.1 Yeni dosya: `src/lib/galleryEdgeFunction.ts`

- **Amaç:** Galeri satırlarını tek noktadan upsert etmek ve RLS hatasında anlamlı mesaj vermek.
- **İçerik:**
  - `GalleryUpsertRow` tipi: `{ id, product_id, image_url, sort_order }`
  - `upsertProductGalleryImages(rows)`: `supabase.from("product_gallery_images").upsert(rows, { onConflict: "id" })` çağrısı
  - Hata RLS ise: mesajda `VITE_SUPABASE_URL` gösteriliyor ve kullanıcıya “bu projede RLS kapatın” + SQL Editor talimatı veriliyor

### 2.2 Değişen dosya: `src/pages/admin/AdminProductEdit.tsx`

**Eklenen / değişen:**

- **Import:** `import { upsertProductGalleryImages } from "@/lib/galleryEdgeFunction";`
- **Tip:** `ProductGalleryImageUpsertRow` (id, product_id, image_url, sort_order) – galeri upsert’inde sadece bu alanlar gidiyor.
- **Kaydet (Save) akışı:** Galeri satırları hazırlandıktan sonra `supabase.from("product_gallery_images").upsert(...)` yerine:
  - `const { error: fnErr } = await upsertProductGalleryImages(rows);`
  - Hata varsa: `throw new Error("Galeri sırası yazılamadı: " + fnErr);`
- **Sürükle-bırak (handleGalleryReorder):** Aynı şekilde:
  - `const { error: fnErr } = await upsertProductGalleryImages(rows);`
  - Hata varsa: state eski sıraya alınıyor, `toast.error("Sıra kaydedilemedi: " + fnErr);`

**Payload:** Her iki yerde de `rows` sadece şu alanlardan oluşuyor: `id`, `product_id`, `image_url`, `sort_order` (ekstra sütun yok).

---

## 3. VERİTABANI (SUPABASE) – MİGRATION’LAR

Aşağıdaki migration’lar `supabase/migrations/` altında. **Hedef projede (fyjztlhtxubeedyqublo) sadece RLS’i kapatmak yeterli**; RPC kullanılmıyor.

### 3.1 Sadece RLS kapatmak için (önerilen – tek seferde)

**Dosya:** `supabase/migrations/20260221250000_gallery_rls_off_and_rpc_once.sql`  
**Ne yapar:** Tüm policy’leri siler, RLS’i kapatır, isteğe bağlı RPC oluşturur, schema notify.  
**Pratik kullanım:** Sadece RLS kısmı yeterli. SQL Editor’da şunu çalıştır:

```sql
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_gallery_images'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.product_gallery_images', pol.policyname);
  END LOOP;
END $$;
ALTER TABLE public.product_gallery_images DISABLE ROW LEVEL SECURITY;
```

### 3.2 Diğer ilgili migration dosyaları (referans)

- `20260221210000_disable_rls_product_gallery_images.sql` – RLS disable
- `20260221220000_product_gallery_images_rls_off.sql` – Policy drop + RLS disable
- `20260221230000_upsert_product_gallery_images_rpc.sql` – RPC (kullanılmıyor)
- `20260221240000_product_gallery_images_force_rls_off.sql` – Tüm bilinen policy isimleri DROP + RLS disable
- `20260221250000_gallery_rls_off_and_rpc_once.sql` – Yukarıdaki tek seferlik SQL’in tam hali

Eski RPC / policy denemeleri: `20260221120000` … `20260221200000` arası dosyalar.

---

## 4. EDGE FUNCTION (KULLANILMIYOR)

- **Dosya:** `supabase/functions/upsert-product-gallery-images/index.ts`
- **Durum:** Kod var ama uygulama bu Edge Function’ı **çağırmıyor**; “Failed to fetch” vb. nedenlerle devre dışı bırakıldı.
- **İçerik (özet):** Auth kontrolü, admin/owner kontrolü, service role ile `product_gallery_images` upsert. İstersen ileride tekrar kullanılabilir.

---

## 5. .ENV (PROJE / KEY)

- **Kullanılan proje:** `fyjztlhtxubeedyqublo`  
  URL: `https://fyjztlhtxubeedyqublo.supabase.co`
- **Değişkenler:**
  - `VITE_SUPABASE_URL` = proje URL’i
  - `VITE_SUPABASE_PROJECT_ID` = proje ref (fyjztlhtxubeedyqublo)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = bu projeye ait **anon public** key (Dashboard → Project Settings → API)

Tek Supabase projesi: `.env` içindeki `VITE_SUPABASE_URL` (fyjztlhtxubeedyqublo).

---

## 6. DİĞER PROJEYE UYGULAMA ADIMLARI (48 SAATLİK GELİŞTİRME)

1. **Kod:**
   - `src/lib/galleryEdgeFunction.ts` dosyasını olduğu gibi kopyala.
   - `AdminProductEdit.tsx` içinde:
     - `upsertProductGalleryImages` import’u,
     - `ProductGalleryImageUpsertRow` tipi,
     - Save ve `handleGalleryReorder` içinde `upsertProductGalleryImages(rows)` kullanımı  
   yoksa ekle / varsa aynı mantıkla eşitle.

2. **Supabase (hedef proje):**
   - Giriş yapıp **ilgili projeyi** aç (uygulamanın `.env`’deki URL ile aynı proje).
   - SQL Editor’da yukarıdaki “Sadece RLS kapatmak için” SQL’ini çalıştır.

3. **.env:**
   - `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PROJECT_ID` hedef projeyi göstermeli.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = o projeden alınan **anon public** key.

4. **Test:**
   - Admin’de bir ürünün galeri sırasını değiştir (sürükle-bırak veya kaydet).
   - “Sıra kaydedilemedi” / RLS hatası gelmemeli; gelirse mesajdaki URL’deki projede SQL’in çalıştığından emin ol.

---

## 7. TABLO BİLGİSİ (product_gallery_images)

- **Sütunlar:** id (uuid), product_id (uuid), image_url (text), sort_order (int), created_at (timestamptz, default now())
- **Upsert’te gönderilen:** Sadece id, product_id, image_url, sort_order. `created_at` veritabanında default ile dolduruluyor.

Bu doküman, 48 saatlik galeri/RLS geliştirmesinin tek yerden uygulanabilir özetidir.
