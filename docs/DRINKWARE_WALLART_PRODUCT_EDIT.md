# Product edit: Drinkware & Wall Art & Prints

Bu doküman **Aksesuar > Kupa, bardak, termoslar** ve **Home Living > Wall Art & Prints** için ürün düzenleme (product edit) ve filtrelerde kullanılacak alanları tanımlar.

---

## 1. Drinkware (Kupa, bardak, termoslar)

### 1.1 Kullanılacak attribute’lar (product_attributes.data anahtarları)

| Key | Name (UI) | Type | Açıklama |
|-----|-----------|------|----------|
| `drinkware_type` | Product type | multiselect | Ürün tipi: Mug, Tumbler, Thermos, vb. |
| `drinkware_capacity` | Capacity | multiselect | Hacim (ml veya oz). |
| `drinkware_lid_type` | Lid type | select | Kapak tipi. |
| `material` | Material | multiselect | *(Mevcut global attribute)* Seramik, paslanmaz çelik, cam, vb. |
| `color` | Color | *(Varyant)* | Renk (mevcut color varyantları). |
| `decoration_method` | Decoration method | multiselect | *(Mevcut)* Baskı, nakış, vb. |
| `region` | Deliver-to Regions | *(Mevcut)* | Teslimat bölgeleri. |
| `care_instructions` | Care Instructions | text | Yıkama / kullanım talimatları. |

### 1.2 Drinkware attribute option listeleri

**drinkware_type** (Product type):
- Mug  
- Tumbler  
- Travel Mug  
- Thermos  
- Water Bottle  
- Tea Cup  
- Coffee Cup  
- Kids Cup  
- Other  

**drinkware_capacity** (Capacity):
- 250 ml  
- 350 ml  
- 400 ml  
- 500 ml  
- 750 ml  
- 1 L  
- 12 oz  
- 16 oz  
- 20 oz  
- 24 oz  
- 32 oz  
- Other  

**drinkware_lid_type** (Lid type):
- No Lid  
- Push Lid  
- Screw Lid  
- Straw Lid  
- Flip Lid  
- Leak-Proof Lid  
- Other  

### 1.3 Product edit’te gösterilecek alanlar (Drinkware)

- **Basic info:** Name, Product code, Category (Drinkware), Gender (opsiyonel / Unisex), Stock.  
- **Variants & Media:** Color variants, Product images, Video. *(Size yok veya “One Size” tek seçenek.)*  
- **Price:** Unit price tiers.  
- **Customization:** Decoration method, Deliver-to Regions, Fulfillment From, Print Area (baskı alanı varsa).  
- **Product details (Drinkware):**  
  - Description  
  - **Product type** (drinkware_type)  
  - **Capacity** (drinkware_capacity)  
  - **Lid type** (drinkware_lid_type)  
  - **Material** (material)  
  - Care Instructions  
- **Delivery times & Shipping:** Mevcut alanlar.

---

## 2. Wall Art & Prints

### 2.1 Kullanılacak attribute’lar (product_attributes.data anahtarları)

| Key | Name (UI) | Type | Açıklama |
|-----|-----------|------|----------|
| `wall_art_type` | Product type | multiselect | Poster, Canvas, Framed Print, vb. |
| `wall_art_size` | Size | multiselect | A4, A3, 8x10", vb. |
| `wall_art_orientation` | Orientation | select | Portrait, Landscape, Square. |
| `wall_art_frame_style` | Frame style | select | Çerçevesiz, siyah çerçeve, vb. |
| `material` | Material | multiselect | *(Mevcut)* Kağıt, canvas, metal, vb. |
| `color` | Color | *(Varyant)* | Renk (ürün rengi varsa). |
| `decoration_method` | Decoration method | multiselect | *(Mevcut)* Genelde Print. |
| `region` | Deliver-to Regions | *(Mevcut)* | Teslimat bölgeleri. |
| `care_instructions` | Care Instructions | text | Bakım / asma talimatları. |

### 2.2 Wall Art attribute option listeleri

**wall_art_type** (Product type):
- Poster  
- Canvas Print  
- Framed Print  
- Art Print  
- Photographic Print  
- Metal Print  
- Wood Print  
- Sticker  
- Other  

**wall_art_size** (Size):
- A4  
- A3  
- A2  
- A1  
- 8x10"  
- 12x16"  
- 18x24"  
- 20x28"  
- Small  
- Medium  
- Large  
- Other  

**wall_art_orientation** (Orientation):
- Portrait  
- Landscape  
- Square  

**wall_art_frame_style** (Frame style):
- Unframed  
- Black Frame  
- White Frame  
- Wood Frame  
- Natural Wood  
- Silver Frame  
- Gold Frame  
- Other  

### 2.3 Product edit’te gösterilecek alanlar (Wall Art & Prints)

- **Basic info:** Name, Product code, Category (Wall Art & Prints), Stock.  
- **Variants & Media:** Renk varyantı varsa Color; yoksa tek ürün. Product images, Video.  
- **Price:** Unit price tiers.  
- **Customization:** Decoration method, Deliver-to Regions, Fulfillment From, Print Area (baskı varsa).  
- **Product details (Wall Art):**  
  - Description  
  - **Product type** (wall_art_type)  
  - **Size** (wall_art_size)  
  - **Orientation** (wall_art_orientation)  
  - **Frame style** (wall_art_frame_style)  
  - **Material** (material)  
  - Care Instructions  
- **Delivery times & Shipping:** Mevcut alanlar.

---

## 3. Filtreler (collection sayfası)

- **Drinkware:** Deliver to, Fulfillment, **Product type** (drinkware_type), **Capacity**, **Lid type**, **Material**, **Color**, Technique (decoration_method).  
- **Wall Art & Prints:** Deliver to, Fulfillment, **Product type** (wall_art_type), **Size** (wall_art_size), **Orientation**, **Frame style**, **Material**, **Color**, Technique.

Bu attribute’lar Admin > Filters’ta oluşturulduktan ve (isteğe bağlı) ilgili kategoriye atandıktan sonra, collection filtreleri bu anahtarlara göre yapılandırılabilir.

---

## 4. Veritabanı

Yeni attribute’lar ve seçenekler `supabase/migrations/20260220100000_drinkware_wallart_attributes.sql` ile eklenir.  
İsterseniz Admin > Filters üzerinden **Category** alanıyla bu attribute’ları “Drinkware” veya “Wall Art & Prints” kategorisine atayabilirsiniz.

---

## 5. Product edit formu (Admin)

- **Kategori slug’ları:** Ürünün kategorisi **drinkware** veya **wall-art-prints** olduğunda ilgili alanlar Product details bölümünde gösterilir.
- **Admin > Categories:** Accessories altında slug **drinkware**, Home Living altında slug **wall-art-prints** olan alt kategorileri oluşturun. Ürünü bu kategorilerden birine atadığınızda form otomatik olarak Drinkware veya Wall Art alanlarını gösterir.
- **Apparel** ve diğer kategorilerde Fit, Thickness, Material, Sleeve Length vb. mevcut alanlar gösterilmeye devam eder.
