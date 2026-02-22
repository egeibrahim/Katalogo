import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogProductGrid } from "@/components/newcatalog/collection/CatalogProductGrid";

type Catalog = {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  is_public: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
};

type CatalogProduct = {
  id: string;
  name: string;
  slug: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  price_from: number | null;
  badge: string | null;
  product_code: string | null;
};

type PublicCatalogData = {
  catalog: Catalog;
  products: CatalogProduct[];
};

export default function PublicCatalog() {
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
        return { catalog: catalog as Catalog, products: [] };
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,price_from,badge,product_code")
        .in("id", productIds);
      if (productsError) throw productsError;

      const byId = new Map((products ?? []).map((p) => [p.id, p as unknown as CatalogProduct]));
      const orderedProducts = productIds.map((id) => byId.get(id)).filter(Boolean) as CatalogProduct[];

      return {
        catalog: catalog as Catalog,
        products: orderedProducts,
      };
    },
  });

  const catalog = data?.catalog ?? null;
  const products = data?.products ?? [];

  const productCount = products.length;
  const description =
    catalog?.name && productCount > 0
      ? `${catalog.name} catalog – ${productCount} products. View on Newcatalog.`
      : catalog?.name
        ? `${catalog.name} catalog. View on Newcatalog.`
        : "Katalog";

  usePageMeta({
    title: catalog?.name ? catalog.name : "Katalog",
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
      url: p.slug ? `${baseUrl}/product/${p.slug}` : undefined,
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

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading…</CardTitle>
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
            <CardTitle>This catalog is not published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">If the link is correct, the publish setting may be off.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <header className="overflow-hidden rounded-xl border border-border">
        <div className="relative h-48 md:h-72">
          <img
            src={catalog.cover_image_url || "/placeholder.svg"}
            alt={`${catalog.name} cover image`}
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
              alt={`${catalog.name} logo`}
              className="h-16 w-16 rounded-lg border border-border bg-background object-contain"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-foreground md:text-3xl">{catalog.name}</h1>
              <p className="truncate text-sm text-muted-foreground">Contact: {catalog.contact_email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mt-6">
        {products.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No products in this catalog yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Products</h2>
              <p className="text-sm text-muted-foreground">Products in this catalog</p>
            </div>
            <CatalogProductGrid products={products} />
          </>
        )}
      </main>
    </div>
  );
}
