import React, { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { upsertProductGalleryImages } from "@/lib/galleryEdgeFunction";
import { slugify } from "@/lib/slug";
import { resolveUniqueProductSlug } from "@/lib/productSlug";
import { getSignedImageUrl, uploadPublicFile, sanitizeStorageFileName } from "@/lib/storage";
import { SUPPORTED_CURRENCIES, normalizeCurrency, type SupportedCurrency } from "@/lib/currency";

import {
  PrelineCard,
  PrelineCardContent,
  PrelineCardHeader,
  PrelineCardTitle,
  PrelineButton,
  PrelineInput,
  PrelineSelect,
} from "@/components/preline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, ImagePlus, Video, Upload } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n/LocaleProvider";

import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { UnitPriceTiersEditor, type UnitPriceTierDraft } from "@/components/admin/UnitPriceTiersEditor";
import { MultiSelectField } from "@/components/admin/MultiSelectField";
import { fetchNewcatalogFilters } from "@/lib/api/newcatalogFilters";
import {
  FULFILLMENT_COUNTRIES,
  getCitiesForCountry,
} from "@/lib/fulfillmentLocations";
import { getCountryFlag } from "@/components/newcatalog/product/ProductConfigurator";
import { ProductEditHeader } from "@/components/admin/ProductEditHeader";
import { ColorPoolPopover } from "@/components/designer/ColorPoolPopover";
import { ProductEditSectionNav } from "@/components/admin/ProductEditSectionNav";
import {
  ProductShippingOverrideFields,
  type ProductShippingOverrideDraft,
} from "@/components/admin/ProductShippingOverrideFields";
import { SignedImage } from "@/components/ui/signed-image";

function formatSizeRange(sizes: string[]) {
  if (sizes.length === 0) return null;
  if (sizes.length === 1) return sizes[0];
  return `${sizes[0]}-${sizes[sizes.length - 1]}`;
}

function pickAttrNumber(data: Record<string, unknown> | undefined, keys: string[]) {
  if (!data) return null;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "number") return String(v);
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

const EMPTY_SHIPPING_OVERRIDE: ProductShippingOverrideDraft = {
  shipping_tip: "",
  shipping_method_name: "",
  shipping_method_time_text: "",
  shipping_method_cost_from_text: "",
  shipping_method_additional_item_text: "",
  production_time_text: "",
  shipping_time_text: "",
  total_fulfillment_time_text: "",
  estimated_delivery_text: "",
};

/** product_gallery_images upsert: sadece bu 4 sütun gönderilir. Tabloda created_at NOT NULL ama DEFAULT now() ile doldurulur. */
type ProductGalleryImageUpsertRow = {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
};

const GENDER_OPTIONS = [
  "Men",
  "Women",
  "Unisex",
  "Kids",
  "Boys",
  "Girls",
  "Baby",
  "Unisex Adult",
  "Unisex Youth",
  "Youth",
  "Toddler",
] as const;

// Filters ile aynı kaynak: Product edit'te Style/Elements seçenekleri boş kalmasın diye attribute + values yoksa oluşturulur.
const ELEMENTS_OPTIONS = [
  "None", "Snow Wash", "Washed", "Frayed", "Pocket", "Elastic Waist", "Drawstring", "Zipper",
  "Patchwork", "Ripped", "Slit", "Pleated", "Button", "Elastic Straps", "Knotted", "Hollow Out", "Asymmetrical",
];
const STYLE_OPTIONS = [
  "Casual", "Street", "Basics", "Preppy", "Sporty", "Vintage", "Sexy", "Elegant", "Cute", "Glamorous", "Business",
];
const SEASON_OPTIONS = ["Spring", "Summer", "Fall", "Winter", "All seasons"];

const schema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  product_code: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  is_active: z.boolean(),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

type Mode = "create" | "edit";

function AdminSizeGuideImageCell({ imageUrl, onRemove }: { imageUrl: string; onRemove: () => void }) {
  const { t } = useI18n();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const displayUrl = signedUrl ?? imageUrl;

  const handleError = () => {
    if (signedUrl) {
      setFailed(true);
      return;
    }
    getSignedImageUrl(imageUrl).then((url) => {
      if (url) setSignedUrl(url);
      else setFailed(true);
    });
  };

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted/50">
      {!failed ? (
        <img
          src={displayUrl}
          alt={t("admin.productEdit.sizeGuideAlt")}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
          onError={handleError}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("admin.productEdit.sizeGuideFailedToLoad")}</div>
      )}
      <div className="absolute bottom-1 right-1">
        <Button type="button" variant="secondary" size="sm" className="h-7 text-xs" onClick={onRemove}>
          {t("common.remove")}
        </Button>
      </div>
    </div>
  );
}

