import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ProductView } from "./types";

type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean | null;
};

type ColorRow = {
  id: string;
  name: string;
  hex_code: string;
  sort_order: number | null;
};

type Props = {
  currentProductId: string;
  onProductSelect: (productId: string) => void;
  selectedColorId: string | null;
  onColorSelect: (colorId: string, hexCode: string) => void;
  views: ProductView[];
  activeViewId: string;
  onViewSelect: (viewId: string) => void;
  mockupWarning?: string | null;
  onClose?: () => void;
};

export function NewcatalogSetupOverlay({
  currentProductId,
  onProductSelect,
  selectedColorId,
  onColorSelect,
  views,
  activeViewId,
  onViewSelect,
  mockupWarning,
  onClose,
}: Props) {
  const step = useMemo(() => {
    if (!currentProductId) return 1;
    if (!selectedColorId) return 2;
    if (!activeViewId) return 3;
    return 0;
  }, [activeViewId, currentProductId, selectedColorId]);

  const canClose = Boolean(onClose) && step === 3 && Boolean(activeViewId);

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["newcatalog-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,category,is_active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const { data: colors = [], isLoading: isLoadingColors } = useQuery({
    queryKey: ["newcatalog-colors", currentProductId],
    enabled: Boolean(currentProductId),
    queryFn: async () => {
      // Fetch product's color variants, then fetch colors
      const { data: variants, error: variantsError } = await supabase
        .from("product_color_variants")
        .select("color_id")
        .eq("product_id", currentProductId);

      if (variantsError) throw variantsError;

      const ids = (variants ?? []).map((v) => v.color_id).filter(Boolean);
      if (ids.length === 0) return [] as ColorRow[];

      const { data: colorRows, error: colorsError } = await supabase
        .from("product_colors")
        .select("id,name,hex_code,sort_order")
        .in("id", ids)
        .order("sort_order");

      if (colorsError) throw colorsError;
      return (colorRows ?? []) as ColorRow[];
    },
  });

  if (step === 0) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-6"
      style={{ backgroundColor: "hsl(var(--background) / 0.55)" }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-designer-lg">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="text-sm font-semibold leading-none">Prepare product</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Newcatalog flow: Product → Color → Mockup
            </div>
          </div>
          {canClose ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>

        <div className="grid gap-0 md:grid-cols-3">
          {/* Step 1 */}
          <section
            className={cn(
              "p-4 border-b md:border-b-0 md:border-r border-border",
              step === 1 ? "bg-muted/40" : ""
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold tracking-wide">1) Select product</div>
              <Badge variant={step === 1 ? "default" : "secondary"} className="text-[10px]">
                {step === 1 ? "Now" : "Done"}
              </Badge>
            </div>

            <div className="mt-3">
              <ScrollArea className="h-[260px] pr-2">
                <div className="space-y-2">
                  {isLoadingProducts ? (
                    <div className="text-xs text-muted-foreground">Loading…</div>
                  ) : (
                    products.map((p) => {
                      const isActive = currentProductId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onProductSelect(p.id)}
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          )}
                        >
                          <div className="text-sm font-medium leading-tight">{p.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] opacity-90">
                            <span>{p.category || "Other"}</span>
                            <span className="opacity-70">•</span>
                            <span>{p.is_active ? "Published" : "Draft"}</span>
                          </div>
                        </button>
                      );
                    })
                  )}

                  {!isLoadingProducts && products.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No products yet.</div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </section>

          {/* Step 2 */}
          <section
            className={cn(
              "p-4 border-b md:border-b-0 md:border-r border-border",
              step === 2 ? "bg-muted/40" : "",
              step < 2 ? "opacity-50" : ""
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold tracking-wide">2) Select color</div>
              <Badge variant={step === 2 ? "default" : "secondary"} className="text-[10px]">
                {step === 2 ? "Now" : step > 2 ? "Done" : "Waiting"}
              </Badge>
            </div>

            <div className="mt-3">
              <ScrollArea className="h-[260px] pr-2">
                <div className="grid grid-cols-2 gap-2">
                  {isLoadingColors ? (
                    <div className="col-span-2 text-xs text-muted-foreground">Loading…</div>
                  ) : (
                    colors.map((c) => {
                      const isActive = selectedColorId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={step < 2}
                          onClick={() => onColorSelect(c.id, c.hex_code)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                            isActive
                              ? "border-primary bg-muted"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: c.hex_code }}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium truncate">{c.name}</span>
                        </button>
                      );
                    })
                  )}

                  {!isLoadingColors && currentProductId && colors.length === 0 ? (
                    <div className="col-span-2 text-xs text-muted-foreground">
                      No color defined for this product.
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </section>

          {/* Step 3 */}
          <section
            className={cn("p-4", step === 3 ? "bg-muted/40" : "", step < 3 ? "opacity-50" : "")}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold tracking-wide">3) Select mockup view</div>
              <Badge variant={step === 3 ? "default" : "secondary"} className="text-[10px]">
                {step === 3 ? "Now" : "Waiting"}
              </Badge>
            </div>

            <div className="mt-3">
              {mockupWarning ? (
                <div className="mb-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Mockup warning:</span> {mockupWarning}
                </div>
              ) : null}

              <ScrollArea className="h-[260px] pr-2">
                <div className="space-y-2">
                  {views.map((v) => {
                    const isActive = activeViewId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={step < 3}
                        onClick={() => onViewSelect(v.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                          isActive
                            ? "border-primary bg-muted"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        <div className="text-sm font-medium leading-tight">{v.view_name}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Alan: {Number(v.design_area_width)}×{Number(v.design_area_height)}
                        </div>
                      </button>
                    );
                  })}

                  {views.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No views for this product.</div>
                  ) : null}
                </div>
              </ScrollArea>

              {step === 3 && activeViewId && onClose ? (
                <div className="mt-3">
                  <Button className="w-full" onClick={onClose}>
                    Go to design
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
