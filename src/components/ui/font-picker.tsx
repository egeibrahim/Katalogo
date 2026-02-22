"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGoogleFonts, ensureGoogleFontLoaded } from "@/hooks/useGoogleFonts";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

const PREVIEW_PHRASE = "The quick brown fox";

function FontListItem({
  fontFamily,
  isSelected,
  onSelect,
}: {
  fontFamily: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureGoogleFontLoaded(fontFamily);
    const t = setTimeout(() => {
      if (!cancelled) setLoaded(true);
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fontFamily]);

  return (
    <CommandItem
      value={fontFamily}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 px-2 py-2 data-[selected=true]:bg-accent"
    >
      <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span
          className={cn("text-sm font-medium truncate transition-opacity", loaded ? "opacity-100" : "opacity-70")}
          style={{ fontFamily: loaded ? fontFamily : "system-ui" }}
        >
          {fontFamily}
        </span>
        <span
          className={cn(
            "text-xs text-muted-foreground transition-opacity truncate",
            loaded ? "opacity-100" : "opacity-50"
          )}
          style={{ fontFamily: loaded ? fontFamily : "system-ui" }}
        >
          {PREVIEW_PHRASE}
        </span>
      </div>
    </CommandItem>
  );
}

export interface FontPickerProps {
  value?: string;
  onChange?: (fontFamily: string) => void;
  width?: number;
  listHeight?: number;
  className?: string;
  placeholder?: string;
}

export function FontPicker({
  value = "",
  onChange,
  width = 280,
  listHeight = 320,
  className,
  placeholder = "Select font...",
}: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const { fonts, isLoading } = useGoogleFonts();

  const handleSelect = useCallback(
    (font: string) => {
      ensureGoogleFontLoaded(font);
      onChange?.(font);
      setOpen(false);
    },
    [onChange]
  );

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Select font"
          className={cn("h-9 w-full justify-between rounded-lg border border-input font-normal", className)}
          style={{ fontFamily: value || undefined }}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput placeholder="Search fonts..." className="border-none focus:ring-0" />
          <div className="flex items-center border-b px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{fonts.length} fonts</span>
          </div>
          <CommandList className="overflow-y-auto" style={{ maxHeight: listHeight }}>
            <CommandEmpty>No font found.</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                fonts.map((font) => (
                  <FontListItem
                    key={font}
                    fontFamily={font}
                    isSelected={value === font}
                    onSelect={() => handleSelect(font)}
                  />
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
