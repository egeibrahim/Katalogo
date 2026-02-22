# Categories & Subcategories – Reference List & Mockup Notes

This document is the **single reference** for the full category tree and product-type notes. Use it when:
- Creating categories in Admin
- Designing the JSON **Template Mapping** (which templates need wrap, flat surface, etc.)
- Adding new product types without writing new code

---

## 1. Top-level categories

| Slug (suggested) | Name (EN)     | Name (TR)   |
|------------------|---------------|-------------|
| `apparel`        | Apparel       | Giyim       |
| `accessories`    | Accessories   | Aksesuar    |
| `drinkware`      | Drinkware     | Mutfak & İçecek |
| `home-living`    | Home & Living | Ev & Yaşam  |

*(Apparel already exists. Accessories / Drinkware / Home Living may be created as top-level or under a different hierarchy; adjust slugs in Admin as needed.)*

---

## 2. A. Accessories (Aksesuar)

| Subcategory (EN)   | Subcategory (TR)   | Slug (suggested) | Mockup / technical notes |
|--------------------|--------------------|-------------------|---------------------------|
| Tote Bags          | Bez Çantalar       | `tote-bags`       | **Easiest mockup** – flat surface. Good first product type for templates. |
| Hats / Caps        | Şapkalar           | `hats-caps`       | Curved surface; **embroidery effect** may be needed. Sub-types: **Dad Hat**, **Trucker Hat**, **Beanie**. |
| Phone Cases        | Telefon Kılıfları  | `phone-cases`     | **iPhone** and **Samsung** models. Model-specific templates. |
| Socks              | Çoraplar           | `socks`           | Patterned (sublimation) or with logo. |

**Template mapping notes (Accessories):**
- Tote Bags: flat canvas, simple placement (e.g. `position_x/y: center`).
- Hats: curved mockup; consider `displacement_map` or embroidery-specific layer.
- Phone cases: one template per device model (or template keyed by model).
- Socks: full-wrap or front panel; sublimation vs print.

---

## 3. B. Drinkware (Mutfak & İçecek)

| Subcategory (EN) | Subcategory (TR) | Slug (suggested) | Mockup / technical notes |
|------------------|------------------|-------------------|---------------------------|
| Mugs             | Kupalar          | `mugs`            | **Ceramic Mug**, **Enamel (Vintage) Mug**. |
| Tumblers         | Termoslar        | `tumblers`       | Stainless steel **Travel Mug** type. |
| Water Bottles    | Su Şişeleri      | `water-bottles`   | Sports bottle style. |

**Technical note (all Drinkware):**  
Cylindrical **wrap** effect required – design is applied around the circumference. Template `canvas_specs` should support wrap (e.g. `wrap: true`, `wrap_width_px` or equivalent in JSON template).

**Template mapping notes (Drinkware):**
- `canvas_specs`: width/height for unwrapped artwork; mask or displacement for cylinder wrap.
- See `docs/DRINKWARE_WALLART_PRODUCT_EDIT.md` for attributes (capacity, lid type, material).

---

## 4. C. Home & Living (Ev & Yaşam)

| Subcategory (EN)   | Subcategory (TR) | Slug (suggested) | Mockup / technical notes |
|--------------------|------------------|-------------------|---------------------------|
| Pillows           | Yastıklar        | `pillows`        | **Square** and **rectangular** decorative pillows. |
| Blankets          | Battaniyeler     | `blankets`       | **Large surface** – good for big designs. |
| Wall Art (Posters / Canvas) | Duvar Sanatı | `wall-art` / `posters-canvas` | **Framed posters** or **canvas** prints. |
| Candles           | Mumlar           | `candles`        | Brand **label** can be printed (small print area). |

**Template mapping notes (Home & Living):**
- Pillows: rectangular canvas; optional aspect ratio presets (square vs rectangle).
- Blankets: large canvas; consider performance for high-res.
- Wall Art: see `docs/DRINKWARE_WALLART_PRODUCT_EDIT.md` (orientation, size, frame style).
- Candles: small label area; template with fixed label zone.

---

## 5. Summary for JSON Template Mapping

When building product templates (e.g. `config/product-templates/*.json` or DB-driven templates), use this reference:

| Category / type     | Surface / effect     | Priority / difficulty   |
|---------------------|----------------------|--------------------------|
| Tote Bags           | Flat                 | Easiest – start here    |
| Mugs, Tumblers, Water Bottles | Cylindrical wrap | Wrap pipeline required  |
| Hats / Caps         | Curved + embroidery  | Medium–hard              |
| Phone Cases         | Flat per model       | Model-specific assets   |
| Socks               | Wrap or panel        | Sublimation / print     |
| Pillows / Blankets  | Flat, large          | Straightforward         |
| Wall Art            | Flat, frame optional | Already in progress     |
| Candles             | Small label zone     | Simple placement        |

---

## 6. Relation to other docs

- **Filters & attributes per category:** `docs/CATEGORY_FILTERS_PLAN.md`
- **Drinkware & Wall Art product edit fields:** `docs/DRINKWARE_WALLART_PRODUCT_EDIT.md`
- **JSON template structure (future):** e.g. `product_id`, `category` / `sub_category`, `mockup_base`, `canvas_specs`, `variants` – align category slugs and subcategories with this list.

Creating new categories in Admin should follow this tree so that Template Mapping and filters stay consistent.

---

## 7. JSON product templates (designer canvas area)

Mockup alanı koordinatları ve efektler artık **merkezi bir JSON** ile yönetiliyor; tişört koordinatları koda gömülü değil.

- **Dosya:** `src/config/product-templates.json`
- **Kullanım:** Designer’da ürün seçildiğinde veya yeni view oluşturulduğunda, ürünün **kategori slug’ı** (örn. `apparel`, `drinkware`) ile eşleşen template’teki `canvas_area` (yüzde: top, left, width, height) kullanılır. Tasarım bu koordinatlara göre mockup üzerine yerleştirilir.
- **Yeni kategori eklemek:** JSON’a yeni bir `templates` öğesi ekle; `category` slug’ı Admin’deki kategori slug’ı ile aynı olsun. `canvas_area` yüzde (0–100), `effects` ileride warp/mask için kullanılacak.
- **Resolver:** `src/lib/productTemplates.ts` — `getDefaultCanvasArea(categorySlug)`, `getTemplateByCategorySlug(slug)`.
