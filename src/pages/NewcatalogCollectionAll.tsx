import { Link } from "react-router-dom";
import { NewcatalogChrome } from "@/components/newcatalog/layout/NewcatalogChrome";
import { CatalogProductGrid } from "@/components/newcatalog/collection/CatalogProductGrid";
import { CollectionFilters } from "@/components/newcatalog/collection/CollectionFilters";
import { SignedImage } from "@/components/ui/signed-image";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string | null;
  sort_order: number;
};

export default function NewcatalogCollectionAll() {
  usePageMeta({ title: "All Products" });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["public", "categories", "subcategories-only"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,cover_image_url,sort_order")
        .eq("is_active", true)
        .not("parent_category_id", "is", null)
        .order("sort_order", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DbCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["public", "products", "active", "all", "with-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `id,name,slug,cover_image_url,thumbnail_url,price_from,badge,product_code,sort_order,category_id,category,
          product_color_variants ( product_colors ( id, name, hex_code, sort_order ) ),
          product_size_variants ( product_sizes ( id, name, sort_order ) ),
          product_attributes ( data ),
          product_gallery_images ( image_url, sort_order )`
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("sort_order", { foreignTable: "product_gallery_images", ascending: true })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });

  return (
    <NewcatalogChrome activeCategory="All">
      <div className="ru-max">
        <section className="ts-collection-hero" aria-label="All products">
          <h1 className="ts-collection-title">All Products</h1>
          <p className="ts-collection-subtitle">
            Customize high-quality garments and have your creations shipped directly to you or your customers.
          </p>

          {subcategories.length > 0 ? (
            <div className="ts-collection-grid" role="list" aria-label="Subcategories">
              {subcategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/collection/${c.slug}`}
                  className="ts-collection-card"
                  role="listitem"
                  aria-label={`Open ${c.name}`}
                >
                  <div className="ts-collection-card-inner" aria-hidden>
                    {c.cover_image_url ? (
                      <SignedImage src={c.cover_image_url} alt="" loading="lazy" className="ts-cat-thumb" />
                    ) : (
                      <div className="ts-cat-icon" aria-hidden />
                    )}
                  </div>
                  <div className="ts-collection-card-label">{c.name}</div>
                </Link>
              ))}
            </div>
          ) : null}

          <CollectionFilters />

          <div className="mt-4">
            {productsLoading ? (
              <div className="ts-container">
                <p className="text-muted-foreground">Loading…</p>
              </div>
            ) : products.length === 0 ? (
              <div className="ts-container">
                <p className="text-muted-foreground">No active products yet.</p>
              </div>
            ) : (
              <CatalogProductGrid products={products as any} />
            )}
          </div>
        </section>
      </div>
    </NewcatalogChrome>
  );
}

