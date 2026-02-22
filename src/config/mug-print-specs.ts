/**
 * Mug print area (wrap band) and product dimensions by capacity.
 * Used by the designer for drinkware/mug. Template-style: Full size = Print area;
 * Safe area = inner margin where important elements should stay.
 * All measurements in the table refer to product dimensions (Height, Diameter, etc.).
 */

export type MugCapacityKey = "11oz" | "15oz" | "20oz";

export interface MugPrintArea {
  width_px: number;
  height_px: number;
}

export interface MugDimensionsCm {
  height_cm: number;
  diameter_cm: number;
  diameter_with_handle_cm: number;
}

/** Default print area (px) per capacity. Editable in designer. */
export const MUG_PRINT_AREAS: Record<MugCapacityKey, MugPrintArea> = {
  "11oz": { width_px: 2475, height_px: 1155 },
  "15oz": { width_px: 2775, height_px: 1200 },
  "20oz": { width_px: 3000, height_px: 1275 },
};

/** Template-style full size (e.g. 300dpi upload). 11oz example: 2550×1098 px. */
export const MUG_TEMPLATE_FULL_SIZE: Record<MugCapacityKey, MugPrintArea> = {
  "11oz": { width_px: 2550, height_px: 1098 },
  "15oz": { width_px: 2775, height_px: 1200 },
  "20oz": { width_px: 3000, height_px: 1275 },
};

/** Safe area: inset from print area edges (percent, e.g. 10 = 10% each side). */
export const MUG_SAFE_AREA_INSET_PCT = 10;

export const MUG_DIMENSIONS_CM: Record<MugCapacityKey, MugDimensionsCm> = {
  "11oz": { height_cm: 9.6, diameter_cm: 8.1, diameter_with_handle_cm: 12.1 },
  "15oz": { height_cm: 11.0, diameter_cm: 8.6, diameter_with_handle_cm: 12.5 },
  "20oz": { height_cm: 11.5, diameter_cm: 10.0, diameter_with_handle_cm: 14.7 },
};

export const MUG_CAPACITY_OPTIONS: { value: MugCapacityKey; label: string }[] = [
  { value: "11oz", label: "11 oz" },
  { value: "15oz", label: "15 oz" },
  { value: "20oz", label: "20 oz" },
];

const CAPACITY_ALIASES: Record<string, MugCapacityKey> = {
  "11": "11oz",
  "11 oz": "11oz",
  "11oz": "11oz",
  "15": "15oz",
  "15 oz": "15oz",
  "15oz": "15oz",
  "20": "20oz",
  "20 oz": "20oz",
  "20oz": "20oz",
};

/**
 * Resolve product capacity string (e.g. from attributes) to MugCapacityKey.
 * Defaults to 11oz if no match.
 */
export function resolveMugCapacity(value: string | string[] | null | undefined): MugCapacityKey {
  const raw = Array.isArray(value) ? value[0] : value;
  const s = (raw ?? "").toString().toLowerCase().trim();
  return CAPACITY_ALIASES[s] ?? "11oz";
}

export function getMugPrintArea(capacity: MugCapacityKey): MugPrintArea {
  return MUG_PRINT_AREAS[capacity];
}

export function getMugDimensionsCm(capacity: MugCapacityKey): MugDimensionsCm {
  return MUG_DIMENSIONS_CM[capacity];
}
