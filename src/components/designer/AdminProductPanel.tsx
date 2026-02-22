import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Upload, Trash2, Edit2, Save, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeStorageFileName } from "@/lib/storage";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product, ProductView } from "./types";

interface ViewFormData {
  view_name: string;
  mockup_image_url: string;
  design_area_top: number;
  design_area_left: number;
  design_area_width: number;
  design_area_height: number;
}

const DEFAULT_VIEWS: Omit<ViewFormData, 'mockup_image_url'>[] = [
  { view_name: "Front", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 40 },
  { view_name: "Back", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 40 },
  { view_name: "Left Sleeve", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 50 },
  { view_name: "Right Sleeve", design_area_top: 30, design_area_left: 30, design_area_width: 40, design_area_height: 50 },
];

export function AdminProductPanel() {
  const queryClient = useQueryClient();
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewsData, setViewsData] = useState<ViewFormData[]>(
    DEFAULT_VIEWS.map(v => ({ ...v, mockup_image_url: "" }))
  );
  const [uploadingViewIndex, setUploadingViewIndex] = useState<number | null>(null);

  // Fetch all products
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch views for a product
  const fetchProductViews = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_views")
      .select("*")
      .eq("product_id", productId)
      .order("view_order");
    
    if (error) throw error;
    return data as ProductView[];
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async () => {
      // Create product
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: newProductName,
          category: newProductCategory || null,
          is_active: true,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create views
      const viewsToInsert = viewsData.map((view, index) => ({
        product_id: product.id,
        view_name: view.view_name,
        view_order: index,
        mockup_image_url: view.mockup_image_url || null,
        design_area_top: view.design_area_top,
        design_area_left: view.design_area_left,
        design_area_width: view.design_area_width,
        design_area_height: view.design_area_height,
      }));

      const { error: viewsError } = await supabase
        .from("product_views")
        .insert(viewsToInsert);

      if (viewsError) throw viewsError;

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ürün başarıyla oluşturuldu");
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Ürün oluşturulamadı: " + error.message);
    },
  });

  // Update view mutation
  const updateViewMutation = useMutation({
    mutationFn: async ({ viewId, updates }: { viewId: string; updates: Partial<ProductView> }) => {
      const { error } = await supabase
        .from("product_views")
        .update(updates)
        .eq("id", viewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Görünüm güncellendi");
    },
    onError: (error) => {
      toast.error("Güncelleme başarısız: " + error.message);
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ürün silindi");
    },
    onError: (error) => {
      toast.error("Silme başarısız: " + error.message);
    },
  });

  const resetForm = () => {
    setNewProductName("");
    setNewProductCategory("");
    setViewsData(DEFAULT_VIEWS.map(v => ({ ...v, mockup_image_url: "" })));
    setEditingProduct(null);
  };

  const handleImageUpload = useCallback(async (file: File, viewIndex: number) => {
    setUploadingViewIndex(viewIndex);
    
    const safeName = sanitizeStorageFileName(file.name);
    const fileExt = safeName.includes(".") ? safeName.split(".").pop() : "png";
    const fileName = `${Date.now()}-${viewIndex}.${fileExt}`;
    const filePath = `mockups/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-mockups")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Görsel yüklenemedi");
      setUploadingViewIndex(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-mockups")
      .getPublicUrl(filePath);

    setViewsData(prev => prev.map((v, i) => 
      i === viewIndex ? { ...v, mockup_image_url: publicUrl } : v
    ));
    
    setUploadingViewIndex(null);
    toast.success(`${viewsData[viewIndex].view_name} görseli yüklendi`);
  }, [viewsData]);

  const handleViewAreaChange = (viewIndex: number, field: keyof ViewFormData, value: number) => {
    setViewsData(prev => prev.map((v, i) => 
      i === viewIndex ? { ...v, [field]: value } : v
    ));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Admin Panel</h2>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Yeni Ürün
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Ürün Ekle</DialogTitle>
              <DialogDescription>
                Ürün bilgilerini ve 4 farklı açı için görselleri yükleyin
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ürün Adı</Label>
                  <Input
                    placeholder="Örn: Premium Hoodie"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Input
                    placeholder="Örn: Giyim"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Görünümler (4 Açı)</h4>
                <Accordion type="single" collapsible className="space-y-2">
                  {viewsData.map((view, index) => (
                    <AccordionItem value={`view-${index}`} key={index} className="border rounded-lg px-3">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          {view.mockup_image_url ? (
                            <img src={view.mockup_image_url} alt="" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <Upload className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span>{view.view_name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        {/* Image Upload */}
                        <div className="space-y-2">
                          <Label>Görsel</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, index);
                              }}
                              disabled={uploadingViewIndex === index}
                            />
                            {uploadingViewIndex === index && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                          </div>
                        </div>

                        {/* Design Area Controls */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Üst Konum: {view.design_area_top}%</Label>
                            <Slider
                              value={[view.design_area_top]}
                              onValueChange={([val]) => handleViewAreaChange(index, "design_area_top", val)}
                              min={0}
                              max={80}
                              step={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Sol Konum: {view.design_area_left}%</Label>
                            <Slider
                              value={[view.design_area_left]}
                              onValueChange={([val]) => handleViewAreaChange(index, "design_area_left", val)}
                              min={0}
                              max={80}
                              step={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Genişlik: {view.design_area_width}%</Label>
                            <Slider
                              value={[view.design_area_width]}
                              onValueChange={([val]) => handleViewAreaChange(index, "design_area_width", val)}
                              min={10}
                              max={100}
                              step={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Yükseklik: {view.design_area_height}%</Label>
                            <Slider
                              value={[view.design_area_height]}
                              onValueChange={([val]) => handleViewAreaChange(index, "design_area_height", val)}
                              min={10}
                              max={100}
                              step={1}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                İptal
              </Button>
              <Button 
                onClick={() => createProductMutation.mutate()}
                disabled={!newProductName || createProductMutation.isPending}
              >
                {createProductMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Oluştur
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {products?.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                onDelete={() => deleteProductMutation.mutate(product.id)}
                fetchViews={fetchProductViews}
                updateView={(viewId, updates) => updateViewMutation.mutate({ viewId, updates })}
              />
            ))}
            
            {products?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Henüz ürün eklenmemiş
              </p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ProductItemProps {
  product: Product;
  onDelete: () => void;
  fetchViews: (productId: string) => Promise<ProductView[]>;
  updateView: (viewId: string, updates: Partial<ProductView>) => void;
}

function ProductItem({ product, onDelete, fetchViews, updateView }: ProductItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [views, setViews] = useState<ProductView[]>([]);
  const [isLoadingViews, setIsLoadingViews] = useState(false);

  const loadViews = async () => {
    if (views.length > 0) return;
    setIsLoadingViews(true);
    try {
      const data = await fetchViews(product.id);
      setViews(data);
    } catch (error) {
      toast.error("Görünümler yüklenemedi");
    }
    setIsLoadingViews(false);
  };

  return (
    <div className="border rounded-lg">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) loadViews();
        }}
      >
        <div>
          <p className="font-medium text-sm">{product.name}</p>
          {product.category && (
            <p className="text-xs text-muted-foreground">{product.category}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t p-3 space-y-2">
          {isLoadingViews ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            views.map((view) => (
              <ViewEditor key={view.id} view={view} updateView={updateView} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ViewEditorProps {
  view: ProductView;
  updateView: (viewId: string, updates: Partial<ProductView>) => void;
}

function ViewEditor({ view, updateView }: ViewEditorProps) {
  const [localView, setLocalView] = useState(view);
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (field: keyof ProductView, value: number) => {
    setLocalView(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateView(view.id, {
      design_area_top: localView.design_area_top,
      design_area_left: localView.design_area_left,
      design_area_width: localView.design_area_width,
      design_area_height: localView.design_area_height,
      mockup_image_url: localView.mockup_image_url,
    });
    setHasChanges(false);
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    const safeName = sanitizeStorageFileName(file.name);
    const fileExt = safeName.includes(".") ? safeName.split(".").pop() : "png";
    const fileName = `${view.id}-${Date.now()}.${fileExt}`;
    const filePath = `mockups/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-mockups")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Görsel yüklenemedi");
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-mockups")
      .getPublicUrl(filePath);

    setLocalView(prev => ({ ...prev, mockup_image_url: publicUrl }));
    setHasChanges(true);
    setIsUploading(false);
  };

  return (
    <div className="bg-muted/30 rounded p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {localView.mockup_image_url ? (
            <img src={localView.mockup_image_url} alt="" className="w-8 h-8 object-cover rounded" />
          ) : (
            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
              <Upload className="w-3 h-3" />
            </div>
          )}
          <span className="text-sm font-medium">{view.view_name}</span>
        </div>
        {hasChanges && (
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" />
            Kaydet
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Input
          type="file"
          accept="image/*"
          className="text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
          disabled={isUploading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <Label className="text-xs">Üst: {localView.design_area_top}%</Label>
          <Slider
            value={[Number(localView.design_area_top)]}
            onValueChange={([val]) => handleChange("design_area_top", val)}
            min={0}
            max={80}
            step={1}
          />
        </div>
        <div>
          <Label className="text-xs">Sol: {localView.design_area_left}%</Label>
          <Slider
            value={[Number(localView.design_area_left)]}
            onValueChange={([val]) => handleChange("design_area_left", val)}
            min={0}
            max={80}
            step={1}
          />
        </div>
        <div>
          <Label className="text-xs">Genişlik: {localView.design_area_width}%</Label>
          <Slider
            value={[Number(localView.design_area_width)]}
            onValueChange={([val]) => handleChange("design_area_width", val)}
            min={10}
            max={100}
            step={1}
          />
        </div>
        <div>
          <Label className="text-xs">Yükseklik: {localView.design_area_height}%</Label>
          <Slider
            value={[Number(localView.design_area_height)]}
            onValueChange={([val]) => handleChange("design_area_height", val)}
            min={10}
            max={100}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}
