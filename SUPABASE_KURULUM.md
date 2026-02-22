# Kendi Supabase Projenizi Oluşturma

Projede kayıtlı Supabase hesabı sizin değilse veya projeyi bulamıyorsanız, **yeni bir Supabase projesi** oluşturup uygulamayı ona bağlayabilirsiniz.

---

## 1. Supabase hesabı ve proje

1. Tarayıcıda **https://supabase.com** adresine gidin.
2. **Start your project** → GitHub veya e-posta ile **giriş yapın** (veya yeni hesap oluşturun).
3. **New project** ile yeni proje oluşturun:
   - **Name:** İstediğiniz isim (örn. `remix-capp`)
   - **Database password:** Güçlü bir şifre belirleyin (kaydedin).
   - **Region:** Size yakın bölgeyi seçin.
4. **Create new project** deyin; proje birkaç dakikada hazır olur.

---

## 2. Bağlantı bilgilerini alın

1. Sol menüden **Project Settings** (dişli ikonu) → **API** sekmesine gidin.
2. Şunları kopyalayın:
   - **Project URL** (örn. `https://xxxxxxxx.supabase.co`)
   - **anon public** key (uzun JWT token)

---

## 3. Projeyi bu uygulamaya bağlayın

Proje kökündeki **`.env`** dosyasını açın ve değerleri kendi projenizle değiştirin:

```env
VITE_SUPABASE_URL="BURAYA_PROJECT_URL_YAPIŞTIRIN"
VITE_SUPABASE_PUBLISHABLE_KEY="BURAYA_ANON_KEY_YAPIŞTIRIN"
VITE_SUPABASE_PROJECT_ID="BURAYA_PROJECT_REF"
```

- **Project ref:** URL’deki kısım. Örnek: URL `https://abcdefgh.supabase.co` ise ref = `abcdefgh`.

Örnek:

```env
VITE_SUPABASE_URL="https://abcdefgh.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_PROJECT_ID="abcdefgh"
```

Kaydedip uygulamayı yeniden başlatın.

---

## 4. Veritabanı şemasını uygulama (migration’lar)

Uygulamanın çalışması için tüm migration’ların çalışması gerekir. İki yol var:

### A) Supabase CLI (önerilen)

Terminalde:

```bash
# CLI kurulumu (macOS)
brew install supabase/tap/supabase

# Proje klasöründe
cd /Users/ibrahimege/Downloads/remix-of-capp-main
supabase login
supabase link --project-ref BURAYA_PROJECT_REF
supabase db push
```

`supabase db push` tüm migration’ları (Galeri tablosu ve “Galeri” klasörü dahil) uygular.

### B) SQL Editor ile tek tek

CLI kullanmak istemezseniz:

1. Supabase Dashboard → **SQL Editor**.
2. **supabase/migrations** klasöründeki `.sql` dosyalarını **dosya adı sırasına göre** (tarih öneki önemli) tek tek açıp SQL Editor’da çalıştırın.

Bu yöntem zaman alır; mümkünse A yolunu kullanın.

---

## 5. Galeri klasörü

Migration’lar düzgün uygulandıysa **“Galeri”** klasörü otomatik oluşur. Oluşmadıysa SQL Editor’da şu sorguyu çalıştırın:

```sql
INSERT INTO public.ready_made_folders (name, sort_order)
SELECT 'Galeri', 0
WHERE NOT EXISTS (SELECT 1 FROM public.ready_made_folders WHERE name = 'Galeri');
```

---

## 6. İlk admin kullanıcı

Uygulama ilk açıldığında “ilk admin” atama için genelde bir akış vardır (örn. belirli bir kullanıcıyı admin yapan fonksiyon). Projede **bootstrap-admin** veya **claim_first_admin** gibi bir edge function / RPC varsa, dokümantasyonunda veya kodu içinde nasıl tetikleneceği yazar. Giriş yaptıktan sonra bu adımı uygulayın.

---

Özet: **supabase.com** → giriş → **New project** → **Settings → API**’den URL ve anon key alın → **`.env`** güncelleyin → **Supabase CLI ile `supabase link` + `supabase db push`** yapın. Böylece proje kendi Supabase projenizde çalışır.
