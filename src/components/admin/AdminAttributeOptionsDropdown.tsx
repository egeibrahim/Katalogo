import * as React from "react";
import { ChevronDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type OptionRow = {
  id: string;
  value: string;
};

export function AdminAttributeOptionsDropdown({
  label = "Options",
  options,
  onDelete,
  className,
}: {
  label?: string;
  options: OptionRow[];
  onDelete: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.value.toLowerCase().includes(query));
  }, [options, q]);

  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const toggle = React.useCallback((v: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(v)) s.delete(v);
      else s.add(v);
      return Array.from(s);
    });
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={cn("h-9 gap-2", className)} aria-haspopup="menu">
          <span className="truncate">{label}</span>
          <Badge variant="secondary" className="ml-1">
            {options.length}
          </Badge>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[min(28rem,calc(100vw-2rem))] p-0 bg-popover text-popover-foreground border shadow-md z-50"
      >
        <div className="p-3 border-b">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" />
        </div>

        <ScrollArea className="max-h-72">
          <div className="p-2">
            <div className="space-y-1">
              {filtered.map((opt) => {
                const checked = selectedSet.has(opt.id);
                return (
                  <div key={opt.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                    <Checkbox checked={checked} onCheckedChange={() => toggle(opt.id)} />
                    <div className="min-w-0 flex-1 truncate text-sm">{opt.value}</div>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive"
                      aria-label="Sil"
                      onClick={() => onDelete(opt.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              {filtered.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">No results</div>
              ) : null}
            </div>
          </div>
        </ScrollArea>

        <div className="border-t p-2 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])} disabled={!selected.length}>
            Clear
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
