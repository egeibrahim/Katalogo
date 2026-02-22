import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/ui/signed-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { arrayMove, buildSortOrderUpdates } from "@/lib/sort-order";
import { GripVertical, Pencil, Plus, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  price_from: number | null;
  is_active: boolean | null;
  created_at: string;
  categories?: { name: string } | null;
};

function SortableProductRow({
  product,
  children,
}: {
  product: ProductRow;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef as any} style={style} className={isDragging ? "opacity-70" : undefined}>
      <TableCell className="w-[44px]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,sort_order,price_from,is_active,created_at,categories(name)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const [items, setItems] = useState<ProductRow[]>([]);
  useEffect(() => {
    setItems(products ?? []);
  }, [products]);

  const itemIds = useMemo(() => items.map((p) => p.id), [items]);

  const toggleStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: payload.is_active })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Update failed");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const reorderMutation = useMutation({
    mutationFn: async (next: ProductRow[]) => {
      const updates = buildSortOrderUpdates(next);
      // Update only sort_order (admin-only operation)
      const results = await Promise.all(
        updates.map((u) => supabase.from("products").update({ sort_order: u.sort_order }).eq("id", u.id))
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Reorder failed");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const { data: source, error: fetchErr } = await supabase
        .from("products")
        .select("*")
        .eq("id", sourceId)
        .single();
      if (fetchErr || !source) throw new Error(fetchErr?.message ?? "Product not found");

      const maxOrder = Math.max(0, ...(products ?? []).map((p) => p.sort_order ?? 0));
      const insertPayload: Record<string, unknown> = {
        name: `${(source as any).name ?? "Product"} (Kopya)`,
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
        .insert({ ...insertPayload, owner_user_id: null } as any)
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

      const { data: colorVariants } = await supabase
        .from("product_color_variants")
        .select("color_id")
        .eq("product_id", sourceId);
      if (colorVariants?.length) {
        await supabase.from("product_color_variants").insert(
          (colorVariants as any[]).map((c) => ({ product_id: newId, color_id: c.color_id }))
        );
      }

      const { data: sizeVariants } = await supabase
        .from("product_size_variants")
        .select("size_id")
        .eq("product_id", sourceId);
      if (sizeVariants?.length) {
        await supabase.from("product_size_variants").insert(
          (sizeVariants as any[]).map((s) => ({ product_id: newId, size_id: s.size_id }))
        );
      }

      const { data: attrsRow } = await supabase
        .from("product_attributes")
        .select("data")
        .eq("product_id", sourceId)
        .maybeSingle();
      if (attrsRow?.data) {
        await supabase.from("product_attributes").upsert([{ product_id: newId, data: attrsRow.data }], { onConflict: "product_id" });
      }

      const { data: mockupRow } = await supabase
        .from("product_mockups")
        .select("*")
        .eq("product_id", sourceId)
        .maybeSingle();
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

      const { data: shippingRow } = await supabase
        .from("product_shipping_overrides")
        .select("*")
        .eq("product_id", sourceId)
        .maybeSingle();
      if (shippingRow) {
        const { product_id: _, id: __, ...rest } = shippingRow as any;
        await supabase.from("product_shipping_overrides").upsert([{ product_id: newId, ...rest }], { onConflict: "product_id" });
      }

      return newId;
    },
    onSuccess: (newId) => {
      toast.success("Product copied.");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      navigate(`/admin/products/${newId}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Copy failed"),
  });

  const renderProductCells = (p: ProductRow) => (
    <>
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
        <Switch
          checked={Boolean(p.is_active)}
          onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: p.id, is_active: checked })}
          disabled={toggleStatusMutation.isPending}
          className="ml-2"
        />
      </TableCell>
      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="icon" asChild title="Open in store">
            <a href={p.slug ? `/product/${p.slug}` : `/product/id/${p.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/products/${p.id}`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => copyMutation.mutate(p.id)} disabled={copyMutation.isPending} title="Kopyala">
            <Copy className="h-4 w-4" /> Kopyala
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Sil"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                <AlertDialogDescription>This product will be permanently deleted.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} disabled={deleteMutation.isPending}>Sil</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </>
  );

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Products</CardTitle>
            <p className="text-sm text-muted-foreground">Products you create are added to the platform catalog; store accounts use them by copying.</p>
          </div>
          <Button onClick={() => navigate("/admin/products/new")}>
            <Plus className="h-4 w-4" /> New product
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) return;
                const oldIndex = items.findIndex((p) => p.id === active.id);
                const newIndex = items.findIndex((p) => p.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return;
                const next = arrayMove(items, oldIndex, newIndex);
                setItems(next);
                reorderMutation.mutate(next);
              }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]" />
                    <TableHead>Product name</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Fiyat</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading…</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No products yet. Add a new product.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                      {items.map((p) => (
                        <SortableProductRow key={p.id} product={p}>
                          {renderProductCells(p)}
                        </SortableProductRow>
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
