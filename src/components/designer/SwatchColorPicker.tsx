import { Check, ChevronDown, Pipette, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useMemo, useState, type ReactNode } from "react";

export type SwatchColor = {
  id: string;
  name: string;
  hex: string;
};


const GOOGLE_LIKE_PRESETS: string[] = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#B7B7B7",
  "#CCCCCC",
  "#D9D9D9",
  "#EFEFEF",
  "#F3F3F3",
  "#FFFFFF",

  "#980000",
  "#FF0000",
  "#FF9900",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#4A86E8",
  "#0000FF",
  "#9900FF",
  "#FF00FF",

  "#E6B8AF",
  "#F4CCCC",
  "#FCE5CD",
  "#FFF2CC",
  "#D9EAD3",
  "#D0E0E3",
  "#C9DAF8",
  "#CFE2F3",
  "#D9D2E9",
  "#EAD1DC",

  "#DD7E6B",
  "#EA9999",
  "#F9CB9C",
  "#FFE599",
  "#B6D7A8",
  "#A2C4C9",
  "#A4C2F4",
  "#9FC5E8",
  "#B4A7D6",
  "#D5A6BD",

  "#CC4125",
  "#E06666",
  "#F6B26B",
  "#FFD966",
  "#93C47D",
  "#76A5AF",
  "#6D9EEB",
  "#6FA8DC",
  "#8E7CC3",
  "#C27BA0",

  "#A61C00",
  "#CC0000",
  "#E69138",
  "#F1C232",
  "#6AA84F",
  "#45818E",
  "#3C78D8",
  "#3D85C6",
  "#674EA7",
  "#A64D79",

  "#85200C",
  "#990000",
  "#B45F06",
  "#BF9000",
  "#38761D",
  "#134F5C",
  "#1155CC",
  "#0B5394",
  "#351C75",
  "#741B47",

  "#5B0F00",
  "#660000",
  "#783F04",
  "#7F6000",
  "#274E13",
  "#0C343D",
  "#1C4587",
  "#073763",
  "#20124D",
  "#4C1130",
];

function normalizeHex(hex: string) {
  const v = hex.trim();
  if (!v) return "";
  const withHash = v.startsWith("#") ? v : `#${v}`;
  return withHash.toUpperCase();
}

export function SwatchColorPicker({
  label = "Renk",
  colors,
  selectedIds,
  onToggle,
  onSelectHex,
  isBusy,
  paletteManager,
  className,
}: {
  label?: string;
  colors: SwatchColor[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectHex?: (hex: string) => void | Promise<void>;
  isBusy?: boolean;
  paletteManager?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customHex, setCustomHex] = useState("");

  const hexToColor = useMemo(() => {
    const map = new Map<string, SwatchColor>();
    colors.forEach((c) => map.set(normalizeHex(c.hex), { ...c, hex: normalizeHex(c.hex) }));
    return map;
  }, [colors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return colors;
    return colors.filter((c) => c.name.toLocaleLowerCase("tr").includes(q) || c.hex.toLowerCase().includes(q));
  }, [colors, query]);

  const selectedCount = selectedIds.length;

  const handlePresetClick = async (hex: string) => {
    const normalized = normalizeHex(hex);
    const existing = hexToColor.get(normalized);
    if (existing) {
      onToggle(existing.id);
      return;
    }
    if (onSelectHex) {
      await onSelectHex(normalized);
    }
  };

  const handleAddCustom = async () => {
    const normalized = normalizeHex(customHex);
    if (!normalized) return;

    const existing = hexToColor.get(normalized);
    if (existing) {
      onToggle(existing.id);
      return;
    }

    if (!onSelectHex) return;
    await onSelectHex(normalized);
    setCustomHex("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{label}</Label>
          <span className="text-xs text-muted-foreground">{selectedCount} seçili</span>
        </div>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Pipette className="h-4 w-4 text-muted-foreground" />
              Renk seç
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent side="bottom" align="end" collisionPadding={12} className="w-[340px] p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Color Picker</p>
              <span className="text-xs text-muted-foreground">{selectedCount} seçili</span>
            </div>

            {/* Presets (80) */}
            <div className="grid grid-cols-10 gap-2">
              {GOOGLE_LIKE_PRESETS.map((hex) => {
                const normalized = normalizeHex(hex);
                const existing = hexToColor.get(normalized);
                const active = existing ? selectedIds.includes(existing.id) : false;

                return (
                  <button
                    key={normalized}
                    type="button"
                    onClick={() => void handlePresetClick(normalized)}
                    title={existing ? `${existing.name} (${normalized})` : normalized}
                    aria-label={`${normalized} seç`}
                    className={cn(
                      "relative h-7 w-7 rounded-full border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "shadow-[0_0_0_2px_hsl(var(--primary))]"
                        : "hover:shadow-[0_0_0_2px_hsl(var(--muted-foreground)/0.35)]",
                    )}
                    style={{ backgroundColor: normalized }}
                  >
                    {active && (
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-background/70 backdrop-blur-sm">
                          <Check className="h-3.5 w-3.5 text-foreground" />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Custom</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Pipette className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    placeholder="#434343"
                    className="h-9 pl-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddCustom();
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => void handleAddCustom()}
                  disabled={!!isBusy}
                  title="Renk ekle"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Hex kodu ile ekle: #RRGGBB</p>
            </div>

            {/* Search (optional) */}
            <div className="space-y-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Palet içinde ara (isim / #hex)"
                className="h-9"
              />

              <div className="grid grid-cols-10 gap-2">
                {filtered.slice(0, 80).map((c) => {
                  const active = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onToggle(c.id)}
                      title={`${c.name} (${c.hex})`}
                      aria-label={`${c.name} seç`}
                      className={cn(
                        "relative h-7 w-7 rounded-full border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "shadow-[0_0_0_2px_hsl(var(--primary))]"
                          : "hover:shadow-[0_0_0_2px_hsl(var(--muted-foreground)/0.35)]",
                      )}
                      style={{ backgroundColor: c.hex }}
                    >
                      {active && (
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-background/70 backdrop-blur-sm">
                            <Check className="h-3.5 w-3.5 text-foreground" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {filtered.length === 0 && <p className="text-xs text-muted-foreground">Sonuç yok.</p>}
            </div>

            {paletteManager ? (
              <Accordion type="single" collapsible className="pt-1">
                <AccordionItem value="palette" className="border-b-0">
                  <AccordionTrigger className="py-2 text-sm">Renk Paleti</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    {paletteManager}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
