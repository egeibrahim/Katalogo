import { useState } from "react";
import { Link, Unlink, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DesignElement } from "./types";

interface AttributesPanelProps {
  element: DesignElement | null;
  onUpdate: (updates: Partial<DesignElement>) => void;
}

export function AttributesPanel({ element, onUpdate }: AttributesPanelProps) {
  const [linkRatio, setLinkRatio] = useState(true);
  const [unit, setUnit] = useState<"px" | "cm">("px");

  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Select an element to edit its properties
      </div>
    );
  }

  const pxToCm = (px: number) => (px / 37.795275591).toFixed(2);
  const cmToPx = (cm: number) => Math.round(cm * 37.795275591);

  const handleWidthChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const pxValue = unit === "cm" ? cmToPx(numValue) : numValue;
    const updates: Partial<DesignElement> = { width: pxValue };

    if (linkRatio && element.width && element.height) {
      const ratio = element.height / element.width;
      updates.height = Math.round(pxValue * ratio);
    }

    onUpdate(updates);
  };

  const handleHeightChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const pxValue = unit === "cm" ? cmToPx(numValue) : numValue;
    const updates: Partial<DesignElement> = { height: pxValue };

    if (linkRatio && element.width && element.height) {
      const ratio = element.width / element.height;
      updates.width = Math.round(pxValue * ratio);
    }

    onUpdate(updates);
  };

  const displayWidth = unit === "cm" ? pxToCm(element.width || 100) : element.width || 100;
  const displayHeight = unit === "cm" ? pxToCm(element.height || 100) : element.height || 100;

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm font-medium">Attributes</div>

      {/* Dimensions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Dimensions</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as "px" | "cm")}>
            <SelectTrigger className="w-16 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="px">px</SelectItem>
              <SelectItem value="cm">cm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">W</Label>
            <Input
              type="number"
              value={displayWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mt-4"
            onClick={() => setLinkRatio(!linkRatio)}
          >
            {linkRatio ? (
              <Link className="h-3 w-3" />
            ) : (
              <Unlink className="h-3 w-3" />
            )}
          </Button>

          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">H</Label>
            <Input
              type="number"
              value={displayHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Rotation</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={element.rotation || 0}
              onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) || 0 })}
              className="w-16 h-7 text-xs"
              min={-360}
              max={360}
            />
            <span className="text-xs text-muted-foreground">°</span>
          </div>
        </div>
        <Slider
          value={[element.rotation || 0]}
          onValueChange={([v]) => onUpdate({ rotation: v })}
          min={-180}
          max={180}
          step={1}
        />
      </div>

      {/* Position */}
      <div className="space-y-2">
        <Label className="text-xs">Position</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* DPI Info for Images */}
      {element.type === "image" && element.dpi && (
        <div className="p-2 bg-muted rounded text-xs">
          <span className="text-muted-foreground">DPI: </span>
          <span className={element.dpi >= 300 ? "text-green-600" : "text-yellow-600"}>
            {element.dpi}
          </span>
          {element.dpi < 300 && (
            <p className="text-yellow-600 mt-1">
              Warning: Low resolution for print
            </p>
          )}
        </div>
      )}

      {/* Text-specific attributes */}
      {element.type === "text" && (
        <div className="space-y-2">
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={element.fontSize || 24}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 24 })}
            className="h-8 text-xs"
            min={8}
            max={200}
          />
        </div>
      )}
    </div>
  );
}
