import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Eye, EyeOff, ChevronRight, ChevronLeft } from "lucide-react";
import { ProductView, DesignElement, ProductColor } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ColorPreviewPanelProps {
  views: ProductView[];
  designsByView: Record<string, DesignElement[]>;
  productColor: string;
  selectedColorIds: string[];
  activeColorId: string | null;
  onColorSelect: (colorId: string, hexCode: string) => void;
  activeViewId: string;
  selectedProductId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ColorPreviewPanel({ 
  views, 
  designsByView, 
  productColor,
  selectedColorIds,
  activeColorId,
  onColorSelect,
  activeViewId,
  selectedProductId,
  isCollapsed = false,
  onToggleCollapse
}: ColorPreviewPanelProps) {
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [colorMockups, setColorMockups] = useState<Record<string, string>>({});
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Fetch colors based on selectedColorIds
  useEffect(() => {
    fetchColors();
  }, [selectedColorIds, selectedProductId]);

  // Fetch mockups for selected colors and active view
  useEffect(() => {
    if (activeViewId && selectedColorIds.length > 0) {
      fetchColorMockups();
    }
  }, [activeViewId, selectedColorIds]);

  const fetchColors = async () => {
    if (selectedColorIds.length === 0) {
      // If no colors selected, show all available colors for the product
      if (selectedProductId) {
        const { data: variants } = await supabase
          .from("product_color_variants")
          .select("color_id")
          .eq("product_id", selectedProductId);
        
        if (variants && variants.length > 0) {
          const colorIds = variants.map(v => v.color_id);
          const { data } = await supabase
            .from("product_colors")
            .select("*")
            .eq("is_active", true)
            .in("id", colorIds)
            .order("sort_order");
          
          if (data) {
            setColors(data);
            return;
          }
        }
      }

      const { data } = await supabase
        .from("product_colors")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (data) {
        setColors(data);
      }
    } else {
      const { data } = await supabase
        .from("product_colors")
        .select("*")
        .in("id", selectedColorIds)
        .order("sort_order");
      
      if (data) {
        setColors(data);
      }
    }
  };

  const fetchColorMockups = async () => {
    const { data } = await supabase
      .from("product_view_color_mockups")
      .select("*")
      .eq("product_view_id", activeViewId)
      .in("color_id", selectedColorIds);

    if (data) {
      const mockupMap: Record<string, string> = {};
      data.forEach(item => {
        mockupMap[item.color_id] = item.mockup_image_url;
      });
      setColorMockups(mockupMap);
    }
  };

  const currentView = views.find(v => v.id === activeViewId);
  const currentElements = designsByView[activeViewId] || [];

  // Collapsed state - just show color dots
  if (isCollapsed) {
    return (
      <div className="w-14 bg-card border-l border-border flex flex-col items-center py-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mb-2"
          onClick={onToggleCollapse}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {colors.slice(0, 8).map((color) => (
          <button
            key={color.id}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
              activeColorId === color.id 
                ? "border-primary ring-2 ring-primary/30" 
                : "border-border"
            )}
            style={{ backgroundColor: color.hex_code }}
            onClick={() => onColorSelect(color.id, color.hex_code)}
            title={color.name}
          />
        ))}
        {colors.length > 8 && (
          <span className="text-xs text-muted-foreground">+{colors.length - 8}</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-64 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Önizleme</h3>
          <p className="text-xs text-muted-foreground">
            {colors.length} renk
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleCollapse}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Color Cards */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {colors.map((color) => {
            const isActive = activeColorId === color.id;
            const mockupUrl = colorMockups[color.id];
            const isExpanded = expandedCardId === color.id;

            return (
              <div
                key={color.id}
                className={cn(
                  "relative rounded-lg overflow-hidden cursor-pointer transition-all border-2",
                  isActive 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50",
                  isExpanded ? "aspect-square" : "aspect-[4/3]"
                )}
                onClick={() => onColorSelect(color.id, color.hex_code)}
              >
                {/* Background - either mockup image or solid color */}
                {mockupUrl ? (
                  <img 
                    src={mockupUrl} 
                    alt={color.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="absolute inset-0" 
                    style={{ backgroundColor: color.hex_code }}
                  />
                )}

                {/* Design overlay */}
                {currentView && (
                  <div 
                    className="absolute flex items-center justify-center"
                    style={{
                      top: `${currentView.design_area_top}%`,
                      left: `${currentView.design_area_left}%`,
                      width: `${currentView.design_area_width}%`,
                      height: `${currentView.design_area_height}%`,
                    }}
                  >
                    <div className="relative w-full h-full">
                      {currentElements.filter(el => el.isVisible !== false).map((element) => (
                        <div
                          key={element.id}
                          className="absolute"
                          style={{
                            left: `${element.x}%`,
                            top: `${element.y}%`,
                            transform: `rotate(${element.rotation || 0}deg) scale(${element.scaleX ?? 1}, ${element.scaleY ?? 1}) scale(0.2)`,
                            transformOrigin: "top left",
                          }}
                        >
                          {element.type === "text" ? (
                            <span
                              style={{
                                fontSize: element.fontSize,
                                color: element.color,
                                fontFamily: element.fontFamily,
                                fontWeight: element.fontWeight,
                                fontStyle: element.fontStyle,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {element.content}
                            </span>
                          ) : (
                            <img
                              src={element.imageUrl}
                              alt=""
                              style={{
                                width: element.width ? `${element.width}px` : "auto",
                                height: element.height ? `${element.height}px` : "auto",
                              }}
                              className="object-contain"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}

                {/* Color name label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="text-xs text-white font-medium">{color.name}</span>
                </div>

                {/* Expand toggle */}
                <button
                  className="absolute top-2 left-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded flex items-center justify-center transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCardId(isExpanded ? null : color.id);
                  }}
                >
                  {isExpanded ? (
                    <EyeOff className="h-3 w-3 text-white" />
                  ) : (
                    <Eye className="h-3 w-3 text-white" />
                  )}
                </button>
              </div>
            );
          })}

          {colors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Henüz renk seçilmedi</p>
              <p className="text-xs mt-1">
                Üst toolbar'dan renk seçin
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
