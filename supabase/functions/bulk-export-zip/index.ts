import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { zipSync, strToU8 } from "https://esm.sh/fflate@0.8.2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  tables: string[];
  format?: "csv";
  delimiter?: "," | ";";
  includeHeaders?: boolean;
  fileNamePrefix?: string;
};

// Keep this list in sync with the Admin UI.
const ALLOWED_TABLES = new Set<string>([
  // Catalog
  "categories",
  "attributes",
  "attribute_values",
  "products",
  "product_attributes",
  "product_colors",
  "product_color_variants",
  "product_sizes",
  "product_size_variants",
  "product_specs",
  "product_unit_price_tiers",
  "product_views",
  "product_view_color_mockups",
  "product_details",
  "product_gallery_images",
  "product_mockups",
  "product_page_block_orders",
  "product_shipping_overrides",
  "delivery_regions",
  "delivery_region_shipping_overrides",
  "design_templates",
  "tapstitch_collections",
  "tapstitch_collection_products",
  "catalogs",
  "catalog_products",

  // Users
  "profiles",
  "user_roles",
  "user_memberships",
  "saved_designs",
  "user_uploads",
  "user_folders",
  "user_usage_daily",

  // Settings / Ops
  "app_settings",
  "import_files",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeCsvCell(value: unknown, delimiter: string) {
  if (value === null || value === undefined) return "";

  let s = "";
  if (typeof value === "string") s = value;
  else if (typeof value === "number" || typeof value === "boolean") s = String(value);
  else s = JSON.stringify(value);

  const needsQuotes = s.includes(delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r");
  if (!needsQuotes) return s;

  const escaped = s.replaceAll('"', '""');
  return `"${escaped}"`;
}

function rowsToCsv(
  rows: Array<Record<string, unknown>>,
  delimiter: string,
  includeHeaders: boolean
) {
  if (!rows.length) return { csv: "", headers: [] as string[] };
  const headers = Object.keys(rows[0]);

  const lines: string[] = [];
  if (includeHeaders) lines.push(headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter));

  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h], delimiter)).join(delimiter));
  }

  return { csv: lines.join("\n") + "\n", headers };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ ok: false, error: "missing_backend_env" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await authedClient.auth.getUser();
    if (userError || !userData?.user) return json({ ok: false, error: "unauthorized" }, 401);

    const callerId = userData.user.id;
    const { data: roleRow, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) return json({ ok: false, error: "role_check_failed" }, 500);
    if (!roleRow) return json({ ok: false, error: "forbidden" }, 403);

    const body = (await req.json().catch(() => null)) as Body | null;
    const tables = Array.isArray(body?.tables) ? body!.tables : [];
    const format = body?.format ?? "csv";
    const delimiter = body?.delimiter ?? ",";
    const includeHeaders = body?.includeHeaders ?? true;
    const fileNamePrefix = (body?.fileNamePrefix ?? "export").trim() || "export";

    if (format !== "csv") return json({ ok: false, error: "unsupported_format" }, 400);
    if (delimiter !== "," && delimiter !== ";") return json({ ok: false, error: "invalid_delimiter" }, 400);
    if (!tables.length) return json({ ok: false, error: "no_tables" }, 400);

    for (const t of tables) {
      if (!ALLOWED_TABLES.has(t)) return json({ ok: false, error: `table_not_allowed:${t}` }, 400);
    }

    const chunkSize = 1000;
    const files: Record<string, Uint8Array> = {};

    for (const table of tables) {
      let offset = 0;
      let headerKeys: string[] | null = null;
      let csv = "";

      while (true) {
        const { data, error } = await adminClient
          .from(table)
          .select("*")
          .range(offset, offset + chunkSize - 1);

        if (error) {
          return json({ ok: false, error: `select_failed:${table}`, details: error.message }, 500);
        }

        const rows = (data ?? []) as Array<Record<string, unknown>>;
        if (!rows.length) break;

        if (!headerKeys) {
          headerKeys = Object.keys(rows[0]);
          if (includeHeaders && headerKeys.length) {
            csv += headerKeys.map((h) => escapeCsvCell(h, delimiter)).join(delimiter) + "\n";
          }
        }

        const keys = headerKeys ?? Object.keys(rows[0]);
        for (const row of rows) {
          csv += keys.map((k) => escapeCsvCell(row[k], delimiter)).join(delimiter) + "\n";
        }

        if (rows.length < chunkSize) break;
        offset += chunkSize;
      }

      // If table is empty, export an empty file (still included in zip)
      files[`${table}.csv`] = strToU8(csv);
    }

    const zipBytes = zipSync(files, { level: 6 });
    const zipArrayBuffer = zipBytes.buffer.slice(
      zipBytes.byteOffset,
      zipBytes.byteOffset + zipBytes.byteLength
    ) as ArrayBuffer;
    const zipBlob = new Blob([zipArrayBuffer], { type: "application/zip" });

    const iso = new Date().toISOString().replaceAll(":", "-");
    const path = `exports/${iso}/${fileNamePrefix}.zip`;

    const { error: uploadError } = await adminClient.storage
      .from("imports")
      .upload(path, zipBlob, { contentType: "application/zip", upsert: true });
    if (uploadError) return json({ ok: false, error: "upload_failed", details: uploadError.message }, 500);

    const expiresInSeconds = 60 * 10;
    const { data: signed, error: signedError } = await adminClient.storage
      .from("imports")
      .createSignedUrl(path, expiresInSeconds);

    if (signedError || !signed?.signedUrl) {
      return json({ ok: false, error: "signed_url_failed", details: signedError?.message }, 500);
    }

    return json({
      ok: true,
      path,
      signedUrl: signed.signedUrl,
      expiresInSeconds,
      tablesCount: tables.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "unexpected_error" }, 500);
  }
});
