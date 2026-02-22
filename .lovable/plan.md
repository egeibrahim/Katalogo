
Amaç: `filters` ekranındaki “Decoration Method / Technique” filtresine sadece “method” (tekil seçenek) olarak verdiğin listeyi eklemek ve bu seçeneklerin hem Admin Product Edit’te (decoration_method alanı) hem de public catalog filtrelerinde görünmesini sağlamak.

Mevcut durum (tespit):
- Kod tarafında `decoration_method` anahtarı zaten kullanılıyor:
  - `src/components/newcatalog/collection/CollectionFilters.tsx` içinde `decoration_method` options set’i var.
  - `src/pages/admin/AdminProductEdit.tsx` içinde `attrs.decoration_method` MultiSelectField’e bağlanmış.
- DB’de şu an “Decoration Method” ve “Method” diye iki ayrı attribute var ve ikisinin de option sayısı 0 görünüyor. Bu ikilik ileride karışıklık yaratabilir.
- Senin seçimin: **decoration_method** anahtarına eklensin.

Plan (uygulama adımları):
1) DB’de doğru attribute’ı “tek kaynak” haline getir
   - `attributes` tablosunda **key = `decoration_method`** olan bir attribute var mı kontrol edeceğiz.
   - Yoksa:
     - Mevcut “Method” veya “Decoration Method” kaydını **data update** ile `decoration_method`’a çevireceğiz (id aynı kalacak, sadece key/name güncellenecek).
     - Tercih edilen isim: `Decoration Method` veya UI’de gösterim için `Technique` (AdminAttributes zaten bazı key’leri “Technique” diye label’lıyor).
   - Varsa:
     - “Method” / “Decoration Method” gibi duplikeleri ileride temizlemek için not düşeceğiz (şimdilik dokunmadan da kalabilir, ama tek kaynak önerilir).

2) Verdiğin listeyi `attribute_values` içine ekle
   - `attribute_values.attribute_id = decoration_method` attribute’unun id’si olacak.
   - `value` alanına her maddeyi **aynen** (sadece method string’i) yazacağız:
     - Screen Printing
     - DTG (Direct to Garment)
     - DTF (Direct to Film)
     - Sublimation Printing
     - Heat Transfer (Vinyl / Transfer Paper)
     - All-Over Print (AOP)
     - Embroidery
     - Chenille Embroidery
     - Appliqué
     - Quilting
     - Foil Printing
     - Puff Print
     - Flocking
     - Discharge Printing
     - Burnout (Devoré)
     - Tie-Dye
     - Garment Dye
     - Laser Cutting
     - Laser Engraving
     - Debossing
     - Embossing
     - Die Cut
     - Perforation
     - UV Printing
     - Pad Printing
     - Hydro Dipping
     - Engraving (Mechanical / Laser)
     - Etching
     - Metallic Ink
     - Glow in the Dark Ink
     - Reflective Print
     - Silicone Print
     - High Density Print
     - 3D Print (on surface)
   - `sort_order`’ı 0..N şeklinde sıra numarasıyla dolduracağız (UI’de sıralı gelsin).
   - Aynı değerler zaten varsa (tekrar ekleme durumunda) çift kayıt oluşmaması için:
     - Ya önce o attribute’a ait mevcut values’ları silip yeniden yükleriz (region import gibi “replace” davranışı),
     - Ya da “varsa geç” (upsert benzeri) strateji uygularız.
   - Senin senaryon için önerim: **replace** (temiz ve deterministik).

3) UI tarafında görünürlüğü doğrula
   - `/admin/filters` ekranında ilgili attribute’ı expand edip options listesinde hepsinin göründüğünü kontrol edeceğiz.
   - `/admin/products/:id/edit` (Product Edit) sayfasında “Decoration Method” alanındaki seçeneklerin geldiğini kontrol edeceğiz.
   - Public catalog filtrelerinde (CollectionFilters) “Technique” olarak önerilerde göründüğünü kontrol edeceğiz.

4) (Opsiyonel ama önerilir) Admin’de “Toplu ekle” UX’i
   - Şu an AdminAttributes tek input ile tek tek ekliyor.
   - İstersen “Bulk Add (çok satır)” textarea ekleyip her satırı bir option yapabiliriz. Bu, gelecekte benzer listeleri hızlı eklemenizi sağlar.

Uygulamada kullanılacak işlemler (özet):
- Data update/insert/delete (schema değişikliği yok):
  - `attributes` içinde key düzeltme (gerekirse)
  - `attribute_values` içine toplu insert (veya önce delete sonra insert)
- Kod değişikliği büyük ihtimalle gerekmeyecek (çünkü app zaten `decoration_method`’ı tüketiyor); yalnızca attribute key’leri karışık ise normalize etmek için küçük bir düzenleme yapılabilir.

Kabul kriterleri:
- Filters > Decoration Method (Technique) altında tüm method’lar listeleniyor.
- Admin Product Edit > Decoration Method dropdown’u bu değerleri gösteriyor.
- Public catalog “Add filter” içinde “Technique” önerisi çıkıyor ve seçenekler dolu geliyor.
