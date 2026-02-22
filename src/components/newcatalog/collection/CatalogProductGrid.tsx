import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SignedImage } from "@/components/ui/signed-image";
import { useCart } from "@/contexts/CartContext";

const PLACEHOLDER = "/placeholder.svg";

type ColorItem = { id: string; name: string; hex_code: string; sort_order?: number | null };
type SizeItem = { id: string; name: string; sort_order: number };
type GalleryImage = { image_url: string; sort_order?: number | null };

type CatalogProduct = {
  id: string;
  name: string;
  slug: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  price_from: number | null;
  badge: string | null;
  product_code: string | null;
  product_color_variants?: Array<{ product_colors: ColorItem | null }> | null;
  product_size_variants?: Array<{ product_sizes: SizeItem | null }> | null;
  product_attributes?: Array<{ data: Record<string, unknown> }> | { data: Record<string, unknown> } | null;
  product_gallery_images?: GalleryImage[] | null;
};

function getCardImages(p: CatalogProduct): string[] {
  const fallback = p.cover_image_url || p.thumbnail_url || PLACEHOLDER;
  const raw = p.product_gallery_images;
  if (Array.isArray(raw) && raw.length > 0) {
    const sorted = [...raw]
      .filter((g) => g?.image_url)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (sorted.length > 0) return sorted.map((g) => g.image_url);
  }
  return [fallback];
}

