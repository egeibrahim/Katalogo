import { forwardRef, useMemo, useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pipette, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type ProductColorRow = {
  id: string;
  name: string;
  hex_code: string;
  sort_order: number | null;
};

type ProductColorUpsert = {
  id?: string;
  name: string;
  hex_code: string;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type ImportMode = "replace";

type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
};

function parseBooleanLoose(v: string | undefined): boolean | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return null;
}

function parseDelimitedLine(line: string, delim: ";" | "," | "\t"): string[] {
  // Supports quoted fields with escaped quotes: "" -> ".
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delim) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function detectDelimiter(headerLine: string): ";" | "," | "\t" {
  const counts: Array<[";" | "," | "\t", number]> = [
    [";", (headerLine.match(/;/g) ?? []).length],
    [",", (headerLine.match(/,/g) ?? []).length],
    ["\t", (headerLine.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][0];
}

function normalizeHex(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  const withHash = v.startsWith("#") ? v : `#${v}`;
  const upper = withHash.toUpperCase();
  // Expand 3-digit hex (#ABC -> #AABBCC)
  const m3 = upper.match(/^#([0-9A-F]{3})$/);
  if (m3) {
    const [a, b, c] = m3[1].split("");
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return upper;
}

function isValidHex(hex: string) {
  return /^#([0-9A-F]{6})$/.test(hex);
}

function isLightColor(hexCode: string): boolean {
  const hex = hexCode.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

type BaseProps = {
  className?: string;
};

type SingleProps = BaseProps & {
  mode?: "single";
  selectedColorId: string | null;
  onColorSelect: (colorId: string, hexCode: string) => void;
};

type MultiProps = BaseProps & {
  mode: "multi";
  selectedColorIds: string[];
  onColorToggle: (colorId: string, hexCode: string) => void;
};

export const ColorPoolPopover = forwardRef<HTMLButtonElement, SingleProps | MultiProps>((props, ref) => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const pendingFileRef = useRef<File | null>(null);

  const isMulti = props.mode === "multi";

  const selectedColorId = !isMulti ? props.selectedColorId : null;
  const selectedColorIds = isMulti ? props.selectedColorIds : [];

  const [query, setQuery] = useState("");
  const [newHex, setNewHex] = useState("");
  const [newName, setNewName] = useState("");

  // Reset focus when popover opens
  useEffect(() => {
    if (open) {
      setFocusedIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const { data: colors = [], isLoading } = useQuery({
    queryKey: ["product-colors-pool"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_colors")
        .select("id,name,hex_code,sort_order")
        // Treat NULL as active (older/imported rows may have is_active NULL)
        .neq("is_active", false)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ProductColorRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return colors;
    return colors.filter((c) => c.name.toLocaleLowerCase("tr").includes(q) || c.hex_code.toLowerCase().includes(q));
  }, [colors, query]);

  const importFileMutation = useMutation({
    mutationFn: async ({ file, mode }: { file: File; mode: ImportMode }) => {
      const text = await file.text();
      const rawLines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (rawLines.length < 2) return { imported: 0, updated: 0, skipped: 0 };

      const delim = detectDelimiter(rawLines[0]);
      const firstParts = parseDelimitedLine(rawLines[0], delim);

      // Detect whether the first line is a header or data.
      // Your file is like: key,"Name",#hex,r,g,b (no header)
      const firstLooksLikeData =
        firstParts.length >= 3 &&
        normalizeHex(firstParts[2] ?? "").startsWith("#") &&
        isValidHex(normalizeHex(firstParts[2] ?? ""));

      const headerLine = firstLooksLikeData ? null : rawLines[0];
      const dataLines = firstLooksLikeData ? rawLines : rawLines.slice(1);

      let idxId = -1;
      let idxName = -1;
      let idxHex = -1;
      let idxSort = -1;
      let idxActive = -1;

      if (headerLine) {
        const header = parseDelimitedLine(headerLine, delim).map((h) => h.toLowerCase());
        const getIndex = (keys: string[]) => header.findIndex((h) => keys.includes(h));
        idxId = getIndex(["id", "uuid"]);
        idxName = getIndex(["name", "label", "color", "colour"]);
        idxHex = getIndex(["hex_code", "hex", "hexcode", "color_hex", "colour_hex"]);
        idxSort = getIndex(["sort_order", "sort", "order"]);
        idxActive = getIndex(["is_active", "active", "enabled"]);
      }

      const headerLooksValid = idxName >= 0 && idxHex >= 0;

      // Parse -> then de-duplicate by hex_code (files often contain synonyms with same hex)
      const parsedByHex = new Map<string, ProductColorUpsert>();
      let sortIndex = 0;
      for (const line of dataLines) {
        const parts = parseDelimitedLine(line, delim);

        // Formats supported:
        // 1) With header (name/hex columns)
        // 2) 2-column: name,hex
        // 3) Your file: key,name,hex,r,g,b  -> use name@1, hex@2

        const id = headerLooksValid ? (idxId >= 0 ? parts[idxId] : undefined) : undefined;
        const name = headerLooksValid
          ? (parts[idxName] ?? "")
          : (parts[1] && parts[2] ? parts[1] : parts[0] ?? "");
        const hex = headerLooksValid
          ? (parts[idxHex] ?? "")
          : (parts[2] ? parts[2] : parts[1] ?? "");

        const sortRaw = headerLooksValid && idxSort >= 0 ? parts[idxSort] : undefined;
        const activeRaw = headerLooksValid && idxActive >= 0 ? parts[idxActive] : undefined;

        const normalizedHex = normalizeHex(hex);
        if (!name?.trim()) continue;
        if (!normalizedHex || !isValidHex(normalizedHex)) continue;

        const sort_order = sortRaw ? Number(sortRaw) : sortIndex;
        const is_active = parseBooleanLoose(activeRaw);

        parsedByHex.set(normalizedHex, {
          id: id?.trim() || undefined,
          name: name.trim(),
          hex_code: normalizedHex,
          sort_order: Number.isFinite(sort_order as number) ? (sort_order as number) : null,
          is_active,
        });

        sortIndex++;
      }

      const parsed = Array.from(parsedByHex.values());

      if (parsed.length === 0) {
        throw new Error(
          "CSV içinde geçerli renk satırı bulunamadı. Beklenen format: name,hex veya key,name,hex"
        );
      }

      const insertResilient = async (rows: ProductColorUpsert[]): Promise<{ inserted: number; skipped: number }> => {
        if (rows.length === 0) return { inserted: 0, skipped: 0 };

        const { error } = await supabase.from("product_colors").insert(rows);
        if (!error) return { inserted: rows.length, skipped: 0 };

        // If a batch fails (400 etc.), split it until we isolate the bad row(s).
        if (rows.length === 1) return { inserted: 0, skipped: 1 };
        const mid = Math.floor(rows.length / 2);
        const left = await insertResilient(rows.slice(0, mid));
        const right = await insertResilient(rows.slice(mid));
        return { inserted: left.inserted + right.inserted, skipped: left.skipped + right.skipped };
      };

      // Replace mode: soft-replace to avoid breaking references (mark all inactive first)
      if (mode === "replace") {
        const { error: deactivateErr } = await supabase
          .from("product_colors")
          .update({ is_active: false })
          // apply to all rows; admin RLS allows
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (deactivateErr) throw deactivateErr;
      }

      // Map existing rows by hex (and keep their ids) so we can update without requiring id in the CSV.
      const uniqHexes = Array.from(new Set(parsed.map((r) => r.hex_code)));
      const { data: existing, error: existingErr } = await supabase
        .from("product_colors")
        .select("id,hex_code")
        .in("hex_code", uniqHexes);
      if (existingErr) throw existingErr;
      const existingByHex = new Map(
        (existing ?? []).map((r) => [normalizeHex(r.hex_code), r.id] as const)
      );

      const toInsert: ProductColorUpsert[] = [];
      const toUpsertById: ProductColorUpsert[] = [];

      for (const row of parsed) {
        const mappedId = row.id ?? existingByHex.get(row.hex_code);
        if (mappedId) {
          // In replace mode we always activate the chosen palette
          toUpsertById.push({
            ...row,
            id: mappedId,
            is_active: mode === "replace" ? true : row.is_active,
          });
        } else {
          toInsert.push({
            ...row,
            id: undefined,
            is_active: mode === "replace" ? true : row.is_active,
          });
        }
      }

      // Upsert rows with id in chunks
      const chunkSize = 200;
      for (let i = 0; i < toUpsertById.length; i += chunkSize) {
        const chunk = toUpsertById.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("product_colors")
          .upsert(chunk, { onConflict: "id" });
        if (error) throw error;
      }

      // Insert new rows in chunks (resilient: bad rows won't abort the whole import)
      let insertedCount = 0;
      let skippedCount = 0;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const res = await insertResilient(chunk);
        insertedCount += res.inserted;
        skippedCount += res.skipped;
      }

      return { imported: insertedCount, updated: toUpsertById.length, skipped: skippedCount } satisfies ImportResult;
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["product-colors-pool"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-colors"] });
      const suffix = res.skipped ? ` (${res.skipped} satır atlandı)` : "";
      toast.success(`Yüklendi: ${res.imported} yeni, ${res.updated} güncellendi${suffix}`);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Dosyadan yükleme başarısız";
      toast.error(msg);
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizeHex(newHex);
      if (!normalized) throw new Error("Hex kodu gerekli");
      if (!isValidHex(normalized)) throw new Error("Geçersiz hex. Örn: #E53935");

      // First try local match
      const existingLocal = colors.find((c) => normalizeHex(c.hex_code) === normalized);
      if (existingLocal) return { mode: "existing" as const, row: existingLocal };

      // Best-effort remote match (RLS may hide inactive rows)
      const { data: existingRemote, error: existingErr } = await supabase
        .from("product_colors")
        .select("id,name,hex_code,sort_order")
        .eq("hex_code", normalized)
        .neq("is_active", false)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (existingRemote) return { mode: "existing" as const, row: existingRemote as ProductColorRow };

      const nextSortOrder =
        colors.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0) + 1;

      const name = newName.trim() || normalized;

      const { data: inserted, error: insertErr } = await supabase
        .from("product_colors")
        .insert({ name, hex_code: normalized, is_active: true, sort_order: nextSortOrder })
        .select("id,name,hex_code,sort_order")
        .single();

      if (insertErr) throw insertErr;

      return { mode: "inserted" as const, row: inserted as ProductColorRow };
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["product-colors-pool"] });
      // Keep admin views in sync if they rely on this key
      await queryClient.invalidateQueries({ queryKey: ["admin-colors"] });

      if (isMulti) {
        props.onColorToggle(res.row.id, res.row.hex_code);
      } else {
        props.onColorSelect(res.row.id, res.row.hex_code);
      }

      setNewHex("");
      setNewName("");

      if (res.mode === "inserted") toast.success("Renk havuza eklendi");
      else toast.message("Mevcut renk seçildi");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Renk eklenemedi";
      toast.error(msg);
    },
  });

  const handleAdd = () => {
    void addMutation.mutateAsync();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    
    const cols = 12;
    const totalColors = filtered.length;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev < totalColors - 1 ? prev + 1 : prev;
        return next;
      });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev + cols;
        return next < totalColors ? next : prev;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev - cols;
        return next >= 0 ? next : prev;
      });
    } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < totalColors) {
      e.preventDefault();
      const color = filtered[focusedIndex];
      if (color) {
        if (isMulti) {
          props.onColorToggle(color.id, color.hex_code);
        } else {
          props.onColorSelect(color.id, color.hex_code);
          setOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll focused color into view
  useEffect(() => {
    if (focusedIndex >= 0 && gridRef.current) {
      const buttons = gridRef.current.querySelectorAll("button");
      const focused = buttons[focusedIndex] as HTMLElement | undefined;
      focused?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [focusedIndex]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          size="icon"
          className={cn("h-9 w-9 rounded-lg", props.className)}
          title="Renk havuzu"
          aria-label="Renk havuzu"
        >
          <Pipette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="bottom" collisionPadding={12} className="w-[400px] p-3" onKeyDown={handleKeyDown}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Renk Havuzu</p>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      // allow re-uploading same file
                      e.currentTarget.value = "";
                      if (!file) return;
                      // Palette replacement is destructive (soft): confirm first
                      pendingFileRef.current = file;
                      setConfirmReplaceOpen(true);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={importFileMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                    title="CSV seçip renk paletini değiştir"
                  >
                    {importFileMutation.isPending ? "Yükleniyor…" : "Paleti CSV ile değiştir"}
                  </Button>
                </div>
              ) : null}
              <span className="text-xs text-muted-foreground">{colors.length} renk</span>
            </div>
          </div>

          <AlertDialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Renk paleti değiştirilsin mi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Mevcut tüm renkler pasiflenir ve bu CSV’deki renkler aktif edilir. (Var olan ürünlerde
                  kullanılan renkler bozulmaz.)
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  type="button"
                  onClick={() => {
                    pendingFileRef.current = null;
                  }}
                >
                  Vazgeç
                </AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  onClick={() => {
                    const f = pendingFileRef.current;
                    pendingFileRef.current = null;
                    setConfirmReplaceOpen(false);
                    if (!f) return;
                    void importFileMutation.mutateAsync({ file: f, mode: "replace" });
                  }}
                >
                  Değiştir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            placeholder="Ara (isim / #hex)"
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && filtered.length > 0) {
                e.preventDefault();
                setFocusedIndex(0);
              }
            }}
          />

          <div className="max-h-[260px] overflow-auto pr-1">
            {isLoading ? (
              <p className="text-xs text-muted-foreground py-2">Yükleniyor…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Sonuç yok.</p>
            ) : (
              <TooltipProvider delayDuration={200}>
                <div ref={gridRef} className="grid grid-cols-12 gap-1.5">
                  {filtered.map((c, idx) => {
                    const active = isMulti ? selectedColorIds.includes(c.id) : selectedColorId === c.id;
                    const isFocused = idx === focusedIndex;
                    return (
                      <Tooltip key={c.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => {
                              if (isMulti) {
                                props.onColorToggle(c.id, c.hex_code);
                              } else {
                                props.onColorSelect(c.id, c.hex_code);
                                setOpen(false);
                              }
                            }}
                            onFocus={() => setFocusedIndex(idx)}
                            aria-label={`${c.name} (${c.hex_code}) seç`}
                            className={cn(
                              "relative h-6 w-6 rounded-full border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              active
                                ? "shadow-[0_0_0_2px_hsl(var(--primary))]"
                                : isFocused
                                  ? "shadow-[0_0_0_2px_hsl(var(--primary)/0.5)]"
                                  : "hover:shadow-[0_0_0_2px_hsl(var(--muted-foreground)/0.35)]",
                            )}
                            style={{ backgroundColor: c.hex_code }}
                          >
                            {active ? (
                              <span className="absolute inset-0 grid place-items-center">
                                <span className="grid h-5 w-5 place-items-center rounded-full bg-background/70 backdrop-blur-sm">
                                  <Check
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      isLightColor(c.hex_code) ? "text-foreground" : "text-background",
                                    )}
                                  />
                                </span>
                              </span>
                            ) : null}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium leading-none">{c.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground leading-none">{c.hex_code}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-sm font-medium">Manuel ekle</p>
            <div className="grid grid-cols-1 gap-2">
              <Input
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                placeholder="#E53935"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="İsim (opsiyonel)"
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handleAdd}
                  disabled={addMutation.isPending}
                  title="Ekle"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Hex formatı: #RRGGBB</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ColorPoolPopover.displayName = "ColorPoolPopover";
