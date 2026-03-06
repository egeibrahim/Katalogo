import { useRef, useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductColor } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface ColorPaletteProps {
  selectedColorId: string | null;
  selectedColorIds: string[];
  onColorSelect: (colorId: string, hexCode: string) => void;
  onColorToggle: (colorId: string, hexCode: string) => void;
  selectedProductId?: string;
  /** When set, only these color IDs are shown (e.g. print area colors). Otherwise product colors from product_color_variants. */
  colorIdsToShow?: string[];
}

export function ColorPalette({
  selectedColorId,
  selectedColorIds,
  onColorSelect,
  onColorToggle,
  selectedProductId,
  colorIdsToShow,
}: ColorPaletteProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<ProductColor[]>([]);

  const fetchColors = useCallback(async () => {
    let uniqIds: string[];

    if (colorIdsToShow != null && colorIdsToShow.length > 0) {
      // Only show colors that are in the given list (e.g. print area–assigned colors)
      uniqIds = Array.from(new Set([...colorIdsToShow, selectedColorId].filter(Boolean)));
    } else if (selectedProductId) {
      // Fallback: product colors from product_color_variants
      const idsToShow = Array.from(new Set([...(selectedColorIds ?? []), selectedColorId].filter(Boolean)));
      const { data: variants, error: variantError } = await supabase
        .from("product_color_variants")
        .select("color_id")
        .eq("product_id", selectedProductId);

      if (!variantError && variants?.length) {
        variants.forEach((v) => {
          if (v.color_id) idsToShow.push(v.color_id);
        });
      }
      uniqIds = Array.from(new Set(idsToShow));
    } else {
      setColors([]);
      return;
    }

    if (uniqIds.length === 0) {
      setColors([]);
      return;
    }

    const { data, error } = await supabase
      .from("product_colors")
      .select("*")
      .eq("is_active", true)
      .in("id", uniqIds)
      .order("sort_order");

    if (data && !error) {
      setColors(data);
      return;
    }

    setColors([]);
  }, [selectedProductId, selectedColorIds, colorIdsToShow, selectedColorId]);

  useEffect(() => {
    void fetchColors();
  }, [fetchColors]);

  // Auto-select first color only if nothing is selected yet
  useEffect(() => {
    if (colors.length > 0 && !selectedColorId) {
      onColorSelect(colors[0].id, colors[0].hex_code);
    }
  }, [colors, selectedColorId, onColorSelect]);

  // Helper to determine if a color is light
  const isLightColor = (hexCode: string): boolean => {
    const hex = hexCode.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  if (colors.length === 0) {
    return <div className="flex items-center gap-2 h-full text-sm text-muted-foreground">Renk yok</div>;
  }

  return (
    <div className="flex items-center gap-0.5 h-full min-w-0 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex flex-1 min-w-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <TooltipProvider delayDuration={200}>
          {colors.map((color) => {
            const isActive = selectedColorId === color.id;
            const isSelected = selectedColorIds.includes(color.id);

            return (
              <Tooltip key={color.id}>
                <TooltipTrigger asChild>
                  <button
                    className={
                      "relative shrink-0 overflow-hidden transition-colors " +
                      "h-7 w-7 min-h-[28px] min-w-[28px] rounded-full " +
                      (isActive
                        ? "border-2 border-black shadow-[inset_0_0_0_1px_#4b5563]"
                        : isSelected
                          ? "border-2 border-black/70 shadow-[inset_0_0_0_1px_rgba(75,85,99,0.7)]"
                          : "border border-border hover:border-foreground/50")
                    }
                    style={{ backgroundColor: color.hex_code }}
                    onClick={() => onColorSelect(color.id, color.hex_code)}
                    onContextMenu={(e) => {
                      // Keep multi-select functionality, but remove “add color” UI from the bar.
                      e.preventDefault();
                      onColorToggle(color.id, color.hex_code);
                    }}
                    aria-label={color.name}
                    title={color.name}
                  >
                    {isSelected && !isActive ? (
                      <Check
                        className={
                          "absolute inset-0 m-auto h-3.5 w-3.5 " +
                          (isLightColor(color.hex_code) ? "text-foreground" : "text-background")
                        }
                      />
                    ) : null}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium leading-none">{color.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-none">{color.hex_code}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}

