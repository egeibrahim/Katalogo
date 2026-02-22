# Design Now – Tüm Komutlar ve Uygulanan Kodlar

Bu belge Design Now özelliğindeki tüm değişiklikleri Cursor/AI komutları ve ilgili kod parçalarıyla içerir.

---

## KOMUT 1: Product Page'e Design Now butonu ve handleDesignNow ekle

**Komut:** *"Product page'e Design Now butonu ekle. Butona tıklandığında /designer'a productId, viewId ve colorId query parametreleriyle yönlendir. activeViewId ve selectedColorId değerlerini de parametrelere ekle."*

**Dosya:** `src/pages/ProductPage.tsx`

```tsx
const handleDesignNow = () => {
  if (!productId) {
    navigate("/designer");
    return;
  }
  const params = new URLSearchParams({ productId });
  if (activeViewId) params.set("viewId", activeViewId);
  if (selectedColorId) params.set("colorId", selectedColorId);
  navigate(`/designer?${params.toString()}`);
};
```

```tsx
// Header actions – desktop
<button className="ru-btn-primary" type="button" onClick={handleDesignNow}>
  Design Now
</button>

// Header actions mobile
<button className="ru-btn-primary" type="button" onClick={handleDesignNow}>
  Design Now
</button>
```

**activeViewId** (ProductPage'de front/back için):

```tsx
const activeViewId = useMemo(() => {
  const list = views ?? [];
  if (list.length === 0) return null;
  const needle = selectedView === "front" ? "front" : "back";
  const byName = list.find((v) => (v.view_name || "").toLowerCase().includes(needle));
  return (byName ?? list[0]).id;
}, [selectedView, views]);
```

---

## KOMUT 2: ProductConfigurator'a designNowViewId prop ve handleDesignNow ekle

**Komut:** *"ProductConfigurator bileşenine designNowViewId prop'u ekle. Design Now butonuna tıklandığında /designer'a productId, viewId (designNowViewId), colorId ile yönlendir."*

**Dosya:** `src/components/newcatalog/product/ProductConfigurator.tsx`

**Props interface'e ekleme:**

```ts
/** View ID to open in designer when "Design Now" is clicked (e.g. from product page front/back). */
designNowViewId?: string | null;
```

**Parametre default:**

```ts
designNowViewId = null,
```

**handleDesignNow fonksiyonu:**

```tsx
const handleDesignNow = React.useCallback(() => {
  if (!productId) {
    navigate("/designer");
    return;
  }
  const params = new URLSearchParams({ productId });
  if (designNowViewId) params.set("viewId", designNowViewId);
  if (selectedColorId) params.set("colorId", selectedColorId);
  navigate(`/designer?${params.toString()}`);
}, [navigate, productId, designNowViewId, selectedColorId]);
```

**Buton JSX:**

```tsx
<div className="ru-sticky-actions">
  <button type="button" className="ru-sticky-primary" onClick={handleDesignNow}>
    Design Now
  </button>
  <p className="ru-sticky-note">Shipping costs are calculated at checkout</p>
</div>
```

---

## KOMUT 3: ProductPage'den ProductConfigurator'a designNowViewId geçir

**Komut:** *"ProductPage'de ProductConfigurator'a designNowViewId={activeViewId}, selectedColorId ve onSelectedColorIdChange prop'larını geçir."*

**Dosya:** `src/pages/ProductPage.tsx`

```tsx
<ProductConfigurator
  productId={productId}
  designNowViewId={activeViewId}
  selectedColorId={selectedColorId}
  onSelectedColorIdChange={setSelectedColorId}
  selectedSize={selectedSize}
  onSelectedSizeChange={setSelectedSize}
  // ... diğer props
/>
```

---

## KOMUT 4: ProductDesigner'da URL parametrelerini oku ve Design Now ile açıldığında yükle

**Komut:** *"ProductDesigner'da useSearchParams ile productId, viewId, colorId oku. Sayfa Design Now ile açıldıysa bu parametrelere göre product, view ve color'ı yükle. product_views, product_colors, product_view_color_mockups tablolarından veri çek."*

**Dosya:** `src/components/designer/ProductDesigner.tsx`

**URL params okuma:**

```tsx
const [searchParams] = useSearchParams();
const requestedProductId = searchParams.get("productId") || "";
const requestedViewId = searchParams.get("viewId") || "";
const requestedColorId = searchParams.get("colorId") || "";
```

**Mount effect – Design Now ile yükleme:**

```tsx
// Load initial product and views on mount.
// If a productId is present in the URL (e.g. from "Design Now"), load it and apply viewId/colorId so mockup matches storefront.
useEffect(() => {
  const loadInitialData = async () => {
    if (requestedProductId) {
      setActiveTab("mockup");
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

      const nextViews = (views ?? []) as ProductView[];
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

    // If no product selected, fetch the first product (including drafts)
    if (!currentProductId) {
      const { data: products } = await supabase.from("products").select("id").order("name").limit(1);

      if (products && products.length > 0) {
        const productId = products[0].id;
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
    }
  };

  void loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [requestedProductId, requestedViewId, requestedColorId]);
```

**Product meta ve gallery yükleme (Design Now ile de tetiklenir):**

```tsx
// Load product meta and gallery when product changes (Design Now ile açıldığında da çalışır)
useEffect(() => {
  const run = async () => {
    if (!currentProductId) {
      setCurrentProductName("");
      setCurrentProductCategory("");
      setProductGalleryImages([]);
      return;
    }
    const { data: productRow } = await supabase
      .from("products")
      .select("name,category,cover_image_url,thumbnail_url")
      .eq("id", currentProductId)
      .maybeSingle();
    setCurrentProductName(productRow?.name || "");
    setCurrentProductCategory(productRow?.category || "");

    const { data: galleryRows } = await supabase
      .from("product_gallery_images")
      .select("image_url")
      .eq("product_id", currentProductId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    const rawGallery = (galleryRows ?? []) as { image_url: string }[];
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
```

---

## URL Formatı

```
/designer?productId={uuid}&viewId={uuid}&colorId={uuid}
```

| Parametre | Zorunlu | Açıklama |
|-----------|---------|----------|
| productId | Evet | Yüklenecek ürün ID |
| viewId | Hayır | Başlangıç view (örn. ön/arka baskı) |
| colorId | Hayır | Seçili renk ID |

---

## Supabase Tabloları

| Tablo | Kullanım |
|-------|----------|
| product_views | product_id ile view listesi |
| product_colors | color hex kodu |
| product_view_color_mockups | view+color için mockup görseli |

---

## Etkilenen Dosyalar Özeti

| Dosya | Değişiklik |
|-------|------------|
| `src/pages/ProductPage.tsx` | handleDesignNow, Design Now butonları, activeViewId |
| `src/components/newcatalog/product/ProductConfigurator.tsx` | designNowViewId prop, handleDesignNow, Design Now butonu |
| `src/components/designer/ProductDesigner.tsx` | URL params okuma, loadInitialData useEffect |

---

## Yeni Projede Kullanım

Cursor'da yeni projede şu komutları kullanabilirsiniz:

1. *"Design Now butonu ekle – product page'den designer'a productId, viewId, colorId ile yönlendir"*
2. *"ProductConfigurator'a designNowViewId prop ekle ve handleDesignNow ile /designer'a navigate et"*
3. *"ProductDesigner'da useSearchParams ile productId, viewId, colorId oku ve Design Now ile geldiyse product/view/color yükle"*
4. *"Bu dosyadaki Design Now implementasyonunu uygula"* + `@DESIGN_NOW_KOMUTLAR_VE_KODLAR.md`
