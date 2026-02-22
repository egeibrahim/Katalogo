import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/ui/signed-image";

type RelatedProduct = {
  id: string;
  name: string;
  slug: string | null;
  badge: string | null;
  product_code: string | null;
  price_from: number | null;
  thumbnail_url: string | null;
  cover_image_url: string | null;
};

function formatPriceFrom(priceFrom: number | null) {
  if (priceFrom == null) return null;
  try {
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceFrom);
    return `From ${formatted}`;
  } catch {
    return `From ${priceFrom}`;
  }
}

export const RelatedProducts = React.forwardRef<HTMLElement, {
  productId: string;
  categoryId: string | null;
  limit?: number;
}>(function RelatedProducts({ productId, categoryId, limit = 8 }, ref) {
  const q = useQuery({
    queryKey: ["public", "products", "related", { productId, categoryId, limit }],
    enabled: Boolean(productId),
    queryFn: async (): Promise<RelatedProduct[]> => {
      // Prefer same-category; fallback to newest products when category is unknown.
      let query = supabase
        .from("products")
        .select("id,name,slug,badge,product_code,price_from,thumbnail_url,cover_image_url,category_id")
        .eq("is_active", true)
        .neq("id", productId);

      if (categoryId) query = query.eq("category_id", categoryId);

      const { data, error } = await query
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as RelatedProduct[];
    },
  });

  const items = React.useMemo(() => (q.data ?? []).slice(0, limit), [limit, q.data]);
  if (items.length === 0) return null;

  return (
    <section ref={ref as any} className="ts-container ru-section" aria-label="Related products">
      <h2 className="ru-related-h2">You may also like</h2>
      <div className="ru-related-grid">
        {items.map((p) => {
          const href = p.slug ? `/product/${p.slug}` : `/product/id/${p.id}`;
          const img = p.thumbnail_url || p.cover_image_url || "/placeholder.svg";
          const price = formatPriceFrom(p.price_from);
          return (
            <article key={p.id} className="ru-related-card">
              <Link to={href} className="block">
                <div className="ru-related-imgwrap">
                  {p.badge ? <span className="ru-related-badge">{p.badge}</span> : null}
                  <SignedImage
                    src={img}
                    alt={`${p.name} product image`}
                    loading="lazy"
                    className="ru-related-img"
                  />
                </div>
                <div className="ru-related-meta">
                  <p className="ru-related-title">{p.name}</p>
                  {p.product_code ? <p className="ru-related-code">{p.product_code}</p> : null}
                  {price ? <p className="ru-related-price">{price}</p> : null}
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
});

RelatedProducts.displayName = "RelatedProducts";
