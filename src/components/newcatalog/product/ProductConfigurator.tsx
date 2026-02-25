import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { UnitPriceTiers, type UnitPriceTier } from "@/components/newcatalog/product/UnitPriceTiers";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useDeliveryRegionShippingOverride } from "@/hooks/useDeliveryRegionShippingOverride";
import { useDeliveryRegions } from "@/hooks/useDeliveryRegions";
import { usePublicProductShippingOverride } from "@/hooks/usePublicProduct";
import { FULFILLMENT_CITIES_BY_COUNTRY, FULFILLMENT_COUNTRIES } from "@/lib/fulfillmentLocations";
import { getSignedImageUrl } from "@/lib/storage";
import { SignedImage } from "@/components/ui/signed-image";
import { useI18n } from "@/lib/i18n/LocaleProvider";

type ColorOption = { id: string; name: string; hex_code: string };

const fallbackUnitPriceTiers: UnitPriceTier[] = [
  { min_qty: 1, max_qty: 5, unit_price: 2.99, currency: "USD", sort_order: 0 },
  { min_qty: 6, max_qty: 29, unit_price: 2.85, currency: "USD", sort_order: 1 },
  { min_qty: 30, max_qty: 99, unit_price: 2.7, currency: "USD", sort_order: 2 },
  { min_qty: 100, max_qty: null, unit_price: 2.4, currency: "USD", sort_order: 3 },
];

const placements = [
  { title: "Front" },
  { title: "Back" },
  { title: "Left Sleeve" },
  { title: "Right Sleeve" },
];

/** Values that are treated as "no data" on the product view (legacy defaults / placeholders). */
const SHIPPING_PLACEHOLDER_VALUES = new Set([
  "Final shipping cost will be calculated at checkout depending on order size",
  "Special Line",
  "9-14 days average shipping time",
  "from $6.16",
  "1 - 3 days",
  "9 - 14 days",
  "10 - 17 days",
  "Jan 30 - Feb 06",
]);

function shippingDisplayValue(raw: string | null | undefined): string {
  const s = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!s || SHIPPING_PLACEHOLDER_VALUES.has(s)) return "";
  if (s.toLowerCase().includes("per additional item")) return "";
  return s;
}

function SizeGuideImage({
  src,
  displaySrc,
  onSignedUrl,
}: {
  src: string;
  displaySrc: string | null;
  onSignedUrl: (url: string) => void;
}) {
  // Resolve signed URL when src is a storage path (from edits), so image loads without waiting for onError
  React.useEffect(() => {
    if (!src || src.startsWith("http")) return;
    getSignedImageUrl(src).then((signed) => signed && onSignedUrl(signed));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when src changes
  }, [src]);

  const url = displaySrc ?? src;
  return (
    <img
      src={url}
      alt="Size guide"
      className="max-h-[70vh] w-full object-contain"
      loading="lazy"
      onError={() => {
        if (url === src) getSignedImageUrl(src).then((signed) => signed && onSignedUrl(signed));
      }}
    />
  );
}

function getUnitPriceForQuantity(
  quantity: number,
  tiers: UnitPriceTier[]
): { unitPrice: number; currency: string; activeIndex: number } {
  const sorted = [...(tiers ?? [])]
    .filter((t) => t && typeof t.min_qty === "number" && typeof t.unit_price === "number")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.min_qty - b.min_qty);
  if (sorted.length === 0) return { unitPrice: 0, currency: "USD", activeIndex: 0 };
  const q = Math.max(1, Math.floor(quantity));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const t = sorted[i];
    if (q >= t.min_qty && (t.max_qty == null || q <= t.max_qty))
      return {
        unitPrice: Number(t.unit_price),
        currency: (t.currency || "USD").toUpperCase(),
        activeIndex: i,
      };
  }
  // Quantity above all defined ranges: use last (highest) tier price
  const last = sorted[sorted.length - 1];
  return {
    unitPrice: Number(last.unit_price),
    currency: (last.currency || "USD").toUpperCase(),
    activeIndex: sorted.length - 1,
  };
}

function formatUnitPrice(unitPrice: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(unitPrice);
  } catch {
    return `$${Number(unitPrice).toFixed(2)}`;
  }
}

