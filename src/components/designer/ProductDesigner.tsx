import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { ToolSidebar } from "./ToolSidebar";
import { LayersPanel } from "./LayersPanel";
import { ElementActionsBar } from "./ElementActionsBar";
import { UploadPanel } from "./UploadPanel";
import { TextTemplates } from "./TextTemplates";
import { CatalogBar } from "./CatalogBar";
import { MockupStage } from "./MockupStage";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { Download, Save, FileImage, Undo2, Redo2, Grid3X3, Maximize2, ZoomIn, ShoppingCart } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DesignElement, ProductView, ActiveTab, DEFAULT_FONT_FAMILY } from "./types";
import { toast } from "sonner";
import { useDesignHistory } from "@/hooks/useDesignHistory";
import { useAuth } from "@/hooks/useAuth";
import { useUserMembership } from "@/hooks/useUserMembership";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { getDefaultCanvasArea, getFallbackCanvasArea } from "@/lib/productTemplates";
import { sanitizeStorageFileName } from "@/lib/storage";
import { resolveMugCapacity, getMugPrintArea, type MugCapacityKey } from "@/config/mug-print-specs";
// Static mockups for fallback
const tshirtMockup = "/mockups/tshirt-front.png";
import hoodieMockup from "@/assets/hoodie-mockup.png";
import mugMockup from "@/assets/mug-mockup.png";
import phonecaseMockup from "@/assets/phonecase-mockup.png";

const mockupImages: Record<string, string> = {
  "a1111111-1111-1111-1111-111111111111": tshirtMockup,
  "a2222222-2222-2222-2222-222222222222": hoodieMockup,
  "a3333333-3333-3333-3333-333333333333": mugMockup,
  "a4444444-4444-4444-4444-444444444444": phonecaseMockup,
};

const initialElements: DesignElement[] = [];

