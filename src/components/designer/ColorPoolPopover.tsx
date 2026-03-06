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
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/locales";

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

/** Hex kodu girildiğinde isim boş bırakılırsa, seçilen dile göre varsayılan renk adı kullanılır. */
const HEX_DEFAULT_NAMES: Record<string, { tr: string; en: string }> = {
  "#000000": { tr: "Siyah", en: "Black" },
  "#FFFFFF": { tr: "Beyaz", en: "White" },
  "#F44336": { tr: "Kırmızı", en: "Red" },
  "#E53935": { tr: "Kırmızı", en: "Red" },
  "#FF0000": { tr: "Kırmızı", en: "Red" },
  "#2196F3": { tr: "Mavi", en: "Blue" },
  "#1E88E5": { tr: "Mavi", en: "Blue" },
  "#0000FF": { tr: "Mavi", en: "Blue" },
  "#0D47A1": { tr: "Lacivert", en: "Navy" },
  "#4CAF50": { tr: "Yeşil", en: "Green" },
  "#2E7D32": { tr: "Yeşil", en: "Green" },
  "#FFEB3B": { tr: "Sarı", en: "Yellow" },
  "#FDD835": { tr: "Sarı", en: "Yellow" },
  "#FF9800": { tr: "Turuncu", en: "Orange" },
  "#EF6C00": { tr: "Turuncu", en: "Orange" },
  "#9C27B0": { tr: "Mor", en: "Purple" },
  "#673AB7": { tr: "Mor", en: "Purple" },
  "#E91E63": { tr: "Pembe", en: "Pink" },
  "#9E9E9E": { tr: "Gri", en: "Gray" },
  "#757575": { tr: "Gri", en: "Gray" },
  "#795548": { tr: "Kahverengi", en: "Brown" },
  "#00BCD4": { tr: "Turkuaz", en: "Cyan" },
  "#009688": { tr: "Turkuaz", en: "Teal" },
  "#F5F5DC": { tr: "Bej", en: "Beige" },
  "#800020": { tr: "Bordo", en: "Burgundy" },
};

/**
 * TÜM İngilizce renk adları → tam Türkçe karşılıkları.
 * Her renk kendi tam adıyla çevrilir; "mavi" gibi tek kelimeye indirgenmez.
 * Uzun ifadeler önce. Arama ve TR gösterimde kullanılır.
 */
