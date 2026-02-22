import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { SignedImage } from "@/components/ui/signed-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  price_from: number | null;
  is_active: boolean | null;
  created_at: string;
  categories?: { name: string } | null;
};

export default function BusinessCatalog() {
  usePageMeta({ title: "Catalog", description: "Platform catalog", noIndex: true });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: products, isLoading } = useQuery({
    queryKey: ["business", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,price_from,is_active,created_at,categories(name)")
        .is("owner_user_id", null)
        .order("sort_order", { ascending: true });
      if (!error) return (data ?? []) as ProductRow[];
      if (!error.message?.includes("owner_user_id") && !error.message?.includes("schema cache")) throw error;
      const { data: data2, error: err2 } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,price_from,is_active,created_at,categories(name)")
        .order("sort_order", { ascending: true });
      if (err2) throw err2;
      return (data2 ?? []) as ProductRow[];
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      if (!userId) throw new Error("Oturum gerekli");

      const { data: source, error: fetchErr } = await supabase
        .from("products")
        .select("*")
        .eq("id", sourceId)
        .single();
      if (fetchErr || !source) throw new Error(fetchErr?.message ?? "Product not found");

      const { data: existing } = await supabase
        .from("products")
        .select("sort_order")
        .eq("owner_user_id", userId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const maxOrder = (existing as any)?.sort_order ?? 0;

      const insertPayload: Record<string, unknown> = {
        name: `${(source as any).name ?? "Product"} (Copy)`,
        slug: null,
        category_id: (source as any).category_id ?? null,
        price_from: (source as any).price_from ?? null,
        is_active: false,
        sort_order: maxOrder + 1,
        product_code: (source as any).product_code ?? null,
        description: (source as any).description ?? null,
        meta_title: (source as any).meta_title ?? null,
        meta_description: (source as any).meta_description ?? null,
        cover_image_url: (source as any).cover_image_url ?? null,
        thumbnail_url: (source as any).thumbnail_url ?? null,
      };
      let { data: newProduct, error: insertErr } = await supabase
        .from("products")
        .insert({ ...insertPayload, owner_user_id: userId } as any)
        .select("id")
        .single();
      if (insertErr && (String(insertErr.message || "").includes("owner_user_id") || String(insertErr.message || "").includes("schema cache"))) {
        const res = await supabase.from("products").insert(insertPayload as any).select("id").single();
        insertErr = res.error;
        newProduct = res.data;
      }
      if (insertErr || !newProduct) throw new Error(insertErr?.message ?? "Copy failed");
      const newId = (newProduct as { id: string }).id;

      const { data: views } = await supabase
        .from("product_views")
        .select("id,view_name,view_order,design_area_top,design_area_left,design_area_width,design_area_height,mockup_image_url")
        .eq("product_id", sourceId)
        .order("view_order", { ascending: true });
      const viewIdMap: Record<string, string> = {};
      if (views?.length) {
        for (const v of views) {
          const { data: inserted } = await supabase
            .from("product_views")
            .insert({
              product_id: newId,
              view_name: (v as any).view_name,
              view_order: (v as any).view_order,
              design_area_top: (v as any).design_area_top ?? 25,
              design_area_left: (v as any).design_area_left ?? 25,
              design_area_width: (v as any).design_area_width ?? 50,
              design_area_height: (v as any).design_area_height ?? 40,
              mockup_image_url: (v as any).mockup_image_url ?? null,
            })
            .select("id")
            .single();
          if (inserted) viewIdMap[(v as any).id] = (inserted as { id: string }).id;
        }
      }

      const { data: colorMockups } = await supabase
        .from("product_view_color_mockups")
        .select("product_view_id,color_id,mockup_image_url")
        .in("product_view_id", Object.keys(viewIdMap));
      if (colorMockups?.length) {
        await supabase.from("product_view_color_mockups").insert(
          colorMockups.map((m: any) => ({
            product_view_id: viewIdMap[m.product_view_id] ?? m.product_view_id,
            color_id: m.color_id,
            mockup_image_url: m.mockup_image_url,
          }))
        );
      }

      const { data: gallery } = await supabase
        .from("product_gallery_images")
        .select("image_url,sort_order")
        .eq("product_id", sourceId)
        .order("sort_order", { ascending: true });
      if (gallery?.length) {
        await supabase.from("product_gallery_images").insert(
          (gallery as any[]).map((g, i) => ({
            product_id: newId,
            image_url: g.image_url,
            sort_order: g.sort_order ?? i,
          }))
        );
      }

      const { data: colorVariants } = await supabase.from("product_color_variants").select("color_id").eq("product_id", sourceId);
      if (colorVariants?.length) {
        await supabase.from("product_color_variants").insert(
          (colorVariants as any[]).map((c) => ({ product_id: newId, color_id: c.color_id }))
        );
      }

      const { data: sizeVariants } = await supabase.from("product_size_variants").select("size_id").eq("product_id", sourceId);
      if (sizeVariants?.length) {
        await supabase.from("product_size_variants").insert(
          (sizeVariants as any[]).map((s) => ({ product_id: newId, size_id: s.size_id }))
        );
      }

      const { data: attrsRow } = await supabase.from("product_attributes").select("data").eq("product_id", sourceId).maybeSingle();
      if (attrsRow?.data) {
        await supabase.from("product_attributes").upsert([{ product_id: newId, data: attrsRow.data }], { onConflict: "product_id" });
      }

      const { data: mockupRow } = await supabase.from("product_mockups").select("*").eq("product_id", sourceId).maybeSingle();
      if (mockupRow) {
        const { product_id: _, id: __, ...rest } = mockupRow as any;
        await supabase.from("product_mockups").upsert([{ product_id: newId, ...rest }], { onConflict: "product_id" });
      }

      const { data: tiers } = await supabase
        .from("product_unit_price_tiers")
        .select("min_qty,max_qty,unit_price,currency,sort_order")
        .eq("product_id", sourceId)
        .order("sort_order", { ascending: true });
      if (tiers?.length) {
        await supabase.from("product_unit_price_tiers").insert(
          (tiers as any[]).map((t, i) => ({
            product_id: newId,
            min_qty: t.min_qty,
            max_qty: t.max_qty,
            unit_price: t.unit_price,
            currency: t.currency ?? "USD",
            sort_order: i,
          }))
        );
      }

      const { data: shippingRow } = await supabase.from("product_shipping_overrides").select("*").eq("product_id", sourceId).maybeSingle();
      if (shippingRow) {
        const { product_id: _, id: __, ...rest } = shippingRow as any;
        await supabase.from("product_shipping_overrides").upsert([{ product_id: newId, ...rest }], { onConflict: "product_id" });
      }

      return newId;
    },
    onSuccess: (newId) => {
      toast.success("Product copied. Added to My products tab.");
      qc.invalidateQueries({ queryKey: ["business", "products", userId] });
      navigate("/business/products");
    },
    onError: (e: any) => toast.error(e?.message ?? "Copy failed"),
  });

  const items = products ?? [];

  if (!userId) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Oturum gerekli.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Katalog</CardTitle>
          <p className="text-sm text-muted-foreground">
            Copy products from the platform catalog to add to your own products, then edit them.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product name</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No products in catalog yet.</TableCell>
                  </TableRow>
                ) : (
                  items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                            {(p.thumbnail_url || p.cover_image_url) ? (
                              <SignedImage src={p.thumbnail_url ?? p.cover_image_url ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="truncate font-medium">{p.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{p.categories?.name ?? "—"}</TableCell>
                      <TableCell>{p.price_from != null ? `$${p.price_from}` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Published" : "Draft"}</Badge>
                      </TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyMutation.mutate(p.id)}
                          disabled={copyMutation.isPending}
                          title="Copy to my products"
                        >
                          <Copy className="h-4 w-4" /> Kopyala
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
