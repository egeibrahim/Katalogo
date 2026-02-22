import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Save, Package, Loader2, Palette, Send, X, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ProductColor {
  id: string;
  name: string;
  hex_code: string;
  sort_order: number;
  is_active: boolean;
}


interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
}


const productSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı en az 2 karakter olmalı").max(80, "Ürün adı en fazla 80 karakter olmalı"),
});

const colorSchema = z.object({
  name: z.string().trim().min(1, "Renk adı boş olamaz").max(30, "Renk adı en fazla 30 karakter olmalı"),
  hex_code: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/, "Hex kodu #RRGGBB formatında olmalı"),
});

const DEFAULT_VIEWS: Array<{
  view_name: string;
  design_area_top: number;
  design_area_left: number;
  design_area_width: number;
  design_area_height: number;
}> = [
  { view_name: "Ön", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 40 },
  { view_name: "Arka", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 40 },
  { view_name: "Sol Kol", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 50 },
  { view_name: "Sağ Kol", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 50 },
];


type AdminCatalogPanelProps = {
  selectedColorId: string | null;
};

export function AdminCatalogPanel({ selectedColorId }: AdminCatalogPanelProps) {
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md border bg-card">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold leading-tight">Admin Kataloğu</h2>
            <p className="text-xs text-muted-foreground">Ürünleri ve renk paletini düzenle.</p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <ProductsTab selectedColorId={selectedColorId} />
      </div>
    </div>
  );
}

// === PRODUCTS TAB ===
function ProductsTab({ selectedColorId }: { selectedColorId: string | null }) {
  const queryClient = useQueryClient();
  const [newProductName, setNewProductName] = useState("");

  // Fetch all products (including inactive for admin)
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filteredProducts = useMemo(() => {
    return products ?? [];
  }, [products]);

  const createProductMutation = useMutation({
    mutationFn: async () => {
      const parsed = productSchema.safeParse({ name: newProductName });
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Ürün adı geçersiz");
      }

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: parsed.data.name,
          category: null,
          is_active: false,
        })
        .select("id")
        .single();

      if (productError) throw productError;

      const viewsToInsert = DEFAULT_VIEWS.map((view, index) => ({
        product_id: product.id,
        view_name: view.view_name,
        view_order: index,
        mockup_image_url: null,
        design_area_top: view.design_area_top,
        design_area_left: view.design_area_left,
        design_area_width: view.design_area_width,
        design_area_height: view.design_area_height,
      }));

      const { error: viewsError } = await supabase.from("product_views").insert(viewsToInsert);
      if (viewsError) throw viewsError;

      return product.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ürün eklendi");
      setNewProductName("");
    },
    onError: (error) => {
      toast.error("Ürün eklenemedi: " + (error as Error).message);
    },
  });

  // Toggle product active status
  const toggleProductMutation = useMutation({
    mutationFn: async ({ productId, isActive }: { productId: string; isActive: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(isActive ? "Ürün yayınlandı" : "Ürün yayından kaldırıldı");
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      return productId;
    },
    onSuccess: (deletedProductId) => {
      queryClient.setQueryData(["admin-products"], (old: Product[] | undefined) =>
        old?.filter((p) => p.id !== deletedProductId)
      );
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ürün silindi");
    },
  });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ürün adı"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createProductMutation.mutate();
              }
            }}
            className="h-8"
            aria-label="Yeni ürün adı"
          />
          <Button
            size="sm"
            onClick={() => createProductMutation.mutate()}
            disabled={!newProductName.trim() || createProductMutation.isPending}
          >
            {createProductMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Ekle"
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
              <TableRow>
                <TableHead className="h-10 px-3">Ürün</TableHead>
                <TableHead className="h-10 px-3">Durum</TableHead>
                <TableHead className="h-10 px-3 text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredProducts.map((product, idx) => (
                <ProductItemAdmin
                  key={product.id}
                  product={product}
                  selectedColorId={selectedColorId}
                  rowIndex={idx}
                  rowCount={filteredProducts.length}
                  onRowFocus={(nextIndex) => {
                    const el = document.querySelector<HTMLTableRowElement>(
                      `[data-admin-product-row='${nextIndex}']`
                    );
                    el?.focus();
                  }}
                  onToggle={(isActive) => toggleProductMutation.mutate({ productId: product.id, isActive })}
                  onDelete={() => deleteProductMutation.mutate(product.id)}
                />
              ))}

              {(products?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    Henüz ürün eklenmemiş
                  </TableCell>
                </TableRow>
              )}

              {(products?.length ?? 0) > 0 && filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    Filtrelere uygun ürün bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}


