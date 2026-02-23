# Vercel’e deploy

Kod GitHub’da (egeibrahim/Katalogo) olduktan sonra Vercel’de projeyi açıp yayına almak için:

---

## 1. Push’u tamamla (henüz yapmadıysan)

Proje klasöründe:

```bash
git push -u origin main
```

(GitHub kullanıcı adı + Personal Access Token veya SSH ile giriş gerekir.)

---

## 2. Vercel’de proje oluştur

1. [vercel.com](https://vercel.com) → giriş yap.
2. **Add New…** → **Project**.
3. **Import Git Repository** → **egeibrahim/Katalogo**’yu seç (GitHub bağlı değilse “Import” ile GitHub’ı bağla).
4. **Configure Project** ekranında:
   - **Framework Preset:** Vite (otomatik seçilebilir).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. **Environment Variables** → **Add** ile aşağıdaki değişkenleri ekleyin (değerleri Supabase’ten alın, aşağıda “Environment Variables boşsa” bölümüne bakın).

6. **Deploy**’e tıkla.

Birkaç dakika sonra proje yayında olur; Vercel bir URL verir (örn. `katalogo.vercel.app`).

---

## 3. Özel domain (isteğe bağlı)

Vercel’de: **Project** → **Settings** → **Domains** → domain’i ekle, DNS kayıtlarını domain sağlayıcında tanımla.  
Ayrıntı: `docs/OZEL_DOMAIN.md`

Supabase’te: **Authentication** → **URL Configuration** → **Site URL** ve **Redirect URLs**’e production adresini ekle.

---

## 4. Sonraki push’lar

`main` branch’e her push’ta Vercel otomatik yeni deploy alır; ekstra işlem gerekmez.

---

## 5. Logo / sayfa güncellenmiyorsa (cache)

Sitede hâlâ eski logo veya eski içerik görünüyorsa:

1. **Değişiklikleri push et:**
   ```bash
   git add .
   git commit -m "Logo ve sayfa güncellemesi"
   git push origin main
   ```

2. **Vercel’de cache’siz yeniden deploy:**
   - [vercel.com/dashboard](https://vercel.com/dashboard) → **Katalogo** projesi.
   - **Deployments** sekmesi → en üstteki deploy’un sağındaki **⋯** (üç nokta).
   - **Redeploy** → **Redeploy with existing Build Cache cleared** (veya benzeri “cache temizle” seçeneği) işaretli olsun → **Redeploy**.

3. **Tarayıcıda:** Sayfayı sert yenile: **Ctrl+Shift+R** (Windows) veya **Cmd+Shift+R** (Mac). Gerekirse sitede çıkış yapıp tekrar aç veya gizli pencere ile dene.

---

## 6. Environment Variables boşsa (giriş / canlı site çalışmıyor)

Vercel’de **Settings** → **Environment Variables** boşsa canlı sitede Supabase’e bağlanılamaz; giriş yapılamaz. Şunları ekleyin:

### Değerleri nereden alacaksınız?

1. **Supabase Dashboard** → [supabase.com/dashboard](https://supabase.com/dashboard) → projenizi seçin.
2. Sol menüden **Project Settings** (dişli ikon) → **API** sekmesi.
3. Orada göreceksiniz:
   - **Project URL** → bunu `VITE_SUPABASE_URL` olarak kopyalayın (örn. `https://abcdefgh.supabase.co`).
   - **Project API keys** → **anon** / **public** satırındaki key’i kopyalayın → `VITE_SUPABASE_PUBLISHABLE_KEY` olarak ekleyin.

### Vercel’de ekleme

1. Vercel → **Katalogo** projesi → **Settings** → **Environment Variables**.
2. **Add New** (veya **Add**) → **Key:** `VITE_SUPABASE_URL`, **Value:** Supabase’teki Project URL (örn. `https://xxxx.supabase.co`).
3. Tekrar **Add New** → **Key:** `VITE_SUPABASE_PUBLISHABLE_KEY`, **Value:** Supabase API sayfasındaki anon public key.
4. Her iki değişken için **Environment** kısmında **Production** (ve isterseniz Preview, Development) işaretli olsun.
5. **Save** deyin.
6. **Deployments** → son deploy’un yanındaki **⋯** → **Redeploy** ile yeniden deploy alın (yeni env’ler ancak yeni build’de devreye girer).

İsterseniz `VITE_SUPABASE_PROJECT_ID` de ekleyebilirsiniz (API sayfasındaki Reference ID); giriş için zorunlu değil.
