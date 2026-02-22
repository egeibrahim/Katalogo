import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { NewcatalogChrome } from "@/components/newcatalog/layout/NewcatalogChrome";
import { ProductConfigurator } from "@/components/newcatalog/product/ProductConfigurator";
import { ProductV2DetailsTab } from "@/pages/product-v2/ProductV2DetailsTab";
import { useProductBySlugOrIdAnyStatus } from "@/hooks/useProductBySlugOrId";
import { usePublicProductBlockOrder } from "@/hooks/usePublicProductBlockOrder";
import { usePageMeta } from "@/hooks/usePageMeta";

// Static RU0010 gallery (frontend-only V1). We'll connect product media from DB in the next step.
import ruF1 from "@/assets/ru0010-slide/RU0010-F-1.jpg";
import ruF2 from "@/assets/ru0010-slide/RU0010-F-2.jpg";
import ruF3 from "@/assets/ru0010-slide/RU0010-F-3.jpg";
import ruM1 from "@/assets/ru0010-slide/RU0010-M-1.jpg";
import ruM2 from "@/assets/ru0010-slide/RU0010-M-2.jpg";
import ruM3 from "@/assets/ru0010-slide/RU0010-M-3.jpg";

const galleryImages = [
  { src: ruF1, alt: "Pure Cotton Unisex T-Shirt lifestyle front (female)" },
  { src: ruF2, alt: "Pure Cotton Unisex T-Shirt lifestyle detail (female)" },
  { src: ruF3, alt: "Pure Cotton Unisex T-Shirt lifestyle back (female)" },
  { src: ruM1, alt: "Pure Cotton Unisex T-Shirt lifestyle front (male)" },
  { src: ruM2, alt: "Pure Cotton Unisex T-Shirt lifestyle detail (male)" },
  { src: ruM3, alt: "Pure Cotton Unisex T-Shirt lifestyle back (male)" },
];

