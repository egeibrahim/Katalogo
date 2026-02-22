import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DesignElement, DEFAULT_FONT_FAMILY } from "./types";

interface PropertyInspectorProps {
  selectedElement: DesignElement | null;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onDeleteElement: (id: string) => void;
}

const fonts = [
  { value: "Instrument Sans", label: "Instrument Sans" },
  { value: "Newsreader", label: "Newsreader" },
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Courier New", label: "Courier New" },
  { value: "Impact", label: "Impact" },
  { value: "Comic Sans MS", label: "Comic Sans" },
];

const colorPresets = [
  "#000000",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

export function PropertyInspector({ selectedElement, onUpdateElement, onDeleteElement }: PropertyInspectorProps) {
  if (!selectedElement) {
    return (
      <aside className="w-72 bg-inspector-bg border-l border-border flex flex-col">
        <div className="h-12 border-b border-border flex items-center px-4">
          <h2 className="text-sm font-semibold">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select an element to edit its properties
          </p>
        </div>
      </aside>
    );
  }

  const getStyleValues = () => {
    const values: string[] = [];
    if (selectedElement.fontWeight === "bold") values.push("bold");
    if (selectedElement.fontStyle === "italic") values.push("italic");
    if (selectedElement.textDecoration === "underline") values.push("underline");
    return values;
  };

  const handleStyleChange = (values: string[]) => {
    onUpdateElement(selectedElement.id, {
      fontWeight: values.includes("bold") ? "bold" : "normal",
      fontStyle: values.includes("italic") ? "italic" : "normal",
      textDecoration: values.includes("underline") ? "underline" : "none",
    });
  };

  return (
    <aside className="w-72 bg-inspector-bg border-l border-border flex flex-col animate-fade-in">
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold">Properties</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDeleteElement(selectedElement.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Content Section (only for text) */}
        {selectedElement.type === "text" && (
          <div className="property-section">
            <Label className="property-label">Content</Label>
            <Input
              value={selectedElement.content}
              onChange={(e) => onUpdateElement(selectedElement.id, { content: e.target.value })}
              className="h-9"
            />
          </div>
        )}

        {/* Image Size Section */}
        {selectedElement.type === "image" && (
          <div className="property-section">
            <Label className="property-label">Size</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1">Width</Label>
                <Input
                  type="number"
                  value={selectedElement.width || 100}
                  onChange={(e) => onUpdateElement(selectedElement.id, { width: parseInt(e.target.value) || 100 })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1">Height</Label>
                <Input
                  type="number"
                  value={selectedElement.height || 100}
                  onChange={(e) => onUpdateElement(selectedElement.id, { height: parseInt(e.target.value) || 100 })}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        )}

        {/* Typography Section */}
        {selectedElement.type === "text" && (
          <>
            <div className="property-section">
              <Label className="property-label">Font Family</Label>
              <Select
                value={selectedElement.fontFamily || DEFAULT_FONT_FAMILY}
                onValueChange={(value) => onUpdateElement(selectedElement.id, { fontFamily: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* If current font isn't in the list, still show it to avoid Select breaking */}
                  {selectedElement.fontFamily && !fonts.some((f) => f.value === selectedElement.fontFamily) && (
                    <SelectItem value={selectedElement.fontFamily}>
                      <span style={{ fontFamily: selectedElement.fontFamily }}>{selectedElement.fontFamily}</span>
                    </SelectItem>
                  )}
                  {fonts.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="property-section">
              <Label className="property-label">Font Size</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[selectedElement.fontSize || 24]}
                  min={8}
                  max={120}
                  step={1}
                  onValueChange={([value]) => onUpdateElement(selectedElement.id, { fontSize: value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={selectedElement.fontSize || 24}
                  onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 24 })}
                  className="w-16 h-9 text-center"
                />
              </div>
            </div>

            <div className="property-section">
              <Label className="property-label">Style</Label>
              <ToggleGroup 
                type="multiple" 
                className="justify-start"
                value={getStyleValues()}
                onValueChange={handleStyleChange}
              >
                <ToggleGroupItem value="bold" aria-label="Bold" className="h-9 w-9">
                  <Bold className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" aria-label="Italic" className="h-9 w-9">
                  <Italic className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="underline" aria-label="Underline" className="h-9 w-9">
                  <Underline className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="property-section">
              <Label className="property-label">Alignment</Label>
              <ToggleGroup 
                type="single" 
                value={selectedElement.textAlign || "center"} 
                onValueChange={(value) => value && onUpdateElement(selectedElement.id, { textAlign: value as "left" | "center" | "right" })}
                className="justify-start"
              >
                <ToggleGroupItem value="left" aria-label="Align Left" className="h-9 w-9">
                  <AlignLeft className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Align Center" className="h-9 w-9">
                  <AlignCenter className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Align Right" className="h-9 w-9">
                  <AlignRight className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Color Section */}
            <div className="property-section">
              <Label className="property-label">Color</Label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    className={`color-swatch ${selectedElement.color === color ? "active" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => onUpdateElement(selectedElement.id, { color })}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={selectedElement.color || "#000000"}
                  onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={selectedElement.color || "#000000"}
                  onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                  className="flex-1 h-9 font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>
          </>
        )}

        {/* Rotation Section */}
        <div className="property-section">
          <Label className="property-label flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            Rotation
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[selectedElement.rotation || 0]}
              min={-180}
              max={180}
              step={1}
              onValueChange={([value]) => onUpdateElement(selectedElement.id, { rotation: value })}
              className="flex-1"
            />
            <Input
              type="number"
              value={selectedElement.rotation || 0}
              onChange={(e) => onUpdateElement(selectedElement.id, { rotation: parseInt(e.target.value) || 0 })}
              className="w-16 h-9 text-center"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onUpdateElement(selectedElement.id, { rotation: 0 })}
          >
            Reset Rotation
          </Button>
        </div>

        {/* Position Section */}
        <div className="property-section">
          <Label className="property-label">Position</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">X</Label>
              <Input
                type="number"
                value={Math.round(selectedElement.x)}
                onChange={(e) => onUpdateElement(selectedElement.id, { x: parseInt(e.target.value) || 50 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Y</Label>
              <Input
                type="number"
                value={Math.round(selectedElement.y)}
                onChange={(e) => onUpdateElement(selectedElement.id, { y: parseInt(e.target.value) || 50 })}
                className="h-9"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
