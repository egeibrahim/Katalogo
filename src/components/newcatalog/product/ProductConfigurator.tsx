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

const placements = [
  { title: "Front" },
  { title: "Back" },
  { title: "Left Sleeve" },
  { title: "Right Sleeve" },
];

const COUNTRY_FLAG_MAP: Record<string, string> = {
  Afghanistan: "AF",
  "Aland Islands": "AX",
  Albania: "AL",
  Algeria: "DZ",
  "American Samoa": "AS",
  Andorra: "AD",
  Angola: "AO",
  Anguilla: "AI",
  Antarctica: "AQ",
  "Antigua and Barbuda": "AG",
  Argentina: "AR",
  Armenia: "AM",
  Aruba: "AW",
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Bahamas: "BS",
  Bahrain: "BH",
  Bangladesh: "BD",
  Barbados: "BB",
  Belarus: "BY",
  Belgium: "BE",
  Belize: "BZ",
  Benin: "BJ",
  Bermuda: "BM",
  Bhutan: "BT",
  Bolivia: "BO",
  "Bonaire, Saint Eustatius and Saba": "BQ",
  "Bosnia and Herzegovina": "BA",
  Botswana: "BW",
  "Bouvet Island": "BV",
  Brazil: "BR",
  "British Indian Ocean Territory": "IO",
  "British Virgin Islands": "VG",
  Brunei: "BN",
  Bulgaria: "BG",
  "Burkina Faso": "BF",
  Burundi: "BI",
  "Cabo Verde": "CV",
  Cambodia: "KH",
  Cameroon: "CM",
  Canada: "CA",
  "Cayman Islands": "KY",
  "Central African Republic": "CF",
  Chad: "TD",
  Chile: "CL",
  China: "CN",
  "Christmas Island": "CX",
  "Cocos Islands": "CC",
  Colombia: "CO",
  Comoros: "KM",
  "Cook Islands": "CK",
  "Costa Rica": "CR",
  Croatia: "HR",
  Cuba: "CU",
  Curacao: "CW",
  Cyprus: "CY",
  Czechia: "CZ",
  "Democratic Republic of the Congo": "CD",
  Denmark: "DK",
  Djibouti: "DJ",
  Dominica: "DM",
  "Dominican Republic": "DO",
  Ecuador: "EC",
  Egypt: "EG",
  "El Salvador": "SV",
  "Equatorial Guinea": "GQ",
  Eritrea: "ER",
  Estonia: "EE",
  Eswatini: "SZ",
  Ethiopia: "ET",
  "Falkland Islands": "FK",
  "Faroe Islands": "FO",
  Fiji: "FJ",
  Finland: "FI",
  France: "FR",
  "French Guiana": "GF",
  "French Polynesia": "PF",
  "French Southern Territories": "TF",
  Gabon: "GA",
  Gambia: "GM",
  Georgia: "GE",
  Germany: "DE",
  Ghana: "GH",
  Gibraltar: "GI",
  Greece: "GR",
  Greenland: "GL",
  Grenada: "GD",
  Guadeloupe: "GP",
  Guam: "GU",
  Guatemala: "GT",
  Guernsey: "GG",
  Guinea: "GN",
  "Guinea-Bissau": "GW",
  Guyana: "GY",
  Haiti: "HT",
  "Heard Island and McDonald Islands": "HM",
  Honduras: "HN",
  "Hong Kong": "HK",
  Hungary: "HU",
  Iceland: "IS",
  India: "IN",
  Indonesia: "ID",
  Iran: "IR",
  Iraq: "IQ",
  Ireland: "IE",
  "Isle of Man": "IM",
  Italy: "IT",
  "Ivory Coast": "CI",
  Jamaica: "JM",
  Japan: "JP",
  Jersey: "JE",
  Jordan: "JO",
  Kazakhstan: "KZ",
  Kenya: "KE",
  Kiribati: "KI",
  Kosovo: "XK",
  Kuwait: "KW",
  Kyrgyzstan: "KG",
  Laos: "LA",
  Latvia: "LV",
  Lebanon: "LB",
  Lesotho: "LS",
  Liberia: "LR",
  Libya: "LY",
  Liechtenstein: "LI",
  Lithuania: "LT",
  Luxembourg: "LU",
  Macao: "MO",
  Madagascar: "MG",
  Malawi: "MW",
  Malaysia: "MY",
  Maldives: "MV",
  Mali: "ML",
  Malta: "MT",
  "Marshall Islands": "MH",
  Martinique: "MQ",
  Mauritania: "MR",
  Mauritius: "MU",
  Mayotte: "YT",
  Mexico: "MX",
  Micronesia: "FM",
  Moldova: "MD",
  Monaco: "MC",
  Mongolia: "MN",
  Montenegro: "ME",
  Montserrat: "MS",
  Morocco: "MA",
  Mozambique: "MZ",
  Myanmar: "MM",
  Namibia: "NA",
  Nauru: "NR",
  Nepal: "NP",
  "Netherlands Antilles": "AN",
  "New Caledonia": "NC",
  "New Zealand": "NZ",
  Nicaragua: "NI",
  Niger: "NE",
  Nigeria: "NG",
  Niue: "NU",
  "Norfolk Island": "NF",
  "North Korea": "KP",
  "North Macedonia": "MK",
  "Northern Mariana Islands": "MP",
  Norway: "NO",
  Oman: "OM",
  Pakistan: "PK",
  Palau: "PW",
  "Palestinian Territory": "PS",
  Panama: "PA",
  "Papua New Guinea": "PG",
  Paraguay: "PY",
  Peru: "PE",
  Philippines: "PH",
  Pitcairn: "PN",
  Poland: "PL",
  Portugal: "PT",
  "Puerto Rico": "PR",
  Qatar: "QA",
  "Republic of the Congo": "CG",
  Reunion: "RE",
  Romania: "RO",
  Russia: "RU",
  Rwanda: "RW",
  "Saint Barthelemy": "BL",
  "Saint Helena": "SH",
  "Saint Kitts and Nevis": "KN",
  "Saint Lucia": "LC",
  "Saint Martin": "MF",
  "Saint Pierre and Miquelon": "PM",
  "Saint Vincent and the Grenadines": "VC",
  Samoa: "WS",
  "San Marino": "SM",
  "Sao Tome and Principe": "ST",
  "Saudi Arabia": "SA",
  Senegal: "SN",
  Serbia: "RS",
  "Serbia and Montenegro": "CS",
  Seychelles: "SC",
  "Sierra Leone": "SL",
  Singapore: "SG",
  "Sint Maarten": "SX",
  Slovakia: "SK",
  Slovenia: "SI",
  "Solomon Islands": "SB",
  Somalia: "SO",
  "South Africa": "ZA",
  "South Georgia and the South Sandwich Islands": "GS",
  "South Korea": "KR",
  "South Sudan": "SS",
  Spain: "ES",
  "Sri Lanka": "LK",
  Sudan: "SD",
  Suriname: "SR",
  "Svalbard and Jan Mayen": "SJ",
  Sweden: "SE",
  Switzerland: "CH",
  Syria: "SY",
  Taiwan: "TW",
  Tajikistan: "TJ",
  Tanzania: "TZ",
  Thailand: "TH",
  "The Netherlands": "NL",
  "Timor Leste": "TL",
  Togo: "TG",
  Tokelau: "TK",
  Tonga: "TO",
  "Trinidad and Tobago": "TT",
  Tunisia: "TN",
  Türkiye: "TR",
  Turkmenistan: "TM",
  "Turks and Caicos Islands": "TC",
  Tuvalu: "TV",
  "U.S. Virgin Islands": "VI",
  Uganda: "UG",
  Ukraine: "UA",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
  "United States Minor Outlying Islands": "UM",
  Uruguay: "UY",
  Uzbekistan: "UZ",
  Vanuatu: "VU",
  Vatican: "VA",
  Venezuela: "VE",
  Vietnam: "VN",
  "Wallis and Futuna": "WF",
  "Western Sahara": "EH",
  Yemen: "YE",
  Zambia: "ZM",
  Zimbabwe: "ZW",
};

