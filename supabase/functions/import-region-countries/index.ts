// Lovable Cloud backend function: import ISO 3166-1 countries into attributes/attribute_values for `attributes.key = 'region'`.
// - Requires an authenticated admin user.
// - Fetches a CSV (default is lukes/ISO-3166...) and inserts rows as: "Country Name (ALPHA2)".

import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImportResult = {
  sourceUrl: string;
  attributeKey: string;
  attributeId: string;
  deleted: number;
  inserted: number;
  skipped: number;
};

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.*)$/i);
  return m?.[1] ?? null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeAlpha2(s: string): string | null {
  const t = s.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(t)) return null;
  return t;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

async function createSupabaseClient(url: string, anonKey: string, token: string | null) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  return createClient(url, anonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Missing backend env");

    const token = getBearerToken(req);
    const supabase = await createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, token);

    // AuthZ: admin only
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr) throw roleErr;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const sourceUrl =
      typeof body?.sourceUrl === "string" && body.sourceUrl.trim()
        ? body.sourceUrl.trim()
        : "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv";

    const attributeKey = "region";

    const { data: attr, error: attrErr } = await supabase
      .from("attributes")
      .select("id,key")
      .eq("key", attributeKey)
      .maybeSingle();
    if (attrErr) throw attrErr;
    if (!attr?.id) throw new Error(`Attribute not found: key='${attributeKey}'`);

    const csv = await fetchText(sourceUrl);
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // Expected header: name,alpha-2,alpha-3,...
    const header = parseCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
    const nameIdx = header.indexOf("name");
    const alpha2Idx = header.indexOf("alpha-2");
    if (nameIdx === -1 || alpha2Idx === -1) throw new Error("Unexpected CSV header; need columns: name, alpha-2");

    // 1) Delete existing region values to avoid duplicates (hard replace)
    const { error: delErr, count: deletedCount } = await supabase
      .from("attribute_values")
      .delete({ count: "exact" })
      .eq("attribute_id", attr.id);
    if (delErr) throw delErr;

    // 2) Insert new values in chunks
    const toInsert: { attribute_id: string; value: string; sort_order: number; is_active: boolean }[] = [];
    let skipped = 0;
    let order = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i] ?? "");
      const name = String(cols[nameIdx] ?? "").trim();
      const a2 = normalizeAlpha2(String(cols[alpha2Idx] ?? ""));
      if (!name || !a2) {
        skipped++;
        continue;
      }
      order += 10;
      toInsert.push({
        attribute_id: attr.id,
        value: `${name} (${a2})`,
        sort_order: order,
        is_active: true,
      });
    }

    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error: insErr } = await supabase.from("attribute_values").insert(chunk);
      if (insErr) throw insErr;
      inserted += chunk.length;
    }

    const result: ImportResult = {
      sourceUrl,
      attributeKey,
      attributeId: attr.id,
      deleted: deletedCount ?? 0,
      inserted,
      skipped,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Supabase errors are often plain objects, not Error instances.
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String((e as any).message)
          : typeof e === "object"
            ? JSON.stringify(e)
            : String(e);
    console.error("import-region-countries error:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
