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
5. **Environment Variables** → **Add** ile şunları ekle (Supabase’ten al):

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | anon public key |
   | `VITE_SUPABASE_PROJECT_ID` | project ref |

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
