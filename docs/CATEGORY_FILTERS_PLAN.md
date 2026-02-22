# Category & Filters Plan: Apparel, Accessories, Home Living

## Current state

- **Categories** (table `categories`):
  - Two-level hierarchy: `parent_category_id` is NULL for top-level, set for subcategories.
  - Products have `category_id` → one category (leaf or parent).
  - Frontend: top nav from top-level categories; collection page shows children or siblings and products for current category.

- **Filters** (tables `attributes`, `attribute_values`):
  - Each attribute has optional `category_id`: **NULL = global** (all categories), or link to a **specific category**.
  - Admin **Filters** page (AdminAttributes) already supports creating/editing attributes and assigning them to a category or "Global".
  - Product edit form uses the same attributes (e.g. size, color, fit, decoration_method) for variants and details.

- **Collection filters (frontend)**:
  - `CollectionFilters` shows a **fixed set** of filter keys: Deliver to, Fulfillment, Size, Color, Fit, Print Areas, Sleeve Length, Style, Elements.
  - Options are loaded from **all** `product_attributes.data` and from `attributes`/`attribute_values` **without** filtering by current collection category.
  - So today filters are effectively **global** and **Apparel-oriented** (sizes, sleeve length, fit, etc.).

---

## Goal

- **Apparel**: keep current behaviour; filters stay as today (size, color, fit, sleeve length, style, elements, etc.).
- **Accessories (Aksesuarlar)**: new top-level category with its own subcategories and a **different set of filters** (e.g. type, material, color, no size/sleeve).
- **Home Living**: new top-level category with subcategories and **its own filters** (e.g. room, material, dimensions, color).

---

## 1. Proposed category structure

### Top-level (parent_category_id = NULL)

| Slug       | Name          | Notes                    |
|-----------|----------------|--------------------------|
| `apparel` | Apparel        | Existing                 |
| `accessories` | Accessories | New                      |
| `home-living` | Home Living  | New                      |

### Subcategories (examples)

**Under Apparel (existing or extend as needed)**  
- T-Shirts, Hoodies, Sweatshirts, etc.

**Under Accessories**  
- Bags, Hats/Caps, Scarves, Socks, Belts, etc.

**Under Home Living**  
- Cushions, Blankets, Towels, Bags (e.g. tote), Wall Art, etc.

Subcategories are created in **Admin → Categories** (Add category / Add new subcategory). No schema change required.

---

## 2. Proposed filter sets per category type

Concept: **attributes** with `category_id = NULL` are **global** (shown for every category). Attributes with `category_id = X` are shown only when the current collection belongs to category X or a descendant of X.

### Apparel (current)

- Keep: Region, Fulfillment, **Size**, **Color**, **Fit**, Print Areas, **Sleeve Length**, Thickness, Fabric Weight, Technique, Material, **Sleeve Style**, **Neckline**, **Style**, **Elements**, Season.

### Accessories

- **Use**: Region, Fulfillment, **Color**, **Material**, **Type** (e.g. Bag, Hat, Scarf), optionally Technique / Print Areas if they do print-on-demand.
- **Do not use** (or hide in UI for this branch): Size (or use a reduced set like One Size), Fit, Sleeve Length, Sleeve Style, Neckline, Thickness, Fabric Weight (unless relevant).

### Home Living

- **Use**: Region, Fulfillment, **Color**, **Material**, **Room** (e.g. Living Room, Bedroom, Bathroom), **Product type** (Cushion, Blanket, Towel, etc.), optionally dimensions (e.g. size preset).
- **Do not use**: Sleeve Length, Sleeve Style, Neckline, Fit (or map to “size” presets like Small/Medium/Large for cushions).

---

## 3. Implementation outline (preliminary)

### Phase A: Categories only (no code change for filters)

1. In **Admin → Categories** create:
   - Top-level **Accessories** (slug `accessories`).
   - Top-level **Home Living** (slug `home-living`).
   - Under each, create subcategories as needed (e.g. Bags, Hats under Accessories; Cushions, Blankets under Home Living).
2. Assign products to the new categories when ready.
3. Frontend: nav and collection pages already use `categories` and `parent_category_id`; new top-level and children will appear automatically.

### Phase B: Category-aware attributes (admin)

1. **Admin → Filters**: when creating/editing an attribute, set **Category** to:
   - **Global** (current “no category”) → shown for all categories, or
   - **Apparel** / **Accessories** / **Home Living** (top-level) → shown only for that branch.
2. Optionally: bulk-edit existing attributes to set `category_id` to the Apparel top-level category so they are “Apparel-only” (or leave as global if you want them everywhere for now).
3. No DB migration needed; `attributes.category_id` already exists.

### Phase C: Collection filters by category (frontend)

1. **Pass context into filters**
   - In `NewcatalogCollectionCategory` (and any other collection view), determine the “filter context”:
     - Current category’s **parent** if current is a subcategory, or current category if it’s top-level.
   - Pass this **categoryId** (or slug) into `CollectionFilters`.

2. **Load attributes for that category**
   - In `CollectionFilters` (or a small API/hook):
     - Fetch attributes where `category_id IS NULL OR category_id = categoryId` (or `category_id` in the path from root to current category).
   - Build filter options (e.g. size, color, …) only from these attributes + their `attribute_values` and from `product_attributes.data` for products in the current collection.
   - So: **Apparel** collection → current Apparel attributes + global; **Accessories** → Accessories + global; **Home Living** → Home Living + global.

3. **Render only relevant filters**
   - For each filter key (Size, Color, Sleeve Length, etc.), show the dropdown only if the current category’s attribute set includes that key and has options.
   - Avoid showing “Sleeve Length” on Accessories or Home Living if those attributes are not linked to that category.

### Phase D: Product edit form (admin)

- Product edit form today uses a **global** list of attributes (e.g. from `newcatalogFilters` or admin attributes).
- When product’s `category_id` is set to an Accessories or Home Living category, the form could:
  - Show only attributes that are **global** or **for that category** (and its parent), for variant/details fields.
- This may require passing `product.category_id` into the attribute/filter options fetcher used in the product edit page and filtering the list there.

---

## 4. Data model summary

| Table / concept      | Role |
|----------------------|------|
| `categories`         | Hierarchy (top-level + subcategories). Products and attributes can be linked to a category. |
| `attributes.category_id` | NULL = global; set = only for that category (and can be used for “filter set” for that branch). |
| `attribute_values`   | Options for each attribute (unchanged). |
| `product_attributes.data` | Product-level filter values (keys match attribute keys). |

---

## 5. Next steps (recommended order)

1. **Create categories**: Add **Accessories** and **Home Living** and their subcategories in Admin → Categories.
2. **Define filter sets**: List exact attribute keys (and option values) for Accessories and for Home Living; create these attributes in Admin → Filters and set their **Category** to the corresponding top-level category.
3. **Wire collection filters to category**: Implement Phase C (pass category into `CollectionFilters`, load category-scoped attributes, show only relevant filters).
4. **Optionally** scope product edit attributes by product category (Phase D).

This document is a preliminary plan; implementation details (exact attribute keys, UI for “filter set” templates, or making category optional on attributes) can be refined as you add Accessories and Home Living.
