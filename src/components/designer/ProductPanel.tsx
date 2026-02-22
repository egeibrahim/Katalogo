import { useMemo, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Product, ProductView } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { ProductDetailsAccordion } from "./ProductDetailsAccordion";
import { toast } from "sonner";

type ProductSpec = {
  product_id: string;
  sku: string | null;
  sizes: string | null;
  technique: string | null;
  guideline_url: string | null;
  supported_file_types: string | null;
  max_upload_mb: number | null;
  print_dpi: number | null;
  print_areas: Record<string, unknown> | null;
};

interface ProductPanelProps {
  selectedProductId: string;
  onProductSelect: (productId: string) => void;
  onViewsLoaded: (views: ProductView[]) => void;
  selectedColorId: string | null;
  selectedColorIds: string[];
  onColorSelect: (colorId: string, hexCode: string) => void;
  onColorToggle: (colorId: string, hexCode: string) => void;
  canManage: boolean;
}

const DEFAULT_GUIDELINES: Omit<ProductSpec, "product_id"> = {
  sku: null,
  sizes: "S,M,L,XL,2XL",
  technique: "DTF",
  guideline_url: "",
  supported_file_types: "PNG,JPG",
  max_upload_mb: 50,
  print_dpi: 150,
  print_areas: {
    front: "2069 x 1615 px",
    back: "2067 x 2770 px",
  },
};

