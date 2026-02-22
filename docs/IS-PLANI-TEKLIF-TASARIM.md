# İş planı: Teklif ile birlikte ürün adetleri ve tasarımların iletilmesi

## Mevcut durum

- **Designer**: Görünümlere tasarım yükleniyor; "Sepete ekle" ile ürün + `designData` (viewId → öğe listesi) ve `designName` sepete yazılıyor.
- **Sepet**: `CartItem` içinde `designData`, `designName`, `quantity`, `quantityBySize`, `selectedSize`, `selectedColorName` vb. tutuluyor.
- **Teklif formu**: "Teklif iste" → `QuoteFormSection` açılıyor; gönderimde sadece `hasDesign` (boolean) ve `designName` gidiyor; **tasarım verisi (`designData`) ve beden bazlı adet (`quantityBySize`) payload’a eklenmiyor**. Payload şu an sadece `console.info` ile loglanıyor, gerçek bir API/e-posta gönderimi yok.

## Hedef

Teklif iletildiğinde:

1. **Ürün adetleri** (ve varsa beden bazlı adetler) ile birlikte  
2. **Tasarım verileri** (görünüm bazlı tasarım öğeleri)  
alıcıya (backend / e-posta / CRM) eksiksiz iletilmeli.

---

## İş planı (adımlar)

### 1. Teklif payload’ına tasarım ve adet bilgisini ekle (frontend)

**Dosya:** `src/pages/CartPage.tsx` – `QuoteFormSection` içindeki `handleSubmit` payload’ı.

**Yapılacaklar:**

- Payload’taki her kalem için:
  - **`designData`**: Varsa `item.designData`’yı olduğu gibi veya serialize edilmiş (JSON) ekle.
  - **`quantityBySize`**: Varsa `item.quantityBySize` ekle; yoksa mevcut `quantity` yeterli.
- Gönderilecek yapı örneği:

```ts
items: items.map((i) => ({
  name: i.name,
  product_code: i.product_code,
  selectedSize: i.selectedSize,
  selectedColorName: i.selectedColorName,
  selectedTechnique: i.selectedTechnique,
  selectedPlacements: i.selectedPlacements,
  quantity: i.quantity,
  quantityBySize: i.quantityBySize ?? undefined,  // beden bazlı adet
  unitPrice: (i.price_from ?? 0) + (i.placementFeePerItem ?? 0),
  lineTotal: lineTotal(i),
  hasDesign: Boolean(i.designData && Object.keys(i.designData).length > 0),
  designName: i.designName ?? undefined,
  designData: i.designData ?? undefined,  // görünüm bazlı tasarım verisi
})),
```

**Not:** `designData` içinde `imageUrl` olarak `blob:` URL’leri varsa, bu adımda sadece veriyi payload’a ekliyoruz. Blob’ların kalıcı hale getirilmesi 2. adımda ele alınacak.

---

### 2. Blob URL’lerini teklif gönderiminde kullanılabilir hale getirme

**Sorun:** `designData` içindeki görsel öğelerde `imageUrl: "blob:..."` olabilir; blob URL’leri sayfa dışında geçersizdir.

**Seçenekler:**

- **A) Gönderim öncesi base64:**  
  Teklif gönderilmeden önce blob’ları okuyup base64 (veya data URL) yapıp payload’a koymak. Küçük görseller için uygun; payload büyür.

- **B) Gönderim öncesi storage’a yükleme:**  
  Blob’ları Supabase Storage (veya benzeri) yükleyip `imageUrl`’i kalıcı URL ile değiştirmek; payload’da sadece bu URL’leri göndermek. Üretim için daha uygun.

**Yapılacaklar:**

- Designer’dan gelen `designData` yapısını koruyarak:
  - Her öğede `type === "image"` ve `imageUrl?.startsWith("blob:")` ise:
    - Seçenek A: `fetch(blobUrl)` → blob → FileReader ile base64 → `imageUrl`’i data URL veya ayrı bir alan (örn. `imageDataBase64`) ile değiştir.
    - Seçenek B: `fetch(blobUrl)` → blob → Supabase Storage’a upload → dönen public URL’i `imageUrl` olarak yaz.
