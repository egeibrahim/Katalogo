import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a unique, URL-safe product slug. If the base slug already exists,
 * appends incremental suffixes (-2, -3, ...).
 */
export async function resolveUniqueProductSlug(baseSlug: string | null, excludeProductId?: string | null): Promise<string | null> {
  if (!baseSlug || !String(baseSlug).trim()) return null;
  const base = String(baseSlug).trim().toLowerCase().replace(/-+$/, "");
  if (!base) return null;
  let candidate = base;
  let n = 1;
  for (;;) {
    let query = supabase.from("products").select("id").eq("slug", candidate).limit(1);
    if (excludeProductId) query = query.neq("id", excludeProductId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${++n}`;
  }
}