function toggleSelection<T>(arr: T[], value: T) {
  const exists = arr.includes(value);
  if (exists) {
    // Keep at least 1 selected.
    if (arr.length <= 1) return arr;
    return arr.filter((x) => x !== value);
  }
  return [...arr, value];
}

export function ProductConfigurator({
  productId,
  productName,
  thumbnailUrl,
  sizes,
  colors,
  region,
  fulfillmentFrom,
  fulfillmentCity = null,
  techniques,
  selectedColorId,
  onSelectedColorIdChange,
  selectedSize,
  onSelectedSizeChange,
  quantity = 1,
  unitPriceTiers,
  onQuantityChange,
  onAddToCart,
  maxQuantity = null,
  topSlot,
  blockOrder,
  sizeGuideImageUrl = null,
  printAreaViews = null,
  placementOptions = null,
  designNowViewId = null,
  designerBrandSlug = null,
  addToCartRef,
}: {
  productId?: string;
  productName: string;
  thumbnailUrl: string;
  sizes: string[];
  colors: ColorOption[];
  region?: string | null;
  fulfillmentFrom?: string | null;
  fulfillmentCity?: string | null;
  techniques?: string[];
  selectedColorId?: string | null;
  onSelectedColorIdChange?: (next: string | null) => void;
  selectedSize?: string | null;
  onSelectedSizeChange?: (next: string | null) => void;
  quantity?: number;
  unitPriceTiers?: UnitPriceTier[];
  onQuantityChange?: (qty: number) => void;
  /** Called with placement fee, unit price, and optional variant details for cart. */
  onAddToCart?: (
    placementFeePerItem?: number,
    unitPriceFromTier?: number,
    details?: { selectedTechnique?: string; selectedPlacements?: Array<{ name: string; price: string }> }
  ) => void;
  /** Max allowed quantity (e.g. remaining stock). null = no limit. 0 = out of stock. */
  maxQuantity?: number | null;
  topSlot?: React.ReactNode;
  blockOrder?: ("customization_options" | "unit_price" | "fulfillment" | "shipping")[];
  /** URL of the Size Guide image (from product edits Variants). */
  sizeGuideImageUrl?: string | null;
  /** Baskı alanları teknik bazlı fiyatlarla; seçilen tekniğe göre fiyat kullanılır. */
  printAreaViews?: Array<{ name: string; price?: string; pricesByTechnique?: Record<string, string> }> | null;
  /** Print area views from edits (name + price), max 10. Teknik yokken veya geri uyumluluk için. */
  placementOptions?: Array<{ name: string; price: string }> | null;
  /** View ID to open in designer when "Design Now" is clicked (e.g. from product page front/back). */
  designNowViewId?: string | null;
  /** If set, designer runs in brand-page context (e.g. /brand/:slug). */
  designerBrandSlug?: string | null;
  /** Ref to expose addToCartWithCurrentSelections for Design Now (e.g. header button adds to cart then navigates). */
  addToCartRef?: React.MutableRefObject<{ addToCartWithCurrentSelections: () => void } | null>;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [sizeGuideOpen, setSizeGuideOpen] = React.useState(false);
  const [sizeGuideImgSrc, setSizeGuideImgSrc] = React.useState<string | null>(sizeGuideImageUrl ?? null);

  React.useEffect(() => {
    setSizeGuideImgSrc(sizeGuideImageUrl ?? null);
  }, [sizeGuideImageUrl]);

  const { data: shippingOverride } = usePublicProductShippingOverride(productId);
  const { data: regions } = useDeliveryRegions();
  const { data: appSettings } = useAppSettings([
    "shipping_tip",
    "shipping_method_name",
    "shipping_method_time_text",
    "shipping_method_cost_from_text",
    "shipping_method_additional_item_text",
    "production_time_text",
    "shipping_time_text",
    "total_fulfillment_time_text",
    "estimated_delivery_text",
  ]);

  const deliverToCountries = FULFILLMENT_COUNTRIES;
  const [deliverTo, setDeliverTo] = React.useState(() => {
    const r = region?.trim();
    if (r && (deliverToCountries as readonly string[]).includes(r)) return r;
    return "Turkey";
  });
  const [deliverToCity, setDeliverToCity] = React.useState("");

  const deliveryCities = React.useMemo(
    () => FULFILLMENT_CITIES_BY_COUNTRY[deliverTo] ?? [],
    [deliverTo]
  );

  React.useEffect(() => {
    const r = region?.trim();
    if (r && (deliverToCountries as readonly string[]).includes(r)) setDeliverTo(r);
  }, [region, deliverToCountries]);

  React.useEffect(() => {
    if (!(deliverToCountries as readonly string[]).includes(deliverTo)) setDeliverTo("Turkey");
  }, [deliverTo, deliverToCountries]);

  React.useEffect(() => {
    if (!deliveryCities.length) {
      setDeliverToCity("");
      return;
    }
    if (deliverToCity && !deliveryCities.includes(deliverToCity)) setDeliverToCity("");
  }, [deliverTo, deliveryCities, deliverToCity]);

  const selectedRegionId = React.useMemo(() => {
    if (region?.trim()) return null;
    return regions?.find((r) => r.name === deliverTo)?.id ?? null;
  }, [deliverTo, region, regions]);

  const { data: regionShippingOverride } = useDeliveryRegionShippingOverride(selectedRegionId);

  const shippingTip = shippingDisplayValue(
    shippingOverride?.shipping_tip || regionShippingOverride?.shipping_tip || appSettings?.shipping_tip
  );
  const shippingMethodName = shippingDisplayValue(
    shippingOverride?.shipping_method_name ||
      regionShippingOverride?.shipping_method_name ||
      appSettings?.shipping_method_name
  );
  const shippingMethodTimeText = shippingDisplayValue(
    shippingOverride?.shipping_method_time_text ||
      regionShippingOverride?.shipping_method_time_text ||
      appSettings?.shipping_method_time_text
  );
  const shippingCostFromText = shippingDisplayValue(
    shippingOverride?.shipping_method_cost_from_text ||
      regionShippingOverride?.shipping_method_cost_from_text ||
      appSettings?.shipping_method_cost_from_text
  );
  const shippingAdditionalItemText = shippingDisplayValue(
    shippingOverride?.shipping_method_additional_item_text ||
      regionShippingOverride?.shipping_method_additional_item_text ||
      appSettings?.shipping_method_additional_item_text
  );
  const productionTimeText = shippingDisplayValue(
    shippingOverride?.production_time_text ||
      regionShippingOverride?.production_time_text ||
      appSettings?.production_time_text
  );
  const shippingTimeText = shippingDisplayValue(
    shippingOverride?.shipping_time_text ||
      regionShippingOverride?.shipping_time_text ||
      appSettings?.shipping_time_text
  );
  const totalFulfillmentTimeText = shippingDisplayValue(
    shippingOverride?.total_fulfillment_time_text ||
      regionShippingOverride?.total_fulfillment_time_text ||
      appSettings?.total_fulfillment_time_text
  );
  const estimatedDeliveryText = shippingDisplayValue(
    shippingOverride?.estimated_delivery_text ||
      regionShippingOverride?.estimated_delivery_text ||
      appSettings?.estimated_delivery_text
  );

  const hasShippingTip = Boolean(shippingTip);
  const hasShippingMethodName = Boolean(shippingMethodName);
  const hasShippingMethodTimeText = Boolean(shippingMethodTimeText);
  const hasShippingCostFromText = Boolean(shippingCostFromText);
  const hasShippingAdditionalItemText = Boolean(shippingAdditionalItemText);
  const hasProductionTimeText = Boolean(productionTimeText);
  const hasShippingTimeText = Boolean(shippingTimeText);
  const hasTotalFulfillmentTimeText = Boolean(totalFulfillmentTimeText);
  const hasEstimatedDeliveryText = Boolean(estimatedDeliveryText);

  const hasAnyShippingData =
    hasShippingTip ||
    hasShippingMethodName ||
    hasShippingMethodTimeText ||
    hasShippingCostFromText ||
    hasShippingAdditionalItemText ||
    hasProductionTimeText ||
    hasShippingTimeText ||
    hasTotalFulfillmentTimeText ||
    hasEstimatedDeliveryText;
  const techniqueOptions = React.useMemo(() => {
    const list = (techniques ?? []).map((t) => t.trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [techniques]);

  const [selectedTechnique, setSelectedTechnique] = React.useState<string>(techniqueOptions[0] ?? "");

  const orderedBlocks = React.useMemo(() => {
    const fallback: ("customization_options" | "unit_price" | "fulfillment" | "shipping")[] = [
      "customization_options",
      "unit_price",
      "fulfillment",
      "shipping",
    ];
    const allowed = new Set(fallback);
    const raw = Array.isArray(blockOrder) ? blockOrder : [];
    const out: typeof fallback = [];
    for (const k of raw) {
      if (typeof k === "string" && allowed.has(k as any) && !out.includes(k as any)) out.push(k as any);
    }
    for (const k of fallback) if (!out.includes(k)) out.push(k);
    return out;
  }, [blockOrder]);

  const visibleBlocks = React.useMemo(() => {
    return orderedBlocks.filter((block) => {
      if (block !== "shipping") return true;
      return hasAnyShippingData;
    });
  }, [orderedBlocks, hasAnyShippingData]);

  const tiersForQuantity = unitPriceTiers?.length ? unitPriceTiers : fallbackUnitPriceTiers;
  const effectiveTier = React.useMemo(
    () => getUnitPriceForQuantity(Math.max(1, quantity), tiersForQuantity),
    [quantity, tiersForQuantity]
  );
  const stickyPriceFormatted = formatUnitPrice(effectiveTier.unitPrice, effectiveTier.currency);

  React.useEffect(() => {
    if (!techniqueOptions.length) return;
    if (!selectedTechnique || !techniqueOptions.includes(selectedTechnique)) {
      setSelectedTechnique(techniqueOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techniqueOptions.join("|")]);

  React.useEffect(() => {
    if (region?.trim()) setDeliverTo(region.trim());
  }, [region]);

  React.useEffect(() => {
    setQuantityInputLocal(null);
  }, [quantity]);

  const placementsList = React.useMemo(() => {
    if (printAreaViews && printAreaViews.length > 0) {
      const technique = selectedTechnique?.trim() ?? "";
      return printAreaViews
        .filter((p) => (p.name ?? "").trim())
        .map((p) => {
          const price =
            (technique && p.pricesByTechnique?.[technique] != null)
              ? String(p.pricesByTechnique[technique]).trim()
              : (p.price != null ? String(p.price).trim() : (p.pricesByTechnique?.[""] != null ? String(p.pricesByTechnique[""]).trim() : ""));
          return { name: (p.name ?? "").trim(), price };
        });
    }
    if (placementOptions && placementOptions.length > 0) {
      return placementOptions.filter((p) => (p.name ?? "").trim());
    }
    return placements.map((p) => ({ name: p.title, price: "" }));
  }, [printAreaViews, placementOptions, selectedTechnique]);

  const [selectedPlacementIndices, setSelectedPlacementIndices] = React.useState<number[]>([]);
  /** Yerel adet input metni; boş bırakılabilir, blur'da 1'e çekilir. */
  const [quantityInputLocal, setQuantityInputLocal] = React.useState<string | null>(null);

  function parsePlacementPrice(s: string): number {
    if (!s || typeof s !== "string") return 0;
    const cleaned = s.replace(",", ".").replace(/[^\d.-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  /** Placement fiyatını ekranda göstermek için $X.XX formatına çevirir (örn. "5" → "$5.00"). */
  function formatPlacementPriceDisplay(priceStr: string | null | undefined): string {
    if (priceStr == null || priceStr === "") return "";
    const s = String(priceStr).trim();
    const n = parsePlacementPrice(s);
    if (Number.isFinite(n)) return formatUnitPrice(n, "USD");
    return s;
  }

  const placementFeePerItem = React.useMemo(() => {
    return selectedPlacementIndices.reduce(
      (sum, i) => sum + parsePlacementPrice(placementsList[i]?.price ?? ""),
      0
    );
  }, [selectedPlacementIndices, placementsList]);

  const effectiveUnitPrice = effectiveTier.unitPrice + placementFeePerItem;

  const addToCartWithCurrentSelections = React.useCallback(() => {
    if (typeof onAddToCart !== "function") return;
    const selectedPlacements = selectedPlacementIndices
      .map((i) => placementsList[i])
      .filter(Boolean)
      .map((p) => ({ name: p.name || "", price: p.price || "" }));
    onAddToCart(placementFeePerItem, effectiveTier.unitPrice, {
      selectedTechnique: selectedTechnique || undefined,
      selectedPlacements: selectedPlacements.length ? selectedPlacements : undefined,
    });
  }, [onAddToCart, placementFeePerItem, effectiveTier.unitPrice, selectedTechnique, selectedPlacementIndices, placementsList]);

  const handleDesignNow = React.useCallback(() => {
    addToCartWithCurrentSelections();
    if (!productId) {
      navigate("/designer");
      return;
    }
    const params = new URLSearchParams({ productId });
    if (designNowViewId) params.set("viewId", designNowViewId);
    if (selectedColorId) params.set("colorId", selectedColorId);
    if (designerBrandSlug) params.set("brandSlug", designerBrandSlug);
    navigate(`/designer?${params.toString()}`);
  }, [navigate, productId, designNowViewId, selectedColorId, designerBrandSlug, addToCartWithCurrentSelections]);

  React.useEffect(() => {
    if (addToCartRef) {
      addToCartRef.current = { addToCartWithCurrentSelections };
      return () => {
        addToCartRef.current = null;
      };
    }
  }, [addToCartRef, addToCartWithCurrentSelections]);

  const initialSize = sizes[0] ?? "M";
  const initialColor = colors[0]?.id ?? "";

  const [selectedSizes, setSelectedSizes] = React.useState<string[]>([initialSize]);
  const [selectedColorIds, setSelectedColorIds] = React.useState<string[]>(initialColor ? [initialColor] : []);

  const effectiveSelectedColorIds = selectedColorId ? [selectedColorId] : selectedColorIds;
  const effectiveSelectedSizes = selectedSize ? [selectedSize] : selectedSizes;

  React.useEffect(() => {
    if (sizes.length > 0 && selectedSizes.length === 0) setSelectedSizes([sizes[0]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes.join("|")]);

  React.useEffect(() => {
    if (colors.length > 0 && selectedColorIds.length === 0) setSelectedColorIds([colors[0].id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.map((c) => c.id).join("|")]);

  React.useEffect(() => {
    if (selectedColorId && !colors.some((c) => c.id === selectedColorId)) {
      onSelectedColorIdChange?.(colors[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.map((c) => c.id).join("|"), selectedColorId]);

  React.useEffect(() => {
    if (selectedSize && !sizes.includes(selectedSize)) {
      onSelectedSizeChange?.(sizes[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes.join("|"), selectedSize]);

  return (
    <section className="ts-container ru-section" aria-label="Product configuration">
      <div className="ru-config-grid">
        <div className="ru-config-col">
          {topSlot ? topSlot : null}

          {colors.length ? (
            <div className="ru-block" aria-label={t("common.color")}>
              <div className="ru-block-head">
                <h2 className="ru-h2">{t("common.color")}</h2>
              </div>

              <div className="ru-color-row" role="list" aria-label={t("product.colors")}>
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={
                      effectiveSelectedColorIds.includes(c.id) ? "ru-color-btn ru-color-btn--active" : "ru-color-btn"
                    }
                    style={{ backgroundColor: c.hex_code || "transparent" }}
                    onClick={() => {
                      if (onSelectedColorIdChange) onSelectedColorIdChange(c.id);
                      else setSelectedColorIds((prev) => toggleSelection(prev, c.id));
                    }}
                    aria-label={`${t("common.color")} ${c.name}`}
                    aria-pressed={effectiveSelectedColorIds.includes(c.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {sizes.length ? (
            <div className="ru-block">
              <div className="ru-block-head">
                <h2 className="ru-h2">{t("common.size")}</h2>
              </div>

              <div className="ru-size-row" role="list" aria-label="Sizes">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={effectiveSelectedSizes.includes(s) ? "ru-size-btn ru-size-btn--active" : "ru-size-btn"}
                    onClick={() => {
                      if (onSelectedSizeChange) onSelectedSizeChange(s);
                      else setSelectedSizes((prev) => toggleSelection(prev, s));
                    }}
                    aria-pressed={effectiveSelectedSizes.includes(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex justify-start">
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen((o) => !o)}
                  className="ru-outline-pill inline-flex items-center gap-1.5 text-sm font-medium"
                  aria-expanded={sizeGuideOpen}
                >
                  {t("common.size")} Guide
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${sizeGuideOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
              </div>

              {sizeGuideOpen ? (
                <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                  {sizeGuideImageUrl ? (
                    <SizeGuideImage
                      src={sizeGuideImageUrl}
                      displaySrc={sizeGuideImgSrc}
                      onSignedUrl={(url) => setSizeGuideImgSrc(url)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No size guide image has been set for this product.</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {visibleBlocks.map((block) => {
            if (block === "unit_price") {
              return (
                <div key={block} className="ru-block">
                  <div className="ru-block-head">
                    <h2 className="ru-h2">{t("cart.quote.unitPrice")}</h2>
                  </div>
                  <UnitPriceTiers
                    tiers={unitPriceTiers?.length ? unitPriceTiers : fallbackUnitPriceTiers}
                    activeIndex={effectiveTier.activeIndex}
                    currency={effectiveTier.currency}
                  />
                </div>
              );
            }

            if (block === "customization_options") {
              return (
                <div key={block} className="ru-block">
                  <div className="ru-block-head">
                    <h2 className="ru-h2">Customization Options</h2>
                  </div>

                  <div className="ru-subblock">
                    <h3 className="ru-h3">Technique</h3>
                    <div className="ru-tech-list" role="list">
                      {(techniqueOptions.length ? techniqueOptions : ["DTG", "DTF"]).map((t) => {
                        const isActive = selectedTechnique ? selectedTechnique === t : t === (techniqueOptions[0] ?? t);
                        const desc =
                          t === "DTG"
                            ? "Direct to Garment (DTG) printing applies eco-friendly, water-based inks directly onto fabric. It is ideal for vibrantly colored designs and intricate graphics. The technique provides a soft feel as the ink is absorbed into the fabric."
                            : t === "DTF"
                            ? "Direct to Film (DTF) printing allows for pre-printed designs to be heat-transferred onto fabrics. It is ideal for complex and photorealistic images. It is not advised for larger designs because the film layer applied is not breathable."
                            : null;

                        return (
                          <button
                            key={t}
                            type="button"
                            className={isActive ? "ru-tech-item ru-tech-item--active" : "ru-tech-item"}
                            onClick={() => setSelectedTechnique(t)}
                            aria-pressed={isActive}
                          >
                            <div className="ru-tech-name">{t}</div>
                            {desc ? <div className="ru-tech-desc">{desc}</div> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ru-subblock">
                    <h3 className="ru-h3">Where would you like your design to appear?</h3>
                    <div className="ru-placement-grid" aria-label="Print placements">
                      {placementsList.map((p, i) => {
                        const isSelected = selectedPlacementIndices.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            className={
                              isSelected ? "ru-placement-card ru-placement-card--active" : "ru-placement-card"
                            }
                            onClick={() => {
                              setSelectedPlacementIndices((prev) =>
                                prev.includes(i) ? prev.filter((idx) => idx !== i) : [...prev, i]
                              );
                            }}
                            aria-pressed={isSelected}
                          >
                            <p className="ru-placement-title">{p.name || "\u00A0"}</p>
                            <p className="ru-placement-meta">
                              <span className="ru-placement-price">
                                {formatPlacementPriceDisplay(p.price ?? stickyPriceFormatted)}
                              </span>
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            if (block === "fulfillment") {
              return (
                <div key={block} className="ru-block" aria-label="Fulfillment">
                  <div className="ru-block-head">
                    <h2 className="ru-h2">Fulfillment</h2>
                  </div>

                  <div className="ru-ful-grid">
                    <div className="ru-ful-row">
                      <p className="ru-ful-q">Where do you want delivery?</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="ru-ful-select" aria-label="Deliver to (country)">
                          <select
                            value={deliverTo}
                            onChange={(e) => setDeliverTo(e.target.value)}
                          >
                            {deliverToCountries.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {deliveryCities.length > 0 ? (
                          <label className="ru-ful-select" aria-label="Deliver to (city)">
                            <select
                              value={deliverToCity}
                              onChange={(e) => setDeliverToCity(e.target.value)}
                            >
                              <option value="">City</option>
                              {deliveryCities.map((city) => (
                                <option key={city} value={city}>
                                  {city}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </div>

                    <div className="ru-ful-row ru-ful-row--stack">
                      <p className="ru-ful-q">Production and shipping address</p>
                      <p className="ru-ful-desc">
                        {fulfillmentFrom?.trim()
                          ? fulfillmentCity?.trim()
                            ? `${fulfillmentCity.trim()}, ${fulfillmentFrom.trim()} — This product is made and shipped to you from this location.`
                            : `${fulfillmentFrom.trim()} — This product is made and shipped to you from this location.`
                          : "This product is made and shipped to you from your selected location."}
                      </p>
                      <button type="button" className="ru-ful-card" disabled aria-disabled>
                        <div className="ru-ful-card-left">
                          <div className="ru-ful-card-title">
                            {fulfillmentFrom?.trim() || "International Fulfillment"}
                          </div>
                          <div className="ru-ful-card-sub">
                            {fulfillmentFrom?.trim()
                              ? fulfillmentCity?.trim()
                                ? `${fulfillmentCity.trim()}, ${fulfillmentFrom.trim()}`
                                : fulfillmentFrom.trim()
                              : "Customized and shipped from an international fulfillment center"}
                          </div>
                        </div>
                        <span className="ru-radio-dot" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // shipping — only show when hasAnyShippingData; hide individual items with no data
            const hasShippingMethodCard =
              hasShippingMethodName ||
              hasShippingMethodTimeText ||
              hasShippingCostFromText ||
              hasShippingAdditionalItemText;
            const hasAnyDeliveryRow =
              hasProductionTimeText ||
              hasShippingTimeText ||
              hasTotalFulfillmentTimeText ||
              hasEstimatedDeliveryText;

            return (
              <div key={block} className="ru-block">
                <div className="ru-block-head">
                    <h2 className="ru-h2">{t("cart.summary.shipping")}</h2>
                </div>

                {hasShippingTip ? <div className="ru-tip">{shippingTip}</div> : null}

                {hasShippingMethodCard ? (
                  <div className="ru-ship-card" aria-label="Shipping method">
                    <div className="ru-ship-row">
                      <div>
                        {hasShippingMethodName ? <p className="ru-ship-name">{shippingMethodName}</p> : null}
                        {hasShippingMethodTimeText ? <p className="ru-muted">{shippingMethodTimeText}</p> : null}
                      </div>
                      <div className="ru-ship-right">
                        {hasShippingCostFromText ? <p className="ru-ship-cost">{shippingCostFromText}</p> : null}
                        {hasShippingAdditionalItemText ? (
                          <p className="ru-muted">{shippingAdditionalItemText}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {hasAnyDeliveryRow ? (
                  <div className="ru-delivery" aria-label="Estimated delivery">
                    {hasProductionTimeText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">Production Time</span>
                        <span className="ru-delivery-val">{productionTimeText}</span>
                      </div>
                    ) : null}
                    {hasShippingTimeText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">Shipping Time</span>
                        <span className="ru-delivery-val">{shippingTimeText}</span>
                      </div>
                    ) : null}
                    {hasTotalFulfillmentTimeText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">Total Fulfilment Time</span>
                        <span className="ru-delivery-val">{totalFulfillmentTimeText}</span>
                      </div>
                    ) : null}
                    {hasEstimatedDeliveryText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">Estimated Delivery</span>
                        <span className="ru-delivery-val">{estimatedDeliveryText}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <aside className="ru-sticky" aria-label="Sticky purchase panel">
          <div className="ru-sticky-head">
            <div className="ru-sticky-thumb-wrap">
              <SignedImage
                src={thumbnailUrl}
                alt={`${productName} thumbnail`}
                className="ru-sticky-thumb h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <p className="ru-sticky-title">{productName}</p>
          </div>
          <div className="ru-sticky-divider" />

          {/* Seçim detayları: renk, beden, teknik, baskı alanları */}
          <div className="ru-sticky-details">
            {colors.length > 0 && (
              <div className="ru-sticky-detail-row">
                <span className="ru-muted">{t("common.color")}</span>
                <span className="ru-sticky-detail-val">
                  {selectedColorId
                    ? colors.find((c) => c.id === selectedColorId)?.name ?? "—"
                    : effectiveSelectedColorIds.length > 0
                      ? effectiveSelectedColorIds
                          .map((id) => colors.find((c) => c.id === id)?.name ?? id)
                          .join(", ") || "—"
                      : "—"}
                </span>
              </div>
            )}
            {sizes.length > 0 && (
              <div className="ru-sticky-detail-row">
                <span className="ru-muted">{t("common.size")}</span>
                <span className="ru-sticky-detail-val">
                  {selectedSize ?? (effectiveSelectedSizes.length > 0 ? effectiveSelectedSizes.join(", ") : "—")}
                </span>
              </div>
            )}
            {techniqueOptions.length > 0 && selectedTechnique && (
              <div className="ru-sticky-detail-row">
                <span className="ru-muted">{t("cart.quote.technique")}</span>
                <span className="ru-sticky-detail-val">{selectedTechnique}</span>
              </div>
            )}
            {placementsList.length > 0 && selectedPlacementIndices.length > 0 && (
              <div className="ru-sticky-detail-row">
                <span className="ru-muted">{t("cart.item.printAreas")}</span>
                <span className="ru-sticky-detail-val">
                  {selectedPlacementIndices
                    .map((i) => placementsList[i]?.name)
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              </div>
            )}
          </div>
          <div className="ru-sticky-divider" />

          <div className="ru-sticky-row">
            <div>
              <p className="ru-sticky-strong">Fulfill Internationally</p>
              <p className="ru-muted">Price per item</p>
            </div>
            <span className="ru-sticky-price">{stickyPriceFormatted}</span>
          </div>

          <div className="ru-sticky-box">
            <div className="ru-sticky-box-row">
              <span>Unit Price</span>
              <span>{formatUnitPrice(effectiveUnitPrice, effectiveTier.currency)}</span>
            </div>
            {placementFeePerItem > 0 ? (
              <div className="ru-sticky-box-row">
                <span>Placement fees</span>
                <span>+{formatUnitPrice(placementFeePerItem, effectiveTier.currency)}</span>
              </div>
            ) : null}
          </div>

          {typeof onQuantityChange === "function" && typeof onAddToCart === "function" ? (
            <>
              <div className="ru-sticky-divider" />
              {maxQuantity === 0 ? (
                <p className="ru-muted text-sm">{t("product.outOfStock")}</p>
              ) : (
                <>
                  <div className="ru-sticky-row">
                    <label className="ru-sticky-strong" htmlFor="sticky-qty">{t("common.quantity")}</label>
                    <input
                      id="sticky-qty"
                      type="text"
                      inputMode="numeric"
                      value={quantityInputLocal !== null ? quantityInputLocal : String(quantity)}
                      onChange={(e) => setQuantityInputLocal(e.target.value)}
                      onBlur={() => {
                        const raw = (quantityInputLocal ?? String(quantity)).trim();
                        const v = raw === "" ? 1 : parseInt(raw, 10);
                        const clamped =
                          maxQuantity != null ? Math.min(Number.isNaN(v) || v < 1 ? 1 : v, maxQuantity) : (Number.isNaN(v) || v < 1 ? 1 : v);
                        onQuantityChange(clamped);
                        setQuantityInputLocal(null);
                      }}
                      className="h-10 w-20 rounded-md border border-input bg-background px-2 text-center text-sm"
                    />
                  </div>
                  {maxQuantity != null && maxQuantity > 0 ? (
                    <p className="ru-muted text-sm">{t("product.stockLimit", { count: maxQuantity })}</p>
                  ) : null}
                  <div className="ru-sticky-box">
                    <div className="ru-sticky-box-row">
                      <span>{t("common.quantity")}</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="ru-sticky-box-row">
                      <span>{t("common.total")}</span>
                      <span>{formatUnitPrice(quantity * effectiveUnitPrice, effectiveTier.currency)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ru-btn-outline w-full"
                    onClick={() => {
                      const selectedPlacements = selectedPlacementIndices
                        .map((i) => placementsList[i])
                        .filter(Boolean)
                        .map((p) => ({ name: p.name || "", price: p.price || "" }));
                      onAddToCart(placementFeePerItem, effectiveTier.unitPrice, {
                        selectedTechnique: selectedTechnique || undefined,
                        selectedPlacements: selectedPlacements.length ? selectedPlacements : undefined,
                      });
                    }}
                    disabled={maxQuantity === 0 || (sizes.length > 0 && effectiveSelectedSizes.length === 0)}
                    title={sizes.length > 0 && effectiveSelectedSizes.length === 0 ? t("product.selectSize") : undefined}
                  >
                    {t("designer.addToCart")}
                  </button>
                </>
              )}
            </>
          ) : null}

          <div className="ru-sticky-actions">
            <button type="button" className="ru-sticky-primary" onClick={handleDesignNow}>
              {t("common.designNow")}
            </button>
            <p className="ru-sticky-note">Shipping costs are calculated at checkout</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

