import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogProductGrid } from "@/components/newcatalog/collection/CatalogProductGrid";
import { LandingFooter } from "@/components/navigation/LandingFooter";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { getProductPath } from "@/lib/productUrls";

type Catalog = {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  is_public: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type CatalogProduct = {
  id: string;
  name: string;
  slug: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  price_from: number | null;
  currency: string | null;
  badge: string | null;
  product_code: string | null;
  category_id: string | null;
};

type PublicCatalogData = {
  catalog: Catalog;
  products: CatalogProduct[];
  categories: Category[];
};

export default function PublicCatalog() {
  const { t } = useI18n();
  const { slug } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["public", "catalog", slug, "products"],
    enabled: !!slug,
    queryFn: async (): Promise<PublicCatalogData | null> => {
      const { data: catalog, error } = await supabase
        .from("catalogs")
        .select("id,name,slug,contact_email,is_public,logo_url,cover_image_url")
        .eq("slug", slug as string)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;

      if (!catalog) return null;

      // catalog_products -> products join (two-step, keeps ordering by sort_order)
      const { data: links, error: linksError } = await supabase
        .from("catalog_products")
        .select("product_id,sort_order")
        .eq("catalog_id", catalog.id)
        .order("sort_order", { ascending: true });
      if (linksError) throw linksError;

      const productIds = (links ?? []).map((l) => l.product_id).filter(Boolean) as string[];
      if (productIds.length === 0) {
        return { catalog: catalog as Catalog, products: [], categories: [] };
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,price_from,currency,badge,product_code,category_id")
        .in("id", productIds);
      if (productsError) throw productsError;

      const byId = new Map((products ?? []).map((p) => [p.id, p as unknown as CatalogProduct]));
      const orderedProducts = productIds.map((id) => byId.get(id)).filter(Boolean) as CatalogProduct[];

      const categoryIds = Array.from(
        new Set((orderedProducts ?? []).map((p) => p.category_id).filter(Boolean) as string[]),
      );

      let categories: Category[] = [];
      if (categoryIds.length > 0) {
        const { data: categoryRows, error: categoryError } = await supabase
          .from("categories")
          .select("id,name,slug")
          .in("id", categoryIds);
        if (categoryError) throw categoryError;
        categories = (categoryRows ?? []) as Category[];
      }

      return {
        catalog: catalog as Catalog,
        products: orderedProducts,
        categories,
      };
    },
  });

  const catalog = data?.catalog ?? null;
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];

  const productCount = products.length;
  const description =
    catalog?.name && productCount > 0
      ? t("publicCatalog.metaWithCount", { name: catalog.name, count: productCount })
      : catalog?.name
        ? t("publicCatalog.metaWithoutCount", { name: catalog.name })
        : t("publicCatalog.metaFallbackTitle");

  usePageMeta({
    title: catalog?.name ? catalog.name : t("publicCatalog.metaFallbackTitle"),
    description,
    ogImageUrl: catalog?.cover_image_url ?? undefined,
  });

  // JSON-LD: Google'ın katalog sayfasını ürün listesi olarak anlaması için
  useEffect(() => {
    if (!catalog || products.length === 0) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const catalogUrl = `${baseUrl}/brand/${catalog.slug}`;
    const itemListElement = products.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${baseUrl}${getProductPath({
        slug: p.slug,
        productCode: p.product_code,
        id: p.id,
      })}`,
      name: p.name,
    }));
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: catalog.name,
      description,
      url: catalogUrl,
      ...(itemListElement.length > 0 && {
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products.length,
          itemListElement,
        },
      }),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [catalog, products, description]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("common.loading")}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      );
    }

    if (!catalog) {
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("publicCatalog.notPublished")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("publicCatalog.notPublishedDesc")}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <>
      <div className="p-4 md:p-8">
        <header className="overflow-hidden rounded-xl border border-border">
        <div className="relative h-48 md:h-72">
          <img
            src={catalog.cover_image_url || "/placeholder.svg"}
            alt={t("publicCatalog.coverImageAlt", { name: catalog.name })}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
            <img
              src={catalog.logo_url || "/placeholder.svg"}
              alt={t("publicCatalog.logoAlt", { name: catalog.name })}
              className="h-16 w-16 rounded-lg border border-border bg-background object-contain"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-foreground md:text-3xl">{catalog.name}</h1>
              <p className="truncate text-sm text-muted-foreground">{t("publicCatalog.contact")}: {catalog.contact_email}</p>
            </div>
          </div>
        </div>
      </header>

        <main className="mt-6">
        {products.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("common.products")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("publicCatalog.noProducts")}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t("common.products")}</h2>
              <p className="text-sm text-muted-foreground">{t("publicCatalog.productsInCatalog")}</p>
            </div>
            {categories.length > 0 ? (
              <div className="ru-catalog-catbar mb-6 overflow-x-auto">
                <div className="flex flex-nowrap gap-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {category.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <CatalogProductGrid
              products={products}
              designerBrandSlug={catalog.slug}
              categoryPathContext={null}
            />
          </>
        )}
        </main>
      </div>
      <LandingFooter />
      </>
    );
  };

  return renderContent();
}
