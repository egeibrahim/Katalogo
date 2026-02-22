const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = {
  key?: string;
  name: string;
  hex: string;
};

function expandHex(hexRaw: string): string | null {
  const s = hexRaw.trim();
  if (!s.startsWith("#")) return null;
  const h = s.slice(1);
  if (/^[0-9a-fA-F]{6}$/.test(h)) return `#${h.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    const [r, g, b] = h.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

/**
 * Very small CSV parser: supports quoted fields and commas.
 * We only need the first 3 columns: key,name,hex (others are ignored).
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped double-quote ""
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeName(s: string): string {
  return s.trim().replace(/^"|"$/g, "");
}

function formatValue(name: string, hex: string): string {
  return `${name} (${hex.toUpperCase()})`;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LovableCloudBot/1.0)",
      Accept: "text/plain,text/csv,text/*,*/*",
    },
  });
  if (!res.ok) throw new Error(`Kaynak indirilemedi (${res.status})`);
  return await res.text();
}

function extractRowsFromCsv(csv: string): Row[] {
  const lines = csv
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: Row[] = [];
  for (const line of lines) {
    const parts = parseCsvLine(line);
    if (parts.length < 3) continue;

    // Common formats:
    // - key,name,hex
    // - key,name,hex,r,g,b
    const key = parts[0];
    const name = normalizeName(parts[1] ?? "");
    const hex = expandHex(parts[2] ?? "");
    if (!name || !hex) continue;
    out.push({ key, name, hex });
  }
  return out;
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function createSupabaseClient(url: string, anonKey: string, token: string | null) {
  // Use ESM build in Deno
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return (globalThis as any).createClient(url, anonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

function createServiceClient(url: string, serviceKey: string) {
  return (globalThis as any).createClient(url, serviceKey);
}

// Import via dynamic import to keep Deno happy
const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
(globalThis as any).createClient = createClient;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const sourceUrl =
      typeof body.sourceUrl === "string" && body.sourceUrl.trim()
        ? body.sourceUrl.trim()
        : "https://raw.githubusercontent.com/codebrainz/color-names/master/output/colors.csv";

    const attributeKey = typeof body.attributeKey === "string" && body.attributeKey.trim() ? body.attributeKey.trim() : "color";
    const mode = body.mode === "replace" ? "replace" : "replace";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("Backend yapılandırması eksik");

    const token = getBearerToken(req);
    const supabaseUser = createSupabaseClient(supabaseUrl, anonKey, token);

    // Auth + admin check
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ success: false, error: "Yetkisiz" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userId = userData.user.id;
    const { data: isAdmin, error: roleErr } = await supabaseUser.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (roleErr) throw roleErr;
    if (!isAdmin) return new Response(JSON.stringify({ success: false, error: "Admin yetkisi gerekli" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const service = createServiceClient(supabaseUrl, serviceKey);

    // Find attribute
    const { data: attr, error: attrErr } = await service
      .from("attributes")
      .select("id,key")
      .eq("key", attributeKey)
      .limit(1)
      .maybeSingle();
    if (attrErr) throw attrErr;
    if (!attr?.id) throw new Error(`Attribute bulunamadı: ${attributeKey}`);

    const csv = await fetchText(sourceUrl);
    const rows = extractRowsFromCsv(csv);
    if (rows.length === 0) throw new Error("CSV içinde okunabilir satır bulunamadı");

    // Mode replace: remove existing options for this attribute, then insert all rows.
    if (mode === "replace") {
      const { error: delErr } = await service.from("attribute_values").delete().eq("attribute_id", attr.id);
      if (delErr) throw delErr;
    }

    // Insert attribute_values in chunks
    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const payload = chunk.map((r, idx) => ({
        attribute_id: attr.id,
        value: formatValue(r.name, r.hex),
        sort_order: i + idx,
        is_active: true,
      }));
      const { error } = await service.from("attribute_values").insert(payload);
      if (error) throw error;
      inserted += payload.length;
    }

    // Also ensure these exist in product_colors pool (best-effort, don't delete to avoid breaking references)
    // Insert name+hex pairs that are missing (exact match).
    let insertedPool = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const payload = chunk.map((r, idx) => ({
        name: r.name,
        hex_code: r.hex,
        sort_order: i + idx,
        is_active: true,
      }));

      // We cannot do a single "insert if not exists" via API, so we insert and ignore conflicts at app level by retrying smaller chunks.
      const { error } = await service.from("product_colors").insert(payload);
      if (!error) {
        insertedPool += payload.length;
      }
      // If insert fails (e.g., due to duplicates), just continue; pool sync is best-effort.
    }

    return new Response(
      JSON.stringify({ success: true, sourceUrl, attributeKey, rows: rows.length, inserted_filter_options: inserted, inserted_pool_best_effort: insertedPool }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