function isoCodeToFlag(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) return "";
  const code = isoCode.toUpperCase();
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  const first = A + (code.charCodeAt(0) - a);
  const second = A + (code.charCodeAt(1) - a);
  return String.fromCodePoint(first) + String.fromCodePoint(second);
}

export function getCountryFlag(name: string): string {
  const iso = COUNTRY_FLAG_MAP[name];
  return iso ? isoCodeToFlag(iso) : "";
}

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
  productCurrency = "USD",
  maxQuantity = null,
  topSlot,
  blockOrder,
  sizeGuideImageUrl = null,
  printAreaViews = null,
  placementOptions = null,
  designNowViewId = null,
  designerBrandSlug = null,
  addToCartRef,
  primaryCta = "design_now",
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
    details?: {
      selectedTechnique?: string;
      selectedPlacements?: Array<{ name: string; price: string }>;
      currency?: string;
    }
  ) => void;
  productCurrency?: string;
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
  /** "design_now" = Hemen Tasarla (designer), "request_quote" = Teklif Al (sepete ekle + sepet). */
  primaryCta?: "design_now" | "request_quote";
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
    return "Türkiye";
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
    if (!(deliverToCountries as readonly string[]).includes(deliverTo)) setDeliverTo("Türkiye");
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

  const hasUnitPriceTiers = (unitPriceTiers?.length ?? 0) > 0;
  const tiersForQuantity = React.useMemo(() => (hasUnitPriceTiers ? unitPriceTiers ?? [] : []), [hasUnitPriceTiers, unitPriceTiers]);
  const effectiveTier = React.useMemo(() => {
    if (!hasUnitPriceTiers) return null;
    return getUnitPriceForQuantity(Math.max(1, quantity), tiersForQuantity);
  }, [hasUnitPriceTiers, quantity, tiersForQuantity]);
  const stickyPriceFormatted = effectiveTier ? formatUnitPrice(effectiveTier.unitPrice, effectiveTier.currency) : null;

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
            technique && p.pricesByTechnique?.[technique] != null
              ? String(p.pricesByTechnique[technique]).trim()
              : p.price != null
              ? String(p.price).trim()
              : p.pricesByTechnique?.[""] != null
              ? String(p.pricesByTechnique[""]).trim()
              : "";
          return { name: (p.name ?? "").trim(), price };
        });
    }
    if (placementOptions && placementOptions.length > 0) {
      return placementOptions.filter((p) => (p.name ?? "").trim());
    }
    // Ürün print area tanımlı değilse, sabit varsayılanları gösterme; boş liste döndür.
    return [];
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

  const effectiveUnitPrice = (effectiveTier?.unitPrice ?? 0) + placementFeePerItem;

  const addToCartWithCurrentSelections = React.useCallback(() => {
    if (typeof onAddToCart !== "function") return;
    const selectedPlacements = selectedPlacementIndices
      .map((i) => placementsList[i])
      .filter(Boolean)
      .map((p) => ({ name: p.name || "", price: p.price || "" }));
    onAddToCart(placementFeePerItem, effectiveTier?.unitPrice ?? 0, {
      selectedTechnique: selectedTechnique || undefined,
      selectedPlacements: selectedPlacements.length ? selectedPlacements : undefined,
      currency: productCurrency,
    });
  }, [onAddToCart, placementFeePerItem, effectiveTier?.unitPrice, selectedTechnique, selectedPlacementIndices, placementsList, productCurrency]);

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

  const handleRequestQuote = React.useCallback(() => {
    addToCartWithCurrentSelections();
    navigate("/cart");
  }, [navigate, addToCartWithCurrentSelections]);

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

  const canAdjustQuantity = typeof onQuantityChange === "function";
  const canAddToCart = typeof onAddToCart === "function";
  const quantityInputDisabled = !canAdjustQuantity || maxQuantity === 0;

  const clampQuantity = React.useCallback(
    (value: number) => {
      if (Number.isNaN(value) || value < 1) return 1;
      if (maxQuantity != null) {
        if (maxQuantity < 1) return 1;
        return Math.min(value, maxQuantity);
      }
      return value;
    },
    [maxQuantity],
  );

  const commitQuantityInput = React.useCallback(() => {
    if (!canAdjustQuantity || maxQuantity === 0) {
      setQuantityInputLocal(null);
      return;
    }
    const raw = (quantityInputLocal ?? String(quantity)).trim();
    const parsed = raw === "" ? quantity : parseInt(raw, 10);
    const next = clampQuantity(parsed);
    onQuantityChange?.(next);
    setQuantityInputLocal(null);
  }, [canAdjustQuantity, clampQuantity, maxQuantity, onQuantityChange, quantity, quantityInputLocal]);

  const adjustQuantityBy = React.useCallback(
    (delta: number) => {
      if (!canAdjustQuantity || maxQuantity === 0) return;
      const next = clampQuantity(quantity + delta);
      onQuantityChange?.(next);
      setQuantityInputLocal(null);
    },
    [canAdjustQuantity, clampQuantity, maxQuantity, onQuantityChange, quantity],
  );

  return (
    <section className="ts-container ru-section" aria-label={t("product.configTitle")}>
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

              <div className="ru-size-row" role="list" aria-label={t("product.sizes")}>
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
                  {t("product.sizeGuide")}
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
                    <p className="text-sm text-muted-foreground">{t("product.noSizeGuideImage")}</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {visibleBlocks.map((block) => {
            if (block === "unit_price") {
              if (!hasUnitPriceTiers) return null;
              return (
                <div key={block} className="ru-block">
                  <div className="ru-block-head">
                    <h2 className="ru-h2">{t("cart.quote.unitPrice")}</h2>
                  </div>
                  <UnitPriceTiers
                    tiers={unitPriceTiers ?? []}
                    activeIndex={effectiveTier?.activeIndex ?? 0}
                    currency={effectiveTier?.currency}
                  />
                </div>
              );
            }

            if (block === "customization_options") {
              const hasTechniqueOptions = techniqueOptions.length > 0;
              const hasPlacements = placementsList.length > 0;
              if (!hasTechniqueOptions && !hasPlacements) return null;

              return (
                <div key={block} className="ru-block">
                  <div className="ru-block-head">
                    <h2 className="ru-h2">{t("product.customizationOptions")}</h2>
                  </div>

                  {hasTechniqueOptions ? (
                    <div className="ru-subblock">
                      <h3 className="ru-h3">{t("cart.quote.technique")}</h3>
                      <div className="ru-tech-list" role="list">
                        {techniqueOptions.map((tech) => {
                          const isActive = selectedTechnique ? selectedTechnique === tech : tech === techniqueOptions[0];
                          const desc =
                            tech === "DTG"
                              ? "Direct to Garment (DTG) printing applies eco-friendly, water-based inks directly onto fabric. It is ideal for vibrantly colored designs and intricate graphics. The technique provides a soft feel as the ink is absorbed into the fabric."
                              : tech === "DTF"
                              ? "Direct to Film (DTF) printing allows for pre-printed designs to be heat-transferred onto fabrics. It is ideal for complex and photorealistic images. It is not advised for larger designs because the film layer applied is not breathable."
                              : null;

                          return (
                            <button
                              key={tech}
                              type="button"
                              className={isActive ? "ru-tech-item ru-tech-item--active" : "ru-tech-item"}
                              onClick={() => setSelectedTechnique(tech)}
                              aria-pressed={isActive}
                            >
                              <div className="ru-tech-name">{tech}</div>
                              {desc ? <div className="ru-tech-desc">{desc}</div> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {hasPlacements ? (
                    <div className="ru-subblock">
                      <h3 className="ru-h3">{t("product.designPlacementQuestion")}</h3>
                      <div className="ru-placement-grid" aria-label={t("product.printPlacements")}>
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
                  ) : null}
                </div>
              );
            }

            if (block === "fulfillment") {
              const hasFulfillmentLocation = Boolean(
                (fulfillmentFrom && fulfillmentFrom.trim().length > 0) || (fulfillmentCity && fulfillmentCity.trim().length > 0)
              );
              if (!hasFulfillmentLocation) return null;
              return (
                <div key={block} className="ru-block" aria-label={t("product.fulfillment")}>
                  <div className="ru-block-head">
                    <h2 className="ru-h2">{t("product.fulfillment")}</h2>
                  </div>

                  <div className="ru-ful-grid">
                    <div className="ru-ful-row">
                      <p className="ru-ful-q">{t("product.deliveryQuestion")}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="ru-ful-select" aria-label={t("product.deliverToCountry")}>
                          <select
                            value={deliverTo}
                            onChange={(e) => setDeliverTo(e.target.value)}
                          >
                            {deliverToCountries.map((name) => {
                              const flag = getCountryFlag(name);
                              return (
                                <option key={name} value={name}>
                                  {flag ? `${flag} ${name}` : name}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                        {deliveryCities.length > 0 ? (
                          <label className="ru-ful-select" aria-label={t("product.deliverToCity")}>
                            <select
                              value={deliverToCity}
                              onChange={(e) => setDeliverToCity(e.target.value)}
                            >
                              <option value="">{t("product.city")}</option>
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
                      <p className="ru-ful-q">{t("product.productionShippingAddress")}</p>
                      {(() => {
                        const rawCountry = fulfillmentFrom?.trim() || "";
                        const countryName = rawCountry === "Turkey" ? "Türkiye" : rawCountry;
                        const flag = countryName ? getCountryFlag(countryName) : "";
                        const countryLabel = countryName ? `${flag ? `${flag} ` : ""}${countryName}` : "";

                        return (
                          <>
                            <p className="ru-ful-desc">
                              {countryLabel
                                ? fulfillmentCity?.trim()
                                  ? `${fulfillmentCity.trim()}, ${countryLabel} — ${t("product.madeAndShippedThisLocation")}`
                                  : `${countryLabel} — ${t("product.madeAndShippedThisLocation")}`
                                : t("product.madeAndShippedSelectedLocation")}
                            </p>
                            <button type="button" className="ru-ful-card" disabled aria-disabled>
                              <div className="ru-ful-card-left">
                                <div className="ru-ful-card-title">
                                  {countryLabel || t("product.internationalFulfillment")}
                                </div>
                                <div className="ru-ful-card-sub">
                                  {countryLabel
                                    ? fulfillmentCity?.trim()
                                      ? `${fulfillmentCity.trim()}, ${countryLabel}`
                                      : countryLabel
                                    : t("product.customizedShippedInternational")}
                                </div>
                              </div>
                              <span className="ru-radio-dot" aria-hidden />
                            </button>
                          </>
                        );
                      })()}
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
                  <div className="ru-ship-card" aria-label={t("product.shippingMethod")}>
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
                  <div className="ru-delivery" aria-label={t("product.estimatedDelivery")}>
                    {hasProductionTimeText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">{t("product.productionTime")}</span>
                        <span className="ru-delivery-val">{productionTimeText}</span>
                      </div>
                    ) : null}
                    {hasShippingTimeText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">{t("product.shippingTime")}</span>
                        <span className="ru-delivery-val">{shippingTimeText}</span>
                      </div>
                    ) : null}
                    {hasTotalFulfillmentTimeText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">{t("product.totalFulfillmentTime")}</span>
                        <span className="ru-delivery-val">{totalFulfillmentTimeText}</span>
                      </div>
                    ) : null}
                    {hasEstimatedDeliveryText ? (
                      <div className="ru-delivery-row">
                        <span className="ru-muted">{t("product.estimatedDelivery")}</span>
                        <span className="ru-delivery-val">{estimatedDeliveryText}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <aside className="ru-sticky" aria-label={t("product.stickyPurchasePanel")}>
          <div className="ru-sticky-head">
            <div className="ru-sticky-thumb-wrap">
              <SignedImage
                src={thumbnailUrl}
                alt={t("product.thumbnailAlt", { name: productName })}
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

          {stickyPriceFormatted ? (
            <div className="ru-sticky-row">
              <div>
                <p className="ru-sticky-strong">{t("product.fulfillInternationally")}</p>
                <p className="ru-muted">{t("product.pricePerItem")}</p>
              </div>
              <span className="ru-sticky-price">{stickyPriceFormatted}</span>
            </div>
          ) : null}

          {effectiveTier && (
            <div className="ru-sticky-box">
              <div className="ru-sticky-box-row">
                <span>{t("cart.quote.unitPrice")}</span>
                <span>{formatUnitPrice(effectiveUnitPrice, effectiveTier.currency)}</span>
              </div>
              {placementFeePerItem > 0 ? (
                <div className="ru-sticky-box-row">
                  <span>{t("product.placementFees")}</span>
                  <span>+{formatUnitPrice(placementFeePerItem, effectiveTier.currency)}</span>
                </div>
              ) : null}
            </div>
          )}

          <div className="ru-sticky-row">
            <div>
              <p className="ru-sticky-strong">{t("common.quantity")}</p>
              <p className="ru-muted">{t("product.total")}</p>
            </div>
            <span className="ru-sticky-price">{formatUnitPrice(quantity * effectiveUnitPrice, effectiveTier?.currency ?? productCurrency ?? "USD")}</span>
          </div>

          {canAdjustQuantity ? (
            <>
              <div className="ru-sticky-divider" />
              {maxQuantity === 0 ? (
                <p className="ru-muted text-sm">{t("product.outOfStock")}</p>
              ) : (
                <div className="space-y-2">
                  <div className="ru-sticky-row">
                    <label className="ru-sticky-strong" htmlFor="sticky-qty">
                      {t("common.quantity")}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="ru-qty-btn"
                        onClick={() => adjustQuantityBy(-1)}
                        disabled={quantityInputDisabled || quantity <= 1}
                        aria-label={t("product.decreaseQuantity")}
                      >
                        −
                      </button>
                      <input
                        id="sticky-qty"
                        type="text"
                        inputMode="numeric"
                        disabled={quantityInputDisabled}
                        value={quantityInputLocal !== null ? quantityInputLocal : String(quantity)}
                        onChange={(e) => setQuantityInputLocal(e.target.value)}
                        onBlur={commitQuantityInput}
                        className="h-10 w-20 rounded-md border border-input bg-background px-2 text-center text-sm"
                      />
                      <button
                        type="button"
                        className="ru-qty-btn"
                        onClick={() => adjustQuantityBy(1)}
                        disabled={quantityInputDisabled || (maxQuantity != null && quantity >= maxQuantity)}
                        aria-label={t("product.increaseQuantity")}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {maxQuantity != null && maxQuantity > 0 ? (
                    <p className="ru-muted text-xs">{t("product.stockLimit", { count: maxQuantity })}</p>
                  ) : null}
                  <div className="ru-sticky-box">
                    <div className="ru-sticky-box-row">
                      <span>{t("common.quantity")}</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="ru-sticky-box-row">
                      <span>{t("common.total")}</span>
                      <span>{formatUnitPrice(quantity * effectiveUnitPrice, effectiveTier?.currency ?? productCurrency ?? "USD")}</span>
                    </div>
                  </div>
                </div>
              )}

              {canAddToCart ? (
                <button
                  type="button"
                  className="ru-btn-outline w-full"
                  onClick={() => {
                    const selectedPlacements = selectedPlacementIndices
                      .map((i) => placementsList[i])
                      .filter(Boolean)
                      .map((p) => ({ name: p.name || "", price: p.price || "" }));
                    onAddToCart?.(placementFeePerItem, effectiveTier?.unitPrice ?? 0, {
                      selectedTechnique: selectedTechnique || undefined,
                      selectedPlacements: selectedPlacements.length ? selectedPlacements : undefined,
                      currency: productCurrency,
                    });
                  }}
                  disabled={maxQuantity === 0 || (sizes.length > 0 && effectiveSelectedSizes.length === 0)}
                  title={sizes.length > 0 && effectiveSelectedSizes.length === 0 ? t("product.selectSize") : undefined}
                >
                  {t("designer.addToCart")}
                </button>
              ) : null}
            </>
          ) : null}

          <div className="ru-sticky-actions">
            <button
              type="button"
              className="ru-sticky-primary"
              onClick={primaryCta === "request_quote" ? handleRequestQuote : handleDesignNow}
            >
              {primaryCta === "request_quote" ? t("common.requestQuote") : t("common.designNow")}
            </button>
            <p className="ru-sticky-note">{t("product.shippingCostCalculatedAtCheckout")}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