const COLOR_NAME_TO_TR: [string, string][] = [
  // Mavi tonları – her biri tam Türkçe ad
  ["air force blue", "hava kuvvetleri mavisi"],
  ["midnight blue", "gece mavisi"],
  ["navy blue", "lacivert"],
  ["sapphire blue", "safir mavisi"],
  ["cobalt blue", "kobalt mavisi"],
  ["royal blue", "kraliyet mavisi"],
  ["steel blue", "çelik mavisi"],
  ["powder blue", "pudra mavisi"],
  ["baby blue", "bebek mavisi"],
  ["dark blue", "koyu mavi"],
  ["light blue", "açık mavi"],
  ["sky blue", "gök mavisi"],
  ["azure", "azur mavisi"],
  ["navy", "lacivert"],
  ["cobalt", "kobalt mavisi"],
  ["sapphire", "safir"],
  ["denim", "kot mavisi"],
  ["blue", "mavi"],
  // Kırmızı tonları
  ["dark red", "koyu kırmızı"],
  ["light red", "açık kırmızı"],
  ["crimson", "al"],
  ["scarlet", "kıpkırmızı"],
  ["cherry red", "kiraz kırmızısı"],
  ["cherry", "kiraz rengi"],
  ["wine", "şarap rengi"],
  ["burgundy", "bordo"],
  ["maroon", "bordo"],
  ["red", "kırmızı"],
  ["ruby", "yakut"],
  // Yeşil tonları
  ["forest green", "orman yeşili"],
  ["army green", "askeri yeşil"],
  ["olive green", "zeytin yeşili"],
  ["lime green", "limon yeşili"],
  ["mint green", "nane yeşili"],
  ["hunter green", "avcı yeşili"],
  ["kelly green", "parlak yeşil"],
  ["sage green", "adaçayı yeşili"],
  ["light green", "açık yeşil"],
  ["dark green", "koyu yeşil"],
  ["green", "yeşil"],
  ["emerald", "zümrüt yeşili"],
  ["jade", "yeşim taşı"],
  ["moss", "yosun yeşili"],
  ["fern", "eğrelti otu yeşili"],
  ["sage", "adaçayı yeşili"],
  ["seafoam", "deniz köpüğü yeşili"],
  ["spearmint", "nane yeşili"],
  ["mint", "nane yeşili"],
  ["olive", "zeytin yeşili"],
  ["hunter", "avcı yeşili"],
  ["kelly", "parlak yeşil"],
  ["army", "askeri yeşil"],
  // Sarı / turuncu tonları
  ["rose gold", "gül altını"],
  ["golden", "altın rengi"],
  ["gold", "altın"],
  ["mustard", "hardal sarısı"],
  ["honey", "bal rengi"],
  ["lemon", "limon sarısı"],
  ["tangerine", "mandalina turuncusu"],
  ["dark orange", "koyu turuncu"],
  ["light orange", "açık turuncu"],
  ["orange", "turuncu"],
  ["amber", "kehribar"],
  ["yellow", "sarı"],
  ["apricot", "kayısı rengi"],
  // Mor / pembe tonları
  ["eggplant", "patlıcan moru"],
  ["lavender", "lavanta"],
  ["lilac", "leylak"],
  ["violet", "menekşe"],
  ["plum", "erik moru"],
  ["mauve", "eflatun"],
  ["purple", "mor"],
  ["indigo", "çivit mavisi"],
  ["grape", "üzüm moru"],
  ["hot pink", "sıcak pembe"],
  ["light pink", "açık pembe"],
  ["blush", "allık"],
  ["rose", "gül kurusu"],
  ["pink", "pembe"],
  ["magenta", "magenta"],
  ["coral", "mercan rengi"],
  ["salmon", "somon rengi"],
  ["peach", "şeftali rengi"],
  ["berry", "çilek rengi"],
  // Gri / nötr tonları
  ["charcoal gray", "kömür grisi"],
  ["charcoal", "kömür grisi"],
  ["slate gray", "arduvaz grisi"],
  ["slate", "arduvaz grisi"],
  ["graphite", "grafit grisi"],
  ["gunmetal", "silah metali grisi"],
  ["dark gray", "koyu gri"],
  ["light gray", "açık gri"],
  ["gray", "gri"],
  ["grey", "gri"],
  ["silver", "gümüş"],
  ["pearl", "inci rengi"],
  ["ash", "kül grisi"],
  ["smoke", "duman grisi"],
  ["stone", "taş grisi"],
  ["concrete", "beton grisi"],
  ["heather", "pamuklu gri"],
  // Kahverengi / toprak tonları
  ["espresso", "espresso kahverengisi"],
  ["chocolate", "çikolata kahverengisi"],
  ["dark brown", "koyu kahverengi"],
  ["light brown", "açık kahverengi"],
  ["brown", "kahverengi"],
  ["mocha", "mocha kahverengisi"],
  ["caramel", "karamel"],
  ["terracotta", "terracotta"],
  ["clay", "kil rengi"],
  ["tan", "buğday rengi"],
  ["sand", "kum rengi"],
  ["oatmeal", "yulaf rengi"],
  ["beige", "bej"],
  ["cream", "krem"],
  ["ivory", "fildişi"],
  ["champagne", "şampanya"],
  ["rust", "pas rengi"],
  ["bronze", "bronz"],
  ["copper", "bakır rengi"],
  // Turkuaz / camgöbeği
  ["turquoise", "turkuaz"],
  ["teal", "petrol mavisi"],
  ["cyan", "camgöbeği"],
  ["aqua", "su mavisi"],
  // Siyah / beyaz
  ["black", "siyah"],
  ["white", "beyaz"],
  ["snow", "kar beyazı"],
  ["ice", "buz"],
  ["frost", "buz"],
  ["ink", "mürekkep"],
  ["midnight", "gece mavisi"],
  // Diğer
  ["khaki", "haki"],
  ["antique", "antika"],
  ["neon", "neon"],
  ["pastel", "pastel"],
  ["fluorescent", "floresan"],
  ["bright", "parlak"],
  ["electric", "elektrik mavisi"],
];

/** Uzun eşleşme önce: en uzun en başta. */
const COLOR_SEARCH_SYNONYMS_SORTED = [...COLOR_NAME_TO_TR].sort((a, b) => b[0].length - a[0].length);

