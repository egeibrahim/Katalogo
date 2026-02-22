import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { sanitizeStorageFileName } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ImportFileRow = {
  id: string;
  logical_name: string;
  table_name: string;
  variant: string;
  storage_path: string;
  original_name: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type DbCounts = Record<string, number>;

function parseBool(v: string | null | undefined) {
  return String(v ?? "").toLowerCase() === "true";
}

function parseIntOrNull(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function toNull(v: string | null | undefined) {
  const s = String(v ?? "");
  return s.trim() === "" ? null : s;
}

function parseCsv(text: string, delimiter = ";") {
  // Minimal CSV parser supporting quotes + escaped double quotes.
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === "\r") continue;

    if (ch === delimiter) {
      row.push(cur);
      cur = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cur);
      cur = "";
      // skip empty trailing lines
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    cur += ch;
  }

  // Last line
  if (cur.length || row.length) {
    row.push(cur);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (const r of rows.slice(1)) {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i] ?? "";
    out.push(obj);
  }
  return out;
}

async function fetchCsvObjects(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`CSV not found: ${path}`);
  const text = await res.text();
  return parseCsv(text, ";");
}

function basename(p: string) {
  const s = String(p ?? "");
  const idx = s.lastIndexOf("/");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

function guessLogicalNameFromFilename(filename: string) {
  // Accept:
  // - products-export-2026-01-23_....csv  => products.export.csv
  // - products.export.csv                => products.export.csv
  // - products.csv                       => products.csv
  // - products-2026-01-23.csv            => products.csv
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".csv")) return null;

  if (lower.endsWith(".export.csv")) {
    const table = lower.replace(/\.export\.csv$/, "");
    return { tableName: table, logicalName: `${table}.export.csv`, variant: "export" };
  }

  const mExport = lower.match(/^([a-z0-9_]+)-export-/);
  if (mExport?.[1]) {
    const table = mExport[1];
    return { tableName: table, logicalName: `${table}.export.csv`, variant: "export" };
  }

  const mBase = lower.match(/^([a-z0-9_]+)(?:-|\.)/);
  const table = mBase?.[1] ?? lower.replace(/\.csv$/, "");
  return { tableName: table, logicalName: `${table}.csv`, variant: "csv" };
}

async function fetchOptionalCsvObjects(path: string) {
  try {
    return await fetchCsvObjects(path);
  } catch {
    return [];
  }
}

async function fetchUploadedCsvObjects(logicalName: string) {
  const { data, error } = await supabase
    .from("import_files")
    .select("id, logical_name, storage_path, created_at")
    .eq("logical_name", logicalName)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row?.storage_path) return [];

  const { data: fileData, error: dlErr } = await supabase.storage.from("imports").download(row.storage_path);
  if (dlErr) throw dlErr;
  const text = await fileData.text();
  return parseCsv(text, ";");
}

function dedupeById<T extends { id: string }>(rows: T[]) {
  const m = new Map<string, T>();
  for (const r of rows) {
    if (!r?.id) continue;
    m.set(r.id, r);
  }
  return Array.from(m.values());
}

function dedupeByKey<T>(rows: T[], keyFn: (row: T) => string | null | undefined) {
  const m = new Map<string, T>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    m.set(k, r);
  }
  return Array.from(m.values());
}

async function countTable(table: string) {
  // Some tables don't have an `id` column (e.g. app_settings, product_shipping_overrides).
  const { count, error } = await supabase.from(table as any).select("*", { head: true, count: "exact" });
  if (error) throw error;
  return count ?? 0;
}

async function clearTable(table: string) {
  // PostgREST requires a filter on DELETE. Use a safe timestamp filter that matches all rows.
  const { error } = await supabase
    .from(table as any)
    .delete()
    .gte("created_at", "1970-01-01T00:00:00Z");
  if (error) throw error;
}

