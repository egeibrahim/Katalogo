import { supabase } from "@/integrations/supabase/client";

export type NewcatalogFiltersResponse = {
  success: boolean;
  data?: Record<string, string[]>;
  error?: string;
};

// Naming-only rebrand: keep invoking existing backend function for now.
export async function fetchNewcatalogFilters(): Promise<NewcatalogFiltersResponse> {
  const { data, error } = await supabase.functions.invoke("tapstitch-filters", {
    body: { url: "https://www.tapstitch.com/collections/all" },
  });

  if (error) return { success: false, error: error.message };
  return (data ?? { success: false, error: "No data" }) as NewcatalogFiltersResponse;
}
