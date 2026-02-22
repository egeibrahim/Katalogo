import * as React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ADMIN_POPOVER_CONTENT_CLASS } from "@/components/admin/popoverStyles";

type Option = { label: string; value: string };

export function MultiSelectField({
  label,
  value,
  options,
  placeholder = "Select…",
  onChange,
  className,
  searchable = true,
  allowCustom = false,
  hideLabel = false,
  showChips = true,
}: {
  label: string;
  value: string[];
  options: Option[];
  placeholder?: string;
  onChange: (next: string[]) => void;
  className?: string;
  searchable?: boolean;
  allowCustom?: boolean;
  hideLabel?: boolean;
  showChips?: boolean;
}) {
  const selected = React.useMemo(() => new Set(value), [value]);
  const [query, setQuery] = React.useState("");

  const normalizedQuery = React.useMemo(() => query.trim(), [query]);
  const filteredOptions = React.useMemo(() => {
    const q = normalizedQuery.toLowerCase();
    if (!searchable || !q) return options;
    return options.filter((o) => (o.label || o.value).toLowerCase().includes(q));
  }, [normalizedQuery, options, searchable]);

  const canCreate = React.useMemo(() => {
    if (!allowCustom) return false;
    const v = normalizedQuery;
    if (!v) return false;
    const exists = options.some((o) => o.value === v) || value.includes(v);
    return !exists;
  }, [allowCustom, normalizedQuery, options, value]);

  const selectedLabel = React.useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return options.find((o) => o.value === value[0])?.label ?? value[0];
    return `${value.length} selected`;
  }, [options, placeholder, value]);

  const selectedBadges = React.useMemo(() => {
    if (!showChips) return [] as Array<{ label: string; value: string }>;
    const map = new Map(options.map((o) => [o.value, o.label] as const));
    return value.map((v) => ({ value: v, label: map.get(v) ?? v }));
  }, [options, showChips, value]);

  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  };

  const create = () => {
    const v = normalizedQuery;
    if (!v) return;
    const next = new Set(selected);
    next.add(v);
    onChange(Array.from(next));
    setQuery("");
  };

  return (
    <div className={className}>
      {hideLabel ? null : <Label>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="mt-2 w-full justify-between">
            {showChips ? (
              <span className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-1 text-left">
                {value.length === 0 ? (
                  <span className="truncate text-muted-foreground">{placeholder}</span>
                ) : (
                  <>
                    {selectedBadges.slice(0, 2).map((b) => (
                      <Badge key={b.value} variant="secondary" className="max-w-[10rem] truncate">
                        {b.label}
                      </Badge>
                    ))}
                    {selectedBadges.length > 2 ? (
                      <Badge variant="outline">+{selectedBadges.length - 2}</Badge>
                    ) : null}
                  </>
                )}
              </span>
            ) : (
              <span className="truncate text-left">{selectedLabel}</span>
            )}
            <span className="text-xs text-muted-foreground">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          // Ensure dropdowns are never see-through and always sit above sticky headers / overlays.
          className={`${ADMIN_POPOVER_CONTENT_CLASS} w-[320px] p-0`}
        >
          {searchable ? (
            <div className="border-b p-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
              />
              {canCreate ? (
                <Button type="button" variant="secondary" className="mt-2 w-full" onClick={create}>
                  Add “{normalizedQuery}”
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="max-h-72 overflow-y-auto overflow-x-hidden p-3">
            <div className="space-y-2">
              {filteredOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No options found.</div>
              ) : (
                filteredOptions.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
                    <Checkbox checked={selected.has(o.value)} onCheckedChange={() => toggle(o.value)} />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {value.length > 0 ? (
            <div className="border-t p-2">
              <Button type="button" variant="ghost" className="w-full" onClick={() => onChange([])}>
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
