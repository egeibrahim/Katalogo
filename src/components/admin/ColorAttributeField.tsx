import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ColorPoolPopover } from "@/components/designer/ColorPoolPopover";
import { ADMIN_POPOVER_CONTENT_CLASS } from "@/components/admin/popoverStyles";

type Option = { label: string; value: string };

interface ColorAttributeFieldProps {
  label: string;
  value: string[];
  options: Option[];
  onChange: (next: string[]) => void;
  className?: string;
  allowCustom?: boolean;
}

// Extract hex code from "ColorName (#HEX)" format
function extractHex(value: string): string | null {
  const match = value.match(/#[0-9A-Fa-f]{6}/);
  return match ? match[0] : null;
}

// Extract color name from "ColorName (#HEX)" format
function extractName(value: string): string {
  return value.replace(/\s*\(#[0-9A-Fa-f]{6}\)\s*/g, "").trim();
}

export function ColorAttributeField({
  label,
  value,
  options,
  onChange,
  className,
  allowCustom = false,
}: ColorAttributeFieldProps) {
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customHex, setCustomHex] = useState("");

  // Load colors from product_colors pool
  const { data: poolColors = [] } = useQuery({
    queryKey: ["product-colors-pool"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_colors")
        .select("id, name, hex_code")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = useMemo(() => new Set(value), [value]);

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const selectedLabel = useMemo(() => {
    const count = selected.size;
    if (count === 0) return "Select colors…";
    if (count === 1) {
      const val = value[0];
      return extractName(val) || val;
    }
    return `${count} colors selected`;
  }, [selected, value]);

  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  };

  const addCustom = () => {
    if (!customName.trim() || !customHex.trim()) return;
    const formatted = `${customName.trim()} (${customHex.trim().toUpperCase()})`;
    const next = new Set(selected);
    next.add(formatted);
    onChange(Array.from(next));
    setCustomName("");
    setCustomHex("");
    setQuery("");
  };

  const handlePoolColorToggle = (colorId: string, hexCode: string) => {
    const color = poolColors.find(c => c.id === colorId);
    if (!color) return;

    const formattedValue = `${color.name} (${hexCode})`;
    toggle(formattedValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>

      <div className="flex items-center gap-2 mb-2">
        <ColorPoolPopover
          mode="multi"
          selectedColorIds={value.map(v => {
            // Try to match selected values with pool colors by hex
            const hex = extractHex(v);
            if (!hex) return null;
            const poolColor = poolColors.find(c => c.hex_code === hex);
            return poolColor?.id ?? null;
          }).filter(Boolean) as string[]}
          onColorToggle={handlePoolColorToggle}
        />
        <span className="text-xs text-muted-foreground">
          Renk havuzundan seç veya manuel ekle
        </span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{selectedLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn(ADMIN_POPOVER_CONTENT_CLASS, "w-80 p-0")} align="start">
          <div className="border-b p-2 space-y-2">
            <Input
              placeholder="Search colors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
            />
            {allowCustom && (
              <div className="flex gap-2">
                <Input
                  placeholder="Color name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-8"
                />
                <Input
                  placeholder="#HEX"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-8 w-24"
                />
                <Button
                  size="sm"
                  onClick={addCustom}
                  disabled={!customName.trim() || !customHex.trim()}
                  className="h-8"
                >
                  Add
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {filteredOptions.map((opt) => {
                const isSelected = selected.has(opt.value);
                const hex = extractHex(opt.value);
                const name = extractName(opt.value);

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted",
                      isSelected && "bg-muted"
                    )}
                    title={opt.value}
                  >
                    {hex && (
                      <div
                        className="h-5 w-5 shrink-0 rounded border"
                        style={{ backgroundColor: hex }}
                      />
                    )}
                    <span className="flex-1 truncate text-left">{name}</span>
                    {hex && (
                      <span className="text-xs text-muted-foreground">{hex}</span>
                    )}
                    {isSelected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          {selected.size > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => {
            const hex = extractHex(v);
            const name = extractName(v);
            return (
              <div
                key={v}
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                title={v}
              >
                {hex && (
                  <div
                    className="h-3 w-3 shrink-0 rounded border"
                    style={{ backgroundColor: hex }}
                  />
                )}
                <span className="truncate max-w-[120px]">{name}</span>
                <button
                  type="button"
                  onClick={() => toggle(v)}
                  className="shrink-0 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}