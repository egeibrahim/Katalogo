import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ChevronLeft, GripVertical, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "@/hooks/use-toast";
import { arrayMove } from "@/lib/sort-order";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
};

type CatalogProductRow = {
  id: string;
  catalog_id: string;
  product_id: string;
  sort_order: number;
};

type CatalogProductItem = CatalogProductRow & {
  product: ProductRow | null;
};

function SortableCatalogProductRow({ item, onRemove }: { item: CatalogProductItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const p = item.product;
  const img = p?.thumbnail_url || p?.cover_image_url || "/placeholder.svg";

  return (
    <div
      ref={setNodeRef as any}
      style={style}
      className={
        "flex items-center gap-3 rounded-lg border border-border bg-background p-3" + (isDragging ? " opacity-70" : "")
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 cursor-grab"
        aria-label="Sırala"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </Button>

      <div className="h-12 w-12 overflow-hidden rounded-md border border-border bg-muted">
        <img
          src={img}
          alt={p ? `${p.name} görseli` : "Ürün görseli"}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">{p?.name ?? item.product_id}</div>
        <div className="truncate text-sm text-muted-foreground">{p?.slug ? `/product/${p.slug}` : `id: ${item.product_id}`}</div>
      </div>

      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRemove}>
        <Trash2 className="h-4 w-4" /> Kaldır
      </Button>
    </div>
  );
}

export default function BusinessCatalogProducts() {
  const { id: catalogId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [query, setQuery] = useState("");

  usePageMeta({ title: "Katalog Ürünleri", description: "Katalog ürün yönetimi", noIndex: true });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["business", "catalog", catalogId, userId],
    enabled: !!catalogId && !!userId,
    queryFn: async (): Promise<CatalogRow | null> => {
      const { data, error } = await supabase
        .from("catalogs")
        .select("id,name,slug")
        .eq("id", catalogId as string)
        .eq("owner_user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CatalogRow | null;
    },
  });

  const { data: allProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["business", "products", "picker"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
    staleTime: 60 * 1000,
  });

  const { data: catalogProductsRaw, isLoading: catalogProductsLoading } = useQuery({
    queryKey: ["business", "catalog_products", catalogId],
    enabled: !!catalogId,
    queryFn: async (): Promise<CatalogProductRow[]> => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("id,catalog_id,product_id,sort_order")
        .eq("catalog_id", catalogId as string)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogProductRow[];
    },
  });

  const [items, setItems] = useState<CatalogProductItem[]>([]);

  useEffect(() => {
    const productsById = new Map((allProducts ?? []).map((p) => [p.id, p] as const));
    const next: CatalogProductItem[] = (catalogProductsRaw ?? []).map((r) => ({
      ...r,
      product: productsById.get(r.product_id) ?? null,
    }));
    setItems(next);
  }, [allProducts, catalogProductsRaw]);

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const selectedProductIds = useMemo(() => new Set(items.map((i) => i.product_id)), [items]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = allProducts ?? [];
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q) || (p.slug ?? "").toLowerCase().includes(q));
  }, [allProducts, query]);

  const addMutation = useMutation({
    mutationFn: async (product: ProductRow) => {
      if (!catalogId) throw new Error("missing_catalog");
      const sort_order = items.length;
      const { error } = await supabase.from("catalog_products").insert({
        catalog_id: catalogId,
        product_id: product.id,
        sort_order,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business", "catalog_products", catalogId] });
    },
    onError: (e) => {
      const msg = (e as { message?: string })?.message ?? "";
      toast({
        title: msg.toLowerCase().includes("catalog_products_unique") ? "Bu ürün zaten ekli" : "Ürün eklenemedi",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("catalog_products").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business", "catalog_products", catalogId] });
    },
    onError: () => toast({ title: "Kaldırılamadı", variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (next: CatalogProductItem[]) => {
      // Update each row's sort_order (keeps it simple + safe)
      const ops = next.map((it, index) =>
        supabase.from("catalog_products").update({ sort_order: index }).eq("id", it.id)
      );
      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business", "catalog_products", catalogId] });
    },
    onError: () => toast({ title: "Sıralama kaydedilemedi", variant: "destructive" }),
  });

  if (catalogLoading || catalogProductsLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Yükleniyor…</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Katalog bulunamadı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Bu kataloğa erişimin olmayabilir.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/business/catalogs")}> 
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="truncate text-lg font-semibold text-foreground">{catalog.name} · Ürünler</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sırala (drag&drop), kaldır veya yeni ürün ekle. Public URL: <span className="font-mono">/brand/{catalog.slug}</span>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/brand/${catalog.slug}`} target="_blank" rel="noreferrer">
            Public sayfayı aç
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section aria-label="Katalog ürünleri">
          <Card>
            <CardHeader>
              <CardTitle>Katalogtaki ürünler</CardTitle>
            </CardHeader>
            <CardContent>
              {(items ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz ürün eklenmedi.</p>
              ) : (
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
                  <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {items.map((it) => (
                        <SortableCatalogProductRow
                          key={it.id}
                          item={it}
                          onRemove={() => removeMutation.mutate(it.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </section>

        <aside aria-label="Ürün ekle">
          <Card>
            <CardHeader>
              <CardTitle>Ürün ekle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara (isim / slug)" />
              <Separator />

              {productsLoading ? (
                <p className="text-sm text-muted-foreground">Yükleniyor…</p>
              ) : (
                <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                  {filteredProducts.slice(0, 50).map((p) => {
                    const disabled = selectedProductIds.has(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{p.slug ?? p.id}</div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={disabled ? "outline" : "default"}
                          className="gap-2"
                          disabled={disabled || addMutation.isPending}
                          onClick={() => addMutation.mutate(p)}
                        >
                          <Plus className="h-4 w-4" /> {disabled ? "Eklendi" : "Ekle"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