- Bu dönüşümü **Teklif gönder** tıklandığında, payload oluşturulmadan hemen önce yapmak (CartPage’te veya bir `prepareQuotePayload(items)` helper’ında).
- Dönüştürülmüş `designData`’yı 1. adımdaki payload’a eklemek.

---

### 3. Teklif gönderimini gerçek kanala bağlama (API / e-posta)

**Mevcut:** Payload sadece `console.info("Quote request payload:", payload)` ile loglanıyor.

**Yapılacaklar:**

- **Backend API (tercih edilir):**
  - Örn. `POST /api/quote-request` veya Supabase Edge Function.
  - Body: iletişim bilgileri + `items` (adet, quantityBySize, designData, vb.).
  - Backend: payload’ı veritabanına (veya CRM’e) yazar; gerekirse tasarım JSON’ını veya storage URL’lerini ayrı kolon/tabloda saklar.
- **E-posta (alternatif):**
  - Backend’e “e-posta gönder” endpoint’i koymak veya mevcut bir servisi kullanmak.
  - E-postada: özet tablo (ürün, adet, beden, renk, birim fiyat, satır toplamı) + tasarımlı satırlar için “Tasarım ekli” bilgisi ve tasarım verisi/ekleri (link veya base64 ek).

Hangi kanal kullanılacaksa (sadece API, sadece e-posta, ikisi birden) netleştirilmeli; CartPage’teki `handleSubmit` bu kanala göre çağrı yapacak şekilde güncellenecek.

---

### 4. Backend / veritabanı (teklif kaydı)

- **Tablo (örnek):** `quote_requests`  
  - `id`, `created_at`, `company_name`, `contact_name`, `email`, `phone`, `address`, `notes`  
  - `items` (JSONB): yukarıdaki `items` dizisi (designData ve quantityBySize dahil).
- **Tasarım verisi:**  
  - Ya `items[].designData` doğrudan JSONB içinde tutulur,  
  - Ya tasarım dosyaları storage’a atılıp `items[].designData` içinde sadece URL’ler saklanır.
- İsteğe bağlı: Teklif durumu (beklemede, yanıtlandı, iptal) ve admin panelde listeleme.

---

### 5. Özet akış (son durum)

1. Kullanıcı Designer’da ürün görünümlerine tasarım yükler → "Sepete ekle" → sepette kalemde `designData` + adet/beden bilgisi tutulur.
2. Sepette adet/beden güncellenir.
3. "Teklif iste" → Teklif formu açılır; iletişim bilgileri + sepetteki kalemler (adet, quantityBySize, designData dahil) gösterilir.
4. "Teklif gönder" tıklanınca:
   - Blob URL’ler base64 veya storage’a yüklenerek kalıcı hale getirilir (2. adım).
   - Payload’a tasarım ve adet bilgisi eklenir (1. adım).
   - Payload API veya e-posta ile iletilir (3. adım).
5. Backend teklifi kaydeder; gerekirse e-posta gönderir (4. adım).

---

## Kısa uygulama sırası

| Sıra | Konu | Öncelik |
|------|------|--------|
| 1 | CartPage: payload’a `designData` ve `quantityBySize` ekle | Yüksek |
| 2 | Blob → base64 veya storage upload (teklif gönderiminde) | Yüksek |
| 3 | Teklif API / e-posta endpoint ve CartPage entegrasyonu | Yüksek |
| 4 | Backend: quote_requests tablosu ve kayıt | Orta |
| 5 | (Opsiyonel) Admin: teklif listesi ve detay | Düşük |

Bu plan ile “görünümlerine tasarım yüklediğimiz ürünleri designer’da hazırlayıp sepete ekledikten sonra, teklif iletildiğinde ürün adetleri ve tasarımlar birlikte” gidecek şekilde yol haritası netleştirilmiş olur.
