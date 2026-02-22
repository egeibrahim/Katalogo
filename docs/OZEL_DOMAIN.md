# Özel domain bağlama

Uygulamayı kendi alan adınızla (örn. `newcatalog.com` veya `app.sirket.com`) yayınlamak için aşağıdaki adımları uygulayın.

---

## 1. Hosting tarafında domain ekleme

### Netlify

1. **Netlify Dashboard** → projenizi seçin → **Domain management** (veya **Site configuration** → **Domain management**).
2. **Add custom domain** / **Add domain alias** → kendi domain adınızı yazın (örn. `newcatalog.com`).
3. Netlify size **DNS ayarlarını** gösterir:
   - **Root domain (newcatalog.com):**  
     DNS sağlayıcınızda **A record** ekleyin:  
     - Name: `@` (veya boş)  
     - Value: `75.2.60.5` (Netlify load balancer; güncel adres Netlify’da yazar)
   - **www:**  
     **CNAME** ekleyin:  
     - Name: `www`  
     - Value: `sitename.netlify.app` (Netlify’da yazan)
4. **Verify** / **Check DNS** ile doğrulayın. DNS yayılımı 5–48 saat sürebilir.
5. İsterseniz **HTTPS** Netlify tarafından otomatik verilir (Let’s Encrypt).

### Vercel

1. **Vercel Dashboard** → projenizi seçin → **Settings** → **Domains**.
2. **Add** ile domain adınızı girin (örn. `newcatalog.com`).
3. Vercel’in gösterdiği **DNS kayıtlarını** domain sağlayıcınızda ekleyin:
   - **Root domain:**  
     **A record**: `76.76.21.21` (Vercel’in güncel IP’si sayfada yazar)
   - **www:**  
     **CNAME**: `cname.vercel-dns.com`
4. **Verify** ile kontrol edin. Yayılım birkaç dakika ile birkaç saat arasında değişir.
5. HTTPS Vercel tarafından otomatik açılır.

---

## 2. Supabase: Redirect URL’lere domain ekleme

Google (ve varsa diğer OAuth) girişi özel domain’de çalışsın diye Supabase’e bu domain’i tanıtın:

1. **Supabase Dashboard** → projeniz → **Authentication** → **URL Configuration**.
2. **Site URL** alanını özel domain’iniz yapın:
   - Örnek: `https://newcatalog.com`  
   - (www kullanıyorsanız: `https://www.newcatalog.com`)
3. **Redirect URLs** listesine şunları ekleyin (kendi domain’inizle değiştirin):
   - `https://newcatalog.com/**`
   - `https://www.newcatalog.com/**` (www kullanıyorsanız)
4. **Save** ile kaydedin.

Böylece `signInWithOAuth` ile giriş yapıldığında Supabase, dönüş adresi olarak bu domain’i kabul eder. Uygulama zaten `window.location.origin` kullandığı için özel domain’de açıldığında doğru URL’e yönlendirilir.

---

## 3. Opsiyonel: Ortam değişkeni

Varsayılan olarak uygulama `window.location.origin` kullanır; özel domain’e deploy ettiğinizde otomatik doğru adres kullanılır. İleride e-posta linkleri veya canonical URL için sabit bir adres isterseniz:

- `.env` içinde (sadece production’da doldurun):
  - `VITE_SITE_URL=https://newcatalog.com`

Şu an kodda zorunlu değil; isterseniz ileride e-posta şablonları veya meta etiketleri için kullanılabilir.

---

## Özet kontrol listesi

- [ ] Hosting (Netlify veya Vercel) üzerinde custom domain eklendi.
- [ ] DNS’te A / CNAME kayıtları doğru ve yayıldı.
- [ ] Supabase → Authentication → URL Configuration’da **Site URL** ve **Redirect URLs** özel domain ile güncellendi.
- [ ] Tarayıcıda `https://yourdomain.com` açılıyor ve Google ile giriş test edildi.

Sorun olursa: Tarayıcı konsolunda veya Network sekmesinde redirect/OAuth hatalarını kontrol edin; genelde Supabase Redirect URLs’te eksik veya yanlış domain kaynaklıdır.