function AdminGalleryImageCell({
  imageUrl,
  isCover,
  onRemove,
}: {
  imageUrl: string;
  isCover: boolean;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const displayUrl = signedUrl ?? imageUrl;

  const handleError = () => {
    if (signedUrl) {
      setFailed(true);
      return;
    }
    getSignedImageUrl(imageUrl).then((url) => {
      if (url) setSignedUrl(url);
      else setFailed(true);
    });
  };

  return (
    <div className="relative aspect-square min-h-[80px] overflow-hidden rounded-lg border bg-muted/50">
      {!failed ? (
        <img
          src={displayUrl}
          alt={t("admin.productEdit.galleryAlt")}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={handleError}
        />
      ) : null}
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center bg-muted/80 text-xs text-muted-foreground">
          {t("admin.productEdit.noImage")}
        </span>
      ) : null}
      {isCover && !failed && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {t("admin.productEdit.coverBadge")}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
          aria-label={t("admin.productEdit.aria.removeFromGallery")}
        >
          <X className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}

function SortableGalleryImageCell({
  id,
  imageUrl,
  isCover,
  onRemove,
}: {
  id: string;
  imageUrl: string;
  isCover: boolean;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-80 z-10" : undefined}>
      <div
        className="relative cursor-grab active:cursor-grabbing touch-none rounded-lg overflow-hidden"
        aria-label={t("admin.productEdit.aria.dragToReorder")}
        {...attributes}
        {...listeners}
      >
        <AdminGalleryImageCell imageUrl={imageUrl} isCover={isCover} onRemove={onRemove} />
      </div>
    </div>
  );
}


export default function AdminProductEdit({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { t, locale } = useI18n();
  const isTr = locale === "tr";

  const isBusinessScope = location.pathname.startsWith("/brand/");
  const productId = mode === "edit" ? id : undefined;
  const [activeSection, setActiveSection] = useState("general");
  const suppressNavigateOnCreateRef = useRef(false);
  /** Toplu galeri yüklemede ürün yokken tek ürün oluşturulur; tüm yüklemeler bu promise'i paylaşır. */
  const galleryCreateProductPromiseRef = useRef<Promise<string> | null>(null);
  /** Create modda toplu galeri yüklerken sıralı sort_order (paralel yüklemeler çakışmasın). */
  const galleryNextSortOrderRef = useRef(0);
  /** Aynı batch'te sadece bir kez navigate edilsin. */
  const galleryHasNavigatedRef = useRef(false);

  useEffect(() => {
    if (productId) {
      galleryCreateProductPromiseRef.current = null;
      galleryNextSortOrderRef.current = 0;
      galleryHasNavigatedRef.current = false;
    }
  }, [productId]);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setHeaderHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    // initial
    setHeaderHeight(el.getBoundingClientRect().height);

    return () => ro.disconnect();
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug,parent_category_id").order("name");
      if (error) throw error;
      return data ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const parentCategories = useMemo(
    () => (categories ?? []).filter((c: any) => !c.parent_category_id),
    [categories]
  );
  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, any[]>();
    (categories ?? []).forEach((c: any) => {
      if (c.parent_category_id) {
        const list = map.get(c.parent_category_id) ?? [];
        list.push(c);
        map.set(c.parent_category_id, list);
      }
    });
    map.forEach((list) => list.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")));
    return map;
  }, [categories]);

  const { data: sizes } = useQuery({
    queryKey: ["admin", "sizes"],
    queryFn: async () => {
      // Product edit uses product_sizes (id-based) for variants, but the canonical list of
      // human-entered sizes lives under /admin/filters -> attribute_values for the "size" attribute.
      // Keep product_sizes in sync by inserting any missing size names found in filters.

      const [{ data: existingSizes, error: sizesErr }, { data: sizeAttrs, error: attrsErr }] = await Promise.all([
        supabase.from("product_sizes").select("id,name,sort_order,is_active").order("sort_order"),
        supabase
          .from("attributes")
          .select("id,key,name")
          // support different conventions: key/name contains size OR legacy key like EU
          .or("key.ilike.%size%,name.ilike.%size%,key.ilike.eu"),
      ]);

      if (sizesErr) throw sizesErr;
      if (attrsErr) throw attrsErr;

      const attrIds = (sizeAttrs ?? []).map((a: any) => a.id).filter(Boolean);

      if (attrIds.length === 0) {
        // No canonical list configured; return all active sizes.
        return ((existingSizes ?? []) as any[]).filter((s) => s.is_active !== false);
      }

      const { data: sizeValues, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at")
        .in("attribute_id", attrIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      const desiredNames = (sizeValues ?? [])
        .map((r: any) => String(r.value ?? "").trim())
        .filter(Boolean);

      // Map existing sizes by lower-case for case-insensitive match.
      const existingByLower = new Map<string, any>();
      for (const s of existingSizes ?? []) {
        const n = String((s as any).name ?? "").trim();
        if (!n) continue;
        existingByLower.set(n.toLowerCase(), s);
      }

      // Desired set + sort order map based on filters list order.
      const desiredLowerSet = new Set(desiredNames.map((n) => n.toLowerCase()));
      const desiredSortByLower = new Map<string, number>();
      let base = 0;
      for (const n of desiredNames) {
        base += 10;
        const lower = n.toLowerCase();
        if (!desiredSortByLower.has(lower)) desiredSortByLower.set(lower, base);
      }

      const inserts: { name: string; sort_order: number; is_active: boolean }[] = [];
      const updates: PromiseLike<any>[] = [];

      // Insert missing + reactivate existing that are in desired list.
      for (const n of desiredNames) {
        const lower = n.toLowerCase();
        const match = existingByLower.get(lower);
        const desiredSort = desiredSortByLower.get(lower) ?? 0;
        if (!match) {
          inserts.push({ name: n, sort_order: desiredSort, is_active: true });
          continue;
        }

        const needActive = (match as any).is_active === false;
        const needSort = Number((match as any).sort_order ?? 0) !== desiredSort;
        const needName = String((match as any).name ?? "").trim() !== n;

        if (needActive || needSort || needName) {
          updates.push(
            supabase
              .from("product_sizes")
              .update({
                ...(needActive ? { is_active: true } : {}),
                ...(needSort ? { sort_order: desiredSort } : {}),
                ...(needName ? { name: n } : {}),
              })
              .eq("id", (match as any).id)
          );
        }
      }

      // Deactivate sizes that are not present in filters anymore.
      for (const s of existingSizes ?? []) {
        const name = String((s as any).name ?? "").trim();
        if (!name) continue;
        const lower = name.toLowerCase();
        if (!desiredLowerSet.has(lower) && (s as any).is_active !== false) {
          updates.push(supabase.from("product_sizes").update({ is_active: false }).eq("id", (s as any).id));
        }
      }

      if (inserts.length > 0) {
        const { error: insertErr } = await supabase.from("product_sizes").insert(inserts);
        if (insertErr) throw insertErr;
      }
      if (updates.length > 0) {
        const results = await Promise.all(updates);
        const firstErr = results.find((r: any) => r?.error)?.error;
        if (firstErr) throw firstErr;
      }

      // Return active sizes only, in canonical order.
      const { data: refreshed, error: refetchErr } = await supabase
        .from("product_sizes")
        .select("id,name,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (refetchErr) throw refetchErr;
      return refreshed ?? [];
    },
    refetchOnWindowFocus: false,
  });

  // Live sync: if Filters/sizes changes while Product/Edit is open, refresh size options automatically.
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data: sizeAttrs, error } = await supabase
        .from("attributes")
        .select("id,key,name")
        .or("key.ilike.%size%,name.ilike.%size%,key.ilike.eu");
      if (error) return;
      const attrIds = (sizeAttrs ?? []).map((a: any) => a.id).filter(Boolean);
      if (attrIds.length === 0) return;

      const filter = `attribute_id=in.(${attrIds.join(",")})`;

      const channel = supabase
        .channel("admin-sizes-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attribute_values", filter },
          () => {
            qc.invalidateQueries({ queryKey: ["admin", "sizes"] });
          }
        )
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [qc]);

  const { data: product } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isBusinessScope || mode !== "edit" || !product || !user?.id) return;
    if ((product as any).owner_user_id !== user.id) {
      navigate("/brand/products", { replace: true });
    }
  }, [isBusinessScope, mode, product, user?.id, navigate]);

  const { data: productAttrs } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "attrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_attributes")
        .select("data")
        .eq("product_id", productId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.data as Record<string, unknown>) ?? {};
    },
    refetchOnWindowFocus: false,
  });

  const { data: newcatalogFilters } = useQuery({
    queryKey: ["newcatalog", "filters"],
    queryFn: async () => {
      const res = await fetchNewcatalogFilters();
      if (!res.success) throw new Error(res.error || "Failed to fetch filters");
      return res.data ?? {};
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const { data: decorationMethodOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "decoration_method"],
    queryFn: async () => {
      // Source of truth for techniques lives in admin filters (attributes/attribute_values).
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .in("key", ["decoration_method", "method"]);
      if (attrsErr) throw attrsErr;

      const attrIds = (attrsRows ?? []).map((r: any) => r.id).filter(Boolean);
      if (attrIds.length === 0) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .in("attribute_id", attrIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const { data: fabricWeightOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "fabric_weight"],
    queryFn: async () => {
      // Source of truth for fabric_weight lives in admin filters (attributes/attribute_values).
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "fabric_weight");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const { data: thicknessOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "thickness"],
    queryFn: async () => {
      // Source of truth for thickness lives in admin filters (attributes/attribute_values).
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "thickness");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const { data: fitOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "fit"],
    queryFn: async () => {
      // Source of truth for fit lives in admin filters (attributes/attribute_values).
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "fit");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // Region and Fulfillment From options come from FULFILLMENT_COUNTRIES (see Delivery Regions multi-select and Fulfillment country select below).
  // No dependency on attributes/attribute_values for region or fulfillment_from.

  // Live sync: keep Fit options updated while Product/Edit is open.
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "fit");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;

      const filter = `attribute_id=eq.${attrId}`;

      const channel = supabase
        .channel("admin-fit-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "fit"] });
        })
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [qc]);

  // Live sync: keep Thickness options updated while Product/Edit is open.
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "thickness");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;

      const filter = `attribute_id=eq.${attrId}`;

      const channel = supabase
        .channel("admin-thickness-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "thickness"] });
        })
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [qc]);

  // Live sync: keep Fabric Weight options updated while Product/Edit is open.
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "fabric_weight");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;

      const filter = `attribute_id=eq.${attrId}`;

      const channel = supabase
        .channel("admin-fabric-weight-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "fabric_weight"] });
        })
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [qc]);

  // necklineOptions query: source of truth is admin filters (attributes/attribute_values).
  const { data: necklineOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "neckline"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "neckline");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // Live sync: keep Neckline options updated while Product/Edit is open.
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "neckline");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;

      const filter = `attribute_id=eq.${attrId}`;

      const channel = supabase
        .channel("admin-neckline-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "neckline"] });
        })
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [qc]);

  // sleeveStyleOptions query: source of truth is admin filters (attributes/attribute_values).
  const { data: sleeveStyleOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "sleeve_style"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "sleeve_style");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // Live sync: keep Sleeve Style options updated while Product/Edit is open.
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "sleeve_style");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;

      const filter = `attribute_id=eq.${attrId}`;

      const channel = supabase
        .channel("admin-sleeve-style-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "sleeve_style"] });
        })
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [qc]);

  // sleeveLengthOptions query: source of truth is admin filters (attributes/attribute_values).
  const { data: sleeveLengthOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "sleeve_length"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "sleeve_length");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "sleeve_length");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;
      const filter = `attribute_id=eq.${attrId}`;
      const channel = supabase
        .channel("admin-sleeve-length-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "sleeve_length"] });
        })
        .subscribe();
      unsub = () => supabase.removeChannel(channel);
    })();
    return () => { if (unsub) unsub(); };
  }, [qc]);

  // elementsOptions query: source of truth is admin filters (attributes/attribute_values).
  const { data: elementsOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "elements"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "elements");
      if (attrsErr) throw attrsErr;
      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];
      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;
      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { data: attrRows } = await supabase.from("attributes").select("id").eq("key", "elements");
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;
      const filter = `attribute_id=eq.${attrId}`;
      const channel = supabase
        .channel("admin-elements-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "elements"] });
        })
        .subscribe();
      unsub = () => supabase.removeChannel(channel);
    })();
    return () => { if (unsub) unsub(); };
  }, [qc]);

  // styleOptions query: source of truth is admin filters (attributes/attribute_values).
  const { data: styleOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "style"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "style");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "style");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;
      const filter = `attribute_id=eq.${attrId}`;
      const channel = supabase
        .channel("admin-style-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "style"] });
        })
        .subscribe();
      unsub = () => supabase.removeChannel(channel);
    })();
    return () => { if (unsub) unsub(); };
  }, [qc]);

  // Product edit açıldığında Style, Elements ve Season attribute'ları yoksa oluştur (Filters sayfası açılmamış olabilir).
  const styleElementsEnsuredRef = useRef(false);
  useEffect(() => {
    if (styleElementsEnsuredRef.current) return;
    styleElementsEnsuredRef.current = true;
    (async () => {
      try {
        for (const { key, name, options } of [
          { key: "elements", name: "Elements", options: ELEMENTS_OPTIONS },
          { key: "style", name: "Style", options: STYLE_OPTIONS },
          { key: "season", name: "Season", options: SEASON_OPTIONS },
        ] as const) {
          const { data: attrRow } = await supabase.from("attributes").select("id").eq("key", key).maybeSingle();
          let attrId = attrRow?.id ?? null;
          if (!attrId) {
            const { data: maxOrd } = await supabase.from("attributes").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
            const sortOrder = ((maxOrd as any)?.sort_order ?? -1) + 1;
            const { data: inserted, error: insErr } = await supabase
              .from("attributes")
              .insert({ name, key, type: "multiselect", sort_order: sortOrder, is_active: true })
              .select("id")
              .single();
            if (insErr || !inserted?.id) continue;
            attrId = inserted.id;
          }
          const { data: existingVals } = await supabase.from("attribute_values").select("value").eq("attribute_id", attrId);
          const existingSet = new Set((existingVals ?? []).map((r: any) => String(r.value ?? "").trim().toLowerCase()));
          const toInsert = options.filter((v) => !existingSet.has(v.toLowerCase()));
          if (toInsert.length === 0) {
            qc.invalidateQueries({ queryKey: ["admin", "attribute_values", key] });
            continue;
          }
          const rows = toInsert.map((value) => ({
            attribute_id: attrId,
            value,
            sort_order: options.indexOf(value),
            is_active: true,
          }));
          await supabase.from("attribute_values").insert(rows);
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", key] });
        }
      } catch {
        styleElementsEnsuredRef.current = false;
      }
    })();
  }, [qc]);

  // seasonOptions query: Filters ile aynı kaynak (attributes/attribute_values).
  const { data: seasonOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "season"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "season");
      if (attrsErr) throw attrsErr;
      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];
      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;
      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // Drinkware & Wall Art attribute options (for category-specific product details).
  const DRINKWARE_WALLART_KEYS = [
    "drinkware_type",
    "drinkware_capacity",
    "drinkware_lid_type",
    "wall_art_type",
    "wall_art_size",
    "wall_art_orientation",
    "wall_art_frame_style",
  ] as const;
  const { data: drinkwareWallArtOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "drinkware_wallart"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .in("key", [...DRINKWARE_WALLART_KEYS]);
      if (attrsErr) throw attrsErr;
      const out: Record<string, { label: string; value: string }[]> = {};
      for (const key of DRINKWARE_WALLART_KEYS) out[key] = [];
      for (const row of attrsRows ?? []) {
        const attrId = (row as any).id;
        const key = (row as any).key;
        const { data: values, error: valuesErr } = await supabase
          .from("attribute_values")
          .select("value,sort_order,is_active")
          .eq("attribute_id", attrId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (!valuesErr && values?.length)
          out[key] = (values as any[])
            .map((v: any) => String(v.value ?? "").trim())
            .filter(Boolean)
            .map((v) => ({ label: v, value: v }));
      }
      return out;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const ACCESSORIES_HOME_LIVING_KEYS = [
    "accessory_bag_type",
    "accessory_hat_type",
    "accessory_phone_model",
    "accessory_sock_type",
    "pillow_type",
    "pillow_size",
    "blanket_type",
    "blanket_size",
    "candle_type",
  ] as const;
  const { data: accessoriesHomeLivingOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "accessories_home_living"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .in("key", [...ACCESSORIES_HOME_LIVING_KEYS]);
      if (attrsErr) throw attrsErr;
      const out: Record<string, { label: string; value: string }[]> = {};
      for (const key of ACCESSORIES_HOME_LIVING_KEYS) out[key] = [];
      for (const row of attrsRows ?? []) {
        const attrId = (row as any).id;
        const key = (row as any).key;
        const { data: values, error: valuesErr } = await supabase
          .from("attribute_values")
          .select("value,sort_order,is_active")
          .eq("attribute_id", attrId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (!valuesErr && values?.length)
          out[key] = (values as any[])
            .map((v: any) => String(v.value ?? "").trim())
            .filter(Boolean)
            .map((v) => ({ label: v, value: v }));
      }
      return out;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // materialOptions query: source of truth is admin filters (attributes/attribute_values).
  const { data: materialOptions } = useQuery({
    queryKey: ["admin", "attribute_values", "material"],
    queryFn: async () => {
      const { data: attrsRows, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .eq("key", "material");
      if (attrsErr) throw attrsErr;

      const attrId = (attrsRows ?? [])?.[0]?.id;
      if (!attrId) return [] as { label: string; value: string }[];

      const { data: values, error: valuesErr } = await supabase
        .from("attribute_values")
        .select("value,sort_order,created_at,is_active")
        .eq("attribute_id", attrId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (valuesErr) throw valuesErr;

      return (values ?? [])
        .map((v: any) => String(v.value ?? "").trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // Live sync: keep Material options updated while Product/Edit is open.
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data: attrRows, error } = await supabase
        .from("attributes")
        .select("id")
        .eq("key", "material");
      if (error) return;
      const attrId = (attrRows ?? [])?.[0]?.id;
      if (!attrId) return;

      const filter = `attribute_id=eq.${attrId}`;

      const channel = supabase
        .channel("admin-material-options-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "attribute_values", filter }, () => {
          qc.invalidateQueries({ queryKey: ["admin", "attribute_values", "material"] });
        })
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [qc]);

  const getFilterOptions = (label: string) => {
    const key = Object.keys(newcatalogFilters ?? {}).find((k) => k.toLowerCase() === label.toLowerCase());
    const values = key ? (newcatalogFilters?.[key] ?? []) : [];
    return (values as string[]).map((v) => ({ label: v, value: v }));
  };

  const getFilterOptionsAny = (labels: string[]) => {
    for (const label of labels) {
      const opts = getFilterOptions(label);
      if (opts.length > 0) return opts;
    }
    return [] as { label: string; value: string }[];
  };

  const { data: mockups } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "mockups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_mockups")
        .select("*")
        .eq("product_id", productId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const { data: gallery } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_gallery_images")
        .select("id,image_url,sort_order")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [galleryOrder, setGalleryOrder] = useState<{ id: string; image_url: string; sort_order: number }[]>([]);
  const galleryOrderRef = useRef<{ id: string; image_url: string; sort_order: number }[]>([]);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const printAreaViewFileInputRef = useRef<HTMLInputElement>(null);
  const printAreaViewUploadViewIdRef = useRef<string | null>(null);
  useEffect(() => {
    galleryOrderRef.current = galleryOrder;
  }, [galleryOrder]);
  useEffect(() => {
    setGalleryOrder((gallery as { id: string; image_url: string; sort_order: number }[] | undefined) ?? []);
  }, [gallery]);

  const { data: unitPriceRows } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "unitPriceTiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_unit_price_tiers")
        .select("id,min_qty,max_qty,unit_price,currency,sort_order")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true })
        .order("min_qty", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const { data: selectedColorIds } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "colorVariants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_color_variants")
        .select("color_id")
        .eq("product_id", productId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.color_id));
    },
    refetchOnWindowFocus: false,
  });

  const { data: selectedSizeIds } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "sizeVariants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_size_variants")
        .select("size_id")
        .eq("product_id", productId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.size_id));
    },
    refetchOnWindowFocus: false,
  });

  const [form, setForm] = useState<z.infer<typeof schema>>({
    name: "",
    product_code: "",
    category_id: null,
    is_active: false,
    currency: "USD",
  });
  const [description, setDescription] = useState<string>("");
  const [attrs, setAttrs] = useState<Record<string, unknown>>({});
  const [unitPriceTiers, setUnitPriceTiers] = useState<UnitPriceTierDraft[]>([]);

  const currentCategory = useMemo(
    () => (categories ?? []).find((c: any) => c.id === form.category_id),
    [categories, form.category_id]
  );
  const selectedCategory = currentCategory;
  const selectedParentId = useMemo(() => {
    if (!selectedCategory) return null;
    return selectedCategory.parent_category_id ?? selectedCategory.id;
  }, [selectedCategory]);
  const subcategoryOptionsForParent = useMemo(() => {
    if (!selectedParentId) return [];
    const subs = subcategoriesByParent.get(selectedParentId) ?? [];
    return [
      { value: selectedParentId, label: t("admin.productEdit.mainCategoryOption") },
      ...subs.map((c: any) => ({ value: c.id, label: c.name })),
    ];
  }, [selectedParentId, subcategoriesByParent, t]);
  const currentCategorySlug = currentCategory?.slug ?? null;
  const currentCategoryName = (currentCategory?.name ?? "").toLowerCase();
  const parentCategory = useMemo(() => {
    if (!currentCategory?.parent_category_id) return null;
    return (categories ?? []).find((c: any) => c.id === currentCategory.parent_category_id) ?? null;
  }, [categories, currentCategory]);
  const parentSlug = (parentCategory?.slug ?? "").toLowerCase();
  const parentName = (parentCategory?.name ?? "").toLowerCase();
  const slugForBranch = (parentCategory ? parentSlug : (currentCategorySlug ?? "").toLowerCase()) || (currentCategorySlug ?? "").toLowerCase();
  const nameForBranch = (parentCategory ? parentName : currentCategoryName) || currentCategoryName;

  const isDrinkwareCategory = useMemo(() => {
    const s = slugForBranch || (currentCategorySlug ?? "").toLowerCase();
    const n = nameForBranch || currentCategoryName;
    const cs = (currentCategorySlug ?? "").toLowerCase();
    const cn = currentCategoryName;
    const match = (sl: string, na: string) =>
      sl.includes("drinkware") || sl.includes("kupa") || sl.includes("bardak") || sl.includes("termos") ||
      sl.includes("cups") || sl.includes("mugs") || sl.includes("thermos") || sl.includes("tumbler") || sl.includes("bottle") ||
      na.includes("drinkware") || na.includes("kupa") || na.includes("bardak") || na.includes("termos") ||
      na.includes("cup") || na.includes("mug") || na.includes("thermos") || na.includes("tumbler") || na.includes("bottle");
    return match(s, n) || match(cs, cn);
  }, [slugForBranch, nameForBranch, currentCategorySlug, currentCategoryName]);

  const isWallArtCategory = useMemo(() => {
    const s = slugForBranch || (currentCategorySlug ?? "").toLowerCase();
    const n = nameForBranch || currentCategoryName;
    const cs = (currentCategorySlug ?? "").toLowerCase();
    const cn = currentCategoryName;
    const match = (sl: string, na: string) =>
      sl.includes("wall-art") || sl.includes("wall_art") || sl.includes("wallart") || sl.includes("poster") || sl.includes("prints") || sl.includes("canvas") ||
      na.includes("wall art") || na.includes("poster") || na.includes("print") || na.includes("canvas");
    return match(s, n) || match(cs, cn);
  }, [slugForBranch, nameForBranch, currentCategorySlug, currentCategoryName]);

  const isAccessoriesCategory = useMemo(() => {
    const s = slugForBranch || (currentCategorySlug ?? "").toLowerCase();
    const n = nameForBranch || currentCategoryName;
    const cs = (currentCategorySlug ?? "").toLowerCase();
    const cn = currentCategoryName;
    const match = (sl: string, na: string) =>
      sl === "accessories" || sl.includes("tote") || sl.includes("hats") || sl.includes("caps") || sl.includes("phone") || sl.includes("socks") ||
      na.includes("accessories") || na.includes("tote") || na.includes("bag") || na.includes("hat") || na.includes("cap") || na.includes("phone") || na.includes("sock");
    return match(s, n) || match(cs, cn);
  }, [slugForBranch, nameForBranch, currentCategorySlug, currentCategoryName]);

  const isToteBagsCategory = useMemo(() => {
    const s = (currentCategorySlug ?? "").toLowerCase();
    const n = currentCategoryName;
    return s.includes("tote") || s.includes("bag") || n.includes("tote") || n.includes("bag");
  }, [currentCategorySlug, currentCategoryName]);

  const isHatsCapsCategory = useMemo(() => {
    const s = (currentCategorySlug ?? "").toLowerCase();
    const n = currentCategoryName;
    return s.includes("hat") || s.includes("cap") || n.includes("hat") || n.includes("cap");
  }, [currentCategorySlug, currentCategoryName]);

  const isPhoneCasesCategory = useMemo(() => {
    const s = (currentCategorySlug ?? "").toLowerCase();
    const n = currentCategoryName;
    return s.includes("phone") || n.includes("phone case");
  }, [currentCategorySlug, currentCategoryName]);

  const isSocksCategory = useMemo(() => {
    const s = (currentCategorySlug ?? "").toLowerCase();
    const n = currentCategoryName;
    return s.includes("sock") || n.includes("sock");
  }, [currentCategorySlug, currentCategoryName]);

  const isPillowsCategory = useMemo(() => {
    const s = (currentCategorySlug ?? "").toLowerCase();
    const n = currentCategoryName;
    return s.includes("pillow") || n.includes("pillow");
  }, [currentCategorySlug, currentCategoryName]);

  const isBlanketsCategory = useMemo(() => {
    const s = (currentCategorySlug ?? "").toLowerCase();
    const n = currentCategoryName;
    return s.includes("blanket") || n.includes("blanket");
  }, [currentCategorySlug, currentCategoryName]);

  const isCandlesCategory = useMemo(() => {
    const s = (currentCategorySlug ?? "").toLowerCase();
    const n = currentCategoryName;
    return s.includes("candle") || n.includes("candle");
  }, [currentCategorySlug, currentCategoryName]);

  const { data: shippingOverrideRow } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "shippingOverrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_shipping_overrides")
        .select(
          "product_id,shipping_tip,shipping_method_name,shipping_method_time_text,shipping_method_cost_from_text,shipping_method_additional_item_text,production_time_text,shipping_time_text,total_fulfillment_time_text,estimated_delivery_text"
        )
        .eq("product_id", productId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    refetchOnWindowFocus: false,
  });

  const { data: productViewsRows = [], refetch: refetchProductViews } = useQuery({
    enabled: Boolean(productId),
    queryKey: ["admin", "product", productId, "product_views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_views")
        .select("id, view_name, view_order, mockup_image_url")
        .eq("product_id", productId!)
        .order("view_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; view_name: string; view_order: number; mockup_image_url: string | null }[];
    },
    refetchOnWindowFocus: false,
  });

  const [variantColors, setVariantColors] = useState<Set<string>>(new Set());
  const [variantSizes, setVariantSizes] = useState<Set<string>>(new Set());

  const toggleSetValue = (prev: Set<string>, id: string) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const [mockupState, setMockupState] = useState({
    front_image_url: "" as string | null,
    back_image_url: "" as string | null,
    side_image_url: "" as string | null,
    print_area_x: null as number | null,
    print_area_y: null as number | null,
    print_area_width: null as number | null,
    print_area_height: null as number | null,
    export_resolution: null as number | null,
  });

  const [shippingOverride, setShippingOverride] = useState<ProductShippingOverrideDraft>(EMPTY_SHIPPING_OVERRIDE);
  const [uploadProgress, setUploadProgress] = useState<{ kind: "gallery" | "video"; percent: number } | null>(null);

  // Sync server data → form only once per product (initial load). Prevents tab switch / refetch from resetting edits.
  const initialSyncDoneRef = useRef<{
    form?: boolean;
    attrs?: boolean;
    unitPrice?: boolean;
    shipping?: boolean;
    colors?: boolean;
    sizes?: boolean;
    mockups?: boolean;
  }>({});
  useEffect(() => {
    initialSyncDoneRef.current = {};
  }, [productId]);

  useEffect(() => {
    if (!product || !productId) return;
    if (initialSyncDoneRef.current.form) return;
    initialSyncDoneRef.current.form = true;
    setForm({
      name: product.name ?? "",
      product_code: (product as any).product_code ?? "",
      category_id: (product as any).category_id ?? null,
      is_active: Boolean(product.is_active),
      currency: normalizeCurrency((product as any).currency),
    });
    setDescription(product.description ?? "");
  }, [product, productId]);

  useEffect(() => {
    if (!productAttrs || !productId) return;
    if (initialSyncDoneRef.current.attrs) return;
    initialSyncDoneRef.current.attrs = true;
    setAttrs(productAttrs);
  }, [productAttrs, productId]);

  useEffect(() => {
    if (!unitPriceRows || !productId) return;
    if (initialSyncDoneRef.current.unitPrice) return;
    initialSyncDoneRef.current.unitPrice = true;
    setUnitPriceTiers(
      (unitPriceRows as any[]).map((r, idx) => ({
        id: r.id,
        min_qty: Number(r.min_qty ?? 1),
        max_qty: r.max_qty == null ? null : Number(r.max_qty),
        unit_price: Number(r.unit_price ?? 0),
        currency: String(r.currency ?? "USD").toUpperCase(),
        sort_order: Number(r.sort_order ?? idx),
      }))
    );
  }, [unitPriceRows, productId]);

  useEffect(() => {
    if (!productId) return;
    if (shippingOverrideRow === undefined) return;
    if (initialSyncDoneRef.current.shipping) return;
    initialSyncDoneRef.current.shipping = true;
    if (!shippingOverrideRow) {
      setShippingOverride(EMPTY_SHIPPING_OVERRIDE);
      return;
    }
    setShippingOverride({
      shipping_tip: shippingOverrideRow.shipping_tip ?? "",
      shipping_method_name: shippingOverrideRow.shipping_method_name ?? "",
      shipping_method_time_text: shippingOverrideRow.shipping_method_time_text ?? "",
      shipping_method_cost_from_text: shippingOverrideRow.shipping_method_cost_from_text ?? "",
      shipping_method_additional_item_text: shippingOverrideRow.shipping_method_additional_item_text ?? "",
      production_time_text: shippingOverrideRow.production_time_text ?? "",
      shipping_time_text: shippingOverrideRow.shipping_time_text ?? "",
      total_fulfillment_time_text: shippingOverrideRow.total_fulfillment_time_text ?? "",
      estimated_delivery_text: shippingOverrideRow.estimated_delivery_text ?? "",
    });
  }, [shippingOverrideRow, productId]);

  useEffect(() => {
    if (!selectedColorIds || !productId) return;
    if (initialSyncDoneRef.current.colors) return;
    initialSyncDoneRef.current.colors = true;
    setVariantColors(new Set(selectedColorIds));
  }, [selectedColorIds, productId]);

  useEffect(() => {
    if (!selectedSizeIds || !productId) return;
    if (initialSyncDoneRef.current.sizes) return;
    initialSyncDoneRef.current.sizes = true;
    setVariantSizes(new Set(selectedSizeIds));
  }, [selectedSizeIds, productId]);

  const variantColorIdsKey = useMemo(() => Array.from(variantColors).sort().join(","), [variantColors]);

  useEffect(() => {
    const list = Array.isArray((attrs as any).print_area_views) ? (attrs as any).print_area_views : [];
    if (list.length === 0) return;
    const allowed = new Set(Array.from(variantColors).map((id) => String(id)));
    let changed = false;
    const next = list.map((view: any) => {
      if (!Array.isArray(view?.color_ids) || view.color_ids.length === 0) {
        if (allowed.size === 0 && Array.isArray(view?.color_ids) && view.color_ids.length > 0) {
          changed = true;
          return { ...view, color_ids: [] };
        }
        return view;
      }
      const filtered = view.color_ids.filter((cid: unknown) => allowed.has(String(cid)));
      if (filtered.length === view.color_ids.length) {
        if (allowed.size === 0 && filtered.length > 0) {
          changed = true;
          return { ...view, color_ids: [] };
        }
        return view;
      }
      changed = true;
      return { ...view, color_ids: filtered };
    });
    if (changed) {
      setAttrs((prev) => ({ ...prev, print_area_views: next }));
    }
  }, [variantColorIdsKey, attrs, variantColors]);

  useEffect(() => {
    if (!mockups || !productId) return;
    if (initialSyncDoneRef.current.mockups) return;
    initialSyncDoneRef.current.mockups = true;
    setMockupState({
      front_image_url: (mockups as any).front_image_url ?? "",
      back_image_url: (mockups as any).back_image_url ?? "",
      side_image_url: (mockups as any).side_image_url ?? "",
      print_area_x: (mockups as any).print_area_x ?? null,
      print_area_y: (mockups as any).print_area_y ?? null,
      print_area_width: (mockups as any).print_area_width ?? null,
      print_area_height: (mockups as any).print_area_height ?? null,
      export_resolution: (mockups as any).export_resolution ?? null,
    });
  }, [mockups, productId]);

  const derivedSlug = useMemo(() => slugify(form.name || ""), [form.name]);

  const categoryName = useMemo(() => {
    const cid = form.category_id;
    if (!cid) return null;
    const match = (categories ?? []).find((c: any) => c.id === cid);
    return match?.name ?? null;
  }, [categories, form.category_id]);

  const selectedSizeNames = useMemo(() => {
    const selected = variantSizes;
    const list = (sizes ?? []) as any[];
    const picked = list.filter((s) => selected.has(s.id));
    const sorted = picked
      .slice()
      .sort((a, b) => (Number(a.sort_order) ?? 0) - (Number(b.sort_order) ?? 0) || String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { numeric: true }));
    return sorted.map((s) => String(s.name));
  }, [sizes, variantSizes]);

  const sizeRange = useMemo(() => formatSizeRange(selectedSizeNames), [selectedSizeNames]);
  const colorCount = useMemo(() => variantColors.size, [variantColors]);

  const selectedColorIdsArray = useMemo(() => Array.from(variantColors), [variantColors]);
  const selectedColorIdsKey = useMemo(() => selectedColorIdsArray.slice().sort().join(","), [selectedColorIdsArray]);

  const { data: selectedColorRows } = useQuery({
    enabled: selectedColorIdsArray.length > 0,
    queryKey: ["admin", "product", productId, "selectedColors", selectedColorIdsKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_colors")
        .select("id,name,hex_code,sort_order")
        .in("id", selectedColorIdsArray)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; hex_code: string; sort_order: number | null }[];
    },
    refetchOnWindowFocus: false,
  });

  const gsm = useMemo(
    () => pickAttrNumber(attrs as any, ["gsm", "fabric_gsm", "fabric_weight_gsm", "weight_gsm"]),
    [attrs]
  );
  const oz = useMemo(
    () => pickAttrNumber(attrs as any, ["oz", "fabric_oz", "fabric_weight_oz", "weight_oz"]),
    [attrs]
  );

  const printAreaViewsNormalized = useMemo(() => {
    const raw = (attrs as any).print_area_views;
    const techniqueList = Array.isArray((attrs as any).decoration_method) ? ((attrs as any).decoration_method as string[]) : [];
    const priceKeys = techniqueList.length > 0 ? techniqueList : [""];
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 10).map((x: any) => {
      const legacyPrice = typeof x?.price === "string" ? x.price : x?.price != null ? String(x.price) : "";
      const byTech = (x?.pricesByTechnique && typeof x.pricesByTechnique === "object") ? { ...x.pricesByTechnique } : {};
      const pricesByTechnique: Record<string, string> = {};
      for (const t of priceKeys) {
        pricesByTechnique[t] = byTech[t] ?? legacyPrice ?? "";
      }
      const colorIds = Array.isArray(x?.color_ids) ? x.color_ids.filter((id: unknown) => typeof id === "string") : [];
      return {
        name: typeof x?.name === "string" ? x.name : "",
        pricesByTechnique,
        color_ids: colorIds as string[],
      };
    });
  }, [attrs]);

  const printAreaTechniqueLabels = useMemo(() => {
    const techniqueList = Array.isArray((attrs as any).decoration_method) ? (attrs as any).decoration_method as string[] : [];
    if (techniqueList.length === 0) return ["Fee"];
    return techniqueList.map((t) => {
      const opt = decorationMethodOptions?.find((o: { value: string }) => o.value === t);
      return opt?.label ?? t;
    });
  }, [attrs, decorationMethodOptions]);

  const ensureProductInPrimaryCatalog = React.useCallback(
    async (productId: string) => {
      if (!isBusinessScope || !userId || !productId) return;

      const { data: firstCatalog, error: firstCatalogErr } = await supabase
        .from("catalogs")
        .select("id")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstCatalogErr) throw firstCatalogErr;

      let catalogId = firstCatalog?.id ?? null;
      if (!catalogId) {
        const base = slugify((user?.email ?? "katalogum").split("@")[0] || "katalogum");
        const slug = `${base || "katalogum"}-${Date.now().toString().slice(-6)}`;
        const { data: createdCatalog, error: createCatalogErr } = await supabase
          .from("catalogs")
          .insert({
            owner_user_id: userId,
            name: "Katalogum",
            slug,
            contact_email: user?.email ?? "info@example.com",
            is_public: false,
          })
          .select("id")
          .single();
        if (createCatalogErr || !createdCatalog?.id) throw createCatalogErr ?? new Error("Catalog create failed");
        catalogId = createdCatalog.id;
      }

      const { data: existingLink } = await supabase
        .from("catalog_products")
        .select("id")
        .eq("catalog_id", catalogId)
        .eq("product_id", productId)
        .maybeSingle();
      if (existingLink) return;

      const { count } = await supabase
        .from("catalog_products")
        .select("id", { count: "exact", head: true })
        .eq("catalog_id", catalogId);

      const { error: linkErr } = await supabase.from("catalog_products").insert({
        catalog_id: catalogId,
        product_id: productId,
        sort_order: count ?? 0,
      });
      if (linkErr) throw linkErr;
    },
    [isBusinessScope, userId, user?.email]
  );

  const saveMutation = useMutation({
    mutationFn: async (orderAtSave: { id: string; image_url: string; sort_order: number }[] | void) => {
      const parsed = schema.parse(form);
      const currentOrder = (Array.isArray(orderAtSave) ? orderAtSave : galleryOrderRef.current) ?? [];
      const firstImageUrl =
        (form as any).cover_image_url ||
        (currentOrder.length > 0 ? currentOrder[0].image_url : null);

      // 1) Upsert product — price_from = ilk tier fiyatı (liste/fallback için)
      const firstTierPrice =
        unitPriceTiers.length > 0
          ? (unitPriceTiers.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.unit_price ?? null)
          : null;
      const resolvedSlug = await resolveUniqueProductSlug(
        derivedSlug || null,
        mode === "edit" ? productId : null
      );
      const productPayload: any = {
        name: parsed.name,
        description,
        product_code: parsed.product_code || null,
        category_id: parsed.category_id || null,
        price_from: firstTierPrice != null ? Number(firstTierPrice) : null,
        is_active: parsed.is_active,
        currency: parsed.currency,
        slug: resolvedSlug,
        meta_title: null,
        meta_description: null,
        cover_image_url: firstImageUrl,
        thumbnail_url: firstImageUrl,
      };
      const payloadWithOwner = { ...productPayload, owner_user_id: isBusinessScope ? (user?.id ?? null) : null };

      let pid = productId;

      if (mode === "create") {
        let { data, error } = await supabase.from("products").insert(payloadWithOwner).select("id").single();
        if (error && (String(error.message || "").includes("owner_user_id") || String(error.message || "").includes("schema cache"))) {
          const res = await supabase.from("products").insert(productPayload).select("id").single();
          error = res.error;
          data = res.data;
        }
        if (error) throw error;
        pid = data!.id;
      } else {
        let { error } = await supabase.from("products").update(payloadWithOwner).eq("id", pid!);
        if (error && (String(error.message || "").includes("owner_user_id") || String(error.message || "").includes("schema cache"))) {
          error = (await supabase.from("products").update(productPayload).eq("id", pid!)).error;
        }
        if (error) throw error;
      }

      await ensureProductInPrimaryCatalog(pid!);

      if (pid && currentOrder.length > 0) {
        const productIdForGallery = String(pid);
        const rows: ProductGalleryImageUpsertRow[] = currentOrder
          .map((row, index) => {
            if (!row?.id || !row?.image_url) return null;
            return {
              id: String(row.id),
              product_id: productIdForGallery,
              image_url: String(row.image_url),
              sort_order: index,
            } satisfies ProductGalleryImageUpsertRow;
          })
          .filter((r): r is ProductGalleryImageUpsertRow => r != null && Boolean(r.product_id));
        if (rows.length > 0) {
          const { error: fnErr } = await upsertProductGalleryImages(rows);
          if (fnErr) throw new Error(t("admin.productEdit.toast.galleryOrderSaveFailed") + ": " + fnErr);
        }
      }

      // 2) Attributes JSONB (Tapstitch-like)
      // Sync selected size & color names into attrs so catalog filters can read them
      const sizeList = (sizes ?? []) as any[];
      const selectedSizeNamesForAttrs = sizeList
        .filter((s) => variantSizes.has(s.id))
        .sort((a, b) => (Number(a.sort_order) ?? 0) - (Number(b.sort_order) ?? 0))
        .map((s) => String(s.name));

      const colorRows = (selectedColorRows ?? []) as { id: string; name: string }[];
      const selectedColorNamesForAttrs = colorRows
        .filter((c) => variantColors.has(c.id))
        .map((c) => String(c.name));

      const attrsSynced = {
        ...attrs,
        size: selectedSizeNamesForAttrs.length > 0 ? selectedSizeNamesForAttrs : null,
        color: selectedColorNamesForAttrs.length > 0 ? selectedColorNamesForAttrs : null,
      };

      const { error: attrsErr } = await supabase
        .from("product_attributes")
        .upsert([{ product_id: pid!, data: attrsSynced as any }], { onConflict: "product_id" });
      if (attrsErr) throw attrsErr;

      // 2.5) Print Area → product_views senkronu: Mockup altındaki görünüm isimleri Print Area'dan gelir
      const printAreaViews = Array.isArray((attrs as any).print_area_views) ? (attrs as any).print_area_views as Array<{ name?: string }> : [];
      const { data: existingViews } = await supabase
        .from("product_views")
        .select("id, view_order")
        .eq("product_id", pid!)
        .order("view_order", { ascending: true });
      const existing = (existingViews ?? []) as { id: string; view_order: number }[];
      const defaultArea = { top: 30, left: 30, width: 40, height: 40 };
      for (let i = 0; i < printAreaViews.length; i++) {
        const name = (printAreaViews[i]?.name ?? "").trim() || `View ${i + 1}`;
        const existingRow = existing[i];
        if (existingRow) {
          await supabase
            .from("product_views")
            .update({ view_name: name, view_order: i })
            .eq("id", existingRow.id);
        } else {
          await supabase.from("product_views").insert({
            product_id: pid!,
            view_name: name,
            view_order: i,
            design_area_top: defaultArea.top,
            design_area_left: defaultArea.left,
            design_area_width: defaultArea.width,
            design_area_height: defaultArea.height,
            mockup_image_url: null,
          });
        }
      }
      if (existing.length > printAreaViews.length) {
        const toDelete = existing.slice(printAreaViews.length).map((r) => r.id);
        if (toDelete.length > 0) {
          await supabase.from("product_views").delete().in("id", toDelete);
        }
      }

      // 3) Mockups
      const { error: mockErr } = await supabase
        .from("product_mockups")
        .upsert(
          [{
            product_id: pid!,
            ...mockupState,
          }],
          { onConflict: "product_id" },
        );
      if (mockErr) throw mockErr;

      // 4) Variants: sizes/colors (replace)
      await supabase.from("product_size_variants").delete().eq("product_id", pid!);
      if (variantSizes.size > 0) {
        const { error } = await supabase
          .from("product_size_variants")
          .insert(Array.from(variantSizes).map((size_id) => ({ product_id: pid!, size_id })));
        if (error) throw error;
      }

      await supabase.from("product_color_variants").delete().eq("product_id", pid!);
      if (variantColors.size > 0) {
        const { error } = await supabase
          .from("product_color_variants")
          .insert(Array.from(variantColors).map((color_id) => ({ product_id: pid!, color_id })));
        if (error) throw error;
      }

      // 5) Unit price tiers (replace)
      await supabase.from("product_unit_price_tiers").delete().eq("product_id", pid!);
      if (unitPriceTiers.length > 0) {
        const payload = unitPriceTiers
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t, i) => ({
            product_id: pid!,
            min_qty: Math.max(1, Number(t.min_qty) || 1),
            max_qty: t.max_qty == null || t.max_qty === ("" as any) ? null : Math.max(Number(t.max_qty), Number(t.min_qty) || 1),
            unit_price: Math.max(0, Number(t.unit_price) || 0),
            currency: (t.currency || "USD").toUpperCase(),
            sort_order: i,
          }));

        const { error } = await supabase.from("product_unit_price_tiers").insert(payload as any);
        if (error) throw error;
      }

      // 6) Shipping overrides (upsert if any field is set; otherwise delete override row)
      const hasAnyShippingOverride = Object.values(shippingOverride).some((v) => (v ?? "").trim().length > 0);
      if (hasAnyShippingOverride) {
        const { error } = await supabase
          .from("product_shipping_overrides")
          .upsert([{ product_id: pid!, ...shippingOverride }], { onConflict: "product_id" });
        if (error) throw error;
      } else {
        await supabase.from("product_shipping_overrides").delete().eq("product_id", pid!);
      }

      return pid!;
    },
    onSuccess: (pid) => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid], exact: true });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "attrs"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "mockups"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "product_views"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "gallery"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "colorVariants"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "sizeVariants"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "unitPriceTiers"] });
      qc.invalidateQueries({ queryKey: ["admin", "product", pid, "shippingOverrides"] });
      toast.success("Kaydedildi.");
      if (!suppressNavigateOnCreateRef.current) {
        navigate(isBusinessScope ? "/brand/products" : "/admin/products");
      }
      if (isBusinessScope) qc.invalidateQueries({ queryKey: ["business", "products", user?.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.productEdit.toast.saveFailed")),
  });

  const handleUpload = async (file: File, kind: "front" | "back" | "side" | "cover" | "gallery" | "video" | "size_guide") => {
    const safeName = sanitizeStorageFileName(file.name);
    const pid = productId ?? "new";
    const path = `products/${pid}/${kind}/${Date.now()}-${safeName}`;
    const showProgress = kind === "gallery" || kind === "video";
    if (showProgress) setUploadProgress({ kind, percent: 0 });
    try {
      const url = await uploadPublicFile({
        bucket: "product-mockups",
        path,
        file,
        ...(showProgress && {
          onProgress: (percent) => setUploadProgress((p) => (p ? { ...p, percent } : null)),
        }),
      });

      if (kind === "front") setMockupState((s) => ({ ...s, front_image_url: url }));
      if (kind === "back") setMockupState((s) => ({ ...s, back_image_url: url }));
      if (kind === "side") setMockupState((s) => ({ ...s, side_image_url: url }));

      if (kind === "cover") setForm((f) => ({ ...f, ...( { cover_image_url: url } as any) }));

      if (kind === "gallery") {
        let pidForGallery = productId;
        let createdNow = false;
        if (!pidForGallery) {
          let createPromise = galleryCreateProductPromiseRef.current;
          if (!createPromise) {
            createPromise = saveMutation.mutateAsync();
            galleryCreateProductPromiseRef.current = createPromise;
          }
          try {
            suppressNavigateOnCreateRef.current = true;
            pidForGallery = await createPromise;
            createdNow = true;
          } finally {
            suppressNavigateOnCreateRef.current = false;
          }
        }

        const nextSort = productId != null ? (gallery?.length ?? 0) + 1 : galleryNextSortOrderRef.current++;
        const { error } = await supabase
          .from("product_gallery_images")
          .insert({ product_id: pidForGallery, image_url: url, sort_order: nextSort });
        if (error) throw error;
        await qc.refetchQueries({ queryKey: ["admin", "product", pidForGallery, "gallery"] });
        if (createdNow && !galleryHasNavigatedRef.current) {
          galleryHasNavigatedRef.current = true;
          navigate(`/admin/products/${pidForGallery}`);
        }
        toast.success(t("admin.productEdit.toast.imageAdded"));
      }

      if (kind === "video") {
        setAttrs((a) => ({ ...a, video_url: url }));
        toast.success(t("admin.productEdit.toast.videoUploaded"));
      }

      if (kind === "size_guide") {
        setAttrs((a) => ({ ...a, size_guide_image: url }));
        toast.success(t("admin.productEdit.toast.sizeGuideUploaded"));
      }
    } finally {
      if (showProgress) setUploadProgress(null);
    }
  };

  const handleRemoveGalleryImage = async (galleryImageId: string) => {
    if (!productId) return;
    const { error } = await supabase.from("product_gallery_images").delete().eq("id", galleryImageId);
    if (error) {
      toast.error(error.message ?? t("admin.productEdit.toast.couldNotRemoveImage"));
      return;
    }
    await qc.refetchQueries({ queryKey: ["admin", "product", productId, "gallery"] });
    toast.success(t("admin.productEdit.toast.imageRemovedFromGallery"));
  };

  const handleGalleryReorder = async (
    reordered: { id: string; image_url: string; sort_order: number }[],
    previousOrder: { id: string; image_url: string; sort_order: number }[]
  ) => {
    if (!productId) return;
    setGalleryOrder(reordered);
    galleryOrderRef.current = reordered;
    const productIdForGallery = String(productId);
    const rows: ProductGalleryImageUpsertRow[] = reordered
      .filter((item) => item?.id && item?.image_url)
      .map((item, index) => ({
        id: String(item.id),
        product_id: productIdForGallery,
        image_url: String(item.image_url),
        sort_order: index,
      } satisfies ProductGalleryImageUpsertRow));
    const { error: fnErr } = await upsertProductGalleryImages(rows);
    if (fnErr) {
      setGalleryOrder(previousOrder);
      galleryOrderRef.current = previousOrder;
      toast.error(t("admin.productEdit.toast.galleryOrderSaveFailed") + ": " + fnErr);
      return;
    }
    qc.setQueryData(["admin", "product", productId, "gallery"], reordered);
    toast.success(t("admin.productEdit.toast.galleryOrderUpdated"));
  };

  const gallerySensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const sectionItems = useMemo(
    () => [
      { id: "general", label: t("admin.productEdit.section.general") },
      { id: "customize", label: t("admin.productEdit.section.customize") },
      { id: "unit_price", label: t("admin.productEdit.section.price") },
      { id: "customization_options", label: t("admin.productEdit.section.customization") },
      { id: "product_details", label: t("admin.productEdit.section.details") },
      { id: "fulfillment", label: t("admin.productEdit.section.fulfillment") },
      { id: "shipping", label: t("admin.productEdit.section.shipping") },
    ],
    [t]
  );

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full min-w-0 px-3 pb-3 pt-0 md:px-4 md:pb-4 md:pt-0">
      {/* Galeri upload: input layout dışında, tıklanınca sayfa bozulmasın */}
      <input
        ref={galleryFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
        aria-label={t("admin.productEdit.aria.uploadGallery")}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach((f) =>
            handleUpload(f, "gallery").catch((err) => toast.error(err?.message ?? t("admin.productEdit.toast.uploadFailed")))
          );
          e.target.value = "";
        }}
      />
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
        aria-label={t("admin.productEdit.aria.uploadVideo")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!productId) {
            toast.error(t("admin.productEdit.toast.saveFirst"));
            return;
          }
          handleUpload(file, "video").catch((err) => toast.error(err?.message ?? t("admin.productEdit.toast.uploadFailed")));
          e.target.value = "";
        }}
      />
      {/* Print Area view mockup upload: input layout dışında, sadece Upload butonu ile tetiklenir */}
      <input
        ref={printAreaViewFileInputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
        aria-hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const viewId = printAreaViewUploadViewIdRef.current;
          e.target.value = "";
          printAreaViewUploadViewIdRef.current = null;
          if (!file || !viewId) return;
          try {
            const safeName = sanitizeStorageFileName(file.name);
            const ext = safeName.includes(".") ? safeName.split(".").pop() : "png";
            const filePath = `mockups/${Date.now()}-${viewId}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("product-mockups")
              .upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from("product-mockups").getPublicUrl(filePath);
            const { error: updateError } = await supabase
              .from("product_views")
              .update({ mockup_image_url: publicUrl })
              .eq("id", viewId);
            if (updateError) throw updateError;
            await refetchProductViews();
            toast.success(t("admin.productEdit.toast.viewMockupUploaded"));
          } catch (err: any) {
            toast.error(err?.message || t("admin.productEdit.toast.uploadFailed"));
          }
        }}
      />
      <div ref={headerRef} className="sticky top-0 z-30 bg-background">
        <ProductEditHeader
          breadcrumb={
            <div className="flex flex-wrap items-center gap-1.5">
              <span>{t("admin.products")}</span>
              <span aria-hidden className="opacity-60">
                /
              </span>
              <span className="truncate">{categoryName ?? t("admin.productEdit.uncategorized")}</span>
            </div>
          }
          title={mode === "create" ? t("admin.productEdit.newTitle") : form.name || product?.name || t("admin.productEdit.editTitle")}
          statusControl={
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs">
              <span className="text-xs text-muted-foreground">{t("admin.productEdit.status")}</span>
              <span className="text-xs text-muted-foreground">{t("admin.productEdit.draft")}</span>
              <div className="scale-90 origin-center">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                />
              </div>
              <span className="text-xs">{t("admin.productEdit.published")}</span>
            </div>
          }
          meta={
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground" aria-label={t("admin.productEdit.aria.productMeta")}>
              {sizeRange ? (
                <>
                  <span>{sizeRange}</span>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                </>
              ) : null}
              {colorCount ? (
                <>
                  <span>{t("admin.productEdit.meta.colorCount", { count: String(colorCount) })}</span>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                </>
              ) : null}
              {gsm ? (
                <>
                  <span>{gsm} gsm</span>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                </>
              ) : null}
              {oz ? <span>{oz} oz</span> : null}
            </div>
          }
          onBack={() => navigate(isBusinessScope ? "/brand/products" : "/admin/products")}
          onSave={() => saveMutation.mutate([...galleryOrder])}
          saving={saveMutation.isPending}
        />
      </div>

      <PrelineCard className="w-full min-w-0">
        <PrelineCardContent className="w-full min-w-0 px-4 pt-4 pb-6 sm:px-6">
          {form.category_id ? (
          <ProductEditSectionNav
            items={sectionItems}
            activeId={activeSection}
            onSelect={scrollToSection}
            topOffsetPx={headerHeight}
          />
          ) : null}

          <section id="general" className="mt-2 scroll-mt-32">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 text-base font-semibold text-gray-800">{t("admin.productEdit.section.general")}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <PrelineInput
                  label={t("admin.productEdit.productName")}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <PrelineInput
                  label={t("admin.productEdit.productCode")}
                  value={form.product_code ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value }))}
                />
                <PrelineSelect
                  label={t("admin.productEdit.currency")}
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currency: normalizeCurrency(e.target.value) as SupportedCurrency,
                    }))
                  }
                  options={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }))}
                />
                <PrelineSelect
                  label={t("admin.productEdit.mainCategory")}
                  value={selectedParentId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    if (!v) {
                      setForm((f) => ({ ...f, category_id: null }));
                      return;
                    }
                    const main = parentCategories.find((c: any) => c.id === v);
                    const subs = subcategoriesByParent.get(v);
                    if (main && (!subs || subs.length === 0)) {
                      setForm((f) => ({ ...f, category_id: main.id }));
                    } else {
                      setForm((f) => ({ ...f, category_id: v }));
                    }
                  }}
                  placeholder={t("admin.productEdit.mainCategoryPlaceholder")}
                  options={parentCategories.map((c: any) => ({ value: c.id, label: c.name }))}
                />
                <PrelineSelect
                  label={t("admin.productEdit.subCategory")}
                  value={form.category_id ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
                  placeholder={
                    selectedParentId ? t("admin.productEdit.subCategoryPlaceholderOptional") : t("admin.productEdit.selectMainCategoryFirst")
                  }
                  options={subcategoryOptionsForParent}
                  disabled={!selectedParentId}
                />
              </div>
              {form.category_id ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("admin.productEdit.categoryHint")}
                </p>
              ) : mode === "create" ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-800">
                  {t("admin.productEdit.selectCategoryToContinue")}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {!isDrinkwareCategory && !isWallArtCategory && !isAccessoriesCategory && !isPillowsCategory && !isBlanketsCategory && !isCandlesCategory && (
                <PrelineSelect
                  label={t("admin.productEdit.gender")}
                  value={typeof (attrs as any).gender === "string" ? ((attrs as any).gender as string) : ""}
                  onChange={(e) => setAttrs((a) => ({ ...a, gender: e.target.value || null }))}
                  placeholder={t("admin.productEdit.genderPlaceholder")}
                  options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))}
                />
                )}
                <div className="space-y-1 max-w-sm">
                  <PrelineSelect
                    label={t("admin.productEdit.stock")}
                    value={
                      (attrs as any).stock_mode === "quantity" || (attrs as any).stock_mode === "out_of_stock" || (attrs as any).stock_mode === "in_stock"
                        ? String((attrs as any).stock_mode)
                        : "in_stock"
                    }
                    onChange={(e) => setAttrs((a) => ({ ...a, stock_mode: e.target.value as "quantity" | "in_stock" | "out_of_stock" }))}
                    wrapperClassName="max-w-sm"
                    options={[
                      { value: "in_stock", label: t("admin.productEdit.stockIn") },
                      { value: "out_of_stock", label: t("admin.productEdit.stockOut") },
                      { value: "quantity", label: t("admin.productEdit.stockQuantityMode") },
                    ]}
                  />
                  {(attrs as any).stock_mode === "quantity" ? (
                    <div className="pt-1">
                      <PrelineInput
                        label={t("admin.productEdit.stockQuantity")}
                        type="text"
                        inputMode="numeric"
                        wrapperClassName="max-w-xs"
                        value={
                          typeof (attrs as any).stock_quantity === "number"
                            ? String((attrs as any).stock_quantity)
                            : (attrs as any).stock_quantity != null && (attrs as any).stock_quantity !== ""
                              ? String((attrs as any).stock_quantity)
                              : ""
                        }
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === "") {
                            setAttrs((a) => ({ ...a, stock_quantity: null }));
                            return;
                          }
                          const n = parseInt(raw, 10);
                          setAttrs((a) => ({
                            ...a,
                            stock_quantity: Number.isNaN(n) || n < 0 ? 0 : n,
                          }));
                        }}
                        placeholder="0"
                      />
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2 max-w-sm">
                  <Label>{t("admin.productEdit.primaryCta")}</Label>
                  <Select
                    value={(attrs as any).primary_cta === "request_quote" ? "request_quote" : "design_now"}
                    onValueChange={(v) => setAttrs((a) => ({ ...a, primary_cta: v as "design_now" | "request_quote" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design_now">{t("admin.productEdit.primaryCtaDesignNow")}</SelectItem>
                      <SelectItem value="request_quote">{t("admin.productEdit.primaryCtaRequestQuote")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.productEdit.primaryCtaHint")}
                  </p>
                </div>
              </div>
          </section>

          {form.category_id ? (
          <>
          <section id="customize" className="mt-6 w-full min-w-0 scroll-mt-32">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 text-base font-semibold text-foreground">{t("admin.productEdit.section.customize")}</h2>
              <div className="w-full space-y-5">
                <div>
                  <CardHeader className="px-0 pb-2 pt-0">
                    <CardTitle className="text-sm font-medium">
                      {isDrinkwareCategory || isWallArtCategory || isAccessoriesCategory || isPillowsCategory || isBlanketsCategory || isCandlesCategory
                        ? t("common.color")
                        : t("admin.productEdit.colorAndSize")}
                    </CardTitle>
                  </CardHeader>

                  <div className={`grid gap-3 ${isDrinkwareCategory || isWallArtCategory || isAccessoriesCategory || isPillowsCategory || isBlanketsCategory || isCandlesCategory ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
                    <div className="rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{t("admin.productEdit.colorVariants")}</p>
                          <p className="text-xs text-muted-foreground">{t("admin.productEdit.selectedCount", { count: String(variantColors.size) })}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ColorPoolPopover
                            mode="multi"
                            selectedColorIds={Array.from(variantColors)}
                            onColorToggle={(colorId, _hex) => setVariantColors((s) => toggleSetValue(s, colorId))}
                          />
                          <button
                            type="button"
                            className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                            disabled={variantColors.size === 0}
                            onClick={() => setVariantColors(new Set())}
                          >
                            {t("admin.productEdit.clear")}
                          </button>
                        </div>
                      </div>

                      {variantColors.size > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <TooltipProvider delayDuration={200}>
                            {(selectedColorRows ?? []).slice(0, 50).map((c) => (
                              <Tooltip key={c.id}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="group relative h-7 w-7 shrink-0 rounded-full border transition-colors hover:border-foreground/50"
                                    style={{ backgroundColor: c.hex_code }}
                                    onClick={() => setVariantColors((s) => toggleSetValue(s, c.id))}
                                    aria-label={t("admin.productEdit.aria.removeColor", { name: c.name, hex: c.hex_code })}
                                  >
                                    <span
                                      className="absolute inset-0 grid place-items-center rounded-full bg-background/75 opacity-0 transition-opacity group-hover:opacity-100"
                                      aria-hidden
                                    >
                                      <X className="h-3.5 w-3.5 text-foreground" />
                                    </span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p className="font-medium leading-none">{c.name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground leading-none">{c.hex_code}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </TooltipProvider>
                          {variantColors.size > 50 ? (
                            <span className="text-xs text-muted-foreground">{t("admin.productEdit.moreCount", { count: String(variantColors.size - 50) })}</span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("admin.productEdit.colorPoolHint")}
                        </p>
                      )}
                    </div>

                    {!isDrinkwareCategory && !isWallArtCategory && !isAccessoriesCategory && !isPillowsCategory && !isBlanketsCategory && !isCandlesCategory && (
                    <div className="rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{t("admin.productEdit.sizeVariants")}</p>
                          <p className="text-xs text-muted-foreground">{t("admin.productEdit.selectedCount", { count: String(variantSizes.size) })}</p>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                          disabled={variantSizes.size === 0}
                          onClick={() => setVariantSizes(new Set())}
                        >
                          {t("admin.productEdit.clear")}
                        </button>
                      </div>

                      <div className="mt-2">
                        <MultiSelectField
                          label={t("admin.productEdit.sizeLabel")}
                          value={(sizes ?? []).filter((s: any) => variantSizes.has(s.id)).map((s: any) => String(s.id))}
                          options={(sizes ?? []).map((s: any) => ({ label: String(s.name), value: String(s.id) }))}
                          placeholder={t("admin.productEdit.sizePlaceholder")}
                          onChange={(next) => setVariantSizes(new Set(next))}
                          searchable
                          hideLabel
                          className="[&>button]:mt-0"
                        />
                      </div>
                    </div>
                    )}
                  </div>
                </div>

                <div className="w-full space-y-5">
                  <div className="w-full min-w-0">
                    <CardHeader className="px-0 pb-2 pt-0">
                      <CardTitle className="text-sm font-medium">{t("admin.productEdit.productImagesTitle")}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.productEdit.productImagesHint")}
                      </p>
                      {uploadProgress?.kind === "gallery" && (
                        <p className="text-sm font-medium text-primary mt-1" aria-live="polite">
                          {t("admin.productEdit.loadingPercent", { percent: String(uploadProgress.percent) })}
                        </p>
                      )}
                    </CardHeader>
                    <div className="mt-4 w-full min-w-0 overflow-hidden">
                      <DndContext
                        sensors={gallerySensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e: DragEndEvent) => {
                          const { active, over } = e;
                          if (!over || active.id === over.id || !galleryOrder.length) return;
                          const oldIndex = galleryOrder.findIndex((g) => g.id === active.id);
                          const newIndex = galleryOrder.findIndex((g) => g.id === over.id);
                          if (oldIndex === -1 || newIndex === -1) return;
                          const reordered = arrayMove(galleryOrder, oldIndex, newIndex);
                          handleGalleryReorder(reordered, galleryOrder);
                        }}
                      >
                        <SortableContext items={galleryOrder.map((g) => g.id)} strategy={rectSortingStrategy}>
                          <div className="w-full min-w-0">
                          {galleryOrder.length === 0 ? (
                            <label className="flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 py-12 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="sr-only"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files ?? []);
                                  files.forEach((f) => handleUpload(f, "gallery").catch((err) => toast.error(err?.message ?? t("admin.productEdit.toast.uploadFailed"))));
                                  e.target.value = "";
                                }}
                              />
                              <ImagePlus className="mb-2 h-10 w-10 text-muted-foreground" aria-hidden />
                              <span className="text-sm font-medium text-muted-foreground">{t("admin.productEdit.galleryUploadHint")}</span>
                              <span className="mt-1 text-xs text-muted-foreground">{t("admin.productEdit.galleryUploadMultiple")}</span>
                            </label>
                          ) : (
                          <div className="grid w-full min-w-0 grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                            {(() => {
                              const videoUrl = (attrs as any).video_url as string | undefined;
                              const hasVideo = Boolean(videoUrl);
                              const displayList: Array<{ type: "image"; data: { id: string; image_url: string; sort_order: number }; index: number } | { type: "video" }> = hasVideo
                                ? [
                                    ...galleryOrder.slice(0, 2).map((g, i) => ({ type: "image" as const, data: g, index: i })),
                                    { type: "video" as const },
                                    ...galleryOrder.slice(2).map((g, i) => ({ type: "image" as const, data: g, index: i + 2 })),
                                  ]
                                : galleryOrder.map((g, i) => ({ type: "image" as const, data: g, index: i }));
                              return (
                                <>
                                  {displayList.map((item, i) =>
                                    item.type === "video" ? (
                                      <div key="product-video-slot" className="relative min-w-0 overflow-hidden rounded-lg border bg-muted/50 [aspect-ratio:1/1]">
                                        <video
                                          src={videoUrl}
                                          autoPlay
                                          muted
                                          loop
                                          playsInline
                                          className="h-full w-full object-cover"
                                        />
                                        <div className="absolute bottom-1 right-1">
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => setAttrs((a) => ({ ...a, video_url: undefined }))}
                                          >
                                            {t("common.remove")}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <SortableGalleryImageCell
                                        key={item.data.id}
                                        id={item.data.id}
                                        imageUrl={item.data.image_url}
                                        isCover={item.index === 0}
                                        onRemove={() => handleRemoveGalleryImage(item.data.id)}
                                      />
                                    )
                                  )}
                                  <div className="min-w-0 overflow-hidden [aspect-ratio:1/1]">
                                    <button
                                      type="button"
                                      onClick={() => galleryFileInputRef.current?.click()}
                                      className="flex h-full min-h-0 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                      <ImagePlus className="mb-1 h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
                                      <span className="text-xs font-medium text-muted-foreground">{t("admin.productEdit.upload")}</span>
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          )}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("admin.productEdit.mockupHint")}
                    </p>
                  </div>

                  <div>
                    <CardHeader className="px-0 pb-2 pt-0">
                      <CardTitle className="text-sm font-medium">{t("admin.productEdit.sizeGuideTitle")}</CardTitle>
                      <p className="text-xs text-muted-foreground">{t("admin.productEdit.sizeGuideHint")}</p>
                    </CardHeader>
                    <div className="mt-4">
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 max-w-xs">
                        {(attrs as any).size_guide_image ? (
                          <AdminSizeGuideImageCell
                            imageUrl={(attrs as any).size_guide_image}
                            onRemove={() => setAttrs((a) => ({ ...a, size_guide_image: undefined }))}
                          />
                        ) : (
                          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50">
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleUpload(file, "size_guide").catch((err) => toast.error(err?.message ?? t("admin.productEdit.toast.uploadFailed")));
                                e.target.value = "";
                              }}
                            />
                            <ImagePlus className="mb-1 h-6 w-6 text-muted-foreground" aria-hidden />
                            <span className="text-xs font-medium text-muted-foreground">{t("admin.productEdit.uploadOneImage")}</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <CardHeader className="px-0 pb-2 pt-0">
                      <CardTitle className="text-sm font-medium">{t("admin.productEdit.videoTitle")}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.productEdit.videoHint")}
                      </p>
                      {uploadProgress?.kind === "video" && (
                        <p className="text-sm font-medium text-primary mt-1" aria-live="polite">
                          {t("admin.productEdit.loadingPercent", { percent: String(uploadProgress.percent) })}
                        </p>
                      )}
                    </CardHeader>
                    <div className="mt-4">
                      <div className="max-w-xs">
                        {(attrs as any).video_url ? (
                          <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted/50">
                            <video
                              src={(attrs as any).video_url}
                              controls
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setAttrs((a) => ({ ...a, video_url: undefined }))}
                              >
                                {t("common.remove")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => videoFileInputRef.current?.click()}
                            className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <Video className="mb-1 h-8 w-8 shrink-0 text-muted-foreground" aria-hidden />
                            <span className="text-xs font-medium text-muted-foreground">{t("admin.productEdit.uploadVideo")}</span>
                            <span className="mt-0.5 text-xs text-muted-foreground">{t("admin.productEdit.videoPlaysThird")}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mockups upload (front/back/side) removed per request */}
              </div>
          </section>

          <section id="unit_price" className="mt-6 scroll-mt-32">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 text-base font-semibold text-foreground">{t("admin.productEdit.section.price")}</h2>
            <div className="space-y-3">
              <UnitPriceTiersEditor value={unitPriceTiers} onChange={setUnitPriceTiers} currency={form.currency} />
            </div>
          </section>

          <section id="customization_options" className="mt-6 scroll-mt-32">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 text-base font-semibold text-foreground">{t("admin.productEdit.section.customization")}</h2>
              <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0 mb-6">
                <MultiSelectField
                  label={t("admin.productEdit.decorationMethod")}
                  value={Array.isArray((attrs as any).decoration_method)
                    ? ((attrs as any).decoration_method as string[])
                    : typeof (attrs as any).decoration_method === "string" && (attrs as any).decoration_method
                      ? [String((attrs as any).decoration_method)]
                      : []}
                  options={
                    decorationMethodOptions?.length
                      ? decorationMethodOptions
                      : getFilterOptionsAny(["Technique", "Techniques", "Decoration Method", "Method"])
                  }
                  allowCustom
                  onChange={(next) => setAttrs((a) => ({ ...a, decoration_method: next }))}
                />

                <MultiSelectField
                  label={t("admin.productEdit.deliveryRegions")}
                  value={Array.isArray((attrs as any).region)
                    ? ((attrs as any).region as string[])
                    : typeof (attrs as any).region === "string" && (attrs as any).region
                      ? [String((attrs as any).region)]
                      : []}
                  options={[
                    { label: t("admin.productEdit.allCountries"), value: "ALL_COUNTRIES" },
                    ...FULFILLMENT_COUNTRIES.filter((c) => c !== "Other").map((c) => ({ label: c, value: c })),
                  ]}
                  allowCustom={false}
                  onChange={(next) => setAttrs((a) => ({ ...a, region: next }))}
                />

                <div className="space-y-2">
                  <Label>{t("admin.productEdit.fulfillmentCountry")}</Label>
                  <Select
                    value={
                      (() => {
                        const v = (attrs as any).fulfillment_from;
                        const single = Array.isArray(v) ? v[0] : v;
                        return typeof single === "string" && single.trim() ? single.trim() : "__none__";
                      })()
                    }
                    onValueChange={(country) =>
                      setAttrs((a) => ({
                        ...a,
                        fulfillment_from: country && country !== "__none__" ? country : null,
                        fulfillment_city: null,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.productEdit.selectCountry")} />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("admin.productEdit.selectOption")}</SelectItem>
                        {FULFILLMENT_COUNTRIES.filter((c) => c !== "Other").map((c) => {
                          const flag = getCountryFlag(c);
                          return (
                            <SelectItem key={c} value={c}>
                              {flag ? `${flag} ${c}` : c}
                            </SelectItem>
                          );
                        })}
                        <SelectItem value="Other">{t("admin.productEdit.other")}</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.productEdit.fulfillmentCity")}</Label>
                  <Select
                    value={
                      (() => {
                        const v = (attrs as any).fulfillment_city;
                        return typeof v === "string" && v.trim() ? v.trim() : "__none__";
                      })()
                    }
                    onValueChange={(city) =>
                      setAttrs((a) => ({
                        ...a,
                        fulfillment_city: city && city !== "__none__" ? city : null,
                      }))
                    }
                    disabled={
                      !(
                        (() => {
                          const v = (attrs as any).fulfillment_from;
                          const country = Array.isArray(v) ? v[0] : v;
                          return typeof country === "string" && country.trim();
                        })()
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.productEdit.selectCity")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("admin.productEdit.selectOption")}</SelectItem>
                      {getCitiesForCountry(
                        (() => {
                          const v = (attrs as any).fulfillment_from;
                          const country = Array.isArray(v) ? v[0] : v;
                          return typeof country === "string" ? country.trim() : null;
                        })()
                      ).map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Print Area: full width, outside grid so no max-w-sm constraint */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base">{t("admin.productEdit.price.printAreaTitle")}</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("admin.productEdit.price.printAreaHint")}
                  </p>
                </div>
                <div className="max-w-[72rem] w-full rounded-lg border border-gray-200 min-w-0 overflow-x-auto">
                  <table className="w-full border-collapse text-sm" style={{ tableLayout: "auto", minWidth: "56rem" }}>
                      <colgroup>
                        <col style={{ width: "8rem", minWidth: "8rem" }} />
                        {printAreaTechniqueLabels.map((_, ti) => (
                          <col key={ti} style={{ width: "11rem", minWidth: "10rem" }} />
                        ))}
                        <col style={{ width: "12rem", minWidth: "10rem" }} />
                        <col style={{ width: "7rem", minWidth: "6rem" }} />
                        <col style={{ width: "3.5rem" }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-4 px-4 font-semibold text-gray-700 text-base whitespace-nowrap">{t("admin.productEdit.price.viewName")}</th>
                          {printAreaTechniqueLabels.map((label, ti) => (
                            <th key={ti} className="text-left py-4 px-4 font-semibold text-gray-700 min-w-[10rem]">
                              <span className="block text-sm font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{t("admin.productEdit.price.priceCurrency", { currency: form.currency })}</span>
                              <span className="block text-gray-700 mt-0.5 break-words">{label}</span>
                            </th>
                          ))}
                          <th className="text-left py-4 px-4 font-semibold text-gray-700 text-base whitespace-nowrap">{t("admin.productEdit.price.printAreaColors")}</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-700 text-base whitespace-nowrap">{t("admin.productEdit.price.image")}</th>
                          <th className="py-4 px-2 w-14" />
                        </tr>
                      </thead>
                      <tbody>
                        {printAreaViewsNormalized.map((item, index) => {
                          const techniqueList = Array.isArray((attrs as any).decoration_method) ? (attrs as any).decoration_method as string[] : [];
                          const priceKeys = techniqueList.length > 0 ? techniqueList : [""];
                          return (
                            <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                              <td className="py-4 px-4 align-middle">
                                <Input
                                  placeholder={t("admin.productEdit.price.viewNamePlaceholder")}
                                  value={item.name}
                                  onChange={(e) => {
                                    const list = (attrs as any).print_area_views ?? [];
                                    const arr = Array.isArray(list) ? list.slice(0, 10) : [];
                                    const next = [...arr];
                                    const cur = next[index] ?? {};
                                    next[index] = { ...cur, name: e.target.value };
                                    setAttrs((a) => ({ ...a, print_area_views: next }));
                                  }}
                                  className="h-10 w-full max-w-full rounded-lg border-gray-200 text-base"
                                />
                              </td>
                              {priceKeys.map((techKey, ti) => (
                                <td key={techKey || "default"} className="py-4 px-4 align-middle">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0.00"
                                      value={item.pricesByTechnique[techKey] ?? ""}
                                      onChange={(e) => {
                                        const list = (attrs as any).print_area_views ?? [];
                                        const arr = Array.isArray(list) ? list.slice(0, 10) : [];
                                        const next = [...arr];
                                        const cur = next[index] ?? {};
                                        const byTech = cur.pricesByTechnique && typeof cur.pricesByTechnique === "object" ? { ...cur.pricesByTechnique } : (cur.price != null ? { "": String(cur.price) } : {});
                                        byTech[techKey] = e.target.value;
                                        next[index] = { ...cur, pricesByTechnique: byTech };
                                        if (techniqueList.length === 0) (next[index] as any).price = e.target.value;
                                        setAttrs((a) => ({ ...a, print_area_views: next }));
                                      }}
                                      className="h-10 w-full max-w-full rounded-lg border border-gray-200 bg-white px-3 text-right text-base font-medium tabular-nums focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                                    />
                                    <span className="shrink-0 text-sm text-muted-foreground">{form.currency}</span>
                                  </div>
                                </td>
                              ))}
                              <td className="py-4 px-4 align-middle">
                                <MultiSelectField
                                  label=""
                                  hideLabel
                                  value={item.color_ids}
                                  options={(selectedColorRows ?? []).map((c) => ({ label: c.name, value: c.id }))}
                                  onChange={(next) => {
                                    const list = (attrs as any).print_area_views ?? [];
                                    const arr = Array.isArray(list) ? list.slice(0, 10) : [];
                                    const nextArr = [...arr];
                                    const cur = nextArr[index] ?? {};
                                    nextArr[index] = { ...cur, color_ids: next };
                                    setAttrs((a) => ({ ...a, print_area_views: nextArr }));
                                  }}
                                  placeholder={selectedColorRows?.length ? t("admin.productEdit.price.printAreaColorsPlaceholder") : t("admin.productEdit.price.printAreaColorsNoColors")}
                                  allowCustom={false}
                                  className="min-w-[10rem]"
                                />
                              </td>
                              <td className="py-4 px-4 align-middle">
                                {productId && productViewsRows[index] ? (
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      printAreaViewUploadViewIdRef.current = productViewsRows[index].id;
                                      printAreaViewFileInputRef.current?.click();
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        printAreaViewUploadViewIdRef.current = productViewsRows[index].id;
                                        printAreaViewFileInputRef.current?.click();
                                      }
                                    }}
                                    className="flex shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 h-20 w-20 hover:border-gray-300 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 cursor-pointer"
                                    title={t("admin.productEdit.price.imageUploadTitle")}
                                  >
                                    {(productViewsRows[index] as { mockup_image_url?: string | null }).mockup_image_url ? (
                                      <div className="relative h-full w-full rounded-md overflow-hidden group">
                                        <SignedImage
                                          src={(productViewsRows[index] as { mockup_image_url: string }).mockup_image_url}
                                          alt={`View ${index + 1}`}
                                          className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                                          <Upload className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async (ev) => {
                                            ev.stopPropagation();
                                            ev.preventDefault();
                                            const viewId = productViewsRows[index]?.id;
                                            if (!viewId) return;
                                            try {
                                              const { error } = await supabase
                                                .from("product_views")
                                                .update({ mockup_image_url: null })
                                                .eq("id", viewId);
                                              if (error) throw error;
                                              await refetchProductViews();
                                              toast.success(t("admin.productEdit.price.toast.imageRemoved"));
                                            } catch (err: any) {
                                              toast.error(err?.message || t("admin.productEdit.price.toast.imageRemoveFailed"));
                                            }
                                          }}
                                          className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
                                          title={t("admin.productEdit.price.removeImageTitle")}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <Upload className="h-6 w-6 text-gray-400 mb-0.5" />
                                        <span className="text-[10px] text-gray-500 font-medium">{t("admin.productEdit.price.addImage")}</span>
                                      </>
                                    )}
                                  </div>
                                ) : productId && index < (attrs as any).print_area_views?.length ? (
                                  <span className="text-xs text-amber-600" title={t("admin.productEdit.price.newAreaSaveFirstTitle")}>
                                    {t("admin.productEdit.price.saveFirst")}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-4 px-3 align-middle">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-red-50"
                                  onClick={() => {
                                    const list = (attrs as any).print_area_views ?? [];
                                    const arr = Array.isArray(list) ? list.slice(0, 10) : [];
                                    setAttrs((a) => ({ ...a, print_area_views: arr.filter((_: any, i: number) => i !== index) }));
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {((attrs as any).print_area_views ?? []).length < 10 ? (
                      <div className="border-t border-gray-200 bg-gray-50/50 p-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const list = (attrs as any).print_area_views ?? [];
                            const arr = Array.isArray(list) ? list.slice(0, 10) : [];
                            const techniqueList = Array.isArray((attrs as any).decoration_method) ? (attrs as any).decoration_method as string[] : [];
                            const newItem = techniqueList.length > 0
                              ? { name: "", pricesByTechnique: Object.fromEntries(techniqueList.map((t) => [t, ""])), color_ids: [] as string[] }
                              : { name: "", price: "", color_ids: [] as string[] };
                            setAttrs((a) => ({ ...a, print_area_views: [...arr, newItem] }));
                            if (productId) {
                              const defaultArea = { top: 30, left: 30, width: 40, height: 40 };
                              const { error } = await supabase.from("product_views").insert({
                                product_id: productId,
                                view_name: "New view",
                                view_order: arr.length,
                                design_area_top: defaultArea.top,
                                design_area_left: defaultArea.left,
                                design_area_width: defaultArea.width,
                                design_area_height: defaultArea.height,
                                mockup_image_url: null,
                              });
                              if (error) {
                                toast.error(error.message ?? t("admin.productEdit.price.toast.viewAddFailed"));
                                return;
                              }
                              await refetchProductViews();
                              toast.success(t("admin.productEdit.price.toast.viewAdded"));
                            }
                          }}
                        >
                          {t("admin.productEdit.price.addPrintArea")}
                        </Button>
                      </div>
                    ) : null}
                </div>
              </div>
          </section>

          <section id="product_details" className="mt-6 scroll-mt-32">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 text-base font-semibold text-foreground">{t("admin.productEdit.productDetailsTitle")}</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("admin.productEdit.description")}</Label>
                  <RichTextEditor value={description} onChange={setDescription} />
                </div>

                {isDrinkwareCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.productType")}
                      value={Array.isArray((attrs as any).drinkware_type) ? ((attrs as any).drinkware_type as string[]) : []}
                      options={drinkwareWallArtOptions?.drinkware_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, drinkware_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.capacity")}
                      value={Array.isArray((attrs as any).drinkware_capacity) ? ((attrs as any).drinkware_capacity as string[]) : []}
                      options={drinkwareWallArtOptions?.drinkware_capacity ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, drinkware_capacity: next }))}
                    />
                    <div className="space-y-2 max-w-sm">
                      <Label>{t("admin.productEdit.lidType")}</Label>
                      <Select
                        value={typeof (attrs as any).drinkware_lid_type === "string" ? ((attrs as any).drinkware_lid_type as string) : ""}
                        onValueChange={(v) => setAttrs((a) => ({ ...a, drinkware_lid_type: v || null }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("admin.productEdit.selectLidType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(drinkwareWallArtOptions?.drinkware_lid_type ?? []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {isWallArtCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.productType")}
                      value={Array.isArray((attrs as any).wall_art_type) ? ((attrs as any).wall_art_type as string[]) : []}
                      options={drinkwareWallArtOptions?.wall_art_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, wall_art_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.size")}
                      value={Array.isArray((attrs as any).wall_art_size) ? ((attrs as any).wall_art_size as string[]) : []}
                      options={drinkwareWallArtOptions?.wall_art_size ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, wall_art_size: next }))}
                    />
                    <div className="space-y-2 max-w-sm">
                      <Label>{t("admin.productEdit.orientation")}</Label>
                      <Select
                        value={typeof (attrs as any).wall_art_orientation === "string" ? ((attrs as any).wall_art_orientation as string) : ""}
                        onValueChange={(v) => setAttrs((a) => ({ ...a, wall_art_orientation: v || null }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("admin.productEdit.selectOrientation")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(drinkwareWallArtOptions?.wall_art_orientation ?? []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <Label>{t("admin.productEdit.frameStyle")}</Label>
                      <Select
                        value={typeof (attrs as any).wall_art_frame_style === "string" ? ((attrs as any).wall_art_frame_style as string) : ""}
                        onValueChange={(v) => setAttrs((a) => ({ ...a, wall_art_frame_style: v || null }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("admin.productEdit.selectFrameStyle")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(drinkwareWallArtOptions?.wall_art_frame_style ?? []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {isToteBagsCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.bagType")}
                      value={Array.isArray((attrs as any).accessory_bag_type) ? ((attrs as any).accessory_bag_type as string[]) : []}
                      options={accessoriesHomeLivingOptions?.accessory_bag_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, accessory_bag_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {isHatsCapsCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.hatType")}
                      value={Array.isArray((attrs as any).accessory_hat_type) ? ((attrs as any).accessory_hat_type as string[]) : []}
                      options={accessoriesHomeLivingOptions?.accessory_hat_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, accessory_hat_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {isPhoneCasesCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.deviceModel")}
                      value={Array.isArray((attrs as any).accessory_phone_model) ? ((attrs as any).accessory_phone_model as string[]) : []}
                      options={accessoriesHomeLivingOptions?.accessory_phone_model ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, accessory_phone_model: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {isSocksCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.sockType")}
                      value={Array.isArray((attrs as any).accessory_sock_type) ? ((attrs as any).accessory_sock_type as string[]) : []}
                      options={accessoriesHomeLivingOptions?.accessory_sock_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, accessory_sock_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {isPillowsCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.pillowType")}
                      value={Array.isArray((attrs as any).pillow_type) ? ((attrs as any).pillow_type as string[]) : []}
                      options={accessoriesHomeLivingOptions?.pillow_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, pillow_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.pillowSize")}
                      value={Array.isArray((attrs as any).pillow_size) ? ((attrs as any).pillow_size as string[]) : []}
                      options={accessoriesHomeLivingOptions?.pillow_size ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, pillow_size: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {isBlanketsCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.blanketType")}
                      value={Array.isArray((attrs as any).blanket_type) ? ((attrs as any).blanket_type as string[]) : []}
                      options={accessoriesHomeLivingOptions?.blanket_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, blanket_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.blanketSize")}
                      value={Array.isArray((attrs as any).blanket_size) ? ((attrs as any).blanket_size as string[]) : []}
                      options={accessoriesHomeLivingOptions?.blanket_size ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, blanket_size: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {isCandlesCategory && (
                  <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                    <MultiSelectField
                      label={t("admin.productEdit.candleType")}
                      value={Array.isArray((attrs as any).candle_type) ? ((attrs as any).candle_type as string[]) : []}
                      options={accessoriesHomeLivingOptions?.candle_type ?? []}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, candle_type: next }))}
                    />
                    <MultiSelectField
                      label={t("admin.productEdit.material")}
                      value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                      options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                    />
                  </div>
                )}

                {!isDrinkwareCategory && !isWallArtCategory && !isToteBagsCategory && !isHatsCapsCategory && !isPhoneCasesCategory && !isSocksCategory && !isPillowsCategory && !isBlanketsCategory && !isCandlesCategory && (
                <div className="grid gap-4 md:grid-cols-2 [&>div]:max-w-sm [&>div]:min-w-0">
                  <MultiSelectField
                    label={t("admin.productEdit.fit")}
                    value={Array.isArray((attrs as any).fit)
                      ? ((attrs as any).fit as string[])
                      : typeof (attrs as any).fit === "string" && (attrs as any).fit
                        ? [String((attrs as any).fit)]
                        : []}
                    options={fitOptions?.length ? fitOptions : getFilterOptionsAny(["Fit", "Features"]) }
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, fit: next }))}
                  />

                  <MultiSelectField
                    label={t("admin.productEdit.thickness")}
                    value={Array.isArray((attrs as any).thickness)
                      ? ((attrs as any).thickness as string[])
                      : typeof (attrs as any).thickness === "string" && (attrs as any).thickness
                        ? [String((attrs as any).thickness)]
                        : []}
                    options={thicknessOptions?.length ? thicknessOptions : getFilterOptionsAny(["Thickness"]) }
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, thickness: next }))}
                  />

                  <MultiSelectField
                    label={t("admin.productEdit.material")}
                    value={Array.isArray((attrs as any).material) ? ((attrs as any).material as string[]) : []}
                    options={materialOptions?.length ? materialOptions : getFilterOptionsAny(["Material", "material", "Materials"])}
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, material: next }))}
                  />

                  <div className="space-y-2">
                    <Label>{t("admin.productEdit.fabricWeight")}</Label>
                    <MultiSelectField
                      label={t("admin.productEdit.fabricWeight")}
                      hideLabel
                      value={Array.isArray((attrs as any).fabric_weight)
                        ? ((attrs as any).fabric_weight as string[])
                        : typeof (attrs as any).fabric_weight === "string" && (attrs as any).fabric_weight
                          ? [String((attrs as any).fabric_weight)]
                          : []}
                      options={fabricWeightOptions?.length ? fabricWeightOptions : getFilterOptionsAny(["Fabric Weight", "fabric_weight", "Weight"]) }
                      allowCustom={false}
                      onChange={(next) => setAttrs((a) => ({ ...a, fabric_weight: next }))}
                      className="[&>label]:hidden"
                    />
                  </div>

                  <MultiSelectField
                    label={t("admin.productEdit.neckline")}
                    value={Array.isArray((attrs as any).neckline) ? ((attrs as any).neckline as string[]) : []}
                    options={necklineOptions?.length ? necklineOptions : getFilterOptionsAny(["Neckline", "Neck Line", "Neckline Type"]) }
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, neckline: next }))}
                  />

                  <MultiSelectField
                    label={t("admin.productEdit.sleeveStyle")}
                    value={Array.isArray((attrs as any).sleeve_style) ? ((attrs as any).sleeve_style as string[]) : []}
                    options={
                      sleeveStyleOptions?.length
                        ? sleeveStyleOptions
                        : getFilterOptionsAny(["Sleeve Style", "Sleeve style"])
                    }
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, sleeve_style: next }))}
                  />

                  <MultiSelectField
                    label={t("admin.productEdit.sleeveLength")}
                    value={
                      Array.isArray((attrs as any).sleeve_length)
                        ? ((attrs as any).sleeve_length as string[])
                        : typeof (attrs as any).sleeve_length === "string" && (attrs as any).sleeve_length
                          ? [String((attrs as any).sleeve_length)]
                          : []
                    }
                    options={
                      sleeveLengthOptions?.length
                        ? sleeveLengthOptions
                        : [
                            { label: "Sleeveless", value: "Sleeveless" },
                            { label: "Short Sleeve", value: "Short Sleeve" },
                            { label: "Half Sleeve", value: "Half Sleeve" },
                            { label: "3/4 Sleeve", value: "3/4 Sleeve" },
                            { label: "Long Sleeve", value: "Long Sleeve" },
                            { label: "Extra Long Sleeve", value: "Extra Long Sleeve" },
                          ]
                    }
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, sleeve_length: next }))}
                  />

                  <MultiSelectField
                    label={t("admin.productEdit.season")}
                    value={Array.isArray((attrs as any).season) ? ((attrs as any).season as string[]) : []}
                    options={seasonOptions ?? []}
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, season: next }))}
                  />

                  <MultiSelectField
                    label={t("admin.productEdit.style")}
                    value={
                      Array.isArray((attrs as any).style)
                        ? ((attrs as any).style as string[])
                        : typeof (attrs as any).style === "string" && (attrs as any).style
                          ? [String((attrs as any).style)]
                          : []
                    }
                    options={styleOptions ?? []}
                    allowCustom={false}
                    onChange={(next) => setAttrs((a) => ({ ...a, style: next }))}
                  />

                  <MultiSelectField
                    label={t("admin.productEdit.details")}
                    value={Array.isArray((attrs as any).elements) ? ((attrs as any).elements as string[]) : []}
                    options={elementsOptions ?? []}
                    allowCustom
                    onChange={(next) => setAttrs((a) => ({ ...a, elements: next }))}
                  />
                </div>
                )}

                <div className="space-y-2">
                  <Label>{t("admin.productEdit.careInstructions")}</Label>
                  <Textarea
                    value={typeof (attrs as any).care_instructions === "string" ? ((attrs as any).care_instructions as string) : ""}
                    onChange={(e) => setAttrs((a) => ({ ...a, care_instructions: e.target.value }))}
                  />
                </div>
              </div>
          </section>

          <section id="fulfillment" className="mt-6 scroll-mt-32">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 text-base font-semibold text-foreground">{t("admin.productEdit.section.fulfillment")}</h2>
              <ProductShippingOverrideFields
                value={shippingOverride}
                onChange={setShippingOverride}
                includeKeys={["production_time_text", "total_fulfillment_time_text", "estimated_delivery_text"]}
              />
          </section>

          <section id="shipping" className="mt-6 scroll-mt-32">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 text-base font-semibold text-foreground">{t("admin.productEdit.section.shipping")}</h2>
              <ProductShippingOverrideFields
                value={shippingOverride}
                onChange={setShippingOverride}
                includeKeys={[
                  "shipping_tip",
                  "shipping_method_name",
                  "shipping_method_time_text",
                  "shipping_method_cost_from_text",
                  "shipping_method_additional_item_text",
                  "shipping_time_text",
                ]}
              />
          </section>
          </>
          ) : null}
        </PrelineCardContent>
      </PrelineCard>
    </div>
  );
}
