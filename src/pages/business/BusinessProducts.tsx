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
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
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
import { GripVertical, Pencil, Trash2, Copy, ExternalLink } from "lucide-react";
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

function SortableProductRow({ product, children }: { product: ProductRow; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return (
    <TableRow ref={setNodeRef as any} style={style} className={isDragging ? "opacity-70" : undefined}>
      <TableCell className="w-[44px]">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-grab" aria-label="Sırala" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function BusinessProducts() {
  usePageMeta({ title: "Ürünlerim", description: "Kendi ürünleriniz", noIndex: true });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const { data: products, isLoading } = useQuery({
    queryKey: ["business", "products", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,sort_order,price_from,is_active,created_at,categories(name)")
        .eq("owner_user_id", userId)
        .order("sort_order", { ascending: true });
      if (!error) return (data ?? []) as ProductRow[];
      if (error.message?.includes("owner_user_id") || error.message?.includes("schema cache")) return [];
      throw error;
    },
    enabled: Boolean(userId),
  });

  const [items, setItems] = useState<ProductRow[]>([]);
  useEffect(() => {
    setItems(products ?? []);
  }, [products]);

  const itemIds = useMemo(() => items.map((p) => p.id), [items]);

  const toggleStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: payload.is_active }).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business", "products", userId] }),
    onError: (e: any) => {
      toast.error(e?.message ?? "Güncellenemedi");
      qc.invalidateQueries({ queryKey: ["business", "products", userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId).eq("owner_user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ürün silindi");
      qc.invalidateQueries({ queryKey: ["business", "products", userId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Silinemedi"),
  });

  const reorderMutation = useMutation({
    mutationFn: async (next: ProductRow[]) => {
      const updates = buildSortOrderUpdates(next);
      const results = await Promise.all(
        updates.map((u) => supabase.from("products").update({ sort_order: u.sort_order }).eq("id", u.id).eq("owner_user_id", userId!))
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business", "products", userId] }),
    onError: (e: any) => {
      toast.error(e?.message ?? "Sıra güncellenemedi");
      qc.invalidateQueries({ queryKey: ["business", "products", userId] });
    },
  });

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
          <CardTitle>Ürünlerim</CardTitle>
          <p className="text-sm text-muted-foreground">
            Katalog sekmesinden ürün kopyalayarak buraya ekleyebilir, düzenleyebilirsiniz. Başlangıçta liste boştur.
          </p>
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
                    <TableHead>Ürün adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Fiyat</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead className="w-[200px] text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Yükleniyor…</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Henüz ürün yok. <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/brand/catalog")}>Katalog</Button> sekmesinden kopyalayarak ekleyin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                      {items.map((p) => (
                        <SortableProductRow key={p.id} product={p}>
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
                            <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Yayında" : "Taslak"}</Badge>
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
                              <Button variant="outline" size="icon" asChild title="Mağazada aç">
                                <a href={p.slug ? `/product/${p.slug}` : `/product/id/${p.id}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => navigate(`/brand/products/${p.id}`)}>
                                <Pencil className="h-4 w-4" /> Düzenle
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label="Sil"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Ürünü sil?</AlertDialogTitle>
                                    <AlertDialogDescription>Bu ürün kalıcı olarak silinecek.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} disabled={deleteMutation.isPending}>Sil</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
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