export default function ProductPageV2() {
  const navigate = useNavigate();
  const { slug, id } = useParams();

  // Preview route can be opened as literal ":slug" template; redirect to a known sample.
  useEffect(() => {
    if (slug === ":slug") {
      navigate("/product-v2/pure-cotton-unisex-t-shirt", { replace: true });
    }
  }, [navigate, slug]);

  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
  } = useProductBySlugOrIdAnyStatus({ slug, id });

  const [colorOpen, setColorOpen] = useState(false);
  const colorWrapRef = useRef<HTMLDivElement | null>(null);

  const { data: blockOrder } = usePublicProductBlockOrder(product?.id);

  const suffix = slug ? `(${slug})` : id ? `(id: ${id})` : "";
  usePageMeta({
    title: (product as any)?.meta_title || (product as any)?.name || `Product ${suffix}`.trim(),
    description: (product as any)?.meta_description || null,
  });

  const colors = useMemo(
    () => [
      "rgb(20, 20, 20)",
      "rgb(243, 244, 245)",
      "rgb(225, 225, 225)",
      "rgb(205, 222, 248)",
      "rgb(255, 246, 223)",
      "rgb(231, 184, 128)",
      "rgb(228, 162, 162)",
      "rgb(255, 233, 152)",
      "rgb(82, 82, 82)",
      "rgb(69, 77, 47)",
      "rgb(105, 47, 21)",
      "rgb(41, 57, 70)",
      "rgb(209, 24, 67)",
      "rgb(130, 2, 17)",
      "rgb(60, 14, 30)",
      "rgb(14, 17, 37)",
    ],
    []
  );

  // Frontend-only mock values; will be replaced by DB data in the next step.
  const productName = "Pure Cotton Unisex T-Shirt";
  const productCode = "RU0010-C001-V5";
  const thumbnailUrl = ruF1;

  const sizes = useMemo(() => ["S", "M", "L", "XL", "2XL", "3XL"], []);
  const unitPriceTiers = useMemo(
    () => [
      { min_qty: 1, max_qty: 5, unit_price: 2.99, currency: "USD", sort_order: 0 },
      { min_qty: 6, max_qty: 29, unit_price: 2.85, currency: "USD", sort_order: 1 },
      { min_qty: 30, max_qty: 99, unit_price: 2.7, currency: "USD", sort_order: 2 },
      { min_qty: 100, max_qty: null, unit_price: 2.4, currency: "USD", sort_order: 3 },
    ],
    []
  );

  const techniques = useMemo(() => ["DTG", "DTF"], []);

  const colorOptions = useMemo(
    () =>
      colors.map((c, idx) => ({
        id: `color-${idx}`,
        name: `Color ${idx + 1}`,
        hex_code: c,
      })),
    [colors]
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = colorWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setColorOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (isProductLoading) {
    return (
      <NewcatalogChrome activeCategory="All">
        <div className="ru-max">
          <section className="ts-container pt-8" aria-label="Loading">
            <div className="ru-details-wrap">
              <div className="ru-acc-text">
                <p>Loading product…</p>
              </div>
            </div>
          </section>
        </div>
      </NewcatalogChrome>
    );
  }

  if (isProductError) {
    return (
      <NewcatalogChrome activeCategory="All">
        <div className="ru-max">
          <section className="ts-container pt-8" aria-label="Load error">
            <div className="ru-details-wrap">
              <div className="ru-acc-text">
                <p>Product load failed.</p>
                <p className="ru-muted">
                  {slug ? `slug: ${slug}` : null}
                  {slug && id ? " • " : null}
                  {id ? `id: ${id}` : null}
                </p>
                <p className="ru-muted">{productError instanceof Error ? productError.message : String(productError)}</p>
              </div>
            </div>
          </section>
        </div>
      </NewcatalogChrome>
    );
  }

  if (!product) {
    return (
      <NewcatalogChrome activeCategory="All">
        <div className="ru-max">
          <section className="ts-container pt-8" aria-label="Not found">
            <div className="ru-details-wrap">
              <div className="ru-acc-text">
                <p>Product not found for this URL.</p>
                <p className="ru-muted">
                  {slug ? `slug: ${slug}` : null}
                  {slug && id ? " • " : null}
                  {id ? `id: ${id}` : null}
                </p>
              </div>
            </div>
          </section>
        </div>
      </NewcatalogChrome>
    );
  }

  return (
    <NewcatalogChrome activeCategory="All">
      <div className="ru-max">
        <section className="ts-container pt-8" aria-label="Product header">
          <nav className="ru-breadcrumb" aria-label="Breadcrumb">
            <Link to="/catalog/all" className="ru-breadcrumb-link">
              All
            </Link>
            <span className="ru-breadcrumb-sep">/</span>
            <Link to="/collection/all" className="ru-breadcrumb-link">
              T-Shirts
            </Link>
          </nav>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="ru-badge">BESTSELLER</span>
            <span className="ru-badge ru-badge--new">NEW</span>
          </div>

          <div className="ru-header-row">
            <div>
              <h1 className="ru-h1">{productName}</h1>
              <div className="ru-meta-row" aria-label="Product meta">
                <span className="ru-meta-strong">{productCode}</span>
                <span className="ru-meta-sep" aria-hidden />
                <span>M-3XL</span>
                <span className="ru-meta-sep" aria-hidden />
                <span>{colors.length} Colors</span>
                <span className="ru-meta-sep" aria-hidden />
                <span>180 gsm</span>
                <span className="ru-meta-sep" aria-hidden />
                <span>5.3 oz</span>
              </div>
            </div>

            <div className="ru-header-actions" aria-label="Primary actions">
              <button className="ru-btn-primary" type="button">
                Design Now
              </button>
              <button className="ru-btn-outline" type="button">
                Add Blank to Cart
              </button>
            </div>
          </div>

          <div className="ru-header-actions-mobile" aria-label="Primary actions">
            <button className="ru-btn-primary" type="button">
              Design Now
            </button>
            <button className="ru-btn-outline" type="button">
              Add Blank to Cart
            </button>
          </div>

          <div className="ru-controls" aria-label="Product controls">
            <div className="ru-color-dropdown" ref={colorWrapRef}>
              <button
                type="button"
                className="ru-pill"
                aria-haspopup="menu"
                aria-expanded={colorOpen}
                onClick={() => setColorOpen((v) => !v)}
              >
                <span>Color</span>
                <ChevronDown className={colorOpen ? "h-4 w-4 ru-chev ru-chev--open" : "h-4 w-4 ru-chev"} aria-hidden />
              </button>

              {colorOpen ? (
                <div className="ru-color-menu" role="menu" aria-label="Color options">
                  <div className="ru-color-swatches">
                    {colors.map((c) => (
                      <button key={c} type="button" className="ru-color-swatch" style={{ backgroundColor: c }} aria-label={`Color ${c}`} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <a href="#" className="ru-pill" aria-label="Download gallery">
              <Download className="h-4 w-4" aria-hidden />
              <span>Download gallery</span>
            </a>
          </div>
        </section>

        <section className="ru-max" aria-label="Product gallery">
          <div className="px-6">
            <div className="ru-gallery-strip" aria-label="Gallery strip">
              {galleryImages.map((img) => (
                <div key={img.src} className="ru-gallery-item">
                  <img src={img.src} alt={img.alt} className="ru-gallery-img" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Single flow: Product Details first, then Customize blocks */}
        <ProductConfigurator
          productId={product.id}
          productName={productName}
          thumbnailUrl={thumbnailUrl}
          sizes={sizes}
          colors={colorOptions}
          techniques={techniques}
          unitPriceTiers={unitPriceTiers}
          topSlot={<ProductV2DetailsTab product={product} />}
          blockOrder={blockOrder}
        />
      </div>
    </NewcatalogChrome>
  );
}

