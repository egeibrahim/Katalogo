import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductPageBlockKey =
  | "customization_options"
  | "unit_price"
  | "fulfillment"
  | "shipping";

const FALLBACK_ORDER: ProductPageBlockKey[] = [
  "customization_options",
  "unit_price",
  "fulfillment",
  "shipping",
];

function normalizeOrder(input: unknown): ProductPageBlockKey[] {
  const allowed = new Set<ProductPageBlockKey>(FALLBACK_ORDER);
  const raw = Array.isArray(input) ? input : [];
  const out: ProductPageBlockKey[] = [];
  for (const v of raw) {
    if (typeof v === "string" && allowed.has(v as ProductPageBlockKey)) {
      if (!out.includes(v as ProductPageBlockKey)) out.push(v as ProductPageBlockKey);
    }
  }
  for (const k of FALLBACK_ORDER) if (!out.includes(k)) out.push(k);
  return out;
}

export function usePublicProductBlockOrder(productId?: string) {
  return useQuery({
    enabled: Boolean(productId),
    queryKey: ["public", "product", productId, "blockOrder"],
    queryFn: async (): Promise<ProductPageBlockKey[]> => {
      if (!productId) return FALLBACK_ORDER;

      const sb: any = supabase;

      // 1) product-specific
      // NOTE: DB types are generated; keep this query resilient by using an untyped table call.
      const { data: row, error: rowErr } = await sb
        .from("product_page_block_orders")
        .select("block_order")
        .eq("product_id", productId)
        .maybeSingle();
      if (rowErr) throw rowErr;
      if (row?.block_order?.length) return normalizeOrder(row.block_order as any);

      // 2) global fallback in app settings
      const { data: s, error: sErr } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "product_page_block_order_default")
        .maybeSingle();
      if (sErr) throw sErr;

      if (s?.value) {
        try {
          const parsed = JSON.parse(s.value);
          return normalizeOrder(parsed);
        } catch {
          // ignore
        }
      }

      return FALLBACK_ORDER;
    },
    staleTime: 5 * 60 * 1000,
  });
}
