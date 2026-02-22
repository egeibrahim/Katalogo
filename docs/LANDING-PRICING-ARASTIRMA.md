# Landing Page + Pricing: Araştırma ve Yön Önerileri

## 1. Şu anki durum

| Sayfa | Durum | Renk / arayüz |
|-------|--------|----------------|
| **Ana sayfa (/) ** | Aslında **Auth** (giriş/kayıt) açılıyor; ayrı bir landing yok | — |
| **Home.tsx** | Var ama route’ta kullanılmıyor; hero + 3 kart + Get Started kutusu | Aynı tema |
| **Pricing** | Sadece başlık + “Yakında” alt yazısı; plan/fiyat yok | `ru-max`, sade layout |
| **Genel tema** | Instrument Sans + Newsreader; arka plan bej/krem (40 33% 97%); primary kırmızı (12 72% 50%); kenarlıklı kartlar | Sakin, “editorial” his |

**Sizin geri bildirim:** Renk ve arayüz beğenilmiyor → yeni bir yön gerekli.

---

## 2. Landing page best practices (kısa özet)

- **Tek net hedef:** Sayfa tek bir aksiyona odaklansın (kayıt, teklif al, kataloğa git).
- **Hero:** Kısa, fayda odaklı başlık (≈10 kelime); hemen altında tek, belirgin CTA.
- **Bölüm sayısı:** 5–8 bölüm; aynı CTA farklı yerlerde tekrarlansın.
- **Sosyal kanıt:** Müşteri logoları, kısa referanslar, sayılar (örn. “X marka kullanıyor”).
- **Hız:** İlk anlamlı çizim (LCP) < 2.5 saniye; gereksiz görsel/video yok.
- **Mobil:** Önce mobil düşünülmüş, büyük dokunma alanları.

---

## 3. Renk ve arayüz: alternatif yönler

Aşağıdakiler “şu anki bej + kırmızı”dan farklı, net seçenekler. Birini (veya karışımını) seçebilirsiniz.

### A) Koyu / profesyonel SaaS
- **Arka plan:** Koyu gri / lacivert (#0f172a, #1e293b).
- **Metin:** Beyaz / açık gri.
- **Vurgu:** Tek parlak renk (mavi, yeşil veya mor) buton ve linklerde.
- **His:** Ciddi, kurumsal, “B2B yazılım”.
- **Örnek his:** Linear, Vercel dashboard.

### B) Açık minimal / “beyaz alan”
- **Arka plan:** Beyaz veya çok açık gri (#ffffff, #fafafa).
- **Metin:** Siyah / koyu gri.
- **Vurgu:** Tek renk (mavi veya siyah) CTA’da; geri kalanı siyah-beyaz.
- **His:** Sade, güven veren, okunaklı.
- **Örnek his:** Stripe, Notion landing.

### C) Sıcak ama modern (şu ankinden farklı)
- **Arka plan:** Beyaz veya hafif krem; bej yerine daha nötr.
- **Metin:** Koyu lacivert veya siyah.
- **Vurgu:** Turuncu veya koyu yeşil; kırmızıyı tamamen kaldırın veya sadece “uyarı” için kullanın.
- **His:** Sıcak ama “eski editorial” değil, daha güncel.

### D) Cesur / marka odaklı
- **Arka plan:** Gradient veya tek cesur renk (örn. koyu mor, koyu mavi).
- **Metin:** Beyaz / kontrast yüksek.
- **Vurgu:** Neon veya parlak aksan (yeşil, turuncu).
- **His:** Dikkat çekici, “startup” / kampanya sayfası.

**Öneri:** Ürün kataloğu + tasarım + B2B teklif için **B (açık minimal)** veya **A (koyu profesyonel)** en güvenli; “renk sevmiyorum” için hızlı kazanım B ile gelir.

---

### E) AskDialog tarzı (referans: www.askdialog.com)

Sizin tercih: “şöyle bişey askdialog.com”.

- **Arka plan:** Koyu (dark theme).
- **Renkler:** Yumuşak pastel vurgular (soft pastels) – mor, mavi veya yeşil tonları.
- **Layout:** Temiz, net bölümler; yüksek kontrast, modern / “high-tech” his.
- **Yapı:** Hero + güçlü CTA (örn. “Demo al” / “Başla”), sosyal kanıt (logolar, metrikler), faydalar, özellikler, net section ayrımları.

**Uygulama notu:** Landing (ve isteğe bağlı pricing) için koyu tema + pastel aksan (örn. mor/lavanta veya yumuşak mavi) kullanılabilir; mevcut bej/kırmızı tamamen kaldırılır. Font olarak Instrument Sans kalabilir veya daha “tech” bir sans (örn. Geist, Inter) seçilebilir.

---

### Tercih: Açık tema

**Seçilen yön:** Koyu (AskDialog) değil, **açık tema**.

- **Arka plan:** Beyaz veya çok açık gri (#ffffff, #fafafa).
- **Metin:** Koyu gri / siyah; iyi kontrast.
- **Vurgu:** Tek, sade renk (mavi veya yeşil) buton ve linklerde; pastel veya canlı ton.
- **His:** AskDialog’daki temiz bölümler ve net CTA aynen kalır; sadece koyu yerine açık zemin.

---

## 4. Landing sayfa yapısı önerisi (bölümler)

1. **Hero:** Başlık + 1 cümle alt metin + tek CTA (örn. “Kataloğa git” / “Teklif al”).
2. **Özellikler (3–4 blok):** Koleksiyon, Tasarım, Yönetim, Teklif – her biri kısa metin + ikon/görsel.
3. **Nasıl çalışır:** 3 adım (Kayıt → Katalog / Tasarım → Teklif veya yayın).
4. **Fiyatlandırma özeti:** “Planlar”e yönlendiren kısa blok + “Pricing” butonu.
5. **CTA tekrar:** Aynı ana buton (ve isteğe bağlı ikincil: “Giriş yap”).
6. **Footer:** Links (Pricing, Giriş, İletişim vb.).

Ana sayfa hedefi net olsun: “Kataloğa git” mi, “Hesap aç” mı, “Teklif iste” mi? Buna göre CTA metni sabitlenir.

---

## 5. Pricing sayfası (sonraki adım)

- **Planlar:** Personal, Marka, Premium (özel domain) – hesap tipleriyle uyumlu.
- Her plan: isim, fiyat, kısa liste (özellikler), CTA (Başla / İletişime geç).
- Vurgulu plan (örn. “En çok tercih edilen”) hafif çerçeve veya badge ile.
- “Teklif al” / “Kurumsal” gibi bir blok Premium veya özel kullanım için.

Landing’deki renk ve font kararı pricing’e de taşınır; aynı bileşen kütüphanesi (buton, kart, başlık) kullanılır.

---

## 6. Sonraki adımlar (sizin maddelerinizle uyumlu)

| Sıra | İş | Not |
|-----|-----|-----|
| 1 | **Landing + Pricing (tasarım)** | Renk/yön seçimi (yukarıdaki A/B/C/D) → yeni landing + pricing iskeleti. |
| 2 | **Hesap tipleri** | Marka, Personal, Premium (özel domain) – veritabanı + yetki mantığı. |
| 3 | **Teklifler sayfası** | Marka ve Premium dashboard’da “Teklifler”; `quote_requests` verisi, detaylı görünüm. |

Önce **hangi renk/yön (A/B/C/D veya karışım)** istediğinizi söyleyin; ona göre landing (ve varsa ana sayfa route’u) ve pricing tasarımı adım adım çıkarılabilir.