// Product item with publish toggle
interface ProductItemAdminProps {
  product: Product;
  selectedColorId: string | null;
  rowIndex: number;
  rowCount: number;
  onRowFocus: (nextIndex: number) => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}

function ProductItemAdmin({
  product,
  selectedColorId,
  rowIndex,
  rowCount,
  onRowFocus,
  onToggle,
  onDelete,
}: ProductItemAdminProps) {
  const queryClient = useQueryClient();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCheckingDeleteDeps, setIsCheckingDeleteDeps] = useState(false);
  const [deleteDeps, setDeleteDeps] = useState<{ viewsCount: number; mockupsCount: number } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(product.name);


  const { data: hasAnyMockup = false, isLoading: isCheckingMockup } = useQuery({
    queryKey: ["admin-product-has-mockup", product.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("product_views")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id)
        .not("mockup_image_url", "is", null);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    staleTime: 30_000,
  });

  const publishBlockReason = useMemo(() => {
    if (hasAnyMockup === false) return "Yayınlamak için ürüne en az 1 mockup yüklemelisiniz";
    if (!selectedColorId) return "Yayınlamak için tasarımcıda bir renk seçmelisiniz";
    return null;
  }, [hasAnyMockup, selectedColorId]);

  const publishDisabled = !product.is_active && (isCheckingMockup || Boolean(publishBlockReason));
  const publishTitle = publishDisabled
    ? isCheckingMockup
      ? "Mockup kontrol ediliyor…"
      : publishBlockReason ?? "Yayınla"
    : product.is_active
      ? "Yayından kaldır"
      : "Yayınla";

  const updateProductMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      const parsed = productSchema.safeParse({ name: payload.name });
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Ürün adı geçersiz");
      }

      const { error } = await supabase
        .from("products")
        .update({
          name: parsed.data.name,
        })
        .eq("id", product.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ürün güncellendi");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Ürün güncellenemedi: " + (error as Error).message);
    },
  });

  useEffect(() => {
    setDraftName(product.name);
  }, [product.id, product.name]);

  const handleStartEdit = () => {
    setDraftName(product.name);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftName(product.name);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    updateProductMutation.mutate({ name: draftName });
  };

  useEffect(() => {
    if (!isDeleteOpen) return;

    let cancelled = false;
    const run = async () => {
      setIsCheckingDeleteDeps(true);
      setDeleteDeps(null);

      try {
        const { count: viewsCount, error: viewsCountError } = await supabase
          .from("product_views")
          .select("id", { count: "exact", head: true })
          .eq("product_id", product.id);

        if (viewsCountError) throw viewsCountError;

        let mockupsCount = 0;
        if ((viewsCount ?? 0) > 0) {
          const { data: viewRows, error: viewRowsError } = await supabase
            .from("product_views")
            .select("id")
            .eq("product_id", product.id);

          if (viewRowsError) throw viewRowsError;
          const viewIds = (viewRows ?? []).map((v) => v.id);

          if (viewIds.length > 0) {
            const { count: mockups, error: mockupsError } = await supabase
              .from("product_view_color_mockups")
              .select("id", { count: "exact", head: true })
              .in("product_view_id", viewIds);

            if (mockupsError) throw mockupsError;
            mockupsCount = mockups ?? 0;
          }
        }

        if (!cancelled) setDeleteDeps({ viewsCount: viewsCount ?? 0, mockupsCount });
      } catch {
        if (!cancelled) toast.error("Silme kontrolü yapılamadı");
      } finally {
        if (!cancelled) setIsCheckingDeleteDeps(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isDeleteOpen, product.id]);

  // Önceden burada “Görünümleri Düzenle” popup'ını açma akışı vardı; kaldırıldı.


  return (
    <>
      <TableRow
        tabIndex={0}
        data-admin-product-row={rowIndex}
        className={cn(
          "h-10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            onRowFocus(Math.min(rowIndex + 1, rowCount - 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onRowFocus(Math.max(rowIndex - 1, 0));
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
      >
        <TableCell className="py-2 px-3">
          <div className="min-w-0">
            {isEditing ? (
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancelEdit();
                  }
                }}
                disabled={updateProductMutation.isPending}
                className="h-8"
                aria-label="Ürün adı"
              />
            ) : (
              <p className="truncate font-medium">{product.name}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2 px-3">
          <div className="flex items-center gap-2" title={publishTitle}>
            <Switch
              checked={product.is_active}
              disabled={publishDisabled}
              onCheckedChange={(checked) => {
                const next = Boolean(checked);

                // Only block when trying to publish (turn ON)
                if (next && !product.is_active) {
                  if (isCheckingMockup) {
                    toast.message("Mockup kontrol ediliyor…");
                    return;
                  }
                  if (publishBlockReason) {
                    toast.error(publishBlockReason);
                    return;
                  }
                }

                onToggle(next);
              }}
              aria-label={product.is_active ? "Yayında" : "Taslak"}
            />
          </div>
        </TableCell>

        <TableCell className="py-2 px-3">
          <div className="flex items-center justify-end gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSaveEdit}
                  disabled={updateProductMutation.isPending}
                  aria-label="Kaydet"
                  title="Kaydet"
                >
                  {updateProductMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                  disabled={updateProductMutation.isPending}
                  aria-label="Vazgeç"
                  title="Vazgeç"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleStartEdit}
                  aria-label="Düzenle"
                  title="Düzenle"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  aria-label="Sil"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              {isCheckingDeleteDeps ? (
                "Bağlı içerikler kontrol ediliyor..."
              ) : deleteDeps ? (
                deleteDeps.viewsCount > 0 || deleteDeps.mockupsCount > 0 ? (
                  `Bu ürüne bağlı ${deleteDeps.viewsCount} görünüm ve ${deleteDeps.mockupsCount} renk bazlı mockup var. Silerseniz hepsi kaldırılır.`
                ) : (
                  "Bu ürüne bağlı görünüm/mockup bulunamadı."
                )
              ) : (
                "Silme işlemi geri alınamaz."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCheckingDeleteDeps}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setIsDeleteOpen(false);
              }}
              disabled={isCheckingDeleteDeps}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

// === COLORS TAB ===
function ColorsTab() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");

  // Fetch all colors (including inactive for admin)
  const { data: colors, isLoading } = useQuery({
    queryKey: ["admin-colors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_colors").select("*").order("sort_order");
      if (error) throw error;
      return data as ProductColor[];
    },
  });

  // Create color mutation
  const createColorMutation = useMutation({
    mutationFn: async () => {
      const parsed = colorSchema.safeParse({ name: newColorName, hex_code: newColorHex });
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Renk bilgileri geçersiz");
      }

      const maxOrder = colors?.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) || 0;

      const { error } = await supabase.from("product_colors").insert({
        name: parsed.data.name,
        hex_code: parsed.data.hex_code,
        sort_order: maxOrder + 1,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-colors"] });
      queryClient.invalidateQueries({ queryKey: ["product-colors"] });
      toast.success("Renk eklendi");
      setNewColorName("");
      setNewColorHex("#000000");
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Renk eklenemedi: " + (error as Error).message);
    },
  });

  // Toggle color active status
  const toggleColorMutation = useMutation({
    mutationFn: async ({ colorId, isActive }: { colorId: string; isActive: boolean }) => {
      const { error } = await supabase.from("product_colors").update({ is_active: isActive }).eq("id", colorId);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-colors"] });
      queryClient.invalidateQueries({ queryKey: ["product-colors"] });
      toast.success(isActive ? "Renk aktifleştirildi" : "Renk devre dışı bırakıldı");
    },
    onError: (error) => {
      toast.error("İşlem başarısız: " + (error as Error).message);
    },
  });

  // Delete color mutation
  const deleteColorMutation = useMutation({
    mutationFn: async (colorId: string) => {
      const { error } = await supabase.from("product_colors").delete().eq("id", colorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-colors"] });
      queryClient.invalidateQueries({ queryKey: ["product-colors"] });
      toast.success("Renk silindi");
    },
    onError: (error) => {
      toast.error("İşlem başarısız: " + (error as Error).message);
    },
  });

  return (
    <div className="h-full flex flex-col">
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="w-full mb-4">
            <Palette className="w-4 h-4 mr-1" />
            Yeni Renk Ekle
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Renk Ekle</DialogTitle>
            <DialogDescription>
              Ürünler için yeni bir renk seçeneği ekleyin
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Renk Adı</Label>
              <Input
                placeholder="Örn: Kırmızı"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Renk Kodu</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={() => createColorMutation.mutate()}
              disabled={!newColorName || createColorMutation.isPending}
            >
              {createColorMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Ekle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {colors?.map((color) => (
              <div key={color.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full border-2"
                    style={{ backgroundColor: color.hex_code }}
                  />
                  <div>
                    <p className="font-medium text-sm">{color.name}</p>
                    <p className="text-xs text-muted-foreground">{color.hex_code}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", color.is_active && "text-green-500")}
                    onClick={() => toggleColorMutation.mutate({ colorId: color.id, isActive: !color.is_active })}
                    title={color.is_active ? "Devre Dışı Bırak" : "Aktifleştir"}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteColorMutation.mutate(color.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {colors?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Henüz renk eklenmemiş
              </p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
