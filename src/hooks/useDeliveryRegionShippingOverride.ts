import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type DeliveryRegionShippingOverride = {
  id: string;
  region_id: string;
  shipping_tip: string | null;
  shipping_method_name: string | null;
  shipping_method_time_text: string | null;
  shipping_method_cost_from_text: string | null;
  shipping_method_additional_item_text: string | null;
  production_time_text: string | null;
  shipping_time_text: string | null;
  total_fulfillment_time_text: string | null;
  estimated_delivery_text: string | null;
};

export function useDeliveryRegionShippingOverride(regionId?: string | null) {
  return useQuery({
    queryKey: ["delivery_region_shipping_overrides", regionId ?? null],
    enabled: Boolean(regionId),
    queryFn: async (): Promise<DeliveryRegionShippingOverride | null> => {
      if (!regionId) return null;
      const { data, error } = await supabase
        .from("delivery_region_shipping_overrides")
        .select(
          "id,region_id,shipping_tip,shipping_method_name,shipping_method_time_text,shipping_method_cost_from_text,shipping_method_additional_item_text,production_time_text,shipping_time_text,total_fulfillment_time_text,estimated_delivery_text"
        )
        .eq("region_id", regionId)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as DeliveryRegionShippingOverride | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