export function ProductDesigner() {
  const { isAdmin, user } = useAuth();
  const canManage = isAdmin;
  const { addItem: addToCart, items: cartItems } = useCart();
  const firstCartProductId = useMemo(() => {
    const seen = new Set<string>();
    for (const i of cartItems) {
      if (!seen.has(i.productId)) {
        seen.add(i.productId);
        return i.productId;
      }
    }
    return null;
  }, [cartItems]);

  const { data: membership } = useUserMembership(user?.id ?? null);
  const { data: settings } = useAppSettings(["individual_export_daily_limit"]);
  const exportDailyLimit = useMemo(() => {
    const raw = settings?.individual_export_daily_limit;
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : 3;
  }, [settings]);

  const [searchParams] = useSearchParams();
  const requestedProductId = searchParams.get("productId") || "";
  const requestedViewId = searchParams.get("viewId") || "";
  const requestedColorId = searchParams.get("colorId") || "";

  const [activeTab, setActiveTab] = useState<ActiveTab>("upload");
  const [zoom, setZoom] = useState(100);
  const [fitToPrintArea, setFitToPrintArea] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string>("");
  const [currentProductName, setCurrentProductName] = useState<string>("");
  const [currentProductCategory, setCurrentProductCategory] = useState<string>("");
  const [productIsDrinkware, setProductIsDrinkware] = useState(false);
  const [currentProductSlug, setCurrentProductSlug] = useState<string | null>(null);
  const [currentProductPriceFrom, setCurrentProductPriceFrom] = useState<number | null>(null);
  const [currentProductCode, setCurrentProductCode] = useState<string | null>(null);
  const [currentProductCoverUrl, setCurrentProductCoverUrl] = useState<string | null>(null);
  const [productDrinkwareCapacity, setProductDrinkwareCapacity] = useState<string | string[] | null>(null);
  const [mugCapacity, setMugCapacity] = useState<MugCapacityKey>("11oz");
  const [currentViewId, setCurrentViewId] = useState<string>("");
  const [productViews, setProductViews] = useState<ProductView[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [selectedColorHex, setSelectedColorHex] = useState("#FFFFFF");
  const [colorMockups, setColorMockups] = useState<Record<string, string>>({});

  const [pendingMockups, setPendingMockups] = useState<
    Record<string, { file: File; previewUrl: string; previousUrl: string | null }>
  >({});

  const [isSavingMockup, setIsSavingMockup] = useState(false);
  const [mockupSaveProgress, setMockupSaveProgress] = useState(0);
  const [mockupSaveStatus, setMockupSaveStatus] = useState<string>("");

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [designName, setDesignName] = useState("");
  const [captureMode, setCaptureMode] = useState(false);
  const exportPendingRef = useRef<{ format: "png" | "pdf" | "original" } | null>(null);

  const [printAreaCreatorOpen, setPrintAreaCreatorOpen] = useState(false);
  const [printAreaWidthCm, setPrintAreaWidthCm] = useState("");
  const [printAreaHeightCm, setPrintAreaHeightCm] = useState("");
  const [isSavingPrintArea, setIsSavingPrintArea] = useState(false);
  const [printAreaDimensionsByView, setPrintAreaDimensionsByView] = useState<Record<string, { width_cm: number; height_cm: number; width_pct?: number; height_pct?: number }>>({});
  const [triggerPrintAreaEdit, setTriggerPrintAreaEdit] = useState(0);
  const [printAreaIsEditing, setPrintAreaIsEditing] = useState(false);

  const [productGalleryImages, setProductGalleryImages] = useState<{ image_url: string }[]>([]);

  const handleTabChange = useCallback(
    (tab: ActiveTab) => setActiveTab(tab),
    []
  );

  const handleProductSelect = useCallback(async (productId: string) => {
    setActiveTab("upload");
    setCurrentProductId(productId);

    // reset color selection for a clean start
    setSelectedColorId(null);
    setSelectedColorIds([]);
    setSelectedColorHex("#FFFFFF");
    setColorMockups({});

    // load views
    setCurrentViewId("");
    const { data: views } = await supabase
      .from("product_views")
      .select("*")
      .eq("product_id", productId)
      .order("view_order");

    let nextViews = (views ?? []) as ProductView[];
    if (nextViews.length === 0) {
      let categorySlug = "";
      const { data: productRow } = await supabase
        .from("products")
        .select("category_id")
        .eq("id", productId)
        .maybeSingle();
      const categoryId = (productRow as { category_id?: string } | null)?.category_id;
      if (categoryId) {
        const { data: catRow } = await supabase
          .from("categories")
          .select("slug")
          .eq("id", categoryId)
          .maybeSingle();
        categorySlug = (catRow as { slug?: string } | null)?.slug ?? "";
      }
      const defaultArea = categorySlug ? getDefaultCanvasArea(categorySlug) : getFallbackCanvasArea();
      const { data: attrsRow } = await supabase
        .from("product_attributes")
        .select("data")
        .eq("product_id", productId)
        .maybeSingle();
      const printAreaViews = Array.isArray((attrsRow?.data as any)?.print_area_views)
        ? ((attrsRow?.data as any).print_area_views as Array<{ name?: string }>)
        : [];
      if (printAreaViews.length > 0) {
        const inserted: ProductView[] = [];
        for (let i = 0; i < printAreaViews.length; i++) {
          const name = (printAreaViews[i]?.name ?? "").trim() || `Görünüm ${i + 1}`;
          const { data: newView, error: insertErr } = await supabase
            .from("product_views")
            .insert({
              product_id: productId,
              view_name: name,
              view_order: i,
              design_area_top: defaultArea.top,
              design_area_left: defaultArea.left,
              design_area_width: defaultArea.width,
              design_area_height: defaultArea.height,
            })
            .select()
            .single();
          if (!insertErr && newView) inserted.push(newView as ProductView);
        }
        if (inserted.length > 0) nextViews = inserted;
      }
    }
    setProductViews(nextViews);
    if (nextViews.length > 0) setCurrentViewId(nextViews[0].id);
  }, []);

  // Design elements per view
  const [designsByView, setDesignsByView] = useState<Record<string, DesignElement[]>>({});

  const { elements, setElements, resetElements, undo, redo, canUndo, canRedo } = useDesignHistory(initialElements);

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;
  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));
  const anySelectedLocked = selectedElements.some((el) => el.isLocked === true);
  const currentView = productViews.find((v) => v.id === currentViewId);

  const isDrinkware = productIsDrinkware;

  const designAreaPercent = useMemo(() => {
    if (!currentView) return null;
    if (isDrinkware) {
      const defaultArea = getDefaultCanvasArea("drinkware");
      const viewW = Number(currentView.design_area_width);
      const viewH = Number(currentView.design_area_height);
      const hasSavedArea = viewW > 0 && viewH > 0;
      if (hasSavedArea) {
        return {
          left: Number(currentView.design_area_left) ?? defaultArea.left,
          top: Number(currentView.design_area_top) ?? defaultArea.top,
          width: viewW,
          height: viewH,
        };
      }
      // Baskı alanı silindi (0,0) – varsayılan gösterme
      if (viewW <= 0 || viewH <= 0) {
        return {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
        };
      }
      const printArea = getMugPrintArea(mugCapacity);
      const widthPct = defaultArea.width;
      const heightPct = widthPct * (printArea.height_px / printArea.width_px);
      return {
        left: Number(currentView.design_area_left) || defaultArea.left,
        top: Number(currentView.design_area_top) || defaultArea.top,
        width: widthPct,
        height: Math.min(100, heightPct),
      };
    }
    return {
      left: Number(currentView.design_area_left),
      top: Number(currentView.design_area_top),
      width: Number(currentView.design_area_width),
      height: Number(currentView.design_area_height),
    };
  }, [currentView, isDrinkware, mugCapacity]);

  const canUploadDesignImage = Boolean(
    designAreaPercent &&
    designAreaPercent.width > 0 &&
    designAreaPercent.height > 0 &&
    !printAreaIsEditing
  );

  // Load initial product and views on mount.
  // If a productId is present in the URL (e.g. from "Design Now"), load it and apply viewId/colorId so mockup matches storefront.
  useEffect(() => {
    const loadInitialData = async () => {
      if (requestedProductId) {
        setActiveTab("upload");
        setCurrentProductId(requestedProductId);
        setSelectedColorId(null);
        setSelectedColorIds([]);
        setSelectedColorHex("#FFFFFF");
        setColorMockups({});
        setCurrentViewId("");

        const { data: views } = await supabase
          .from("product_views")
          .select("*")
          .eq("product_id", requestedProductId)
          .order("view_order");

        let nextViews = (views ?? []) as ProductView[];

        // Üründe hiç görünüm yoksa: Print Area (attrs) varsa oradan oluştur, yoksa tek "Front" ekle
        if (nextViews.length === 0) {
          let categorySlug = "";
          const { data: productRow } = await supabase
            .from("products")
            .select("category_id")
            .eq("id", requestedProductId)
            .maybeSingle();
          const categoryId = (productRow as { category_id?: string } | null)?.category_id;
          if (categoryId) {
            const { data: catRow } = await supabase
              .from("categories")
              .select("slug")
              .eq("id", categoryId)
              .maybeSingle();
            categorySlug = (catRow as { slug?: string } | null)?.slug ?? "";
          }
          const defaultArea = categorySlug ? getDefaultCanvasArea(categorySlug) : getFallbackCanvasArea();
          const { data: attrsRow } = await supabase
            .from("product_attributes")
            .select("data")
            .eq("product_id", requestedProductId)
            .maybeSingle();
          const printAreaViews = Array.isArray((attrsRow?.data as any)?.print_area_views)
            ? ((attrsRow?.data as any).print_area_views as Array<{ name?: string }>)
            : [];
          if (printAreaViews.length > 0) {
            const inserted: ProductView[] = [];
            for (let i = 0; i < printAreaViews.length; i++) {
              const name = (printAreaViews[i]?.name ?? "").trim() || `Görünüm ${i + 1}`;
              const { data: newView, error: insertErr } = await supabase
                .from("product_views")
                .insert({
                  product_id: requestedProductId,
                  view_name: name,
                  view_order: i,
                  design_area_top: defaultArea.top,
                  design_area_left: defaultArea.left,
                  design_area_width: defaultArea.width,
                  design_area_height: defaultArea.height,
                })
                .select()
                .single();
              if (!insertErr && newView) inserted.push(newView as ProductView);
            }
            if (inserted.length > 0) nextViews = inserted;
          }
          if (nextViews.length === 0) {
            const { data: newView, error: insertErr } = await supabase
              .from("product_views")
              .insert({
                product_id: requestedProductId,
                view_name: "Front",
                view_order: 0,
                design_area_top: defaultArea.top,
                design_area_left: defaultArea.left,
                design_area_width: defaultArea.width,
                design_area_height: defaultArea.height,
              })
              .select()
              .single();
            if (!insertErr && newView) nextViews = [newView as ProductView];
          }
        }

        setProductViews(nextViews);

        const viewIdToUse =
          requestedViewId && nextViews.some((v) => v.id === requestedViewId)
            ? requestedViewId
            : nextViews.length > 0
              ? nextViews[0].id
              : "";
        setCurrentViewId(viewIdToUse);

        if (requestedColorId) {
          setSelectedColorId(requestedColorId);
          setSelectedColorIds([requestedColorId]);
          const { data: colorRow } = await supabase
            .from("product_colors")
            .select("hex_code")
            .eq("id", requestedColorId)
            .maybeSingle();
          if (colorRow?.hex_code) setSelectedColorHex(colorRow.hex_code);

          if (viewIdToUse) {
            const { data: mockupRow } = await supabase
              .from("product_view_color_mockups")
              .select("mockup_image_url")
              .eq("product_view_id", viewIdToUse)
              .eq("color_id", requestedColorId)
              .maybeSingle();
            if (mockupRow?.mockup_image_url) {
              const url =
                mockupRow.mockup_image_url.startsWith("http") ||
                mockupRow.mockup_image_url.startsWith("/")
                  ? mockupRow.mockup_image_url
                  : `/${mockupRow.mockup_image_url}`;
              setColorMockups((prev) => ({ ...prev, [`${viewIdToUse}-${requestedColorId}`]: url }));
            }
          }
        }
        return;
      }

      // Ürün yoksa ilk sepetteki ürünü seç (dropdown sadece sepettekileri gösterdiği için tutarlı)
      if (!currentProductId && firstCartProductId) {
        const productId = firstCartProductId;
        setCurrentProductId(productId);

        const { data: views } = await supabase
          .from("product_views")
          .select("*")
          .eq("product_id", productId)
          .order("view_order");

        if (views && views.length > 0) {
          setProductViews(views);
          setCurrentViewId(views[0].id);
        }
      }
    };

    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedProductId, requestedViewId, requestedColorId, firstCartProductId]);

  // Load product meta and gallery when product changes (Design Now ile açıldığında da çalışır)
  useEffect(() => {
    const run = async () => {
      if (!currentProductId) {
        setCurrentProductName("");
        setCurrentProductCategory("");
        setProductIsDrinkware(false);
        setCurrentProductSlug(null);
        setCurrentProductPriceFrom(null);
        setCurrentProductCode(null);
        setCurrentProductCoverUrl(null);
        setProductGalleryImages([]);
        setProductDrinkwareCapacity(null);
        setMugCapacity("11oz");
        setPrintAreaDimensionsByView({});
        return;
      }
      const { data: productRow } = await supabase
        .from("products")
        .select("name,category,category_id,cover_image_url,thumbnail_url,slug,price_from,product_code")
        .eq("id", currentProductId)
        .maybeSingle();
      const row = productRow as Record<string, unknown> | null;
      let categorySlug = (row?.category as string) || "";
      let isDrinkwareCat = false;
      if (!categorySlug && row?.category_id) {
        const { data: catRow } = await supabase
          .from("categories")
          .select("slug, parent_category_id")
          .eq("id", row.category_id)
          .maybeSingle();
        const cat = catRow as { slug?: string; parent_category_id?: string | null } | null;
        categorySlug = cat?.slug ?? "";
        if (cat?.slug?.toLowerCase() === "drinkware") isDrinkwareCat = true;
        if (!isDrinkwareCat && cat?.parent_category_id) {
          const { data: parentRow } = await supabase
            .from("categories")
            .select("slug")
            .eq("id", cat.parent_category_id)
            .maybeSingle();
          const parentSlug = (parentRow as { slug?: string } | null)?.slug ?? "";
          if (parentSlug.toLowerCase() === "drinkware") isDrinkwareCat = true;
        }
      }
      if (!isDrinkwareCat && categorySlug) {
        const slugLower = categorySlug.toLowerCase();
        isDrinkwareCat =
          slugLower === "drinkware" ||
          slugLower === "mugs" ||
          slugLower.includes("kupa") ||
          slugLower.includes("bardak") ||
          slugLower.includes("mug") ||
          slugLower.includes("tumbler") ||
          slugLower.includes("water-bottle") ||
          slugLower.includes("bottle");
      }
      setProductIsDrinkware(isDrinkwareCat);
      setCurrentProductName((row?.name as string) || "");
      setCurrentProductCategory(categorySlug);
      setCurrentProductSlug((row?.slug as string) ?? null);
      setCurrentProductPriceFrom(typeof row?.price_from === "number" ? row.price_from : null);
      setCurrentProductCode((row?.product_code as string) ?? null);
      const cover = (row?.cover_image_url as string) ?? (row?.thumbnail_url as string) ?? null;
      setCurrentProductCoverUrl(cover && typeof cover === "string" ? cover : null);

      const { data: attrsRow } = await supabase
        .from("product_attributes")
        .select("data")
        .eq("product_id", currentProductId)
        .maybeSingle();
      const attrs = (attrsRow?.data as Record<string, unknown> | null) ?? null;
      const capacityRaw = attrs?.drinkware_capacity;
      setProductDrinkwareCapacity(capacityRaw ?? null);
      if (categorySlug && isDrinkwareCat) {
        setMugCapacity(resolveMugCapacity(capacityRaw as string | string[] | null));
      } else {
        setMugCapacity("11oz");
      }

      const { data: galleryRows } = await supabase
        .from("product_gallery_images")
        .select("image_url")
        .eq("product_id", currentProductId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      const rawGallery = (galleryRows ?? []) as { image_url: string }[];
      // Aynı URL birden fazla gelmesin (tekrar kayıt veya cover/thumbnail ile çakışma)
      const seen = new Set<string>();
      const fromGallery = rawGallery.filter((row) => {
        const url = (row.image_url || "").trim();
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      });
      if (fromGallery.length > 0) {
        setProductGalleryImages(fromGallery);
      } else {
        // Galeri boşsa ürün kapak/thumbnail ile mockup panelinde en az bir görsel göster
        const fallbacks: { image_url: string }[] = [];
        const cover = (productRow as { cover_image_url?: string } | null)?.cover_image_url;
        const thumb = (productRow as { thumbnail_url?: string } | null)?.thumbnail_url;
        if (cover && typeof cover === "string" && cover.trim()) fallbacks.push({ image_url: cover.trim() });
        if (thumb && typeof thumb === "string" && thumb.trim() && thumb !== cover) fallbacks.push({ image_url: thumb.trim() });
        setProductGalleryImages(fallbacks);
      }
    };
    void run();
  }, [currentProductId]);

  // Load views when product changes
  const handleViewsLoaded = useCallback((views: ProductView[]) => {
    setProductViews(views);
    if (views.length > 0 && (!currentViewId || !views.find(v => v.id === currentViewId))) {
      setCurrentViewId(views[0].id);
    }
  }, [currentViewId]);

  // Mockup sekmesine geçildiğinde görünümleri (ve yeni mockup görsellerini) yeniden yükle
  useEffect(() => {
    if (activeTab !== "mockup" || !currentProductId) return;
    const refetchViews = async () => {
      const { data: views } = await supabase
        .from("product_views")
        .select("*")
        .eq("product_id", currentProductId)
        .order("view_order");
      const nextViews = (views ?? []) as ProductView[];
      setProductViews(nextViews);
      if (nextViews.length > 0 && !nextViews.some((v) => v.id === currentViewId)) {
        setCurrentViewId(nextViews[0].id);
      }
    };
    void refetchViews();
  }, [activeTab, currentProductId]);

  const handleSelectionChange = useCallback((nextIds: string[], primaryId: string | null) => {
    setSelectedElementIds(nextIds);
    setSelectedElementId(primaryId);
  }, []);

  // Switch view
  const handleViewChange = useCallback(async (viewId: string) => {
    // Save current elements to current view
    if (currentViewId) {
      setDesignsByView(prev => ({
        ...prev,
        [currentViewId]: elements
      }));
    }

    // Load elements for new view
    setCurrentViewId(viewId);
    const viewElements = designsByView[viewId] || [];
    resetElements(viewElements);
    handleSelectionChange([], null);

    // Fetch color-specific mockup for new view if color is selected
    if (selectedColorId) {
      const { data } = await supabase
        .from("product_view_color_mockups")
        .select("mockup_image_url")
        .eq("product_view_id", viewId)
        .eq("color_id", selectedColorId)
        .maybeSingle();

      if (data?.mockup_image_url) {
        setColorMockups(prev => ({
          ...prev,
          [`${viewId}-${selectedColorId}`]: data.mockup_image_url
        }));
      }
    }
  }, [currentViewId, elements, designsByView, resetElements, selectedColorId, handleSelectionChange]);

  // Save current view elements when they change
  useEffect(() => {
    if (currentViewId && elements.length > 0) {
      setDesignsByView(prev => ({
        ...prev,
        [currentViewId]: elements
      }));
    }
  }, [elements, currentViewId]);

  // Handle color selection and fetch color-specific mockup
  const handleColorSelect = useCallback(async (colorId: string, hexCode: string) => {
    setSelectedColorId(colorId);
    setSelectedColorHex(hexCode);

    // Auto-add to selectedColorIds if not already there
    setSelectedColorIds((prev) => {
      if (!prev.includes(colorId)) {
        return [...prev, colorId];
      }
      return prev;
    });

    // Ensure the picked color is assigned to the current product so it appears in CatalogBar
    if (currentProductId && colorId) {
      const { data: existing, error: existsErr } = await supabase
        .from("product_color_variants")
        .select("id")
        .eq("product_id", currentProductId)
        .eq("color_id", colorId)
        .maybeSingle();

      // Ignore "not found" (existing=null), but surface real errors
      if (existsErr) {
        // If RLS prevents reading, we'll still attempt insert below.
      }

      if (!existing) {
        await supabase.from("product_color_variants").insert({
          product_id: currentProductId,
          color_id: colorId,
        });
      }
    }

    // Try to load color-specific mockup for current view
    if (currentViewId && colorId) {
      const { data } = await supabase
        .from("product_view_color_mockups")
        .select("mockup_image_url")
        .eq("product_view_id", currentViewId)
        .eq("color_id", colorId)
        .maybeSingle();

      if (data?.mockup_image_url) {
        // Ensure URL is properly formatted
        const mockupUrl = data.mockup_image_url.startsWith("http")
          ? data.mockup_image_url
          : data.mockup_image_url.startsWith("/")
            ? data.mockup_image_url
            : `/${data.mockup_image_url}`;

        setColorMockups((prev) => ({
          ...prev,
          [`${currentViewId}-${colorId}`]: mockupUrl,
        }));
      }
    }
  }, [currentViewId, currentProductId]);

  // Handle color toggle for multi-selection
  const handleColorToggle = useCallback(
    async (colorId: string, hexCode: string) => {
      setSelectedColorIds((prev) => {
        if (prev.includes(colorId)) {
          // Remove - but keep at least one color selected
          if (prev.length > 1) {
            const newIds = prev.filter((id) => id !== colorId);
            // If removing the active color, set a new active color
            if (selectedColorId === colorId && newIds.length > 0) {
              setSelectedColorId(newIds[0]);
            }
            return newIds;
          }
          return prev;
        }
        // Add
        return [...prev, colorId];
      });

      // Persist variant add/remove so palette stays in sync
      if (!currentProductId) return;

      const willRemove = selectedColorIds.includes(colorId);
      if (willRemove) {
        await supabase
          .from("product_color_variants")
          .delete()
          .eq("product_id", currentProductId)
          .eq("color_id", colorId);
        return;
      }

      // Add if missing
      const { data: existing } = await supabase
        .from("product_color_variants")
        .select("id")
        .eq("product_id", currentProductId)
        .eq("color_id", colorId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("product_color_variants").insert({
          product_id: currentProductId,
          color_id: colorId,
        });
      }

      // If there is no active color yet, set it
      if (!selectedColorId) {
        setSelectedColorId(colorId);
        setSelectedColorHex(hexCode);
      }
    },
    [currentProductId, selectedColorId, selectedColorIds]
  );

  const handleUpdateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        const next = { ...el, ...updates };
        // Sürükleme sadece x,y gönderir; width/height asla silinmesin / ezilmesin
        if (el.width !== undefined && next.width === undefined) next.width = el.width;
        if (el.height !== undefined && next.height === undefined) next.height = el.height;
        return next;
      })
    );
  }, [setElements]);

  const handleDeleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedElementIds((prev) => prev.filter((x) => x !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  }, [selectedElementId, setElements]);

  // Backspace/Delete key to remove selected element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedElementId) {
        e.preventDefault();
        handleDeleteElement(selectedElementId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, handleDeleteElement]);

  /** Sınırsız metin ekleme: her eklemeden sonra seçimi değiştirmiyoruz, böylece hemen yeni metin yazıp tekrar eklenebilir */
  const handleAddText = (text: string, style?: Partial<DesignElement>) => {
    const newElement: DesignElement = {
      id: Date.now().toString(),
      type: "text",
      content: text,
      x: 50,
      y: 45,
      width: 200,
      height: 60,
      fontSize: style?.fontSize || 24,
      color: "#000000",
      fontFamily: style?.fontFamily || DEFAULT_FONT_FAMILY,
      fontWeight: style?.fontWeight || "normal",
      fontStyle: style?.fontStyle || "normal",
      textDecoration: "none",
      textAlign: "center",
      rotation: 0,
      isVisible: true,
      isLocked: false,
    };
    setElements((prev) => [...prev, newElement]);
    // Seçimi güncelleme: kullanıcı "Metin ekle" modunda kalır, ardışık sınırsız metin ekleyebilir
  };

  /** Tasarım görseli ekler — görselin doğal oranı korunur, baskı alanına sığar; tutmaç görsele tam oturur */
  const handleImageUpload = async (imageUrl: string) => {
    const area = designAreaPercent;
    const paLeft = area?.left ?? NaN;
    const paTop = area?.top ?? NaN;
    const paWidth = area?.width ?? NaN;
    const paHeight = area?.height ?? NaN;
    const hasPrintArea = Number.isFinite(paLeft) && Number.isFinite(paTop) && paWidth > 0 && paHeight > 0;
    if (!hasPrintArea || printAreaIsEditing) {
      toast.error("Önce baskı alanını oluşturup 'Kaydet ve kilitle' ile kaydedin.");
      return;
    }
    const x = paLeft + paWidth / 2;
    const y = paTop + paHeight / 2;
    const refSize = 400;
    const maxW = Math.min(220, (paWidth / 100) * refSize * 0.9);
    const maxH = Math.min(220, (paHeight / 100) * refSize * 0.9);

    let imgW = Math.max(48, Math.round(maxW));
    let imgH = Math.max(48, Math.round(maxH));
    try {
      const img = new window.Image();
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Görsel yüklenemedi"));
      });
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const scale = Math.min(maxW / nw, maxH / nh, 1);
      imgW = Math.max(48, Math.round(nw * scale));
      imgH = Math.max(48, Math.round(nh * scale));
    } catch {
      // Oran alınamazsa mevcut baskı alanı oranı kullanılır
    }

    const newElement: DesignElement = {
      id: Date.now().toString(),
      type: "image",
      content: "Uploaded Image",
      x,
      y,
      width: imgW,
      height: imgH,
      imageUrl,
      rotation: 0,
      isVisible: true,
      isLocked: false,
    };
    setElements((prev) => [...prev, newElement]);
    handleSelectionChange([newElement.id], newElement.id);
    toast.success("Tasarım görseli baskı alanına eklendi");
  };

  const requiresColorSelection = useMemo(() => {
    const hasAnySavedMockup = productViews.some((v) => Boolean(v.mockup_image_url));
    return hasAnySavedMockup && !selectedColorId;
  }, [productViews, selectedColorId]);

  const ensureColorSelected = () => {
    if (!requiresColorSelection) return true;
    toast.error("Mockup oluştuktan sonra devam etmek için renk seçmelisiniz");
    return false;
  };

  const handleExport = async (format: "png" | "pdf" | "original") => {
    if (!ensureColorSelected()) return;

    // Enforce daily export limit for individual users only; admins are exempt.
    if (!user) {
      toast.error("İndirme için giriş yapmalısın.");
      return;
    }

    if (!isAdmin && (membership?.plan ?? "individual") === "individual") {
      const { data: ok, error } = await supabase.rpc("can_consume_export", {
        _user_id: user.id,
        _limit: exportDailyLimit,
      });

      if (error) {
        toast.error("İndirme limiti kontrol edilemedi.");
        return;
      }

      if (!ok) {
        toast.error(`Günlük ${exportDailyLimit} indirme limitine ulaştın.`);
        return;
      }
    }

    exportPendingRef.current = { format };
    setCaptureMode(true);
  };

  // Export: captureMode açıldıktan sonra baskı alanı çerçevesi/seçim UI gizlendiği için temiz görüntü yakala
  useEffect(() => {
    if (!captureMode || !exportPendingRef.current) return;
    const { format } = exportPendingRef.current;
    const timer = setTimeout(() => {
      const canvas = document.getElementById("design-canvas");
      exportPendingRef.current = null;
      setCaptureMode(false);
      if (!canvas) return;
      html2canvas(canvas as HTMLElement, {
        backgroundColor: selectedColorHex ?? undefined,
        scale: format === "original" ? 4 : 2,
        useCORS: true,
      })
        .then((renderedCanvas) => {
          const imgData = renderedCanvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `design-${currentViewId}.png`;
          link.href = imgData;
          link.click();
          toast.success(`Design exported as ${format.toUpperCase()}`);
        })
        .catch(() => {
          toast.error("Failed to export design");
        });
    }, 80);
    return () => clearTimeout(timer);
  }, [captureMode, currentViewId, selectedColorHex]);

  const handleSaveDesign = async () => {
    if (!ensureColorSelected()) return;

    if (!designName.trim()) {
      toast.error("Please enter a design name");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to save designs");
      return;
    }

    // Save current view elements first
    const allDesigns = {
      ...designsByView,
      [currentViewId]: elements,
    };

    const { error } = await supabase.from("saved_designs").insert({
      user_id: user.id,
      product_id: currentProductId,
      name: designName.trim(),
      design_data: JSON.parse(JSON.stringify(allDesigns)),
    });

    if (!error) {
      toast.success("Design saved successfully");
      setSaveDialogOpen(false);
      setDesignName("");
    } else {
      toast.error("Failed to save design");
    }
  };

  const handleAddToCartFromDesigner = useCallback(async () => {
    if (!currentProductId || !currentProductName) {
      toast.error("Önce bir ürün seçin.");
      return;
    }
    let colorName: string | null = null;
    if (selectedColorId) {
      const { data: colorRow } = await supabase
        .from("product_colors")
        .select("name")
        .eq("id", selectedColorId)
        .maybeSingle();
      colorName = (colorRow as { name?: string } | null)?.name ?? null;
    }
    const designDataClone: Record<string, unknown[]> = {};
    for (const [viewId, els] of Object.entries(designsByView)) {
      if (els && els.length > 0) {
        designDataClone[viewId] = JSON.parse(JSON.stringify(els));
      }
    }
    const hasDesign = Object.keys(designDataClone).length > 0;
    addToCart(
      {
        productId: currentProductId,
        slug: currentProductSlug,
        name: currentProductName,
        price_from: currentProductPriceFrom,
        product_code: currentProductCode,
        cover_image_url: currentProductCoverUrl,
        selectedColorName: colorName ?? undefined,
        ...(hasDesign ? { designData: designDataClone, designName: designName.trim() || undefined } : {}),
      },
      1
    );
    toast.success(hasDesign ? "Tasarım sepete eklendi. Sepette beden ve adeti güncelleyebilirsiniz." : "Ürün sepete eklendi.");
  }, [
    currentProductId,
    currentProductName,
    currentProductSlug,
    currentProductPriceFrom,
    currentProductCode,
    currentProductCoverUrl,
    selectedColorId,
    designsByView,
    designName,
    addToCart,
  ]);

  const handleLoadDesign = (designData: Record<string, DesignElement[]>, productId: string) => {
    setDesignsByView(designData);
    if (productId) {
      setCurrentProductId(productId);
    }
    // Load first view's elements
    const firstViewId = Object.keys(designData)[0];
    if (firstViewId) {
      setCurrentViewId(firstViewId);
      resetElements(designData[firstViewId] || []);
    }
    handleSelectionChange([], null);
  };

  // Element action handlers
  const handleAlign = (alignment: string) => {
    if (!currentView) return;

    const ids = selectedElementIds.length
      ? selectedElementIds
      : selectedElementId
        ? [selectedElementId]
        : [];

    if (ids.length === 0) return;

    const unlocked = elements.filter((el) => ids.includes(el.id) && el.isLocked !== true);
    if (unlocked.length === 0) return;

    // Align relative to the DESIGN AREA (not the whole canvas)
    const left = designAreaPercent ? designAreaPercent.left : Number(currentView.design_area_left);
    const top = designAreaPercent ? designAreaPercent.top : Number(currentView.design_area_top);
    const width = designAreaPercent ? designAreaPercent.width : Number(currentView.design_area_width);
    const height = designAreaPercent ? designAreaPercent.height : Number(currentView.design_area_height);

    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const inset = 1;

    // Distribute (selection bounds, based on element centers)
    if (alignment === "distribute-horizontal") {
      if (unlocked.length < 3) return;
      const sorted = [...unlocked].sort((a, b) => a.x - b.x);
      const min = sorted[0].x;
      const max = sorted[sorted.length - 1].x;
      const step = (max - min) / (sorted.length - 1 || 1);

      setElements((prev) =>
        prev.map((el) => {
          const idx = sorted.findIndex((s) => s.id === el.id);
          if (idx === -1) return el;
          return { ...el, x: min + step * idx };
        })
      );
      return;
    }

    if (alignment === "distribute-vertical") {
      if (unlocked.length < 3) return;
      const sorted = [...unlocked].sort((a, b) => a.y - b.y);
      const min = sorted[0].y;
      const max = sorted[sorted.length - 1].y;
      const step = (max - min) / (sorted.length - 1 || 1);

      setElements((prev) =>
        prev.map((el) => {
          const idx = sorted.findIndex((s) => s.id === el.id);
          if (idx === -1) return el;
          return { ...el, y: min + step * idx };
        })
      );
      return;
    }

    // Snap to centerlines
    if (alignment === "snap-center-x") {
      setElements((prev) =>
        prev.map((el) => (ids.includes(el.id) && el.isLocked !== true ? { ...el, x: centerX } : el))
      );
      return;
    }

    if (alignment === "snap-center-y") {
      setElements((prev) =>
        prev.map((el) => (ids.includes(el.id) && el.isLocked !== true ? { ...el, y: centerY } : el))
      );
      return;
    }

    const updates: Partial<DesignElement> = {};

    if (alignment === "left") updates.x = left + inset;
    if (alignment === "center") updates.x = centerX;
    if (alignment === "right") updates.x = left + width - inset;

    if (alignment === "top") updates.y = top + inset;
    if (alignment === "middle") updates.y = centerY;
    if (alignment === "bottom") updates.y = top + height - inset;

    if (alignment === "center-both") {
      updates.x = centerX;
      updates.y = centerY;
    }

    if (Object.keys(updates).length === 0) return;

    setElements((prev) =>
      prev.map((el) => (ids.includes(el.id) && el.isLocked !== true ? { ...el, ...updates } : el))
    );
  };

  const handleFlip = (direction: "horizontal" | "vertical") => {
    if (!selectedElement) return;
    if (selectedElement.isLocked) return;

    if (direction === "horizontal") {
      const next = (selectedElement.scaleX ?? 1) * -1;
      handleUpdateElement(selectedElement.id, { scaleX: next });
      toast.success("Yatay çevirme uygulandı");
      return;
    }

    const next = (selectedElement.scaleY ?? 1) * -1;
    handleUpdateElement(selectedElement.id, { scaleY: next });
    toast.success("Dikey çevirme uygulandı");
  };

  /** Görsel üzerinde kırp modu (Tapstitch tarzı); null = kapalı */
  const [cropModeElementId, setCropModeElementId] = useState<string | null>(null);
  /** Kırp bölgesi: görsel üzerinde yüzde (0–100) */
  const [cropRegion, setCropRegion] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });

  const handleRemoveBg = useCallback(async () => {
    if (!selectedElement || selectedElement.type !== "image" || !selectedElement.imageUrl) {
      toast.error("Görsel seçin.");
      return;
    }
    const apiKey = import.meta.env.VITE_REMOVE_BG_API_KEY;
    if (!apiKey) {
      toast.error("Arka plan kaldırma için VITE_REMOVE_BG_API_KEY tanımlayın (remove.bg API).");
      return;
    }
    try {
      toast.loading("Arka plan kaldırılıyor…", { id: "removebg" });
      const form = new FormData();
      if (selectedElement.imageUrl.startsWith("blob:")) {
        const res = await fetch(selectedElement.imageUrl);
        const blob = await res.blob();
        form.append("image_file", blob, "image.png");
      } else {
        form.append("image_url", selectedElement.imageUrl);
      }
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: form,
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || response.statusText);
      }
      const resultBlob = await response.blob();
      const url = URL.createObjectURL(resultBlob);
      if (selectedElement.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedElement.imageUrl);
      }
      handleUpdateElement(selectedElement.id, { imageUrl: url });
      toast.success("Arka plan kaldırıldı.", { id: "removebg" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Arka plan kaldırılamadı.", { id: "removebg" });
    }
  }, [selectedElement, handleUpdateElement]);

  const handleCrop = useCallback(() => {
    if (!selectedElement || selectedElement.type !== "image" || !selectedElement.imageUrl) {
      toast.error("Kırpılacak görsel seçin.");
      return;
    }
    setCropModeElementId(selectedElement.id);
    setCropRegion({ left: 0, top: 0, width: 100, height: 100 });
  }, [selectedElement]);

  /** Görsel üzerinden kırp onayı: imageUrl + yüzde bölge → canvas kırp → element güncelle */
  const handleCropConfirmFromRegion = useCallback(
    async (elementId: string, region: { left: number; top: number; width: number; height: number }) => {
      const el = elements.find((e) => e.id === elementId);
      if (!el || el.type !== "image" || !el.imageUrl) return;

      let imageUrlToLoad = el.imageUrl;
      let revokeAfterLoad = false;
      if (!el.imageUrl.startsWith("blob:")) {
        try {
          const res = await fetch(el.imageUrl, { mode: "cors" });
          if (!res.ok) throw new Error(res.statusText);
          const blob = await res.blob();
          imageUrlToLoad = URL.createObjectURL(blob);
          revokeAfterLoad = true;
        } catch {
          toast.error("Kırpma için görsel yüklenemedi (CORS olabilir).");
          setCropModeElementId(null);
          return;
        }
      }

      const img = new Image();
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Görsel yüklenemedi"));
          img.src = imageUrlToLoad;
        });
      } catch {
        if (revokeAfterLoad) URL.revokeObjectURL(imageUrlToLoad);
        toast.error("Kırpma için görsel yüklenemedi.");
        setCropModeElementId(null);
        return;
      }

      if (revokeAfterLoad) URL.revokeObjectURL(imageUrlToLoad);

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const x = (region.left / 100) * nw;
      const y = (region.top / 100) * nh;
      const w = Math.max(1, (region.width / 100) * nw);
      const h = Math.max(1, (region.height / 100) * nh);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      return new Promise<string>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              setCropModeElementId(null);
              return;
            }
            const url = URL.createObjectURL(blob);
            if (el.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(el.imageUrl);
            handleUpdateElement(elementId, { imageUrl: url, width: Math.round(w), height: Math.round(h) });
            setCropModeElementId(null);
            toast.success("Görsel kırpıldı.");
            resolve(url);
          },
          "image/png",
          0.95
        );
      });
    },
    [elements, handleUpdateElement]
  );

  const handleCropCancel = useCallback(() => {
    setCropModeElementId(null);
  }, []);

  const handleDuplicate = () => {
    if (!selectedElement) return;
    
    const newElement: DesignElement = {
      ...selectedElement,
      id: Date.now().toString(),
      x: selectedElement.x + 5,
      y: selectedElement.y + 5,
    };
    setElements((prev) => [...prev, newElement]);
    handleSelectionChange([newElement.id], newElement.id);
    toast.success("Element duplicated");
  };

  const handleSaveAsTemplate = () => {
    toast.info("Save as template - Coming soon");
  };

  const parseHex = (hex: string) => {
    const normalized = hex.trim().toUpperCase();
    if (!/^#([0-9A-F]{6})$/.test(normalized)) return null;
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    return { r, g, b, normalized };
  };

  const tshirtAssetPalette = useMemo(
    () =>
      [
        { suffix: "white", hex: "#FFFFFF", label: "Beyaz" },
        { suffix: "black", hex: "#000000", label: "Siyah" },
        { suffix: "red", hex: "#FF0000", label: "Kırmızı" },
        { suffix: "green", hex: "#00FF00", label: "Yeşil" },
        { suffix: "navy", hex: "#0000FF", label: "Lacivert" },
        { suffix: "gray", hex: "#808080", label: "Gri" },
      ].map((c) => ({ ...c, rgb: parseHex(c.hex)! })),
    []
  );

  const computeTshirtColorFallback = useCallback(
    (hex: string) => {
      const rgb = parseHex(hex);
      if (!rgb) {
        return { suffix: "white", label: "Beyaz", exact: false };
      }

      const exact = tshirtAssetPalette.find((c) => c.rgb.normalized === rgb.normalized);
      if (exact) return { suffix: exact.suffix, label: exact.label, exact: true };

      let best = tshirtAssetPalette[0];
      let bestDist = Number.POSITIVE_INFINITY;

      for (const c of tshirtAssetPalette) {
        const dr = rgb.r - c.rgb.r;
        const dg = rgb.g - c.rgb.g;
        const db = rgb.b - c.rgb.b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }

      return { suffix: best.suffix, label: best.label, exact: false };
    },
    [tshirtAssetPalette]
  );

  const resolvedMockup = useMemo(() => {
    // 0) If a mockup is staged (uploaded but not saved yet), always show it.
    if (currentViewId && pendingMockups[currentViewId]) {
      return { url: pendingMockups[currentViewId].previewUrl, warning: null as string | null };
    }

    // 1) Color-specific mockup from backend table
    if (currentViewId && selectedColorId) {
      const colorMockup = colorMockups[`${currentViewId}-${selectedColorId}`];
      if (colorMockup) return { url: colorMockup, warning: null as string | null };
    }

    // 2) View default mockup (uploaded per-view); relative path is normalized
    if (currentView?.mockup_image_url) {
      const raw = currentView.mockup_image_url;
      const url =
        raw.startsWith("http") || raw.startsWith("/") ? raw : raw.startsWith("blob:") ? raw : `/${raw}`;
      return { url, warning: null as string | null };
    }
    // 3) No automatic mockup fallback: keep the stage blank until the user uploads a mockup.
    return { url: "", warning: null as string | null };
  }, [
    colorMockups,
    currentView,
    currentViewId,
    pendingMockups,
    selectedColorId,
  ]);

  const [mockupWarning, setMockupWarning] = useState<string | null>(null);
  const [mockupWarningKey, setMockupWarningKey] = useState<string>("");

  useEffect(() => {
    setMockupWarning(resolvedMockup.warning);

    if (resolvedMockup.warning) {
      const key = `${currentProductId}|${currentViewId}|${selectedColorHex}`;
      if (key !== mockupWarningKey) {
        setMockupWarningKey(key);
        toast.warning(resolvedMockup.warning);
      }
    }
  }, [
    resolvedMockup.warning,
    currentProductId,
    currentViewId,
    selectedColorHex,
    mockupWarningKey,
  ]);

  const getMockupImage = () => {
    // If no product is selected, return empty string to show only print area
    if (!currentProductId || productViews.length === 0) return "";
    return resolvedMockup.url;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "upload":
        return <UploadPanel onImageSelect={handleImageUpload} disabled={!canUploadDesignImage} />;
      case "text":
        return (
          <TextTemplates
            onAddText={handleAddText}
            selectedElement={selectedElement}
            onUpdateSelectedText={(updates) =>
              selectedElement?.type === "text" && handleUpdateElement(selectedElement.id, updates)
            }
          />
        );

      case "layers":
        return (
          <LayersPanel
            elements={elements}
            selectedElementId={selectedElementId}
            selectedElementIds={selectedElementIds}
            onSelectionChange={handleSelectionChange}
            onDeleteElement={handleDeleteElement}
            onUpdateElement={handleUpdateElement}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Tabs */}
        <ToolSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        {/* Tab Content Panel */}
        <aside className="w-72 bg-card border-r border-border overflow-y-auto flex flex-col">
          {renderTabContent()}
        </aside>

        {/* Canvas: toolbar, scrollable mockup, sabit Print Area butonları (her zaman görünür) */}
        <div className="flex-1 flex flex-col relative min-h-0">
          {/* Toolbar */}
          <div className="border-b border-border bg-background shrink-0 min-h-[52px] flex items-center justify-between gap-2 px-3 py-2">
            {selectedElement ? (
              <div className="flex-1 overflow-x-auto min-w-0">
                <ElementActionsBar
                  onAlign={handleAlign}
                  onFlip={handleFlip}
                  onRemoveBg={handleRemoveBg}
                  onCrop={handleCrop}
                  onDuplicate={handleDuplicate}
                  onSaveAsTemplate={handleSaveAsTemplate}
                  elementType={selectedElement.type}
                  isLocked={anySelectedLocked}
                />
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <CatalogBar
                  currentProductId={currentProductId}
                  currentProductName={currentProductName}
                  onProductSelect={handleProductSelect}
                />
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                disabled={!canUndo}
                onClick={() => undo()}
                title="Geri al"
                aria-label="Geri al"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                disabled={!canRedo}
                onClick={() => redo()}
                title="İleri al"
                aria-label="İleri al"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                variant={showGrid ? "secondary" : "outline"}
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => setShowGrid((v) => !v)}
                title="Izgara"
                aria-label="Izgara"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={fitToPrintArea ? "secondary" : "outline"}
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => {
                  if (fitToPrintArea) {
                    setZoom(100);
                    setFitToPrintArea(false);
                  } else {
                    const w = designAreaPercent?.width ?? (currentView ? Number(currentView.design_area_width) : 40);
                    const h = designAreaPercent?.height ?? (currentView ? Number(currentView.design_area_height) : 40);
                    const minSide = Math.min(w, h) || 40;
                    const fitZoom = Math.max(100, Math.min(400, Math.round((100 * 100) / minSide)));
                    setZoom(fitZoom);
                    setFitToPrintArea(true);
                  }
                }}
                title={fitToPrintArea ? "Önceki görünüme dön" : "Baskı alanını alana sığdır"}
                aria-label={fitToPrintArea ? "Önceki görünüme dön" : "Baskı alanını alana sığdır"}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    title="Yakınlaştır"
                    aria-label="Yakınlaştır"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="end" side="bottom">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Yakınlaştır</span>
                      <span className="tabular-nums font-medium">{zoom}%</span>
                    </div>
                    <Slider
                      min={100}
                      max={400}
                      step={5}
                      value={[zoom]}
                      onValueChange={([v]) => {
                        setFitToPrintArea(false);
                        setZoom(v);
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-px h-7 bg-border mx-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-9"
                    disabled={requiresColorSelection}
                    title={requiresColorSelection ? "Renk seçmeden export yapılamaz" : "Export"}
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border border-border shadow-md z-50">
                  <DropdownMenuItem disabled={requiresColorSelection} onClick={() => handleExport("original")}>
                    <FileImage className="w-4 h-4 mr-2" />
                    Export Original (High-Res)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg h-9"
                disabled={requiresColorSelection}
                title={requiresColorSelection ? "Renk seçmeden kaydedemezsiniz" : "Save"}
                onClick={() => {
                  if (requiresColorSelection) {
                    toast.error("Mockup oluştuktan sonra devam etmek için renk seçmelisiniz");
                    return;
                  }
                  setSaveDialogOpen(true);
                }}
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button
                size="sm"
                variant="default"
                className="rounded-lg h-9"
                disabled={!currentProductId}
                title={!currentProductId ? "Önce bir ürün seçin" : "Tasarımı sepete ekle"}
                onClick={() => handleAddToCartFromDesigner()}
              >
                <ShoppingCart className="w-4 h-4" />
                Sepete ekle
              </Button>
              <div className="w-px h-7 bg-border ml-1" />
              <UserMenu />
            </div>
          </div>

          {/* Mockup alanı ekrana sığar; görünüm butonları altta sabit */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <MockupStage
                mockupImage={getMockupImage()}
            designElements={elements}
            selectedElementId={cropModeElementId ?? selectedElementId}
            onSelectionChange={(ids, primary) => {
              if (!cropModeElementId) handleSelectionChange(ids, primary);
            }}
            onDeleteElement={handleDeleteElement}
            onUpdateElement={handleUpdateElement}
            cropModeElementId={cropModeElementId}
            cropRegion={cropRegion}
            onCropRegionChange={setCropRegion}
            onCropConfirm={handleCropConfirmFromRegion}
            onCropCancel={handleCropCancel}
            onClearDesignImages={() => {
              setElements([]);
              setDesignsByView((prev) => (currentViewId ? { ...prev, [currentViewId]: [] } : prev));
              handleSelectionChange([], null);
              toast.success("Görsel silindi");
            }}
            views={productViews.map((v) => ({ id: v.id, view_name: v.view_name }))}
            activeViewId={currentViewId}
            onViewChange={handleViewChange}
            onReorderViews={async (orderedViewIds) => {
              if (!currentProductId) return;

              const prev = productViews;
              const next = orderedViewIds
                .map((id) => prev.find((v) => v.id === id))
                .filter(Boolean) as ProductView[];

              setProductViews(next.map((v, idx) => ({ ...v, view_order: idx })));

              try {
                const results = await Promise.all(
                  next.map((v, idx) => supabase.from("product_views").update({ view_order: idx }).eq("id", v.id))
                );

                if (results.some((r) => r.error)) throw new Error("order_update_failed");
                toast.success("Görünüm sırası güncellendi");
              } catch {
                setProductViews(prev);
                toast.error("Görünüm sırası güncellenemedi");
              }
            }}
            onAddView={async (viewName) => {
              if (!currentProductId || productViews.length >= 10) return;
              
              const { data, error } = await supabase
                .from("product_views")
                .insert({
                  product_id: currentProductId,
                  view_name: viewName,
                  view_order: productViews.length,
                  mockup_image_url: null,
                  design_area_top: 30,
                  design_area_left: 30,
                  design_area_width: 40,
                  design_area_height: 40,
                })
                .select()
                .single();

              if (error) {
                toast.error("Görünüm eklenemedi");
                return;
              }

              setProductViews((prev) => [...prev, data as ProductView]);
              toast.success("Görünüm eklendi");
            }}
            onUpdateViewName={async (viewId, newName) => {
              const { error } = await supabase
                .from("product_views")
                .update({ view_name: newName })
                .eq("id", viewId);

              if (error) {
                toast.error("Görünüm güncellenemedi");
                return;
              }

              setProductViews((prev) =>
                prev.map((v) => (v.id === viewId ? { ...v, view_name: newName } : v))
              );
              toast.success("Görünüm güncellendi");
            }}
            onDeleteView={async (viewId) => {
              if (productViews.length <= 1) {
                toast.error("En az 1 görünüm kalmalı");
                return;
              }

              const { error } = await supabase
                .from("product_views")
                .delete()
                .eq("id", viewId);

              if (error) {
                toast.error("Görünüm silinemedi");
                return;
              }

              setProductViews((prev) => prev.filter((v) => v.id !== viewId));
              if (currentViewId === viewId && productViews.length > 1) {
                const nextView = productViews.find((v) => v.id !== viewId);
                if (nextView) setCurrentViewId(nextView.id);
              }
              toast.success("Görünüm silindi");
            }}
            onPickFileForView={(viewId, file) => {
              const previewUrl = URL.createObjectURL(file);
              setPendingMockups((prev) => ({
                ...prev,
                [viewId]: {
                  file,
                  previewUrl,
                  previousUrl: productViews.find((v) => v.id === viewId)?.mockup_image_url ?? null,
                },
              }));
              setCurrentViewId(viewId);
            }}
            onPickFileForDesign={canUploadDesignImage ? (file) => {
              const url = URL.createObjectURL(file);
              handleImageUpload(url);
            } : undefined}
            hasUnsavedMockup={Boolean(currentViewId && pendingMockups[currentViewId]) || (getMockupImage() && getMockupImage().startsWith("blob:"))}
            isSavingMockup={isSavingMockup}
            saveProgress={mockupSaveProgress}
            saveStatusText={mockupSaveStatus}
            onSaveMockup={async () => {
              if (!currentViewId) return;
              const pending = pendingMockups[currentViewId];
              if (!pending) return;

              try {
                setIsSavingMockup(true);
                setMockupSaveProgress(10);
                setMockupSaveStatus("Yükleniyor…");

                const safeName = sanitizeStorageFileName(pending.file.name);
                const ext = safeName.includes(".") ? safeName.split(".").pop() : "png";
                const filePath = `mockups/${Date.now()}-${currentViewId}.${ext}`;

                const { error: uploadError } = await supabase.storage
                  .from("product-mockups")
                  .upload(filePath, pending.file, { upsert: true });

                if (uploadError) {
                  toast.error("Mockup kaydedilemedi");
                  return;
                }

                setMockupSaveProgress(70);
                setMockupSaveStatus("Bağlanıyor…");

                const {
                  data: { publicUrl },
                } = supabase.storage.from("product-mockups").getPublicUrl(filePath);

                setMockupSaveProgress(85);
                setMockupSaveStatus("Kaydediliyor…");

                const defaultArea = currentProductCategory
                  ? getDefaultCanvasArea(currentProductCategory)
                  : getFallbackCanvasArea();

                const { error: dbError } = await supabase
                  .from("product_views")
                  .update({
                    mockup_image_url: publicUrl,
                    design_area_top: defaultArea.top,
                    design_area_left: defaultArea.left,
                    design_area_width: defaultArea.width,
                    design_area_height: defaultArea.height,
                  })
                  .eq("id", currentViewId);

                if (dbError) {
                  toast.error("Mockup kaydedilemedi");
                  return;
                }

                setMockupSaveProgress(95);
                setMockupSaveStatus("Son işlem…");

                setProductViews((prev) =>
                  prev.map((v) =>
                    v.id === currentViewId
                      ? {
                          ...v,
                          mockup_image_url: publicUrl,
                          design_area_top: defaultArea.top,
                          design_area_left: defaultArea.left,
                          design_area_width: defaultArea.width,
                          design_area_height: defaultArea.height,
                        }
                      : v,
                  ),
                );
                URL.revokeObjectURL(pending.previewUrl);
                setPendingMockups((prev) => {
                  const next = { ...prev };
                  delete next[currentViewId];
                  return next;
                });

                setMockupSaveProgress(100);
                setMockupSaveStatus("Kaydedildi");
                toast.success("Mockup kaydedildi");
              } finally {
                // Keep the "Kaydedildi" state briefly, then reset.
                window.setTimeout(() => {
                  setIsSavingMockup(false);
                  setMockupSaveProgress(0);
                  setMockupSaveStatus("");
                }, 900);
              }
            }}
            onCancelMockup={() => {
              if (!currentViewId) return;
              const pending = pendingMockups[currentViewId];
              if (!pending) return;

              setProductViews((prev) =>
                prev.map((v) =>
                  v.id === currentViewId ? { ...v, mockup_image_url: pending.previousUrl ?? null } : v,
                ),
              );
              URL.revokeObjectURL(pending.previewUrl);
              setPendingMockups((prev) => {
                const next = { ...prev };
                delete next[currentViewId];
                return next;
              });
              toast.message("Mockup değişikliği iptal edildi");
            }}
            onRemoveMockup={async () => {
              if (!currentViewId) return;
              const view = productViews.find((v) => v.id === currentViewId);
              if (!view?.mockup_image_url) return;

              try {
                setIsSavingMockup(true);
                const { error } = await supabase
                  .from("product_views")
                  .update({ mockup_image_url: null })
                  .eq("id", currentViewId);

                if (error) {
                  toast.error("Mockup kaldırılamadı");
                  return;
                }

                setProductViews((prev) =>
                  prev.map((v) =>
                    v.id === currentViewId ? { ...v, mockup_image_url: null } : v,
                  ),
                );
                setColorMockups((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((key) => {
                    if (key.startsWith(`${currentViewId}-`)) delete next[key];
                  });
                  return next;
                });
                toast.success("Mockup kaldırıldı");
              } finally {
                setIsSavingMockup(false);
              }
            }}
            printArea={
              designAreaPercent && designAreaPercent.width > 0 && designAreaPercent.height > 0
                ? {
                    top: designAreaPercent.top,
                    left: designAreaPercent.left,
                    width: designAreaPercent.width,
                    height: designAreaPercent.height,
                  }
                : currentView &&
                  Number(currentView.design_area_width) > 0 &&
                  Number(currentView.design_area_height) > 0
                ? {
                    top: Number(currentView.design_area_top),
                    left: Number(currentView.design_area_left),
                    width: Number(currentView.design_area_width),
                    height: Number(currentView.design_area_height),
                  }
                : currentView &&
                  Number(currentView.design_area_width) === 0 &&
                  Number(currentView.design_area_height) === 0
                ? null
                : undefined
            }
            disablePrintAreaEdit={false}
            printAreaDimensionsCm={currentViewId ? printAreaDimensionsByView[currentViewId] : undefined}
            triggerPrintAreaEdit={triggerPrintAreaEdit}
            onPrintAreaEditStateChange={setPrintAreaIsEditing}
            onOpenPrintAreaCreator={() => {
              setPrintAreaWidthCm("");
              setPrintAreaHeightCm("");
              setPrintAreaCreatorOpen(true);
            }}
            onResetPrintArea={async () => {
              if (!currentViewId) return;
              if (!window.confirm("Bu görünümün baskı alanı kaldırılacak. Baskı alanı oluşturucu ile yeniden oluşturabilirsiniz. Devam edilsin mi?")) return;
              const payload = {
                design_area_top: 0,
                design_area_left: 0,
                design_area_width: 0,
                design_area_height: 0,
              };
              const { error } = await supabase.from("product_views").update(payload).eq("id", currentViewId);
              if (error) {
                toast.error("Baskı alanı sıfırlanamadı");
                return;
              }
              setProductViews((prev) => prev.map((v) => (v.id === currentViewId ? { ...v, ...payload } : v)));
              setPrintAreaDimensionsByView((prev) => {
                const next = { ...prev };
                delete next[currentViewId];
                return next;
              });
              const { data: attrsRow } = await supabase.from("product_attributes").select("data").eq("product_id", currentProductId).maybeSingle();
              const attrs = (attrsRow?.data as Record<string, unknown>) ?? {};
              const byView = (attrs.print_area_dimensions_by_view as Record<string, unknown>) ?? {};
              const nextByView = { ...byView };
              delete nextByView[currentViewId];
              await supabase.from("product_attributes").upsert({ product_id: currentProductId, data: { ...attrs, print_area_dimensions_by_view: nextByView } }, { onConflict: "product_id" });
              toast.success("Baskı alanı silindi. Baskı alanı oluşturucu ile yeniden oluşturabilirsiniz.");
            }}
            showGrid={showGrid}
            zoom={zoom}
            captureMode={captureMode}
            onSavePrintArea={async (area) => {
              if (!currentViewId) {
                toast.error("Baskı alanı için önce bir görünüm seçin veya ekleyin.");
                return;
              }

              const payload = {
                design_area_top: area.top,
                design_area_left: area.left,
                design_area_width: area.width,
                design_area_height: area.height,
              };

              const { error } = await supabase.from("product_views").update(payload).eq("id", currentViewId);
              if (error) {
                toast.error("Baskı alanı kaydedilemedi");
                return;
              }

              setProductViews((prev) =>
                prev.map((v) => (v.id === currentViewId ? { ...v, ...payload } : v)),
              );
              toast.success("Baskı alanı kaydedildi");
            }}
          />
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Design</DialogTitle>
            <DialogDescription>
              Enter a name for your design. Your design will be saved to your account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="design-name">Design Name</Label>
            <Input
              id="design-name"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="My Awesome Design"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDesign}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Baskı alanı oluşturucu: görünüm için en × boy (cm) girerek baskı alanı oluştur */}
      <Dialog open={printAreaCreatorOpen} onOpenChange={setPrintAreaCreatorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baskı alanı oluşturucu</DialogTitle>
            <DialogDescription>
              Bu görünüm için baskı ebatını girin (en × boy). Örn. 8,5 × 20 cm. Oranına göre baskı alanı oluşturulur.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="print-area-width-cm">En (cm)</Label>
                <Input
                  id="print-area-width-cm"
                  type="text"
                  inputMode="decimal"
                  placeholder="8,5"
                  value={printAreaWidthCm}
                  onChange={(e) => setPrintAreaWidthCm(e.target.value.replace(",", "."))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="print-area-height-cm">Boy (cm)</Label>
                <Input
                  id="print-area-height-cm"
                  type="text"
                  inputMode="decimal"
                  placeholder="20"
                  value={printAreaHeightCm}
                  onChange={(e) => setPrintAreaHeightCm(e.target.value.replace(",", "."))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintAreaCreatorOpen(false)}>
              İptal
            </Button>
            <Button
              disabled={isSavingPrintArea || !printAreaWidthCm.trim() || !printAreaHeightCm.trim()}
              onClick={async () => {
                const w = parseFloat(printAreaWidthCm.replace(",", "."));
                const h = parseFloat(printAreaHeightCm.replace(",", "."));
                if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
                  toast.error("Geçerli en ve boy girin (örn. 8,5 ve 20)");
                  return;
                }
                if (!currentViewId) return;
                setIsSavingPrintArea(true);
                const aspect = w / h;
                const heightPct = 40;
                const widthPct = Math.max(10, Math.min(90, heightPct * aspect));
                const left = Math.max(0, (100 - widthPct) / 2);
                const top = Math.max(0, (100 - heightPct) / 2);
                const payload = {
                  design_area_top: top,
                  design_area_left: left,
                  design_area_width: widthPct,
                  design_area_height: heightPct,
                };
                const { error } = await supabase.from("product_views").update(payload).eq("id", currentViewId);
                if (error) {
                  toast.error("Baskı alanı kaydedilemedi");
                  setIsSavingPrintArea(false);
                  return;
                }
                setProductViews((prev) =>
                  prev.map((v) => (v.id === currentViewId ? { ...v, ...payload } : v)),
                );
                const dims = { width_cm: w, height_cm: h, width_pct: widthPct, height_pct: heightPct };
                setPrintAreaDimensionsByView((prev) => ({ ...prev, [currentViewId]: dims }));
                const { data: attrsRow } = await supabase
                  .from("product_attributes")
                  .select("data")
                  .eq("product_id", currentProductId)
                  .maybeSingle();
                const attrs = (attrsRow?.data as Record<string, unknown>) ?? {};
                const byView = (attrs.print_area_dimensions_by_view as Record<string, { width_cm: number; height_cm: number; width_pct?: number; height_pct?: number }>) ?? {};
                await supabase
                  .from("product_attributes")
                  .upsert({
                    product_id: currentProductId,
                    data: { ...attrs, print_area_dimensions_by_view: { ...byView, [currentViewId]: dims } },
                  }, { onConflict: "product_id" });
                setPrintAreaCreatorOpen(false);
                setPrintAreaWidthCm("");
                setPrintAreaHeightCm("");
                setIsSavingPrintArea(false);
                setTriggerPrintAreaEdit(Date.now());
                toast.success(`Baskı alanı oluşturuldu (${w} × ${h} cm). Taşımak için sürükleyin.`);
              }}
            >
              Uygula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
