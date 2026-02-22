# Bu repoda yapılmış özellik geliştirmeleri listesi

**Bu repoda neler var** – ürün görünümü boşlukları (Tapstitch tarzı), Drinkware, Accessories, vb. Tek Supabase projesi kullanılıyor (`.env`).

---

## 1. Ürün sayfası – Tapstitch tarzı layout (sol/sağ boşluklar)

- **`ru-max`:** İçeriği ortada tutan, max-width 1280px container. Sol/sağ boşluklar bu sınırla oluşuyor.
- **Dosyalar:**
  - `src/index.css`: `.ru-max { max-width: 1280px; margin-left: auto; margin-right: auto; }`
  - `src/pages/ProductPage.tsx`: Ürün sayfası – galeri için `px-3 sm:px-[12px]` (dar yan boşluk)
  - `src/pages/ProductPageV2.tsx`: Alternatif ürün sayfası – galeri için `px-6`
  - `src/components/newcatalog/layout/NewcatalogChrome.tsx`: Kategori satırı `ru-max px-6`
  - `src/components/newcatalog/layout/NewcatalogTopNav.tsx`: Üst nav `ru-max` + `px-6`
- **Galeri:** `ru-gallery-strip`, `ru-gallery-item`, `ru-gallery-img` (index.css). Header layout yorumu: "desktop matches Tapstitch".

**Tapstitch gibi boşlukları kapatmak** = `px-6` veya `px-3` değerlerini azaltmak / tam genişlik için kaldırmak; veya `ru-max` genişliğini artırmak. Hangi sayfada (ProductPage mi ProductPageV2 mi) kullandığını kontrol et.

---

## 2. Drinkware kategorisi

- **Veritabanı:** `supabase/migrations/20260220100000_drinkware_wallart_attributes.sql`  
  - Attribute’lar: `drinkware_type`, `drinkware_capacity`, `drinkware_lid_type` (ve Wall Art alanları).
- **Admin ürün düzenleme:** `src/pages/admin/AdminProductEdit.tsx`  
  - `isDrinkwareCategory` (slug/name’de drinkware, kupa, bardak, termos geçiyorsa)  
  - Drinkware alanları: Product type, Capacity, Lid type (drinkware_type, drinkware_capacity, drinkware_lid_type).  
  - Aynı yerde Wall Art: wall_art_type, wall_art_size, wall_art_orientation, wall_art_frame_style.
- **Designer:** `src/components/designer/ProductDesigner.tsx`  
  - `productIsDrinkware`, `productDrinkwareCapacity`, kupa baskı alanı (mug print specs).
- **Konfig:** `src/config/mug-print-specs.ts`, `src/config/product-templates.json` (category: drinkware).
- **Docs:** `docs/DRINKWARE_WALLART_PRODUCT_EDIT.md`, `docs/CATEGORY_SUBCATEGORY_REFERENCE.md`.

**Diğer projeye taşımak için:** Bu migration’ı o projede çalıştır; Admin + Designer bu attribute’lara göre zaten drinkware’i kullanıyor.

---

## 3. Accessories & Home Living (aksesuar, yastık, battaniye, mum vb.)

- **Veritabanı:** `supabase/migrations/20260221100000_accessories_home_living_attributes.sql`
- **Admin:** `AdminProductEdit.tsx` içinde:
  - `isAccessoriesCategory`, `isPillowsCategory`, `isBlanketsCategory`, `isCandlesCategory`
  - `isWallArtCategory`, `isToteBagsCategory`, `isHatsCapsCategory`, `isPhoneCasesCategory`, `isSocksCategory`
  - Bu kategorilerde farklı form alanları (ör. sadece renk; beden gizleme vb.).

**Diğer projeye:** Bu migration’ı çalıştırman yeterli; kod zaten bu kategorilere göre davranıyor.

---

## 4. Filtreler (sleeve length, style, elements, region vb.)

- **Migration’lar:**  
  - `20260208120000_add_sleeve_length_filter.sql`  
  - `20260208130000_add_style_filter.sql`  
  - `20260219100000_add_elements_filter.sql`  
  - Ve diğer attribute/filter migration’ları (ör. region, catalog).
- **Kod:** Attributes / filter key’leri bu migration’larla uyumlu; Admin Filters ve ürün listesi buna göre.

**Diğer projeye:** Hangi filtreleri kullandıysan, o migration’ları sırayla çalıştır.

---

## 5. Designer – Tapstitch tarzı kırpma (crop)

- **ProductDesigner.tsx:** "Görsel üzerinde kırp modu (Tapstitch tarzı)" – `handleCrop`, `handleCropConfirmFromRegion`, `setCropModeElementId`, `CropRegion`.

---

## 6. Katalog / koleksiyon sayfaları

- **NewcatalogCollectionCategory.tsx, NewcatalogCollectionAll.tsx:** `ru-max` kullanımı, koleksiyon grid’i.
- **NewcatalogChrome:** Kategori navigasyonu, `ru-max px-6`.

---

## 7. Özet – Diğer projeye eklemen gerekenler (özellik tarafı)

| Geliştirme | Bu repoda nerede | Diğer Supabase’e ne yapmalısın |
|------------|-------------------|---------------------------------|
| Ürün görünümü sol/sağ boşluk (Tapstitch) | ProductPage.tsx (px-3 / px-6), NewcatalogChrome, index.css .ru-max | Kod zaten burada; sadece hangi sayfa/container’da kullanıldığını eşleştir. Boşlukları kapatmak için px değerlerini veya ru-max genişliğini değiştir. |
| Drinkware kategorisi | Migration drinkware_wallart; AdminProductEdit; ProductDesigner; mug-print-specs; product-templates | `20260220100000_drinkware_wallart_attributes.sql` migration’ını Supabase’te çalıştır. |
| Accessories / Home Living | Migration accessories_home_living; AdminProductEdit (isAccessoriesCategory, pillows, blankets, candles, vb.) | `20260221100000_accessories_home_living_attributes.sql` migration’ını Supabase’te çalıştır. |
| Wall Art | Aynı drinkware migration’ında; AdminProductEdit’te wall_art_* alanları | drinkware migration’ı Wall Art attribute’larını da ekliyor. |
| Filtreler (sleeve, style, elements, vb.) | İlgili migration dosyaları | Kullandığın filtreler için o migration’ları Supabase’te çalıştır. |
| Galeri RLS | docs/GALERI_RLS_DEGISIKLIKLER_48SAAT.md | product_gallery_images için RLS kapatma SQL’i. |

**Önemli:** Veritabanı tarafında yapılacaklar = **migration’ları Supabase projesinde (.env’deki) çalıştırmak**. Ürün sayfası boşlukları tamamen **frontend (CSS + ProductPage / NewcatalogChrome)**; veritabanına bağlı değil.
