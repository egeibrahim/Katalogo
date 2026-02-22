const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LABELS = [
  "Region",
  "Fulfillment from",
  "Size",
  "Color",
  "Fit",
  "Print Areas",
  "Thickness",
  "Fabric Weight",
  "Technique",
  "Material",
  "Sleeve Style",
  "Neckline",
  "Style",
  "Elements",
] as const;

const SECTION_ID_CANDIDATES = [
  // common Shopify OS2.0 section ids
  "main-collection-filters",
  "main-collection-product-grid",
  "collection-template",
  "collection-filters",
  "main",
];

function isNoise(line: string) {
  const v = line.trim();
  if (!v) return true;
  if (v === "NEW") return true;
  if (/^\d+$/.test(v)) return true;
  return false;
}

function extractFromText(text: string) {
  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const labelSet = new Set<string>(LABELS);
  const out: Record<string, string[]> = {};
  for (const label of LABELS) out[label] = [];

  let current: string | null = null;
  for (const line of lines) {
    if (labelSet.has(line)) {
      current = line;
      continue;
    }
    if (!current) continue;
    if (labelSet.has(line)) {
      current = line;
      continue;
    }
    if (isNoise(line)) continue;

    // Heuristic: options on Tapstitch appear as single words/phrases; ignore obvious nav/footer terms
    if (line.length > 60) continue;
    if (["Deliver to", "Fulfillment", "Add filter"].includes(line)) continue;

    const arr = out[current] ?? (out[current] = []);
    if (!arr.includes(line)) arr.push(line);
  }

  return out;
}

function decodeBasicEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string) {
  return decodeBasicEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeLabel(s: string) {
  return stripTags(s).toLowerCase();
}

/**
 * Shopify collection facets are usually rendered server-side inside <details> blocks.
 * We parse groups by <details> -> <summary> title, then collect option labels within.
 */
function extractShopifyFacets(html: string) {
  const out: Record<string, string[]> = {};
  for (const label of LABELS) out[label] = [];

  const labelByNorm = new Map<string, (typeof LABELS)[number]>();
  for (const l of LABELS) labelByNorm.set(l.toLowerCase(), l);

  // Very tolerant parsing: split on <details ...> ... </details>
  const detailsMatches = html.match(/<details[\s\S]*?<\/details>/gi) ?? [];
  for (const block of detailsMatches) {
    const summary = block.match(/<summary[\s\S]*?<\/summary>/i)?.[0];
    if (!summary) continue;
    const groupRaw = stripTags(summary);
    if (!groupRaw) continue;

    // Map group title to one of our labels (exact or loose)
    const groupNorm = groupRaw.toLowerCase();
    const mapped =
      labelByNorm.get(groupNorm) ||
      (Array.from(labelByNorm.entries()).find(([k]) => groupNorm.includes(k))?.[1] as (typeof LABELS)[number] | undefined);
    if (!mapped) continue;

    // Option texts often appear in spans like facet-checkbox__text or label content
    const optionTextMatches = [
      ...(block.match(/facet-checkbox__text[\s\S]*?<\/span>/gi) ?? []),
      ...(block.match(/<label[\s\S]*?<\/label>/gi) ?? []),
      ...(block.match(/<option[\s\S]*?<\/option>/gi) ?? []),
    ];

    const values = new Set<string>();
    for (const m of optionTextMatches) {
      const t = stripTags(m);
      if (!t) continue;
      // ignore group title repeats
      if (normalizeLabel(t) === normalizeLabel(groupRaw)) continue;
      // ignore counts like "Red (12)"
      const cleaned = t.replace(/\(\s*\d+\s*\)$/g, "").trim();
      if (!cleaned) continue;
      if (cleaned.length > 60) continue;
      if (isNoise(cleaned)) continue;
      values.add(cleaned);
    }

    out[mapped] = Array.from(values);
  }

  return out;
}

async function fetchFacetHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LovableCloudBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Upstream request failed (${res.status})`);
  return await res.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json().catch(() => ({ url: "https://www.tapstitch.com/collections/all" }));
    const targetUrl = typeof url === "string" && url.trim() ? url.trim() : "https://www.tapstitch.com/collections/all";

    // 1) Try Shopify section rendering (most reliable for facets)
    let html: string | null = null;
    let best = "";
    for (const sid of SECTION_ID_CANDIDATES) {
      const u = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}section_id=${encodeURIComponent(sid)}`;
      try {
        const candidate = await fetchFacetHtml(u);
        // Heuristic: prefer responses that look like facets HTML
        const score = (candidate.match(/facet|filter|<details/gi) ?? []).length;
        if (score > best.length) {
          best = candidate;
          html = candidate;
        }
      } catch {
        // ignore and continue
      }
    }

    // fallback to direct page
    if (!html) html = await fetchFacetHtml(targetUrl);

    // 2) Parse facets
    let data = extractShopifyFacets(html);

    // 3) Fallback to previous plaintext heuristic if facets parsing yields nothing
    const anyValues = Object.values(data).some((arr) => arr.length > 0);
    if (!anyValues) {
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "\n")
        .replace(/<style[\s\S]*?<\/style>/gi, "\n")
        .replace(/<[^>]+>/g, "\n")
        .replace(/&nbsp;/g, " ");
      data = extractFromText(text);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
