import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { PublicProduct } from "@/hooks/usePublicProduct";

type Params = { slug?: string; id?: string };

/**
 * ProductPageV2 için: aktif/pasif fark etmeksizin ürün çekmek.
 * (Public hook'lar is_active=true filtrelediği için V2 preview sayfası boş kalabiliyordu.)
 */
export function useProductBySlugOrIdAnyStatus({ slug, id }: Params) {
  return useQuery({
    queryKey: ["products", "by-slug-or-id", { slug: slug ?? null, id: id ?? null }],
    enabled: Boolean(slug || id),
    queryFn: async (): Promise<PublicProduct | null> => {
      const select =
        "id,name,description,slug,badge,product_code,price_from,currency,category_id,cover_image_url,thumbnail_url,meta_title,meta_description,is_active";

      if (slug) {
        // limit(1) prevents errors if the table accidentally has duplicate slugs.
        const { data, error } = await supabase.from("products").select(select).eq("slug", slug).limit(1).maybeSingle();
        if (error) throw error;
        return (data ?? null) as PublicProduct | null;
      }

      if (id) {
        const { data, error } = await supabase.from("products").select(select).eq("id", id).limit(1).maybeSingle();
        if (error) throw error;
        return (data ?? null) as PublicProduct | null;
      }

      return null;
    },
  });
}
