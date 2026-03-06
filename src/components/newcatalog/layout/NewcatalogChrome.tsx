import { ReactNode, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CatalogFooter } from "@/components/newcatalog/layout/CatalogFooter";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { toPublicCategorySlug } from "@/lib/productUrls";

type TopCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export function NewcatalogChrome({
  /**
   * Backwards-compatible: pages historically pass labels like "All".
   * Prefer passing a category slug (e.g. "apparel") going forward.
   */
  activeCategory = "all",
  children,
}: {
  activeCategory?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { data: topCategories = [] } = useQuery({
    queryKey: ["public", "categories", "top"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,sort_order")
        .eq("is_active", true)
        .is("parent_category_id", null)
        .order("sort_order", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as TopCategory[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const navItems = useMemo(() => {
    const categoryLabelBySlug = (slug: string, fallbackName: string) => {
      const key = `catalog.category.${slug.toLowerCase()}`;
      const translated = t(key);
      return translated === key ? fallbackName : translated;
    };

    // Keep "All" as a stable entry, then append backend-driven top categories
    // like "Apparel", "Accessories".
    const base = [{ label: t("catalog.allProductsShort"), slug: "all", to: "/catalog" }];

    // Show all top-level categories in the menu (even if products live only in subcategories).
    const dynamic = topCategories.map((c) => ({
      label: categoryLabelBySlug(c.slug, c.name),
      slug: c.slug,
      to: `/${toPublicCategorySlug(c.slug)}`,
    }));
    return [...base, ...dynamic];
  }, [topCategories, t]);

  const activeKey = (activeCategory ?? "").toLowerCase();

  return (
    <main className="ts-clone min-h-dvh flex flex-col">
      {/* Top menu is rendered globally in AppLayout; keep only the category row here. */}
      <div className="ru-max px-6">
        <nav className="ru-cats" aria-label={t("catalog.categories")}>
          {navItems.map((item) => {
            const isActive =
              activeKey === item.slug.toLowerCase() || activeKey === item.label.toLowerCase();

            return (
              <Link
                key={item.slug}
                to={item.to}
                className={isActive ? "ru-cat ru-cat--active" : "ru-cat"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1">{children}</div>
      <CatalogFooter />
    </main>
  );
}