async function fetchFirstAvailableCsvObjects(paths: string[]) {
  for (const p of paths) {
    try {
      // Prefer an admin-uploaded file (stored in backend) if it exists.
      // If not, fall back to bundled `/public/import/*`.
      const logicalName = basename(p);
      const uploaded = await fetchUploadedCsvObjects(logicalName);
      if (uploaded.length) return uploaded;

      return await fetchCsvObjects(p);
    } catch {
      // try next
    }
  }
  return [];
}

async function fetchOptionalCsvObjectsWithUploads(path: string) {
  const logicalName = basename(path);
  const uploaded = await fetchUploadedCsvObjects(logicalName);
  if (uploaded.length) return uploaded;
  return await fetchOptionalCsvObjects(path);
}

export default function AdminImport() {
  const qc = useQueryClient();
  const [counts, setCounts] = useState<DbCounts>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<ImportFileRow[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Import options
  // user_roles has a FK to auth users; exports from another environment often fail here.
  const [importUserRoles, setImportUserRoles] = useState(false);
  const [importUserData, setImportUserData] = useState(true);
  const [assignAdminRoleToCurrentUser, setAssignAdminRoleToCurrentUser] = useState(true);

  const [step, setStep] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const tables = useMemo(
    () =>
      [
        "categories",
        "attributes",
        "attribute_values",
        "delivery_regions",
        "design_templates",
        "products",
        "product_attributes",
        "product_colors",
        "product_color_variants",
        "product_details",
        "product_gallery_images",
        "product_mockups",
        "product_page_block_orders",
        "product_shipping_overrides",
        "product_sizes",
        "product_size_variants",
        "product_specs",
        "product_unit_price_tiers",
        "product_views",
        "product_view_color_mockups",
        "saved_designs",
        "profiles",
        "user_roles",
        "app_settings",
      ],
    []
  );

  const clearCatalogData = async () => {
    setIsClearing(true);
    setProgress(0);
    setStep("");
    try {
      // Delete in dependency order (children -> parents)
      const order = [
        "product_view_color_mockups",
        "product_views",
        "product_unit_price_tiers",
        "product_specs",
        "product_size_variants",
        "product_sizes",
        "product_color_variants",
        "product_colors",
        "product_gallery_images",
        "product_details",
        "product_mockups",
        "product_page_block_orders",
        "product_shipping_overrides",
        "product_attributes",
        "products",
        "attribute_values",
        "attributes",
        "categories",
        "delivery_region_shipping_overrides",
        "delivery_regions",
        "design_templates",
        // app_settings intentionally NOT cleared by default
      ] as const;

      for (let i = 0; i < order.length; i++) {
        const t = order[i];
        setStep(`Clearing: ${t}`);
        setProgress(Math.round((i / order.length) * 100));
        await clearTable(t);
      }

      setProgress(100);
      setStep("Cleared");
      toast.success("Catalog tables cleared");
      await refreshCounts();
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.message ?? "Clear failed");
    } finally {
      setIsClearing(false);
    }
  };

  const refreshCounts = async () => {
    setIsLoadingCounts(true);
    try {
      const entries = await Promise.all(tables.map(async (t) => [t, await countTable(t)] as const));
      setCounts(Object.fromEntries(entries));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load table counts");
    } finally {
      setIsLoadingCounts(false);
    }
  };

  useEffect(() => {
    refreshCounts();
    refreshUploadedFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUploadedFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("import_files")
        .select("id, logical_name, table_name, variant, storage_path, original_name, uploaded_by, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setUploadedFiles((data as any) ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load CSV list");
    }
  };

  const handleSelectFiles = (files: FileList | null) => {
    if (!files) {
      setSelectedFiles([]);
      return;
    }
    const arr = Array.from(files);
    if (arr.length > 50) {
      toast.error("You can upload at most 50 files");
      setSelectedFiles(arr.slice(0, 50));
      return;
    }
    setSelectedFiles(arr);
  };

  const uploadSelectedFiles = async () => {
    if (!selectedFiles.length) {
      toast.error("Select a file");
      return;
    }
    if (selectedFiles.length > 50) {
      toast.error("You can upload at most 50 files");
      return;
    }

    setIsUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id ?? null;

      const valid = selectedFiles.filter((f) => f.name.toLowerCase().endsWith(".csv"));
      if (valid.length !== selectedFiles.length) toast.error("Only .csv files can be uploaded (others skipped)");

      for (let i = 0; i < valid.length; i++) {
        const f = valid[i];
        const guess = guessLogicalNameFromFilename(f.name);
        if (!guess) continue;

        // Keep uploads organized by logical name
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const safeOriginal = sanitizeStorageFileName(f.name);
        const storagePath = `${guess.logicalName}/${ts}-${safeOriginal}`;

        const { error: upErr } = await supabase.storage.from("imports").upload(storagePath, f, {
          upsert: true,
          contentType: f.type || "text/csv",
        });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase.from("import_files").insert({
          logical_name: guess.logicalName,
          table_name: guess.tableName,
          variant: guess.variant,
          storage_path: storagePath,
          original_name: f.name,
          uploaded_by: userId,
        } as any);
        if (insErr) throw insErr;
      }

      toast.success("CSV files uploaded");
      setSelectedFiles([]);
      await refreshUploadedFiles();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteUploadedFile = async (row: ImportFileRow) => {
    try {
      const { error: stErr } = await supabase.storage.from("imports").remove([row.storage_path]);
      if (stErr) throw stErr;
      const { error: dbErr } = await supabase.from("import_files").delete().eq("id", row.id);
      if (dbErr) throw dbErr;
      toast.success("Silindi");
      await refreshUploadedFiles();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const importBundledCsv = async () => {
    setIsImporting(true);
    setProgress(0);
    setStep("");

    const { data: userRes } = await supabase.auth.getUser();
    const currentUserId = userRes?.user?.id ?? null;

    const steps: Array<{
      label: string;
      table: string;
      path?: string;
      paths?: string[];
      map: (r: Record<string, string>) => any;
      keyField?: string; // default: id
      onConflict?: string; // default: id
    }> = [
      {
        label: "Categories",
        table: "categories",
        paths: ["/import/categories.export.csv", "/import/categories.csv"],
        map: (r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: toNull(r.description),
          cover_image_url: toNull(r.cover_image_url),
          is_active: parseBool(r.is_active),
          created_at: r.created_at,
          updated_at: r.updated_at,
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
        }),
      },
      {
        label: "Attributes",
        table: "attributes",
        paths: ["/import/attributes.export.csv", "/import/attributes.csv"],
        map: (r) => ({
          id: r.id,
          name: r.name,
          key: r.key,
          type: r.type,
          is_active: parseBool(r.is_active),
          created_at: r.created_at,
          updated_at: r.updated_at,
          category_id: toNull(r.category_id),
        }),
      },
      {
        label: "Attribute Values",
        table: "attribute_values",
        paths: ["/import/attribute_values.export.csv", "/import/attribute_values.csv"],
        map: (r) => ({
          id: r.id,
          attribute_id: r.attribute_id,
          value: r.value,
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
          is_active: parseBool(r.is_active),
          created_at: r.created_at,
        }),
      },

      {
        label: "Delivery Regions",
        table: "delivery_regions",
        paths: ["/import/delivery_regions.export.csv", "/import/delivery_regions.csv"],
        map: (r) => ({
          id: r.id,
          name: r.name,
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
          is_active: parseBool(r.is_active),
          created_at: r.created_at,
          updated_at: r.updated_at,
        }),
      },

      {
        label: "Design Templates",
        table: "design_templates",
        paths: ["/import/design_templates.export.csv", "/import/design_templates.csv"],
        map: (r) => ({
          id: r.id,
          name: r.name,
          category: toNull(r.category),
          image_url: r.image_url,
          thumbnail_url: toNull(r.thumbnail_url),
          is_active: r.is_active === "" ? null : parseBool(r.is_active),
          created_at: r.created_at,
        }),
      },
      {
        label: "Products",
        table: "products",
        paths: ["/import/products.export.csv", "/import/products.csv"],
        map: (r) => ({
          id: r.id,
          name: r.name,
          description: toNull(r.description),
          category: toNull(r.category),
          is_active: parseBool(r.is_active),
          created_at: r.created_at,
          updated_at: r.updated_at,
          source_provider: toNull(r.source_provider),
          source_url: toNull(r.source_url),
          source_handle: toNull(r.source_handle),
          thumbnail_url: toNull(r.thumbnail_url),
          price_from: parseFloatOrNull(r.price_from),
          badge: toNull(r.badge),
          product_code: toNull(r.product_code),
          category_id: toNull(r.category_id),
          slug: toNull(r.slug),
          meta_title: toNull(r.meta_title),
          meta_description: toNull(r.meta_description),
          cover_image_url: toNull(r.cover_image_url),
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
        }),
      },
      {
        label: "Product Attributes",
        table: "product_attributes",
        paths: ["/import/product_attributes.export.csv", "/import/product_attributes.csv"],
        map: (r) => {
          const raw = String(r.data ?? "").trim();
          let data: any = {};
          if (raw) {
            try {
              data = JSON.parse(raw);
            } catch {
              // keep default {}
            }
          }
          return {
            id: r.id,
            product_id: r.product_id,
            data,
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
        },
      },

      {
        label: "Product Colors",
        table: "product_colors",
        paths: ["/import/product_colors.export.csv", "/import/product_colors.csv"],
        map: (r) => ({
          id: r.id,
          name: r.name,
          hex_code: r.hex_code,
          sort_order: parseIntOrNull(r.sort_order),
          is_active: r.is_active === "" ? null : parseBool(r.is_active),
          created_at: r.created_at,
        }),
      },
      {
        label: "Product Color Variants",
        table: "product_color_variants",
        paths: ["/import/product_color_variants.export.csv", "/import/product_color_variants.csv"],
        map: (r) => ({
          id: r.id,
          product_id: r.product_id,
          color_id: r.color_id,
          created_at: r.created_at,
        }),
      },

      {
        label: "Product Details",
        table: "product_details",
        paths: ["/import/product_details.export.csv", "/import/product_details.csv"],
        map: (r) => ({
          id: r.id,
          product_id: r.product_id,
          title: r.title,
          content_type: toNull(r.content_type) ?? "text",
          content: r.content,
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }),
      },

      {
        label: "Product Gallery Images",
        table: "product_gallery_images",
        paths: ["/import/product_gallery_images.export.csv", "/import/product_gallery_images.csv"],
        map: (r) => ({
          id: r.id,
          product_id: r.product_id,
          image_url: r.image_url,
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
          created_at: r.created_at,
        }),
      },
      {
        label: "Product Mockups",
        table: "product_mockups",
        paths: ["/import/product_mockups.export.csv", "/import/product_mockups.csv"],
        map: (r) => ({
          id: r.id,
          product_id: r.product_id,
          front_image_url: toNull(r.front_image_url),
          back_image_url: toNull(r.back_image_url),
          side_image_url: toNull(r.side_image_url),
          print_area_x: parseFloatOrNull(r.print_area_x),
          print_area_y: parseFloatOrNull(r.print_area_y),
          print_area_width: parseFloatOrNull(r.print_area_width),
          print_area_height: parseFloatOrNull(r.print_area_height),
          export_resolution: parseIntOrNull(r.export_resolution),
          created_at: r.created_at,
          updated_at: r.updated_at,
        }),
      },

      {
        label: "Product Page Block Orders",
        table: "product_page_block_orders",
        paths: ["/import/product_page_block_orders.export.csv", "/import/product_page_block_orders.csv"],
        map: (r) => {
          const raw = String(r.block_order ?? "").trim();
          let block_order: any = null;
          if (raw) {
            try {
              block_order = JSON.parse(raw);
            } catch {
              block_order = null;
            }
          }
          return {
            id: r.id,
            product_id: r.product_id,
            block_order: Array.isArray(block_order) ? block_order : undefined,
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
        },
      },

      {
        label: "Product Shipping Overrides",
        table: "product_shipping_overrides",
        paths: ["/import/product_shipping_overrides.export.csv", "/import/product_shipping_overrides.csv"],
        keyField: "product_id",
        onConflict: "product_id",
        map: (r) => ({
          product_id: r.product_id,
          shipping_tip: toNull(r.shipping_tip),
          shipping_method_name: toNull(r.shipping_method_name),
          shipping_method_cost_from_text: toNull(r.shipping_method_cost_from_text),
          shipping_method_additional_item_text: toNull(r.shipping_method_additional_item_text),
          production_time_text: toNull(r.production_time_text),
          shipping_time_text: toNull(r.shipping_time_text),
          total_fulfillment_time_text: toNull(r.total_fulfillment_time_text),
          estimated_delivery_text: toNull(r.estimated_delivery_text),
          shipping_method_time_text: toNull(r.shipping_method_time_text),
          created_at: r.created_at,
          updated_at: r.updated_at,
        }),
      },

      {
        label: "Delivery Region Shipping Overrides",
        table: "delivery_region_shipping_overrides",
        paths: [
          "/import/delivery_region_shipping_overrides.export.csv",
          "/import/delivery_region_shipping_overrides.csv",
        ],
        map: (r) => ({
          id: r.id,
          region_id: r.region_id,
          shipping_tip: toNull(r.shipping_tip),
          shipping_method_name: toNull(r.shipping_method_name),
          shipping_method_time_text: toNull(r.shipping_method_time_text),
          shipping_method_cost_from_text: toNull(r.shipping_method_cost_from_text),
          shipping_method_additional_item_text: toNull(r.shipping_method_additional_item_text),
          production_time_text: toNull(r.production_time_text),
          shipping_time_text: toNull(r.shipping_time_text),
          total_fulfillment_time_text: toNull(r.total_fulfillment_time_text),
          estimated_delivery_text: toNull(r.estimated_delivery_text),
          created_at: r.created_at,
          updated_at: r.updated_at,
        }),
      },

      {
        label: "App Settings",
        table: "app_settings",
        paths: ["/import/app_settings.export.csv"],
        keyField: "key",
        onConflict: "key",
        map: (r) => ({
          key: r.key,
          value: r.value,
          updated_at: r.updated_at,
          created_at: r.created_at,
        }),
      },

      // --- Extra exports (optional files). Missing/empty CSVs are skipped.
      {
        label: "Product Sizes",
        table: "product_sizes",
        paths: ["/import/product_sizes.export.csv", "/import/product_sizes.csv"],
        map: (r) => ({
          id: r.id,
          name: r.name,
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
          is_active: parseBool(r.is_active),
          created_at: r.created_at,
        }),
      },
      {
        label: "Product Size Variants",
        table: "product_size_variants",
        paths: ["/import/product_size_variants.export.csv", "/import/product_size_variants.csv"],
        map: (r) => ({
          id: r.id,
          product_id: r.product_id,
          size_id: r.size_id,
          created_at: r.created_at,
        }),
      },
      {
        label: "Product Specs",
        table: "product_specs",
        paths: ["/import/product_specs.export.csv", "/import/product_specs.csv"],
        map: (r) => {
          const raw = String(r.print_areas ?? "").trim();
          let print_areas: any = null;
          if (raw) {
            try {
              print_areas = JSON.parse(raw);
            } catch {
              print_areas = null;
            }
          }
          return {
            id: r.id,
            product_id: r.product_id,
            sku: toNull(r.sku),
            sizes: toNull(r.sizes),
            technique: toNull(r.technique),
            guideline_url: toNull(r.guideline_url),
            supported_file_types: toNull(r.supported_file_types),
            max_upload_mb: parseIntOrNull(r.max_upload_mb),
            print_dpi: parseIntOrNull(r.print_dpi),
            print_areas,
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
        },
      },
      {
        label: "Unit Price Tiers",
        table: "product_unit_price_tiers",
        paths: ["/import/product_unit_price_tiers.export.csv", "/import/product_unit_price_tiers.csv"],
        map: (r) => ({
          id: r.id,
          product_id: r.product_id,
          min_qty: parseIntOrNull(r.min_qty) ?? 1,
          max_qty: parseIntOrNull(r.max_qty),
          unit_price: parseFloatOrNull(r.unit_price) ?? 0,
          currency: toNull(r.currency) ?? "USD",
          sort_order: parseIntOrNull(r.sort_order) ?? 0,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }),
      },
      {
        label: "Product Views",
        table: "product_views",
        paths: ["/import/product_views.export.csv", "/import/product_views.csv"],
        map: (r) => ({
          id: r.id,
          product_id: r.product_id,
          view_name: r.view_name,
          view_order: parseIntOrNull(r.view_order) ?? 0,
          mockup_image_url: toNull(r.mockup_image_url),
          design_area_top: parseFloatOrNull(r.design_area_top) ?? 0,
          design_area_left: parseFloatOrNull(r.design_area_left) ?? 0,
          design_area_width: parseFloatOrNull(r.design_area_width) ?? 100,
          design_area_height: parseFloatOrNull(r.design_area_height) ?? 100,
          created_at: r.created_at,
        }),
      },
      {
        label: "Product View Color Mockups",
        table: "product_view_color_mockups",
        paths: ["/import/product_view_color_mockups.export.csv", "/import/product_view_color_mockups.csv"],
        map: (r) => ({
          id: r.id,
          product_view_id: r.product_view_id,
          color_id: r.color_id,
          mockup_image_url: r.mockup_image_url,
          created_at: r.created_at,
        }),
      },
      {
        label: "Profiles",
        table: "profiles",
        paths: ["/import/profiles.export.csv", "/import/profiles.csv"],
        map: (r) => ({
          id: r.id,
          user_id: r.user_id,
          full_name: toNull(r.full_name),
          avatar_url: toNull(r.avatar_url),
          created_at: r.created_at,
          updated_at: r.updated_at,
        }),
      },
      {
        label: "User Roles",
        table: "user_roles",
        paths: ["/import/user_roles.export.csv", "/import/user_roles.csv"],
        keyField: "user_id",
        onConflict: "user_id",
        map: (r) => ({
          // Important: user_roles.user_id is a FK to the current project's auth users.
          // Exports from other environments will usually fail. Optionally map admin role to current user.
          user_id:
            assignAdminRoleToCurrentUser && String(r.role).toLowerCase() === "admin" && currentUserId
              ? currentUserId
              : r.user_id,
          role: r.role,
          created_at: r.created_at,
        }),
      },
      {
        label: "Saved Designs",
        table: "saved_designs",
        paths: ["/import/saved_designs.export.csv", "/import/saved_designs.csv"],
        map: (r) => {
          const raw = String(r.design_data ?? "").trim();
          let design_data: any = null;
          if (raw) {
            try {
              design_data = JSON.parse(raw);
            } catch {
              design_data = null;
            }
          }
          return {
            id: r.id,
            user_id: r.user_id,
            product_id: toNull(r.product_id),
            name: r.name,
            design_data: design_data ?? {},
            thumbnail_url: toNull(r.thumbnail_url),
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
        },
      },
    ];

    try {
      if (importUserRoles && assignAdminRoleToCurrentUser && !currentUserId) {
        throw new Error("You must log in before user roles import (current user not found).");
      }

      const effectiveSteps = steps.filter((s) => {
        if (!importUserData && (s.table === "profiles" || s.table === "saved_designs")) return false;
        if (!importUserRoles && s.table === "user_roles") return false;
        return true;
      });

      for (let i = 0; i < effectiveSteps.length; i++) {
        const s = effectiveSteps[i];
        setStep(s.label);
        setProgress(Math.round((i / effectiveSteps.length) * 100));

        const rawPrimary = s.paths?.length
          ? await fetchFirstAvailableCsvObjects(s.paths)
          : await fetchOptionalCsvObjectsWithUploads(s.path ?? "");

        const keyField = s.keyField ?? "id";
        const onConflict = s.onConflict ?? "id";
        const mapped = rawPrimary.map(s.map);

        const payload =
          keyField === "id"
            ? dedupeById(mapped.filter((x) => x?.id))
            : dedupeByKey(mapped, (x) => x?.[keyField]);
        if (payload.length === 0) continue;

        const { error } = await supabase.from(s.table as any).upsert(payload as any, { onConflict });
        if (error) {
          // Common case: user_roles export from another environment references users that don't exist here.
          if (
            s.table === "user_roles" &&
            String(error.message ?? "").toLowerCase().includes("foreign key constraint")
          ) {
            throw new Error(
              "user_roles import failed: user_id from export does not exist in this project (export from different environment). Solution: Disable User Roles import or create the user here first."
            );
          }
          throw error;
        }
      }

      setProgress(100);
      setStep("Done");
      toast.success("Import completed");
      await refreshCounts();

      // Refresh admin pages that rely on these tables
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Import Data</CardTitle>
            <p className="text-sm text-muted-foreground">
              Load catalog tables from bundled CSV files (URLs are kept as-is).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refreshCounts} disabled={isLoadingCounts || isImporting}>
              Refresh counts
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isImporting || isClearing}>
                  {isClearing ? "Clearing…" : "Clear catalog tables"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset catalog data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete catalog-related tables (products, categories, attributes, mockups, shipping, etc.) from the DB.
                    User accounts and roles are not affected. You can then import again with "Import bundled CSV".</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction disabled={isClearing} onClick={clearCatalogData}>
                    Yes, clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={importBundledCsv} disabled={isImporting}>
              {isImporting ? "Importing…" : "Import bundled CSV"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">Upload CSV files here</div>
                <div className="text-xs text-muted-foreground">
                  Maximum 50 files. During import, files uploaded here are used first (if any).
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  onChange={(e) => handleSelectFiles(e.target.files)}
                />
                <Button variant="secondary" onClick={uploadSelectedFiles} disabled={isUploading || selectedFiles.length === 0}>
                  {isUploading ? "Uploading…" : `Upload (${selectedFiles.length}/50)`}
                </Button>
              </div>
            </div>

            {uploadedFiles.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Uploaded files (last 200)</div>
                <div className="flex flex-col gap-2">
                  {uploadedFiles.map((f) => (
                    <div key={f.id} className="flex flex-col gap-1 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.logical_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {f.original_name ?? "—"} • {new Date(f.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => deleteUploadedFile(f)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No CSV files uploaded yet.</div>
            )}
          </div>

          <div className="rounded-md border p-4 space-y-2">
            <div className="font-medium">Import options</div>
            <div className="flex items-center gap-2">
              <Checkbox checked={importUserData} onCheckedChange={(v) => setImportUserData(v === true)} id="import-user-data" />
              <Label htmlFor="import-user-data" className="text-sm">
                Import user data (profiles, saved_designs)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={importUserRoles} onCheckedChange={(v) => setImportUserRoles(v === true)} id="import-user-roles" />
              <Label htmlFor="import-user-roles" className="text-sm">
                Import user roles (often causes FK error when exporting from different environment)
              </Label>
            </div>
            {importUserRoles ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={assignAdminRoleToCurrentUser}
                  onCheckedChange={(v) => setAssignAdminRoleToCurrentUser(v === true)}
                  id="assign-admin-role"
                />
                <Label htmlFor="assign-admin-role" className="text-sm">
                  Assign to current admin user (map role=admin rows to current user)
                </Label>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border p-4">
            <div className="flex flex-wrap gap-2">
              {tables.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}: {counts[t] ?? 0}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Step</span>
              <span className="font-medium">{step || "—"}</span>
            </div>
            <Progress value={progress} />
          </div>

          <p className="text-xs text-muted-foreground">
            Note: This operation updates/adds existing records by <span className="font-medium">id</span> (idempotent).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
