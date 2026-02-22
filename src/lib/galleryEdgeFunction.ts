import { supabase } from "@/integrations/supabase/client";

export type GalleryUpsertRow = { id: string; product_id: string; image_url: string; sort_order: number };

/**
 * Galeri sırası: doğrudan tabloya upsert (RLS kapalı olmalı).
 * RLS hatası alınırsa mesajda proje URL'si gösterilir — SQL'i o projede çalıştırın.
 */
export async function upsertProductGalleryImages(rows: GalleryUpsertRow[]): Promise<{ error?: string }> {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const { error } = await supabase.from("product_gallery_images").upsert(rows, { onConflict: "id" });
  if (!error) return {};
  if (error.message.includes("row-level security")) {
    return {
      error: `RLS engelliyor. Bu projede RLS kapatın: ${projectUrl} → Dashboard'da bu URL'deki projeyi açın (sol üst) → SQL Editor → şu komutu çalıştırın: ALTER TABLE public.product_gallery_images DISABLE ROW LEVEL SECURITY; (önce DROP POLICY ile policy'leri silebilirsiniz)`,
    };
  }
  return { error: error.message };
}
