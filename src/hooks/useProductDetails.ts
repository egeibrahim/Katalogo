import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductDetailContentType = "text" | "link" | "list";

export type ProductDetail = {
  id: string;
  product_id: string;
  title: string;
  content_type: ProductDetailContentType;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function useProductDetails(productId: string) {
  return useQuery({
    queryKey: ["product-details", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductDetail[]> => {
      const { data, error } = await supabase
        .from("product_details")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProductDetail[];
    },
  });
}