function CardImageCarousel({
  images,
  alt,
  href,
  badge,
  isHovered,
}: {
  images: string[];
  alt: string;
  href: string;
  badge: string | null;
  isHovered?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [usedArrows, setUsedArrows] = useState(false);
  const n = images.length;
  const showSecondOnHover = isHovered && n >= 2 && !usedArrows;
  const displayIndex = showSecondOnHover ? 1 : index;

  useEffect(() => {
    if (!isHovered) {
      setIndex(0);
      setUsedArrows(false);
    }
  }, [isHovered]);

  const goPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUsedArrows(true);
    setIndex((i) => (i <= 0 ? n - 1 : i - 1));
  };
  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUsedArrows(true);
    setIndex((i) => (i >= n - 1 ? 0 : i + 1));
  };
  return (
    <div className="ru-card-carousel">
      <Link to={href} className="ru-card-carousel-link" aria-label={alt}>
        {badge ? <span className="ru-related-badge">{badge}</span> : null}
        <SignedImage
          src={images[displayIndex]}
          alt={alt}
          loading="lazy"
          className="ru-related-img ru-related-img--contain"
        />
      </Link>
      {n > 1 && (
        <>
          <button
            type="button"
            className="ru-card-carousel-arrow ru-card-carousel-arrow--prev"
            onClick={goPrev}
            aria-label="Önceki görsel"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="ru-card-carousel-arrow ru-card-carousel-arrow--next"
            onClick={goNext}
            aria-label="Sonraki görsel"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <div className="ru-card-carousel-dots" role="tablist" aria-label="Görsel seç">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-label={`Görsel ${i + 1}`}
                aria-selected={i === displayIndex}
                className={i === displayIndex ? "ru-card-carousel-dot ru-card-carousel-dot--active" : "ru-card-carousel-dot"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatPriceFrom(priceFrom: number | null) {
  if (priceFrom == null) return null;
  try {
    return `From $${Number(priceFrom).toFixed(2)}`;
  } catch {
    return `From $${priceFrom}`;
  }
}

function getColors(p: CatalogProduct): ColorItem[] {
  const raw = p.product_color_variants;
  if (!Array.isArray(raw)) return [];
  const list = raw.map((v) => v?.product_colors).filter(Boolean) as ColorItem[];
  return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function getSizeRange(p: CatalogProduct): string | null {
  const raw = p.product_size_variants;
  if (!Array.isArray(raw)) return null;
  const list = raw.map((v) => v?.product_sizes?.name).filter(Boolean) as string[];
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return `${list[0]}-${list[list.length - 1]}`;
}

function getAttrs(p: CatalogProduct): Record<string, unknown> {
  const raw = p.product_attributes;
  if (!raw) return {};
  const data = Array.isArray(raw) ? raw[0]?.data : (raw as { data: Record<string, unknown> }).data;
  return (data && typeof data === "object") ? data : {};
}

function pickAttr(data: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
    if (Array.isArray(v) && v.length) return String(v[0]).trim() || null;
  }
  return null;
}

export function CatalogProductGrid({ products }: { products: CatalogProduct[] }) {
  const navigate = useNavigate();
  const { addItem: addToCart } = useCart();
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  return (
    <section className="ts-container ru-catalog-grid" aria-label="Products">
      <div className="ru-related-grid" role="list" aria-label="Product list">
        {products.map((p) => {
          const cardImages = getCardImages(p);
          const price = formatPriceFrom(p.price_from);
          const href = p.slug ? `/product/${p.slug}` : `/product/id/${p.id}`;
          const colors = getColors(p);
          const sizeRange = getSizeRange(p);
          const attrs = getAttrs(p);
          const gender = pickAttr(attrs, ["gender", "unisex"]);
          const gsm = pickAttr(attrs, ["gsm", "fabric_gsm", "fabric_weight_gsm", "weight_gsm"]);
          const oz = pickAttr(attrs, ["oz", "fabric_oz", "fabric_weight_oz", "weight_oz"]);
          const specParts: string[] = [];
          if (gender) specParts.push(gender);
          if (sizeRange) specParts.push(sizeRange);
          if (colors.length) specParts.push(`${colors.length} colors`);
          if (gsm) specParts.push(`${gsm} gsm`);
          if (oz) specParts.push(`${oz} oz`);
          const specLine = specParts.length ? specParts.join(" · ") : null;
          const firstColor = colors[0] ?? null;

          const handleDesignNow = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart(
              {
                productId: p.id,
                slug: p.slug ?? null,
                name: p.name,
                price_from: p.price_from ?? null,
                product_code: p.product_code ?? null,
                cover_image_url: p.cover_image_url ?? p.thumbnail_url ?? null,
                selectedColorName: firstColor?.name ?? undefined,
              },
              1
            );
            const params = new URLSearchParams({ productId: p.id });
            if (firstColor?.id) params.set("colorId", firstColor.id);
            navigate(`/designer?${params.toString()}`);
          };

          return (
            <div
              key={p.id}
              className="ru-related-card-wrapper group"
              role="listitem"
              onMouseEnter={() => setHoveredCardId(p.id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              <article className="ru-related-card">
                <div className="ru-related-imgwrap">
                  <CardImageCarousel
                    images={cardImages}
                    alt={p.name}
                    href={href}
                    badge={p.badge}
                    isHovered={hoveredCardId === p.id}
                  />
                </div>
                <div className="ru-related-meta">
                  {colors.length > 0 ? (
                    <div className="ru-card-colors" role="list" aria-label="Renkler">
                      {colors.map((c) => (
                        <span
                          key={c.id}
                          className="ru-card-swatch"
                          style={{ backgroundColor: c.hex_code || "transparent" }}
                          title={c.name}
                          aria-hidden
                        />
                      ))}
                    </div>
                  ) : null}
                  {p.product_code ? (
                    <p className="ru-related-code">#{String(p.product_code).replace(/^#/, "")}</p>
                  ) : null}
                  <Link to={href} className="ru-related-title block hover:underline">
                    {p.name}
                  </Link>
                  {specLine ? (
                    <p className="ru-related-spec text-muted-foreground">{specLine}</p>
                  ) : null}
                  {price ? <p className="ru-related-price">{price}</p> : null}
                </div>
                <div className="ru-card-actions" aria-hidden>
                  <button
                    type="button"
                    onClick={handleDesignNow}
                    className="ru-card-btn ru-card-btn--primary"
                  >
                    Design Now
                  </button>
                  <Link to="/cart" className="ru-card-btn ru-card-btn--secondary">
                    Get a quote
                  </Link>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
