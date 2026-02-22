# Tasarım ve Sipariş Süreci – Kullanıcı Hikayesi

Bu belge, bir müşterinin **Design Now** ile tasarım yapıp sepete eklemesi ve teklif alması sürecinin doğru hikayesini tanımlar.

---

## 1. Özet akış

1. Kullanıcı ürün sayfasında **Design Now** der.
2. İlgili ürüne ait **mockuplar** (Ön, Arka vb.) ile tasarımlarını yükler / oluşturur.
3. **Sepete ekle** dediğinde bu **tasarımlar** sepete eklenir.
4. İster önce ister sonra, **ürün sayfasında** aynı ürüne ait siparişi (adet, beden, renk, teknik) sepete ekler.
5. Seçtiği ürünlere ait **tüm mockupları** (görünümleri) tamamlar ve **teklif ister**.

---

## 2. Adım adım hikaye

### 2.1 Design Now ile tasarım

- Kullanıcı bir ürün sayfasındayken **Design Now** butonuna tıklar.
- Tasarım ekranı açılır; **ilgili ürüne ait mockuplar** (Front, Back, Left Sleeve, Right Sleeve vb.) yüklenir.
- Kullanıcı her görünümde:
  - Baskı alanına **görsel** yükleyebilir,
  - **Metin** ekleyebilir,
  - Tasarımı **kaydedebilir** (saved design) veya doğrudan sepete ekleyebilir.

### 2.2 Tasarımların sepete eklenmesi

- Kullanıcı tasarımını bitirip **“Sepete ekle”** (veya benzeri) aksiyonu verdiğinde:
  - Bu **tasarımlar** (hangi ürün, hangi görünümler, hangi tasarım verisi) sepete eklenir.
- Böylece sepette hem **ürün bilgisi** (adet, beden, renk, teknik, fiyat) hem de **tasarım bilgisi** (hangi tasarımın hangi görünüme uygulandığı) yer alır.

### 2.3 Ürün sayfasından sipariş

- Kullanıcı **ürün sayfasında** da aynı ürünü sepete ekleyebilir:
  - **Önce** tasarım yapıp sonra ürün sayfasından sepete ekleyebilir,
  - **Sonra** da ürün sayfasından sepete ekleyebilir.
- Burada eklenen: **adet**, **beden(ler)**, **renk**, **teknik**, **baskı alanları** ve varsa **tasarımla eşleşen satır** (design + product line).

### 2.4 Tüm mockuplar ve teklif

- Kullanıcı seçtiği **ürünlere ait tüm mockupları** (tüm görünümleri) tamamlar:
  - Her ürün için gerekli görünümlerde (Ön, Arka vb.) tasarım yapılmış olur.
- Ardından **teklif ister**:
  - Sepetteki kalemler (ürün + tasarım) üzerinden toplam fiyat ve detaylar gösterilir,
  - Müşteri teklifi onaylayıp siparişe dönüştürebilir.

---

## 3. Önemli noktalar

| Konu | Açıklama |
|------|----------|
| **Mockuplar** | Sadece ilgili ürüne ait görünüm mockupları kullanılır; mağaza galerisi mockup olarak kullanılmaz. |
| **Tasarım → Sepet** | “Sepete ekle” aksiyonu tasarımları sepete ekler (ürün + tasarım verisi birlikte). |
| **Sıra** | Önce tasarım sonra sepete ekleme veya önce ürün sayfasından sepete ekleyip sonra tasarım yapma sırası esnektir. |
| **Teklif** | Seçilen ürünler ve tüm mockuplar tamamlandıktan sonra teklif istenir. |

---

## 4. Mevcut uygulama ile karşılaştırma

- **Design Now:** Ürün sayfasından `productId` (ve isteğe `viewId`, `colorId`) ile designer açılıyor; ilgili ürünün görünümleri ve mockupları yükleniyor. ✅
- **Ürün sayfasından sepete ekleme:** Adet, beden, renk, teknik, baskı alanı fiyatları ile sepete ekleme var. ✅
- **Tasarımın sepete eklenmesi:** Designer’dan doğrudan “Sepete ekle” ile tasarım verisini (design_data / saved_design_id) sepete yazan bir akış şu an tam tanımlı değil; cart item’da tasarım referansı (design_id / design_data) tutulmuyor. ⚠️
- **Teklif isteği:** Sepet sayfasında checkout / teklif adımı UI’da netleştirilebilir. ⚠️

Bu hikaye, yukarıdaki akışa göre ürün sayfası, designer ve sepet tarafının uyumlu çalışması için referans alınabilir.
