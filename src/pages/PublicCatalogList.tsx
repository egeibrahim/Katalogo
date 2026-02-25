import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/LocaleProvider";

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string | null;
  logo_url: string | null;
};

export default function PublicCatalogList() {
  const { t } = useI18n();
  const { data: catalogs, isLoading } = useQuery({
    queryKey: ["public", "catalogs", "list"],
    queryFn: async (): Promise<CatalogRow[]> => {
      const { data, error } = await supabase
        .from("catalogs")
        .select("id,name,slug,cover_image_url,logo_url")
        .eq("is_public", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
    staleTime: 1000 * 60 * 5,
  });

  usePageMeta({
    title: t("publicCatalogList.title"),
    description: t("publicCatalogList.subtitle"),
  });

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

  const list = catalogs ?? [];

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{t("publicCatalogList.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("publicCatalogList.subtitle")}
        </p>
      </header>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("publicCatalogList.noCatalogs")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("publicCatalogList.noCatalogsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Katalog listesi">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                to={`/brand/${c.slug}`}
                className="block overflow-hidden rounded-xl border border-border transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="relative h-36 bg-muted">
                  <img
                    src={c.cover_image_url || "/placeholder.svg"}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt=""
                      className="absolute bottom-2 left-2 h-12 w-12 rounded-lg border border-border bg-background object-contain"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <h2 className="font-semibold text-foreground">{c.name}</h2>
                  <span className="text-xs text-muted-foreground">{t("publicCatalogList.viewCatalog")}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
