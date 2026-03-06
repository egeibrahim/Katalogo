import { Link } from "react-router-dom";
import { NewcatalogChrome } from "@/components/newcatalog/layout/NewcatalogChrome";
import { CatalogProductGrid } from "@/components/newcatalog/collection/CatalogProductGrid";
import { CollectionFilters } from "@/components/newcatalog/collection/CollectionFilters";
import { SignedImage } from "@/components/ui/signed-image";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { toPublicCategorySlug } from "@/lib/productUrls";

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  parent_category_id: string | null;
  parent_slug?: string | null;
  cover_image_url: string | null;
  sort_order: number;
};

export default function NewcatalogCollectionAll() {
  const { t } = useI18n();
  const categoryLabelBySlug = (slug: string, fallbackName: string) => {
    const key = `catalog.category.${slug.toLowerCase()}`;
    const translated = t(key);
    return translated === key ? fallbackName : translated;
  };

  usePageMeta({ title: t("catalog.allProducts") });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["public", "categories", "subcategories-only"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,parent_category_id,cover_image_url,sort_order")
        .eq("is_active", true)
        .not("parent_category_id", "is", null)
        .order("sort_order", { ascending: true })
        .limit(500);
      if (error) throw error;

      const subcategories = (data ?? []) as DbCategory[];
      const parentIds = Array.from(
        new Set(subcategories.map((c) => c.parent_category_id).filter((id): id is string => Boolean(id)))
      );
      if (parentIds.length === 0) return subcategories;

      const { data: parents, error: parentsError } = await supabase
        .from("categories")
        .select("id,slug")
        .in("id", parentIds);
      if (parentsError) throw parentsError;

      const parentSlugById = new Map((parents ?? []).map((p) => [String((p as any).id), String((p as any).slug)]));
      return subcategories.map((c) => ({
        ...c,
        parent_slug: c.parent_category_id ? parentSlugById.get(c.parent_category_id) ?? null : null,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["public", "products", "active", "all", "with-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `id,name,slug,cover_image_url,thumbnail_url,price_from,currency,badge,product_code,sort_order,category_id,category,
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
    <NewcatalogChrome activeCategory={t("catalog.allProductsShort")}>
      <div className="ru-max">
        <section className="ts-collection-hero" aria-label={t("catalog.allProducts")}>
          <h1 className="ts-collection-title">{t("catalog.allProducts")}</h1>
          <p className="ts-collection-subtitle">
            {t("catalog.allProductsSubtitle")}
          </p>

          {subcategories.length > 0 ? (
            <div className="ts-collection-grid" role="list" aria-label={t("catalog.subcategories")}>
              {subcategories.map((c) => (
                <Link
                  key={c.id}
                  to={
                    c.parent_slug
                      ? `/${toPublicCategorySlug(c.parent_slug)}/${toPublicCategorySlug(c.slug)}`
                      : `/${toPublicCategorySlug(c.slug)}`
                  }
                  className="ts-collection-card"
                  role="listitem"
                  aria-label={t("catalog.openCategory", { name: categoryLabelBySlug(c.slug, c.name) })}
                >
                  <div className="ts-collection-card-inner" aria-hidden>
                    {c.cover_image_url ? (
                      <SignedImage src={c.cover_image_url} alt="" loading="lazy" className="ts-cat-thumb" />
                    ) : (
                      <div className="ts-cat-icon" aria-hidden />
                    )}
                  </div>
                  <div className="ts-collection-card-label">{categoryLabelBySlug(c.slug, c.name)}</div>
                </Link>
              ))}
            </div>
          ) : null}

          <CollectionFilters />

          <div className="mt-4">
            {productsLoading ? (
              <div className="ts-container">
                <p className="text-muted-foreground">{t("common.loading")}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="ts-container">
                <p className="text-muted-foreground">{t("catalog.noActiveProducts")}</p>
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

