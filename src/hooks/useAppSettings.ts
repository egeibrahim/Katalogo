import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppSettingsMap = Record<string, string>;

export function useAppSettings(keys?: string[]) {
  return useQuery({
    queryKey: ["app_settings", keys?.slice().sort().join("|") ?? "all"],
    queryFn: async (): Promise<AppSettingsMap> => {
      let q = supabase.from("app_settings").select("key,value");
      if (keys?.length) q = q.in("key", keys);

      const { data, error } = await q;
      if (error) throw error;

      const out: AppSettingsMap = {};
      for (const row of data ?? []) out[row.key] = row.value ?? "";
      return out;
    },
    staleTime: 5 * 60 * 1000,
  });
}
