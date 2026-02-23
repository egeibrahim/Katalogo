# katalogo.co'da giriş yapamıyorum

Yerel (http://127.0.0.1:8081) giriş çalışıyor ama **katalogo.co** üzerinden giriş çalışmıyorsa aşağıdakileri sırayla kontrol edin.

---

## 1. Vercel ortam değişkenleri

Canlı sitede Supabase’e bağlanabilmesi için Vercel’de aynı değerler tanımlı olmalı.

1. **Vercel Dashboard** → **Katalogo** projesi → **Settings** → **Environment Variables**.
2. Şunların **hepsinde** (Production, Preview, Development) tanımlı olduğundan emin olun:
   - `VITE_SUPABASE_URL` = `https://BURAYA_PROJECT_REF.supabase.co` (yerel `.env` ile aynı)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = anon public key (yerel `.env` ile aynı)
3. Değişiklik yaptıysanız **Redeploy** yapın (Deployments → son deploy → ⋯ → Redeploy).

---

## 2. Supabase URL Configuration (mutlaka yapın)

Production domain’i Supabase’e tanıtmazsanız giriş (özellikle Google ile) canlıda çalışmaz.

1. **Supabase Dashboard** → projeniz → **Authentication** → **URL Configuration**.
2. **Site URL** alanını canlı adresiniz yapın:
   - `https://www.katalogo.co` (çoğu kullanım)
   - veya `https://katalogo.co` (www kullanmıyorsanız)
3. **Redirect URLs** listesinde **mutlaka** şunlar olsun (eksikse ekleyin):
   - `https://www.katalogo.co/**`
   - `https://katalogo.co/**`
   - Yerel için: `http://127.0.0.1:8081/**` (isterseniz `http://localhost:8081/**` de ekleyin)
4. **Save** ile kaydedin.

Bu sayede hem e-posta/şifre hem Google ile giriş sonrası kullanıcı doğru adrese döner.

---

## 3. Google ile giriş kullanıyorsanız (opsiyonel)

Sadece **e-posta + şifre** kullanıyorsanız 1 ve 2 yeterli. **Google ile giriş** de kullanıyorsanız:

1. **Google Cloud Console** → **APIs & Services** → **Credentials**.
2. Supabase için kullandığınız **OAuth 2.0 Client ID**’yi açın.
3. **Authorized JavaScript origins** içinde şunlar olsun:
   - `https://www.katalogo.co`
   - `https://katalogo.co`
4. **Authorized redirect URIs** kısmına **Supabase’in** callback adresini eklemiş olmalısınız (örn. `https://BURAYA_PROJECT_REF.supabase.co/auth/v1/callback`). Bu zaten varsa ek işlem gerekmez; sadece yukarıdaki “origins” canlı domain ile güncel olmalı.

---

## Özet kontrol listesi

- [ ] Vercel’de `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` tanımlı (Production’da).
- [ ] Supabase → Authentication → URL Configuration’da **Site URL** = `https://www.katalogo.co` (veya kullandığınız canlı adres).
- [ ] Supabase **Redirect URLs**’te `https://www.katalogo.co/**` ve `https://katalogo.co/**` var.
- [ ] Değişiklik sonrası Vercel’de en az bir kez **Redeploy** yaptınız.
- [ ] Tarayıcıda katalogo.co’yu **sert yenileme** (Ctrl+Shift+R / Cmd+Shift+R) ile denediniz.

Hâlâ olmuyorsa: Tarayıcıda F12 → **Console** ve **Network** sekmesini açıp giriş butonuna basın; kırmızı hata veya başarısız istek var mı bakın. Çoğu durumda sebep **Redirect URLs**’te katalogo.co’nun eksik olmasıdır.
