import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { NewcatalogChrome } from "@/components/newcatalog/layout/NewcatalogChrome";
import { ProductConfigurator } from "@/components/newcatalog/product/ProductConfigurator";
import { ProductDetailsAccordion } from "@/components/newcatalog/product/ProductDetailsAccordion";
import {
  usePublicCategory,
  usePublicProductAttributes,
  usePublicProductById,
  usePublicProductBySlug,
  usePublicProductColors,
  usePublicProductGallery,
  usePublicProductMockups,
  usePublicProductSizes,
  usePublicProductViews,
  usePublicUnitPriceTiers,
  usePublicViewColorMockup,
} from "@/hooks/usePublicProduct";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { getSignedImageUrl } from "@/lib/storage";

function formatSizeRange(sizes: string[]) {
  if (sizes.length === 0) return null;
  if (sizes.length === 1) return sizes[0];
  return `${sizes[0]}-${sizes[sizes.length - 1]}`;
}

function ProductGalleryImage({ src, alt, uniqueKey }: { src: string; alt: string; uniqueKey: string }) {
  const [displayUrl, setDisplayUrl] = useState<string>(src);
  const [triedSigned, setTriedSigned] = useState(false);

  useEffect(() => {
    setDisplayUrl(src);
    setTriedSigned(false);
    if (src && !src.startsWith("http")) {
      getSignedImageUrl(src).then((url) => {
        if (url) setDisplayUrl(url);
      });
    }
  }, [src]);

  const handleError = () => {
    if (triedSigned) return;
    setTriedSigned(true);
    getSignedImageUrl(src).then((url) => {
      if (url) setDisplayUrl(url);
    });
  };

  return (
    <div className="ru-gallery-item">
      <img
        src={displayUrl}
        alt={alt}
        className="ru-gallery-img"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={handleError}
      />
    </div>
  );
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

function pickAttrStringArray(data: Record<string, unknown> | undefined, keys: string[]) {
  if (!data) return [] as string[];
  for (const k of keys) {
    const v = data[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      return v
        .map((x) => (typeof x === "string" ? x.trim() : x != null ? String(x).trim() : ""))
        .filter(Boolean);
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return [];
      // allow comma-separated legacy values
      return s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [String(v)].map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

export default function ProductPage() {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const productBySlug = usePublicProductBySlug(slug);
  const productById = usePublicProductById(id);
  const product = (slug ? productBySlug.data : productById.data) ?? null;
  const productId = product?.id;

  const { data: category } = usePublicCategory(product?.category_id);
  const { data: gallery } = usePublicProductGallery(productId);
  const { data: colors } = usePublicProductColors(productId);
  const { data: sizes } = usePublicProductSizes(productId);
  const { data: attrsRow } = usePublicProductAttributes(productId);
  const { data: mockups } = usePublicProductMockups(productId);
  const { data: views } = usePublicProductViews(productId);
  const { data: unitPriceTiers } = usePublicUnitPriceTiers(productId);

  const [colorOpen, setColorOpen] = useState(false);
  const colorWrapRef = useRef<HTMLDivElement | null>(null);
  const galleryStripRef = useRef<HTMLDivElement | null>(null);
  const configuratorAddToCartRef = useRef<{ addToCartWithCurrentSelections: () => void } | null>(null);

  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"front" | "back">("front");
  const [addToCartQty, setAddToCartQty] = useState(1);
  const { addItem: addToCart, items: cartItems } = useCart();

  const attrs = (attrsRow?.data ?? {}) as Record<string, unknown>;

  const stockMode = useMemo(() => {
    const v = (attrs as any).stock_mode;
    return v === "quantity" || v === "out_of_stock" ? v : "in_stock";
  }, [attrs]);
  const stockQuantity = useMemo(() => {
    if (stockMode !== "quantity") return null;
    const v = (attrs as any).stock_quantity;
    const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }, [attrs, stockMode]);
  const productMaxStock = useMemo(() => {
    if (stockMode === "out_of_stock") return 0;
    if (stockMode === "quantity" && stockQuantity !== null) return stockQuantity;
    return null;
  }, [stockMode, stockQuantity]);
  const cartQtyForProduct = useMemo(
    () => cartItems.find((i) => i.productId === productId ?? "")?.quantity ?? 0,
    [cartItems, productId]
  );
  const remainingStock = useMemo(() => {
    if (productMaxStock === null) return null;
    return Math.max(0, productMaxStock - cartQtyForProduct);
  }, [productMaxStock, cartQtyForProduct]);

  useEffect(() => {
    if (remainingStock !== null && addToCartQty > remainingStock)
      setAddToCartQty(Math.max(1, remainingStock));
  }, [remainingStock, addToCartQty]);

  useEffect(() => {
    if (!selectedColorId && colors?.length) setSelectedColorId(colors[0].id);
  }, [colors, selectedColorId]);


  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = colorWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setColorOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  usePageMeta({
    title: (product as any)?.meta_title || product?.name || "Product",
    description: (product as any)?.meta_description || null,
  });

  const galleryImages = useMemo(() => {
    const fromDb = (gallery ?? []).map((g) => ({ src: g.image_url, alt: `${product?.name ?? "Product"} image` }));
    if (fromDb.length > 0) return fromDb;

    const fallback = product?.cover_image_url || product?.thumbnail_url;
    return fallback ? [{ src: fallback, alt: `${product?.name ?? "Product"} image` }] : [];
  }, [gallery, product?.cover_image_url, product?.name, product?.thumbnail_url]);

  const activeViewId = useMemo(() => {
    const list = views ?? [];
    if (list.length === 0) return null;
    const needle = selectedView === "front" ? "front" : "back";
    const byName = list.find((v) => (v.view_name || "").toLowerCase().includes(needle));
    return (byName ?? list[0]).id;
  }, [selectedView, views]);

  const { data: colorMockupUrl } = usePublicViewColorMockup(activeViewId, selectedColorId);

  const viewFallbackUrl = useMemo(() => {
    const list = views ?? [];
    const active = activeViewId ? list.find((v) => v.id === activeViewId) : null;
    return active?.mockup_image_url ?? null;
  }, [activeViewId, views]);

  const legacyMockupUrl = useMemo(() => {
    if (!mockups) return null;
    return selectedView === "front" ? mockups.front_image_url : mockups.back_image_url;
  }, [mockups, selectedView]);

  const sizeNames = useMemo(() => (sizes ?? []).map((s) => s.name), [sizes]);

  useEffect(() => {
    if (!selectedSize && sizeNames.length) setSelectedSize(sizeNames[0]);
  }, [selectedSize, sizeNames]);
  const sizeRange = useMemo(() => formatSizeRange(sizeNames), [sizeNames]);
  const colorCount = colors?.length ?? 0;

  const gsm = pickAttrNumber(attrs, ["gsm", "fabric_gsm", "fabric_weight_gsm", "weight_gsm"]);
  const oz = pickAttrNumber(attrs, ["oz", "fabric_oz", "fabric_weight_oz", "weight_oz"]);

  const techniques = useMemo(
    () => pickAttrStringArray(attrs, ["decoration_method", "technique"]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify((attrs as any)?.decoration_method), JSON.stringify((attrs as any)?.technique)]
  );

  const region = useMemo(() => {
    const v = attrs.region;
    if (typeof v === "string") return v.trim() || null;
    if (Array.isArray(v)) {
      const first = v[0];
      return typeof first === "string" ? first.trim() || null : first != null ? String(first) : null;
    }
    return null;
  }, [attrs.region]);

  const fulfillmentFrom = useMemo(() => {
    const v = (attrs as any).fulfillment_from;
    if (typeof v === "string") return v.trim() || null;
    if (Array.isArray(v)) {
      const first = v[0];
      return typeof first === "string" ? first.trim() || null : first != null ? String(first) : null;
    }
    return null;
  }, [attrs]);

  const fulfillmentCity = useMemo(() => {
    const v = (attrs as any).fulfillment_city;
    return typeof v === "string" ? v.trim() || null : null;
  }, [attrs]);

  const sizeGuideImageUrl = useMemo(() => {
    const v = (attrs as any).size_guide_image;
    return typeof v === "string" ? v.trim() || null : null;
  }, [attrs]);

  /** Teknik bazlı baskı alanı fiyatları; ProductConfigurator seçilen tekniğe göre fiyatı kendisi seçer. */
  const printAreaViews = useMemo((): Array<{ name: string; price?: string; pricesByTechnique?: Record<string, string> }> | null => {
    const raw = (attrs as any).print_area_views;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const list = raw.slice(0, 10).map((x: any) => ({
      name: typeof x?.name === "string" ? x.name.trim() : "",
      price: typeof x?.price === "string" ? x.price.trim() : x?.price != null ? String(x.price).trim() : "",
      pricesByTechnique: x?.pricesByTechnique && typeof x.pricesByTechnique === "object" ? x.pricesByTechnique : undefined,
    }));
    return list.some((p) => p.name) ? list : null;
  }, [attrs]);

  /** Teknik yokken veya geri uyumluluk için: düz baskı alanı listesi (tek fiyat). */
  const placementOptions = useMemo((): Array<{ name: string; price: string }> | null => {
    if (!printAreaViews?.length) return null;
    return printAreaViews.map((x) => ({
      name: x.name,
      price: x.price ?? (x.pricesByTechnique && typeof x.pricesByTechnique[""] !== "undefined" ? String(x.pricesByTechnique[""]).trim() : "") ?? "",
    }));
  }, [printAreaViews]);

  const heroImageUrl =
    colorMockupUrl || viewFallbackUrl || legacyMockupUrl || product?.thumbnail_url || product?.cover_image_url || galleryImages[0]?.src || "/placeholder.svg";

  /** Galeri strip: product_gallery_images (tekiller); video varsa 3. sırada eklenir. */
  const mergedGalleryImages = useMemo(() => {
    const seen = new Set<string>();
    return galleryImages.filter((x) => {
      if (!x.src) return false;
      if (seen.has(x.src)) return false;
      seen.add(x.src);
      return true;
    });
  }, [galleryImages]);

  const videoUrl = useMemo(() => {
    const v = (attrs as any)?.video_url;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }, [attrs]);

  /** Slayt listesi: ilk 2 görsel, sonra video (varsa), sonra kalan görseller. */
  const galleryStripItems = useMemo((): Array<{ type: "image"; src: string; alt: string } | { type: "video"; src: string }> => {
    const images = mergedGalleryImages;
    if (!videoUrl) return images.map((x) => ({ type: "image" as const, src: x.src, alt: x.alt }));
    return [
      ...images.slice(0, 2).map((x) => ({ type: "image" as const, src: x.src, alt: x.alt })),
      { type: "video" as const, src: videoUrl },
      ...images.slice(2).map((x) => ({ type: "image" as const, src: x.src, alt: x.alt })),
    ];
  }, [mergedGalleryImages, videoUrl]);

  const thumbnailUrl = heroImageUrl;

  const handleDesignNow = () => {
    if (configuratorAddToCartRef.current?.addToCartWithCurrentSelections) {
      configuratorAddToCartRef.current.addToCartWithCurrentSelections();
    } else {
      handleAddToCart();
    }
    if (!productId) {
      navigate("/designer");
      return;
    }
    const params = new URLSearchParams({ productId });
    if (activeViewId) params.set("viewId", activeViewId);
    if (selectedColorId) params.set("colorId", selectedColorId);
    navigate(`/designer?${params.toString()}`);
  };

  const selectedColorName = selectedColorId && colors?.length
    ? (colors.find((c) => c.id === selectedColorId)?.name ?? null)
    : null;

  const handleAddToCart = (
    placementFeePerItem?: number,
    unitPriceFromTier?: number,
    details?: { selectedTechnique?: string; selectedPlacements?: Array<{ name: string; price: string }> }
  ) => {
    if (!productId || !product) return;
    const qtyToAdd =
      remainingStock !== null ? Math.min(addToCartQty, remainingStock) : addToCartQty;
    if (qtyToAdd < 1) {
      if (remainingStock === 0) toast.info("Out of stock. This product is currently closed for orders.");
      return;
    }
    if (sizeNames.length > 0 && !selectedSize) {
      toast.info("Please select a size.");
      return;
    }
    if (remainingStock !== null && addToCartQty > remainingStock) {
      toast.info(`Kalan stok: ${remainingStock} adet. Sepete en fazla ${remainingStock} adet eklenebilir.`);
    }
    const priceFrom = unitPriceFromTier != null ? unitPriceFromTier : (product.price_from ?? null);
    const quantityBySize =
      selectedSize && qtyToAdd > 0 ? { [selectedSize]: qtyToAdd } : undefined;
    addToCart(
      {
        productId,
        slug: product.slug ?? null,
        name: product.name,
        price_from: priceFrom,
        product_code: (product as any).product_code ?? null,
        cover_image_url: product.cover_image_url ?? product.thumbnail_url ?? null,
        selectedSize: selectedSize ?? undefined,
        selectedColorName: selectedColorName ?? undefined,
        selectedTechnique: details?.selectedTechnique ?? undefined,
        selectedPlacements: details?.selectedPlacements?.length ? details.selectedPlacements : undefined,
        ...(placementFeePerItem != null && placementFeePerItem > 0 ? { placementFeePerItem } : {}),
      },
      qtyToAdd,
      quantityBySize
    );
    setAddToCartQty(1);
  };

  if ((slug ? productBySlug.isLoading : productById.isLoading) || (slug ? productBySlug.isFetching : productById.isFetching)) {
    return (
      <NewcatalogChrome activeCategory="All">
        <div className="ru-max">
          <section className="ts-container pt-5" aria-label="Product loading">
            <h1 className="ru-h1">Loading…</h1>
          </section>
        </div>
      </NewcatalogChrome>
    );
  }

  if (!product) {
    return (
      <NewcatalogChrome activeCategory="All">
        <div className="ru-max">
          <section className="ts-container pt-5" aria-label="Product not found">
            <h1 className="ru-h1">Product not found</h1>
            <div className="mt-4">
              <Link to="/catalog/all" className="ru-pill">
                Back to catalog
              </Link>
            </div>
          </section>
        </div>
      </NewcatalogChrome>
    );
  }

  return (
    <NewcatalogChrome activeCategory="All">
      <div className="ru-max ru-product-page">
        <section className="ts-container pt-5" aria-label="Product header">
          <nav className="ru-breadcrumb" aria-label="Breadcrumb">
            <Link to="/catalog/all" className="ru-breadcrumb-link">
              All
            </Link>
            <span className="ru-breadcrumb-sep">/</span>
            {category ? (
              <Link to={`/collection/${category.slug}`} className="ru-breadcrumb-link">
                {category.name}
              </Link>
            ) : (
              <span className="ru-breadcrumb-link">—</span>
            )}
          </nav>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {product.badge ? <span className="ru-badge">{product.badge}</span> : null}
          </div>

          <div className="ru-header-row">
            <div>
              <h1 className="ru-h1">{product.name}</h1>
              <div className="ru-meta-row" aria-label="Product meta">
                {product.product_code ? (
                  <>
                    <span className="ru-meta-strong">{product.product_code}</span>
                    <span className="ru-meta-sep" aria-hidden />
                  </>
                ) : null}
                {sizeRange ? (
                  <>
                    <span>{sizeRange}</span>
                    <span className="ru-meta-sep" aria-hidden />
                  </>
                ) : null}
                {colorCount ? (
                  <>
                    <span>{colorCount} Colors</span>
                    <span className="ru-meta-sep" aria-hidden />
                  </>
                ) : null}
                {gsm ? (
                  <>
                    <span>{gsm} gsm</span>
                    <span className="ru-meta-sep" aria-hidden />
                  </>
                ) : null}
                {oz ? <span>{oz} oz</span> : null}
              </div>
            </div>

            <div className="ru-header-actions" aria-label="Primary actions">
              <button className="ru-btn-primary" type="button" onClick={handleDesignNow}>
                Design Now
              </button>
            </div>
          </div>

          <div className="ru-header-actions-mobile" aria-label="Primary actions">
            <button className="ru-btn-primary" type="button" onClick={handleDesignNow}>
              Design Now
            </button>
          </div>

          <div className="ru-controls" aria-label="Product controls">
            <div className="ru-color-dropdown" ref={colorWrapRef}>
              <button
                type="button"
                className={selectedColorId ? "ru-pill ru-pill--active" : "ru-pill"}
                aria-haspopup="menu"
                aria-expanded={colorOpen}
                onClick={() => setColorOpen((v) => !v)}
              >
                <span>
                  {selectedColorId && colors?.length
                    ? colors.find((c) => c.id === selectedColorId)?.name ?? "Color"
                    : "Color"}
                </span>
                <ChevronDown className={colorOpen ? "h-4 w-4 ru-chev ru-chev--open" : "h-4 w-4 ru-chev"} aria-hidden />
              </button>

              {colorOpen ? (
                <div className="ru-color-menu" role="menu" aria-label="Color options">
                  <div className="ru-color-swatches">
                    {colors?.length ? colors.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={selectedColorId === c.id ? "ru-color-swatch ru-color-swatch--active" : "ru-color-swatch"}
                        style={{ backgroundColor: c.hex_code || "transparent" }}
                        aria-label={`Color ${c.name}`}
                        aria-pressed={selectedColorId === c.id}
                        onClick={() => {
                          setSelectedColorId(c.id);
                          setColorOpen(false);
                        }}
                      />
                    )) : (
                      <p className="text-sm text-muted-foreground py-2">Renk seçeneği yok</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ru-max" aria-label="Product gallery">
          <div className="ru-gallery-wrapper">
            <button
              type="button"
              onClick={() => {
                const el = galleryStripRef.current;
                if (el) el.scrollBy({ left: -380, behavior: "smooth" });
              }}
              className="ru-gallery-arrow ru-gallery-arrow--left"
              aria-label="Önceki görsel"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div ref={galleryStripRef} className="ru-gallery-strip" aria-label="Gallery strip">
              {galleryStripItems.map((item, index) =>
                item.type === "video" ? (
                  <div key="product-video" className="ru-gallery-item">
                    <video
                      src={item.src}
                      className="ru-gallery-img"
                      autoPlay
                      muted
                      loop
                      playsInline
                      aria-label="Ürün videosu"
                    />
                  </div>
                ) : (
                  <ProductGalleryImage
                    key={`${item.src}-${index}`}
                    uniqueKey={`${item.src}-${index}`}
                    src={item.src}
                    alt={item.alt}
                  />
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const el = galleryStripRef.current;
                if (el) el.scrollBy({ left: 380, behavior: "smooth" });
              }}
              className="ru-gallery-arrow ru-gallery-arrow--right"
              aria-label="Sonraki görsel"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </section>

        <section className="ts-container ru-section" aria-label="Product details">
          <ProductDetailsAccordion
            productId={product.id}
            noteHtml={product.description}
            embedded
            attrsFromEdits={attrs as Record<string, unknown>}
            productCode={(product as { product_code?: string | null }).product_code ?? null}
          />
        </section>

        <ProductConfigurator
            productId={productId ?? undefined}
            productName={product.name}
            thumbnailUrl={thumbnailUrl}
            sizes={sizeNames}
            colors={(colors ?? []).map((c) => ({ id: c.id, name: c.name, hex_code: c.hex_code }))}
            region={region}
            fulfillmentFrom={fulfillmentFrom}
            fulfillmentCity={fulfillmentCity}
            sizeGuideImageUrl={sizeGuideImageUrl}
            printAreaViews={printAreaViews}
            placementOptions={placementOptions}
            techniques={techniques}
            designNowViewId={activeViewId}
            selectedColorId={selectedColorId}
            onSelectedColorIdChange={setSelectedColorId}
            selectedSize={selectedSize}
            onSelectedSizeChange={setSelectedSize}
            quantity={addToCartQty}
            onQuantityChange={setAddToCartQty}
            onAddToCart={handleAddToCart}
            addToCartRef={configuratorAddToCartRef}
            maxQuantity={remainingStock}
            unitPriceTiers={(unitPriceTiers ?? []).map((t) => ({
              min_qty: t.min_qty,
              max_qty: t.max_qty,
              unit_price: Number(t.unit_price),
              currency: t.currency,
              sort_order: t.sort_order,
            }))}
          />
      </div>
    </NewcatalogChrome>
  );
}