/** Renk adına göre TR aramada kullanılacak Türkçe terimleri döndürür. */
function getTurkishSearchTerms(colorName: string): string {
  const n = colorName.toLocaleLowerCase("tr");
  const terms: string[] = [];
  for (const [en, tr] of COLOR_NAME_TO_TR) {
    if (n.includes(en)) terms.push(tr);
  }
  return terms.join(" ");
}

/** TR dilinde gösterim için orijinal Türkçe adı döndürür; yoksa orijinal adı verir. */
function getColorDisplayName(name: string, hexCode: string, locale: string): string {
  if (locale !== "tr") return name;
  const hex = normalizeHex(hexCode);
  const trFromHex = HEX_DEFAULT_NAMES[hex]?.tr;
  if (trFromHex) return trFromHex;
  const n = name.toLocaleLowerCase("tr");
  for (const [en, tr] of COLOR_SEARCH_SYNONYMS_SORTED) {
    if (n.includes(en)) return tr;
  }
  return name;
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
  const { t, locale } = useI18n();
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
    return colors.filter((c) => {
      const nameLower = c.name.toLocaleLowerCase("tr");
      if (nameLower.includes(q)) return true;
      if (c.hex_code.toLowerCase().includes(q)) return true;
      if (locale === "tr") {
        const hex = normalizeHex(c.hex_code);
        const trFromHex = HEX_DEFAULT_NAMES[hex]?.tr ?? "";
        const trFromName = getTurkishSearchTerms(c.name);
        const searchableTr = `${trFromHex} ${trFromName}`.trim().toLocaleLowerCase("tr");
        if (searchableTr && searchableTr.includes(q)) return true;
      }
      return false;
    });
  }, [colors, query, locale]);

  const displayOrder = filtered;

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

      const defaultNames = HEX_DEFAULT_NAMES[normalized];
      const nameByLocale = defaultNames?.[locale as Locale];
      const name = newName.trim() || nameByLocale || normalized;

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

      if (res.mode === "inserted") toast.success(t("colorPool.added"));
      else toast.message(t("colorPool.selectExisting"));
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : t("colorPool.addError");
      toast.error(msg);
    },
  });

  const handleAdd = () => {
    void addMutation.mutateAsync();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const cols = 12;
    const totalColors = displayOrder.length;

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
      const color = displayOrder[focusedIndex];
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
          title={t("colorPool.title")}
          aria-label={t("colorPool.title")}
        >
          <Pipette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="bottom" collisionPadding={12} className="w-[400px] p-3" onKeyDown={handleKeyDown}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("colorPool.title")}</p>
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
                    title={t("colorPool.replaceByCsv")}
                  >
                    {importFileMutation.isPending ? t("colorPool.loading") : t("colorPool.replaceByCsv")}
                  </Button>
                </div>
              ) : null}
              <span className="text-xs text-muted-foreground">{t("colorPool.colorCount", { count: String(colors.length) })}</span>
            </div>
          </div>

          <AlertDialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("colorPool.replaceConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("colorPool.replaceConfirmDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  type="button"
                  onClick={() => {
                    pendingFileRef.current = null;
                  }}
                >
                  {t("colorPool.cancel")}
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
                  {t("colorPool.confirm")}
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
            placeholder={t("colorPool.searchPlaceholder")}
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && displayOrder.length > 0) {
                e.preventDefault();
                setFocusedIndex(0);
              }
            }}
          />

          <div className="max-h-[260px] overflow-auto pr-1">
            {isLoading ? (
              <p className="text-xs text-muted-foreground py-2">{t("colorPool.loading")}</p>
            ) : displayOrder.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">{t("colorPool.noResults")}</p>
            ) : (
              <TooltipProvider delayDuration={200}>
                <div ref={gridRef} className="grid grid-cols-12 gap-1.5">
                  {displayOrder.map((c, idx) => {
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
                            aria-label={t("colorPool.ariaSelect", { name: getColorDisplayName(c.name, c.hex_code, locale), hex: c.hex_code })}
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
                          <p className="font-medium leading-none">{getColorDisplayName(c.name, c.hex_code, locale)}</p>
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
            <p className="text-sm font-medium">{t("colorPool.addManually")}</p>
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
                  placeholder={locale === "tr" ? t("colorPool.namePlaceholderTr") : t("colorPool.namePlaceholderEn")}
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
            <p className="text-xs text-muted-foreground">{t("colorPool.hexFormat")}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ColorPoolPopover.displayName = "ColorPoolPopover";
