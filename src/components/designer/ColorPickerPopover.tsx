import { useState, useEffect } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProductColor } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface ColorPickerPopoverProps {
  selectedColorIds: string[];
  onColorToggle: (colorId: string, hexCode: string) => void;
  selectedProductId?: string;
  trigger?: "chevron" | "plus";
  align?: "start" | "center" | "end";
}

export function ColorPickerPopover({
  selectedColorIds,
  onColorToggle,
  selectedProductId,
  trigger = "chevron",
  align = "start",
}: ColorPickerPopoverProps) {
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchColors();
  }, [selectedProductId]);

  const fetchColors = async () => {
    if (selectedProductId) {
      const { data: variants, error: variantError } = await supabase
        .from("product_color_variants")
        .select("color_id")
        .eq("product_id", selectedProductId);

      if (variants && !variantError && variants.length > 0) {
        const colorIds = variants.map((v) => v.color_id);
        const { data, error } = await supabase
          .from("product_colors")
          .select("*")
          .eq("is_active", true)
          .in("id", colorIds)
          .order("sort_order");

        if (data && !error) {
          setColors(data);
          return;
        }
      }
    }

    const { data, error } = await supabase
      .from("product_colors")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (data && !error) {
      setColors(data);
    }
  };

  if (colors.length === 0) {
    return null;
  }

  const TriggerIcon = trigger === "plus" ? Plus : ChevronDown;
  const alignOffset = trigger === "plus" ? -6 : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={
          trigger === "plus"
            ? "h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-transparent hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            : "h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        }
        aria-label={trigger === "plus" ? "Renk ekle" : "Renk seç"}
      >
        <TriggerIcon className={trigger === "plus" ? "h-3 w-3" : "h-4 w-4"} />
      </PopoverTrigger>

      <PopoverContent
        className="w-[400px] rounded-xl border border-border bg-popover p-3 shadow-lg"
        align={align}
        alignOffset={alignOffset}
        side="bottom"
        sideOffset={8}
      >
        <PopoverArrow width={14} height={8} className="-translate-y-px" />

        <div className="px-1 pb-2">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground">BRANDING</div>
          <div className="text-sm font-semibold">Renkler</div>
        </div>

        <div className="max-h-44 overflow-auto pr-1">
          <div className="grid grid-cols-12 gap-1.5">
            {colors.map((color) => {
              const isSelected = selectedColorIds.includes(color.id);
              return (
                <button
                  key={color.id}
                  className={
                    "relative h-5 w-5 rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                    (isSelected
                      ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "border-border hover:border-foreground/50")
                  }
                  style={{ backgroundColor: color.hex_code }}
                  onClick={() => onColorToggle(color.id, color.hex_code)}
                  title={color.name}
                >
                  {isSelected ? (
                    <Check
                      className={
                        "absolute inset-0 m-auto h-4 w-4 " +
                        (isLightColor(color.hex_code) ? "text-foreground" : "text-background")
                      }
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper to determine if a color is light
function isLightColor(hexCode: string): boolean {
  const hex = hexCode.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
