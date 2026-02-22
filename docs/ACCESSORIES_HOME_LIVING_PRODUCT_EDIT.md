# Product edit: Accessories & Home Living subcategories

This document describes the **product creation data** (attributes, options, and form fields) for Accessories and Home Living subcategories. Drinkware and Wall Art are in `DRINKWARE_WALLART_PRODUCT_EDIT.md`.

---

## 1. Accessories subcategories

### Tote Bags (Bez Çantalar) – slug: `tote-bags`

| Attribute key           | UI label  | Options (examples)                          |
|------------------------|-----------|---------------------------------------------|
| `accessory_bag_type`   | Bag type  | Tote Bag, Shopper, Canvas Bag, Market Bag, Other |
| `material`             | Material  | (global attribute)                           |

**Product details shown:** Bag type, Material. No Gender, no Size variants.

---

### Hats / Caps (Şapkalar) – slug: `hats-caps`

| Attribute key           | UI label  | Options (examples)                          |
|------------------------|-----------|---------------------------------------------|
| `accessory_hat_type`   | Hat type  | Dad Hat, Trucker Hat, Beanie, Snapback, Bucket Hat, Other |
| `material`             | Material  | (global attribute)                           |

**Product details shown:** Hat type, Material. No Gender, no Size variants.

---

### Phone Cases (Telefon Kılıfları) – slug: `phone-cases`

| Attribute key             | UI label      | Options (examples)                          |
|---------------------------|---------------|---------------------------------------------|
| `accessory_phone_model`   | Device model  | iPhone 15, iPhone 14, iPhone 13, iPhone SE, Samsung S24, Samsung S23, Samsung A series, Other |
| `material`                | Material      | (global attribute)                           |

**Product details shown:** Device model, Material. No Gender, no Size variants.

---

### Socks (Çoraplar) – slug: `socks`

| Attribute key             | UI label   | Options (examples)                |
|---------------------------|------------|-----------------------------------|
| `accessory_sock_type`     | Sock type  | Ankle, Crew, Knee-high, No-show, Other |
| `material`                | Material   | (global attribute)                 |

**Product details shown:** Sock type, Material. No Gender, no Size variants.

---

## 2. Home Living subcategories (excluding Wall Art)

### Pillows (Yastıklar) – slug: `pillows`

| Attribute key   | UI label     | Options (examples)                                    |
|-----------------|--------------|--------------------------------------------------------|
| `pillow_type`   | Pillow type  | Square, Rectangular, Lumbar, Round, Other              |
| `pillow_size`   | Pillow size  | Small, Medium, Large, 18x18", 20x20", 12x20", Other    |
| `material`      | Material     | (global attribute)                                    |

**Product details shown:** Pillow type, Pillow size, Material. No Gender, no Size variants.

---

### Blankets (Battaniyeler) – slug: `blankets`

| Attribute key   | UI label      | Options (examples)                    |
|----------------|---------------|----------------------------------------|
| `blanket_type` | Blanket type  | Throw, Afghan, Fleece, Weighted, Other |
| `blanket_size` | Blanket size  | Small, Medium, Large, 50x60", 60x80", Other |
| `material`     | Material      | (global attribute)                     |

**Product details shown:** Blanket type, Blanket size, Material. No Gender, no Size variants.

---

### Candles (Mumlar) – slug: `candles`

| Attribute key   | UI label    | Options (examples)                    |
|----------------|-------------|----------------------------------------|
| `candle_type`  | Candle type | Jar, Pillar, Tealight, Votive, Taper, Other |
| `material`     | Material    | (global attribute)                     |

**Product details shown:** Candle type, Material. No Gender, no Size variants.

---

## 3. Wall Art & Prints

See `DRINKWARE_WALLART_PRODUCT_EDIT.md` for `wall_art_type`, `wall_art_size`, `wall_art_orientation`, `wall_art_frame_style`.

---

## 4. Database and form logic

- **Migration:** `supabase/migrations/20260221100000_accessories_home_living_attributes.sql` inserts the attributes and option values above. Run migrations so these exist in `attributes` and `attribute_values`.
- **Admin product edit:** `AdminProductEdit.tsx` detects category by slug/name:
  - **Accessories:** `isAccessoriesCategory` (hides Gender and Size); subcategory blocks: `isToteBagsCategory`, `isHatsCapsCategory`, `isPhoneCasesCategory`, `isSocksCategory`.
  - **Home Living:** `isPillowsCategory`, `isBlanketsCategory`, `isCandlesCategory` (and existing `isWallArtCategory`).
- **Options loading:** `accessoriesHomeLivingOptions` query loads values for keys: `accessory_bag_type`, `accessory_hat_type`, `accessory_phone_model`, `accessory_sock_type`, `pillow_type`, `pillow_size`, `blanket_type`, `blanket_size`, `candle_type`.

---

## 5. Category slugs to use in Admin

Create categories in Admin → Categories with these slugs (and subcategories under Accessories / Home Living) so the form shows the correct blocks:

| Parent        | Subcategory slug  | Name (suggestion)     |
|---------------|-------------------|------------------------|
| Accessories   | `tote-bags`       | Tote Bags              |
| Accessories   | `hats-caps`       | Hats / Caps            |
| Accessories   | `phone-cases`     | Phone Cases            |
| Accessories   | `socks`           | Socks                  |
| Home Living   | `pillows`         | Pillows                |
| Home Living   | `blankets`        | Blankets               |
| Home Living   | `wall-art`        | Wall Art & Prints      |
| Home Living   | `candles`         | Candles                |
