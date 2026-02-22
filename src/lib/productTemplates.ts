/**
 * Product template mapping: canvas area, mask, and effects per category (or product type).
 * Coordinates are in percent (0–100) to match design_area_* in product_views.
 * Add new categories by editing src/config/product-templates.json.
 */

import productTemplatesJson from "@/config/product-templates.json";

export interface CanvasArea {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ProductTemplate {
  id: string;
  category: string;
  canvas_area: CanvasArea;
  mask_url: string | null;
  effects: Record<string, unknown>;
}

const templates: ProductTemplate[] =
  (productTemplatesJson as { templates: ProductTemplate[] }).templates ?? [];

const DEFAULT_CANVAS_AREA: CanvasArea = { top: 30, left: 30, width: 40, height: 40 };

/**
 * Normalize category identifier for lookup (slug: lowercase, no spaces).
 */
function normalizeCategoryKey(categorySlugOrName: string): string {
  return (categorySlugOrName || "").toLowerCase().replace(/\s+/g, "-").trim();
}

/**
 * Get the first template that matches the given category slug or name.
 * Category in JSON is stored as slug (e.g. "apparel", "drinkware").
 */
export function getTemplateByCategorySlug(categorySlugOrName: string): ProductTemplate | null {
  const key = normalizeCategoryKey(categorySlugOrName);
  if (!key) return null;
  return templates.find((t) => normalizeCategoryKey(t.category) === key) ?? null;
}

/**
 * Get default canvas area (percent) for a category. Used when creating new views
 * or when view has no design_area set. Returns fallback if no template matches.
 */
export function getDefaultCanvasArea(categorySlugOrName: string): CanvasArea {
  const template = getTemplateByCategorySlug(categorySlugOrName);
  if (template?.canvas_area) {
    const a = template.canvas_area;
    return {
      top: typeof a.top === "number" ? a.top : DEFAULT_CANVAS_AREA.top,
      left: typeof a.left === "number" ? a.left : DEFAULT_CANVAS_AREA.left,
      width: typeof a.width === "number" ? a.width : DEFAULT_CANVAS_AREA.width,
      height: typeof a.height === "number" ? a.height : DEFAULT_CANVAS_AREA.height,
    };
  }
  return { ...DEFAULT_CANVAS_AREA };
}

/**
 * Default area when category is unknown (e.g. no category on product).
 */
export function getFallbackCanvasArea(): CanvasArea {
  return { ...DEFAULT_CANVAS_AREA };
}
