import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Save, Upload, Move, Maximize, Image as ImageIcon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeStorageFileName } from "@/lib/storage";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ProductDetailsEditor } from "@/components/designer/ProductDetailsEditor";

interface ProductView {
  id: string;
  product_id: string;
  view_name: string;
  view_order: number;
  mockup_image_url: string | null;
  design_area_top: number;
  design_area_left: number;
  design_area_width: number;
  design_area_height: number;
}

interface AdminViewEditorProps {
  views: ProductView[];
  initialViewId?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (viewId: string, updates: Partial<ProductView>) => void;
}

export function AdminViewEditor({ views, initialViewId, isOpen, onClose, onUpdate }: AdminViewEditorProps) {
  const queryClient = useQueryClient();
  const [activeViewId, setActiveViewId] = useState<string>(initialViewId || views[0]?.id || "");
  const [localViews, setLocalViews] = useState<ProductView[]>(views);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Color-specific mockups (per view)
  const [productColors, setProductColors] = useState<Array<{ id: string; name: string; hex_code: string }>>([]);
  const [viewColorMockups, setViewColorMockups] = useState<Record<string, string>>({}); // color_id -> url
  const [uploadingColorId, setUploadingColorId] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, top: 0, left: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Reset state when dialog opens with new views
  useEffect(() => {
    if (isOpen) {
      setLocalViews(views);
      setActiveViewId(initialViewId || views[0]?.id || "");
      setViewColorMockups({});
    }
  }, [isOpen, views, initialViewId]);

  const activeView = localViews.find((v) => v.id === activeViewId);

  const activeProductId = useMemo(() => activeView?.product_id || "", [activeView?.product_id]);

  const isValidMockupUrl = (value: string) => {
    const v = value.trim();
    if (!v) return true;
    if (v.startsWith("/")) return true; // allow public-relative paths like /placeholder.svg
    if (/^data:image\//i.test(v)) return true;
    return /^https?:\/\//i.test(v);
  };

  const mockupUrlSchema = z
    .union([
      z.string().trim().refine(isValidMockupUrl, "Mockup URL geçersiz"),
      z.literal(""),
      z.null(),
    ])
    .transform((v) => (v === "" ? null : v));

  const viewUpdateSchema = z.object({
    id: z.string().min(1),
    mockup_image_url: mockupUrlSchema,
    design_area_top: z.number().min(0).max(80),
    design_area_left: z.number().min(0).max(80),
    design_area_width: z.number().min(10).max(100),
    design_area_height: z.number().min(10).max(100),
  });

  const updateViewMutation = useMutation({
    mutationFn: async (viewToUpdate: ProductView) => {
      const parsed = viewUpdateSchema.safeParse({
        id: viewToUpdate.id,
        mockup_image_url: viewToUpdate.mockup_image_url,
        design_area_top: viewToUpdate.design_area_top,
        design_area_left: viewToUpdate.design_area_left,
        design_area_width: viewToUpdate.design_area_width,
        design_area_height: viewToUpdate.design_area_height,
      });

      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Görünüm bilgileri geçersiz");
      }

      const { error } = await supabase
        .from("product_views")
        .update({
          mockup_image_url: viewToUpdate.mockup_image_url || null,
          design_area_top: viewToUpdate.design_area_top,
          design_area_left: viewToUpdate.design_area_left,
          design_area_width: viewToUpdate.design_area_width,
          design_area_height: viewToUpdate.design_area_height,
        })
        .eq("id", viewToUpdate.id);
      
      if (error) throw error;
      return viewToUpdate;
    },
    onSuccess: (updatedView) => {
      onUpdate(updatedView.id, updatedView);
    },
    onError: (error) => {
      toast.error("Kaydetme hatası: " + (error as Error).message);
    }
  });

  const handleSaveAll = async () => {
    try {
      // Validate all views up-front for consistent UX
      const batchParsed = z.array(viewUpdateSchema).safeParse(
        localViews.map(v => ({
          id: v.id,
          mockup_image_url: v.mockup_image_url,
          design_area_top: v.design_area_top,
          design_area_left: v.design_area_left,
          design_area_width: v.design_area_width,
          design_area_height: v.design_area_height,
        }))
      );
      if (!batchParsed.success) {
        toast.error(batchParsed.error.errors[0]?.message || "Görünüm bilgileri geçersiz");
        return;
      }

      // Save all views that might have been modified
      for (const view of localViews) {
        await updateViewMutation.mutateAsync(view);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Tüm görünümler kaydedildi");
      onClose();
    } catch {
      // Error already handled in mutation
    }
  };

  const allowedImageTypes = useMemo(() => ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'], []);

  const handleImageUpload = async (file: File) => {
    if (!activeView) return;

    if (!allowedImageTypes.includes(file.type)) {
      toast.error("Sadece PNG / JPG / WEBP dosyaları yüklenebilir");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Dosya boyutu maksimum 50MB olmalıdır");
      return;
    }

    setUploadingImage(true);

    const safeName = sanitizeStorageFileName(file.name);
    const fileExt = safeName.includes(".") ? safeName.split(".").pop() : "png";
    const fileName = `${Date.now()}-${activeView.id}.${fileExt}`;
    const filePath = `mockups/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("product-mockups").upload(filePath, file);

    if (uploadError) {
      toast.error("Görsel yüklenemedi");
      setUploadingImage(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-mockups").getPublicUrl(filePath);

    setLocalViews((prev) => prev.map((v) => (v.id === activeViewId ? { ...v, mockup_image_url: publicUrl } : v)));
    setUploadingImage(false);
    toast.success("Görsel yüklendi");
  };

  // Fetch product colors and existing per-color mockups for the active view
  useEffect(() => {
    const run = async () => {
      if (!isOpen || !activeViewId || !activeProductId) return;

      const { data: variants, error: variantError } = await supabase
        .from("product_color_variants")
        .select("color_id")
        .eq("product_id", activeProductId);

      if (variantError) return;
      const colorIds = (variants || []).map((v) => v.color_id).filter(Boolean);

      if (colorIds.length === 0) {
        setProductColors([]);
        setViewColorMockups({});
        return;
      }

      const { data: colors, error: colorError } = await supabase
        .from("product_colors")
        .select("id,name,hex_code")
        .in("id", colorIds)
        .eq("is_active", true)
        .order("sort_order");

      if (colorError) return;
      setProductColors((colors || []) as Array<{ id: string; name: string; hex_code: string }>);

      const { data: mockups, error: mockupError } = await supabase
        .from("product_view_color_mockups")
        .select("color_id,mockup_image_url")
        .eq("product_view_id", activeViewId)
        .in("color_id", colorIds);

      if (mockupError) return;

      const map: Record<string, string> = {};
      (mockups || []).forEach((m) => {
        map[m.color_id] = m.mockup_image_url;
      });
      setViewColorMockups(map);
    };

    run();
  }, [isOpen, activeViewId, activeProductId]);

  const handleColorMockupUpload = async (colorId: string, file: File) => {
    if (!activeView) return;

    if (!allowedImageTypes.includes(file.type)) {
      toast.error("Sadece PNG / JPG / WEBP dosyaları yüklenebilir");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Dosya boyutu maksimum 50MB olmalıdır");
      return;
    }

    setUploadingColorId(colorId);

    const safeName = sanitizeStorageFileName(file.name);
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "png";
    const filePath = `color-mockups/${activeProductId}/${activeView.id}/${colorId}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("product-mockups").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error("Renk mockup'ı yüklenemedi");
      setUploadingColorId(null);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-mockups").getPublicUrl(filePath);

    const { error: upsertError } = await supabase
      .from("product_view_color_mockups")
      .upsert(
        {
          product_view_id: activeView.id,
          color_id: colorId,
          mockup_image_url: publicUrl,
        },
        { onConflict: "product_view_id,color_id" },
      );

    if (upsertError) {
      toast.error("Kaydedilemedi");
      setUploadingColorId(null);
      return;
    }

    setViewColorMockups((prev) => ({ ...prev, [colorId]: publicUrl }));
    setUploadingColorId(null);
    toast.success("Renk mockup'ı kaydedildi");
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'drag' | 'resize') => {
    if (!activeView) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'drag') {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        top: activeView.design_area_top,
        left: activeView.design_area_left
      };
    } else {
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: activeView.design_area_width,
        height: activeView.design_area_height
      };
    }
  }, [activeView]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !activeView) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (isDragging) {
      const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      
      const newLeft = Math.max(0, Math.min(100 - activeView.design_area_width, dragStartRef.current.left + deltaX));
      const newTop = Math.max(0, Math.min(100 - activeView.design_area_height, dragStartRef.current.top + deltaY));
      
      setLocalViews(prev => prev.map(v => 
        v.id === activeViewId ? {
          ...v,
          design_area_left: Math.round(newLeft),
          design_area_top: Math.round(newTop)
        } : v
      ));
    }

    if (isResizing) {
      const deltaX = ((e.clientX - resizeStartRef.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - resizeStartRef.current.y) / rect.height) * 100;
      
      const newWidth = Math.max(10, Math.min(100 - activeView.design_area_left, resizeStartRef.current.width + deltaX));
      const newHeight = Math.max(10, Math.min(100 - activeView.design_area_top, resizeStartRef.current.height + deltaY));
      
      setLocalViews(prev => prev.map(v => 
        v.id === activeViewId ? {
          ...v,
          design_area_width: Math.round(newWidth),
          design_area_height: Math.round(newHeight)
        } : v
      ));
    }
  }, [isDragging, isResizing, activeView, activeViewId]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const updateActiveView = (field: keyof ProductView, value: number) => {
    setLocalViews(prev => prev.map(v => 
      v.id === activeViewId ? { ...v, [field]: value } : v
    ));
  };

  if (!activeView) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Görünümleri Düzenle</DialogTitle>
          <DialogDescription>
            Mockup görsellerini yükleyin ve baskı alanlarını ayarlayın
          </DialogDescription>
        </DialogHeader>

        {/* View Tabs */}
        <div className="flex items-center gap-2 pb-4 border-b">
          {localViews.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveViewId(view.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors min-w-[80px]",
                activeViewId === view.id 
                  ? "border-primary bg-primary/10" 
                  : "border-transparent hover:bg-muted"
              )}
            >
              {view.mockup_image_url ? (
                <img 
                  src={view.mockup_image_url} 
                  alt={view.view_name} 
                  className="w-12 h-12 object-cover rounded" 
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs font-medium">{view.view_name}</span>
              {view.mockup_image_url && (
                <Check className="w-3 h-3 text-green-500" />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Visual Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{activeView.view_name} Önizleme</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Move className="w-3 h-3" /> Sürükle
                <Maximize className="w-3 h-3 ml-2" /> Boyutlandır
              </div>
            </div>

            <div 
              ref={containerRef}
              className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {activeView.mockup_image_url ? (
                <img 
                  src={activeView.mockup_image_url} 
                  alt="Mockup" 
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Henüz mockup yüklenmedi</p>
                    <p className="text-xs">Aşağıdan görsel yükleyin</p>
                  </div>
                </div>
              )}

              {/* Design Area Overlay */}
              <div
                className="absolute border-2 border-primary bg-primary/20 cursor-move transition-colors hover:bg-primary/30"
                style={{
                  top: `${activeView.design_area_top}%`,
                  left: `${activeView.design_area_left}%`,
                  width: `${activeView.design_area_width}%`,
                  height: `${activeView.design_area_height}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'drag')}
              >
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-medium text-primary-foreground bg-primary px-2 py-0.5 rounded">
                    Baskı Alanı
                  </span>
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-tl cursor-se-resize hover:bg-primary/80"
                  onMouseDown={(e) => handleMouseDown(e, 'resize')}
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-xs">Mockup Yükle (2048x2048 px, PNG/JPG/WEBP)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={uploadingImage}
                  className="text-xs"
                />
                {uploadingImage && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </div>

            {/* Color-based mockups */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Renk Bazlı Mockup'lar</Label>
                <span className="text-xs text-muted-foreground">{productColors.length} renk</span>
              </div>

              {productColors.length === 0 ? (
                <p className="text-xs text-muted-foreground">Bu ürün için renk atanmamış.</p>
              ) : (
                <div className="space-y-2">
                  {productColors.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: c.hex_code }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.hex_code}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {viewColorMockups[c.id] ? (
                          <img
                            src={viewColorMockups[c.id]}
                            alt={`${c.name} mockup`}
                            className="h-10 w-10 rounded object-cover border"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted border flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}

                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="text-[10px] max-w-[210px]"
                          disabled={uploadingColorId === c.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleColorMockupUpload(c.id, file);
                          }}
                        />
                        {uploadingColorId === c.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Manual Controls */}
          <div className="space-y-4">
            <Label>Baskı Alanı Değerleri (Manuel)</Label>
            
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Üst Konum</Label>
                  <span className="text-xs text-muted-foreground">{activeView.design_area_top}%</span>
                </div>
                <Slider
                  value={[activeView.design_area_top]}
                  onValueChange={([val]) => updateActiveView('design_area_top', val)}
                  min={0}
                  max={80}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Sol Konum</Label>
                  <span className="text-xs text-muted-foreground">{activeView.design_area_left}%</span>
                </div>
                <Slider
                  value={[activeView.design_area_left]}
                  onValueChange={([val]) => updateActiveView('design_area_left', val)}
                  min={0}
                  max={80}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Genişlik</Label>
                  <span className="text-xs text-muted-foreground">{activeView.design_area_width}%</span>
                </div>
                <Slider
                  value={[activeView.design_area_width]}
                  onValueChange={([val]) => updateActiveView('design_area_width', val)}
                  min={10}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Yükseklik</Label>
                  <span className="text-xs text-muted-foreground">{activeView.design_area_height}%</span>
                </div>
                <Slider
                  value={[activeView.design_area_height]}
                  onValueChange={([val]) => updateActiveView('design_area_height', val)}
                  min={10}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Separator />
              {activeProductId ? <ProductDetailsEditor productId={activeProductId} /> : null}
            </div>

            <div className="p-4 border rounded-lg bg-amber-500/10 border-amber-500/30">
              <h4 className="text-sm font-medium text-amber-600 mb-2">İpuçları</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 2048x2048 piksel kare mockup görseli yükleyin</li>
                <li>• Baskı alanını sürükleyerek konumlandırın</li>
                <li>• Sağ alt köşeden boyutlandırın</li>
                <li>• Üstteki sekmelerden görünümler arası geçiş yapın</li>
              </ul>
            </div>
          </div>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button 
            onClick={handleSaveAll}
            disabled={updateViewMutation.isPending}
          >
            {updateViewMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Tümünü Kaydet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