export function ProductPanel({
  selectedProductId,
  onProductSelect,
  onViewsLoaded,
  selectedColorId,
  selectedColorIds,
  onColorSelect,
  onColorToggle,
  canManage,
}: ProductPanelProps) {

  const [products, setProducts] = useState<Product[]>([]);
  const [productViews, setProductViews] = useState<Record<string, ProductView[]>>({});

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [spec, setSpec] = useState<ProductSpec | null>(null);
  const [draft, setDraft] = useState<Omit<ProductSpec, "product_id">>(DEFAULT_GUIDELINES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchProducts();
  }, []);

  useEffect(() => {
    const next = products.find((p) => p.id === selectedProductId) || null;
    setActiveProduct(next);
  }, [products, selectedProductId]);

  useEffect(() => {
    if (selectedProductId) {
      void fetchViewsForProduct(selectedProductId, true);
      void fetchSpec(selectedProductId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  const fetchViewsForProduct = async (productId: string, loadAfter = false) => {
    const { data: viewsData, error: viewsError } = await supabase
      .from("product_views")
      .select("*")
      .eq("product_id", productId)
      .order("view_order");

    if (viewsError) return;

    if (viewsData) {
      setProductViews((prev) => ({
        ...prev,
        [productId]: viewsData,
      }));

      if (loadAfter) onViewsLoaded(viewsData);
    }
  };

  const fetchProducts = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      // NOTE: We intentionally include drafts (is_active=false) so newly created products
      // are visible immediately in the Products tab.
      .order("name");

    if (productsData && !productsError) {
      setProducts(productsData);

      const { data: viewsData, error: viewsError } = await supabase
        .from("product_views")
        .select("*")
        .in(
          "product_id",
          productsData.map((p) => p.id)
        )
        .order("view_order");

      if (viewsData && !viewsError) {
        const viewsByProduct: Record<string, ProductView[]> = {};
        viewsData.forEach((view) => {
          if (!viewsByProduct[view.product_id]) viewsByProduct[view.product_id] = [];
          viewsByProduct[view.product_id].push(view);
        });
        setProductViews(viewsByProduct);

        if (selectedProductId && viewsByProduct[selectedProductId]) {
          onViewsLoaded(viewsByProduct[selectedProductId]);
        }
      }
    }
  };

  const fetchSpec = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_specs")
      .select("product_id, sku, sizes, technique, guideline_url, supported_file_types, max_upload_mb, print_dpi, print_areas")
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      // non-fatal
      setSpec(null);
      setDraft(DEFAULT_GUIDELINES);
      return;
    }

    setSpec((data as ProductSpec) ?? null);

    if (data) {
      setDraft({
        sku: data.sku,
        sizes: data.sizes,
        technique: data.technique,
        guideline_url: data.guideline_url,
        supported_file_types: data.supported_file_types,
        max_upload_mb: data.max_upload_mb,
        print_dpi: data.print_dpi,
        print_areas: (data.print_areas as Record<string, unknown>) ?? DEFAULT_GUIDELINES.print_areas,
      });
    } else {
      setDraft(DEFAULT_GUIDELINES);
    }
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (!selectedProductId) return;

    setSaving(true);
    const payload = {
      product_id: selectedProductId,
      ...draft,
      // ensure json-serializable for backend Json type
      print_areas: JSON.parse(JSON.stringify(draft.print_areas ?? {})) as any,
    };

    const { error } = await supabase
      .from("product_specs")
      .upsert([payload], { onConflict: "product_id" });

    setSaving(false);

    if (error) {
      toast.error("Kaydedilemedi");
      return;
    }

    toast.success("Ürün detayları kaydedildi");
    await fetchSpec(selectedProductId);
  };

  const groupedProducts = useMemo(() => {
    return products.reduce((acc, product) => {
      const category = product.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [products]);

  const viewsForSelected = productViews[selectedProductId] || [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-border bg-card">
        <h3 className="text-sm font-semibold leading-none">DETAILS</h3>
        <p className="text-xs text-muted-foreground mt-1">Ürün bilgileri</p>
      </div>

      <div className="px-4 py-3">
        <div className="text-sm font-semibold leading-tight">
          {activeProduct?.name || "Bir ürün seç"}
        </div>
        {draft.sku && <div className="text-xs text-muted-foreground mt-1">{draft.sku}</div>}
      </div>

      <Tabs defaultValue="details" className="flex-1 flex flex-col">
        <div className="px-4">
          <TabsList className="w-full grid grid-cols-1">
            <TabsTrigger value="details">DETAILS</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="flex-1 m-0">
          <ScrollArea className="h-[calc(100vh-260px)] px-4 pb-6">
            <div className="space-y-6 pt-4">
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Views</h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {viewsForSelected.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewsForSelected.map((v) => (
                    <Badge key={v.id} variant="outline" className="text-[10px]">
                      {v.view_name}
                    </Badge>
                  ))}
                  {viewsForSelected.length === 0 && (
                    <p className="text-xs text-muted-foreground">Bu ürün için görünüm yok.</p>
                  )}
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Size</h4>
                {canManage ? (
                  <Input
                    value={draft.sizes || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, sizes: e.target.value }))}
                    placeholder="S,M,L,XL,2XL"
                    className="h-9"
                  />
                ) : (
                  <div className="text-sm">{draft.sizes || "—"}</div>
                )}
                <p className="text-xs text-muted-foreground italic">Reference garment size: S</p>
                {draft.guideline_url ? (
                  <a
                    href={draft.guideline_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline text-primary"
                  >
                    View design scaling guide
                  </a>
                ) : null}
              </section>

              <Separator />

              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Technique</h4>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground italic">
                    Direct to Film (DTF) printing allows for pre-printed designs to be heat-transferred onto fabrics.
                  </div>
                  <div className="text-sm font-semibold">{draft.technique || "—"}</div>
                </div>
                {canManage && (
                  <Input
                    value={draft.technique || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, technique: e.target.value }))}
                    placeholder="DTF"
                    className="h-9"
                  />
                )}
              </section>

              <Separator />

              <section className="space-y-3">
                <h4 className="text-sm font-semibold">Upload guidelines</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Supported file types</div>
                    {canManage ? (
                      <Input
                        value={draft.supported_file_types || ""}
                        onChange={(e) => setDraft((p) => ({ ...p, supported_file_types: e.target.value }))}
                        placeholder="PNG,JPG"
                        className="h-9"
                      />
                    ) : (
                      <div className="text-sm">{draft.supported_file_types || "—"}</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Maximum</div>
                    {canManage ? (
                      <Input
                        type="number"
                        value={draft.max_upload_mb ?? 50}
                        onChange={(e) => setDraft((p) => ({ ...p, max_upload_mb: Number(e.target.value) }))}
                        className="h-9"
                      />
                    ) : (
                      <div className="text-sm">{draft.max_upload_mb ?? 50}MB</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Print resolution</div>
                    {canManage ? (
                      <Input
                        type="number"
                        value={draft.print_dpi ?? 150}
                        onChange={(e) => setDraft((p) => ({ ...p, print_dpi: Number(e.target.value) }))}
                        className="h-9"
                      />
                    ) : (
                      <div className="text-sm">{draft.print_dpi ?? 150}DPI</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Print area size</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Front</span>
                      <span className="text-sm">{String((draft.print_areas as any)?.front ?? "—")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Back</span>
                      <span className="text-sm">{String((draft.print_areas as any)?.back ?? "—")}</span>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full rounded-lg"
                      onClick={handleSave}
                      disabled={saving || !selectedProductId}
                    >
                      {saving ? "Kaydediliyor…" : "Save changes"}
                    </Button>
                  </div>
                )}
              </section>

              <Separator />

              <ProductDetailsAccordion productId={selectedProductId} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>


      {/* Product list (bottom) */}
      <div className="border-t border-border">
        <ScrollArea className="h-[260px] p-3">
          <div className="space-y-5">
            {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">{category}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {categoryProducts.length}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  {categoryProducts.map((product) => {
                    const isSelected = selectedProductId === product.id;
                    return (
                      <Button
                        key={product.id}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start h-auto py-2 rounded-lg"
                        onClick={() => onProductSelect(product.id)}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{product.name}</span>
                          {product.category && (
                            <span className="text-[10px] text-muted-foreground">{product.category}</span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
