import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { NewcatalogChrome } from "@/components/newcatalog/layout/NewcatalogChrome";
import { CatalogProductGrid } from "@/components/newcatalog/collection/CatalogProductGrid";
import { CollectionFilters } from "@/components/newcatalog/collection/CollectionFilters";
import { SignedImage } from "@/components/ui/signed-image";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  parent_category_id?: string | null;
  cover_image_url?: string | null;
  sort_order?: number | null;
};

export default function NewcatalogCollectionCategory() {
  const { slug } = useParams();
  const categorySlug = (slug ?? "").trim();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["public", "categories", "by-slug", categorySlug],
    enabled: Boolean(categorySlug),
    queryFn: async (): Promise<DbCategory | null> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,parent_category_id")
        .eq("slug", categorySlug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });

  const parentCategoryId = category?.parent_category_id ?? null;
  const { data: parentCategory } = useQuery({
    queryKey: ["public", "categories", "by-id", parentCategoryId],
    enabled: Boolean(parentCategoryId),
    queryFn: async (): Promise<DbCategory | null> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug")
        .eq("id", parentCategoryId as string)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: childCategories = [] } = useQuery({
    queryKey: ["public", "categories", "children", category?.id],
    enabled: Boolean(category?.id),
    queryFn: async (): Promise<DbCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,cover_image_url,sort_order")
        .eq("is_active", true)
        .eq("parent_category_id", category!.id)
        .order("sort_order", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DbCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: siblingCategories = [] } = useQuery({
    queryKey: ["public", "categories", "siblings", parentCategoryId],
    enabled: Boolean(parentCategoryId),
    queryFn: async (): Promise<DbCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,cover_image_url,sort_order")
        .eq("is_active", true)
        .eq("parent_category_id", parentCategoryId as string)
        .order("sort_order", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DbCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const categoryId = category?.id;
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["public", "products", "active", "by-category", categoryId, "with-details"],
    enabled: Boolean(categoryId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `id,name,slug,cover_image_url,thumbnail_url,price_from,badge,product_code,sort_order,
          product_color_variants ( product_colors ( id, name, hex_code, sort_order ) ),
          product_size_variants ( product_sizes ( id, name, sort_order ) ),
          product_attributes ( data ),
          product_gallery_images ( image_url, sort_order )`
        )
        .eq("is_active", true)
        .eq("category_id", categoryId as string)
        .order("sort_order", { ascending: true })
        .order("sort_order", { foreignTable: "product_gallery_images", ascending: true })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });

  const title = useMemo(() => category?.name ?? "Collection", [category?.name]);

  usePageMeta({ title });

  const visualMenuCategories = useMemo(() => {
    // If we're on a parent category page, show its children.
    // If we're on a child category page, show its siblings (same parent).
    if (childCategories.length > 0) return childCategories;
    return siblingCategories;
  }, [childCategories, siblingCategories]);

  const activeTopCategory = useMemo(() => {
    // Highlight the parent in the top nav when browsing a child category.
    return parentCategory?.slug ?? category?.slug ?? "all";
  }, [parentCategory?.slug, category?.slug]);

  return (
    <NewcatalogChrome activeCategory={activeTopCategory}>
      <div className="ru-max">
        <section className="ts-collection-hero" aria-label="Collection header">
          <nav className="ru-breadcrumb" aria-label="Breadcrumb">
            <Link to="/collection/all" className="ru-breadcrumb-link">
              All Products
            </Link>
            {parentCategory ? (
              <>
                <span className="ru-breadcrumb-sep">/</span>
                <Link
                  to={`/collection/${parentCategory.slug}`}
                  className="ru-breadcrumb-link"
                  aria-label={`Open ${parentCategory.name}`}
                >
                  {parentCategory.name}
                </Link>
              </>
            ) : null}
            <span className="ru-breadcrumb-sep">/</span>
            <span className="ru-breadcrumb-link" aria-current="page">
              {title}
            </span>
          </nav>
          <h1 className="ts-collection-title">{title}</h1>
          <p className="ts-collection-subtitle">
            Customize high-quality garments and have your creations shipped directly to you or your customers.
          </p>

          {visualMenuCategories.length > 0 ? (
            <div className="ts-collection-grid" role="list" aria-label="Subcategories">
              {visualMenuCategories.map((c) => (
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
        </section>

        <section className="ru-max" aria-label="Collection products">
          <div className="mt-4">
            {categoryLoading || productsLoading ? (
              <div className="ts-container">
                <p className="text-muted-foreground">Loading…</p>
              </div>
            ) : !category ? (
              <div className="ts-container">
                <p className="text-muted-foreground">Category not found.</p>
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
