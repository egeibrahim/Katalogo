import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export type FilterKey =
  | "deliverTo"
  | "fulfillment"
  | "size"
  | "color"
  | "price"
  | "fit"
  | "printAreas"
  | "sleeveLength"
  | "elements"
  | "add";

function toggleValue(list: string[], v: string) {
  const set = new Set(list);
  if (set.has(v)) set.delete(v);
  else set.add(v);
  return Array.from(set);
}

export function FilterMultiSelectDropdown({
  k,
  label,
  openKey,
  setOpenKey,
  value,
  options,
  onChange,
  renderOption,
}: {
  k: FilterKey;
  label: string;
  openKey: FilterKey | null;
  setOpenKey: (k: FilterKey | null) => void;
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  renderOption?: (o: { option: string; checked: boolean; onToggle: () => void }) => React.ReactNode;
}) {
  const isOpen = openKey === k;
  const selected = React.useMemo(() => new Set(value), [value]);

  return (
    <div className="ts-filter-dd">
      <button
        type="button"
        className="ts-filter-pill"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpenKey(isOpen ? null : k)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0">{label}</span>
          {value.length ? (
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {value.slice(0, 2).map((v) => (
                <Badge key={v} variant="secondary" className="max-w-[9rem] truncate">
                  {v}
                </Badge>
              ))}
              {value.length > 2 ? <Badge variant="outline">+{value.length - 2}</Badge> : null}
            </span>
          ) : null}
        </span>
        <ChevronDown className={isOpen ? "ts-filter-caret ts-filter-caret--open" : "ts-filter-caret"} aria-hidden />
      </button>

      {isOpen ? (
        <div className="ts-filter-menu" role="menu" aria-label={`${label} filter`}>
          <div className="ts-filter-menu-title">{label}</div>

          <ScrollArea className="max-h-72">
            <div className="p-3">
              <div className="space-y-2" role="none">
                {options.map((opt) => {
                  const checked = selected.has(opt);
                  const onToggle = () => onChange(toggleValue(value, opt));
                  if (renderOption) return <React.Fragment key={opt}>{renderOption({ option: opt, checked, onToggle })}</React.Fragment>;

                  return (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
                    >
                      <Checkbox checked={checked} onCheckedChange={onToggle} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </ScrollArea>

          {value.length ? (
            <div className="border-t p-2">
              <button type="button" className="ts-filter-menu-item" onClick={() => onChange([])}>
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
