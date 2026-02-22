import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type DeliveryRegion = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export function useDeliveryRegions(options?: { includeInactive?: boolean }) {
  const includeInactive = Boolean(options?.includeInactive);

  return useQuery({
    queryKey: ["delivery_regions", { includeInactive }],
    queryFn: async (): Promise<DeliveryRegion[]> => {
      let q = supabase
        .from("delivery_regions")
        .select("id,name,sort_order,is_active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!includeInactive) q = q.eq("is_active", true);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DeliveryRegion[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
