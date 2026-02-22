import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProductDetails } from "@/hooks/useProductDetails";
import { sanitizeRichHtml } from "@/lib/sanitizeHtml";

type CanonicalSection = "details" | "features" | "care" | "fabric" | "other";

const SECTION_ORDER: CanonicalSection[] = ["details", "features", "care", "fabric", "other"];

/** Attrs from admin edits (product_attributes.data) to build Details/Features/Care/Fabric on the view */
export type EditsAttrsForDetails = Record<string, unknown> & {
  gender?: string | null;
  fit?: string | string[] | null;
  neckline?: string | string[] | null;
  sleeve_style?: string | string[] | null;
  sleeve_length?: string | string[] | null;
  season?: string | string[] | null;
  style?: string | string[] | null;
  elements?: string | string[] | null;
  care_instructions?: string | null;
  material?: string | string[] | null;
  fabric?: string | string[] | null;
  fabric_weight?: string | string[] | null;
  thickness?: string | string[] | null;
  elasticity?: string | null;
  breathability?: string | null;
};

function arrFromEdits(v: string | string[] | null | undefined): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  return s ? [s] : [];
}

function joinEdits(arr: string[]): string {
  return arr.join(", ") || "";
}

/** Build accordion items from edits attrs + product code (so view shows what's in admin). */
function buildItemsFromEdits(attrs: EditsAttrsForDetails | null | undefined, productCode: string | null | undefined): ProductDetailLike[] {
  const a = attrs ?? {};
  const details: string[] = [];
  if (productCode != null && String(productCode).trim()) details.push(`Product Code: ${String(productCode).trim()}`);
  const gender = a.gender != null ? String(a.gender).trim() : "";
  if (gender) details.push(`Gender: ${gender}`);

  const fit = joinEdits(arrFromEdits(a.fit as string | string[]));
  const neckline = joinEdits(arrFromEdits(a.neckline as string | string[]));
  const sleeveStyle = joinEdits(arrFromEdits(a.sleeve_style as string | string[]));
  const sleeveLength = joinEdits(arrFromEdits(a.sleeve_length as string | string[]));
  const season = joinEdits(arrFromEdits(a.season as string | string[]));
  const style = joinEdits(arrFromEdits(a.style as string | string[]));
  const elements = joinEdits(arrFromEdits(a.elements as string | string[]));
  const features: string[] = [];
  if (fit) features.push(`Fit: ${fit}`);
  if (neckline) features.push(`Neckline: ${neckline}`);
  if (sleeveStyle) features.push(`Sleeve Style: ${sleeveStyle}`);
  if (sleeveLength) features.push(`Sleeve Length: ${sleeveLength}`);
  if (season) features.push(`Season: ${season}`);
  if (style) features.push(`Style: ${style}`);
  if (elements) features.push(`Elements: ${elements}`);

  const careInstructions = a.care_instructions != null ? String(a.care_instructions).trim() : "";

  const material = joinEdits(arrFromEdits(a.material as string | string[])) || joinEdits(arrFromEdits(a.fabric as string | string[]));
  const fabricWeight = joinEdits(arrFromEdits(a.fabric_weight as string | string[]));
  const thickness = joinEdits(arrFromEdits(a.thickness as string | string[]));
  const elasticity = a.elasticity != null ? String(a.elasticity).trim() : "";
  const breathability = a.breathability != null ? String(a.breathability).trim() : "";
  const fabricLines: string[] = [];
  if (material) fabricLines.push(`Material: ${material}`);
  if (fabricWeight) fabricLines.push(`Fabric Weight: ${fabricWeight}`);
  if (thickness) fabricLines.push(`Thickness: ${thickness}`);
  if (elasticity) fabricLines.push(`Elasticity: ${elasticity}`);
  if (breathability) fabricLines.push(`Breathability: ${breathability}`);

  const allFeaturesLines = [...details, ...features, ...fabricLines];
  const out: ProductDetailLike[] = [];
  if (allFeaturesLines.length) out.push({ id: "edits-features", title: "Features", content_type: "kv", content: allFeaturesLines.join("\n"), sort_order: 0 });
  if (careInstructions) out.push({ id: "edits-care", title: "Care Instructions", content_type: "list", content: careInstructions.split(/\n/).map((l) => `- ${l.trim()}`).join("\n"), sort_order: 1 });
  return out;
}

type ProductDetailLike = { id: string; title: string; content_type: string; content: string; sort_order: number };

function canonicalizeTitle(title: string): CanonicalSection {
  const t = (title ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  // common patterns / variants
  if (t === "details" || t.includes("detail")) return "details";
  if (t === "features" || t.includes("feature")) return "features";
  if (t.includes("care") || t.includes("washing") || t.includes("wash") || t.includes("care instruction")) return "care";
  if (t.includes("fabric") || t.includes("material")) return "fabric";
  return "other";
}

function renderContent(type: string, content: string, opts?: { section?: CanonicalSection; title?: string }) {
  if (type === "link") {
    return (
      <a href={content} target="_blank" rel="noreferrer" className="underline">
        {content}
      </a>
    );
  }

  if (type === "list") {
    const items = content
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean);

    return (
      <>
        <ul className="ru-bullets">
          {items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      </>
    );
  }

  if (type === "kv") {
    // Lines can be "Key: Value" or "Key|Value".
    const rows = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const pipeIdx = line.indexOf("|");
        if (pipeIdx >= 0) {
          return { k: line.slice(0, pipeIdx).trim(), v: line.slice(pipeIdx + 1).trim() };
        }
        const colonIdx = line.indexOf(":");
        if (colonIdx >= 0) {
          return { k: line.slice(0, colonIdx).trim(), v: line.slice(colonIdx + 1).trim() };
        }
        return { k: line, v: "" };
      })
      .filter((r) => r.k);

    return (
      <ul className="ru-kv">
        {rows.map((r, idx) => (
          <li key={`${r.k}-${idx}`} className="ru-kv-row">
            <span className="ru-muted">{r.k}</span>
            <span className="ru-kv-val">{r.v}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <div className="ru-acc-text">{content.split(/\n\n+/).map((p, i) => (p.trim() ? <p key={i}>{p}</p> : null))}</div>;
}

function renderHtml(html: string) {
  const safe = sanitizeRichHtml(html);
  return <div className="ru-acc-text" dangerouslySetInnerHTML={{ __html: safe }} />;
}

export function ProductDetailsAccordion({
  productId,
  noteHtml,
  embedded,
  attrsFromEdits,
  productCode,
}: {
  productId: string;
  noteHtml?: string | null;
  embedded?: boolean;
  /** Attrs from admin (product_attributes) so Details/Features/Care/Fabric are built from edits */
  attrsFromEdits?: EditsAttrsForDetails | null;
  /** Product code from product for Details section */
  productCode?: string | null;
}) {
  const { data, isLoading } = useProductDetails(productId);
  const items = React.useMemo(() => {
    const base = (data ?? []).filter((d) => Boolean(d.title));
    const fromEdits = buildItemsFromEdits(attrsFromEdits, productCode);

    let merged: ProductDetailLike[];
    if (base.length > 0) {
      merged = base as ProductDetailLike[];
    } else if (fromEdits.length > 0) {
      merged = fromEdits;
    } else {
      merged = [];
    }

    const sorted = [...merged].sort((a, b) => {
      const ak = canonicalizeTitle(a.title);
      const bk = canonicalizeTitle(b.title);
      const ai = SECTION_ORDER.indexOf(ak);
      const bi = SECTION_ORDER.indexOf(bk);
      if (ai !== bi) return ai - bi;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    return sorted;
  }, [data, productId, attrsFromEdits, productCode]);

  const cleanNote = (noteHtml ?? "").trim();
  const hasNote = Boolean(cleanNote);

  const defaultValue = hasNote ? "note" : items[0]?.id;

  if (isLoading) return null;

  if (items.length === 0 && !hasNote) {
    const body = (
      <div className="ru-details-wrap">
        <div className="ru-acc-text">
          <p>No details added for this product yet.</p>
        </div>
      </div>
    );

    return embedded ? body : (
        <section className="ts-container ru-section" aria-label="Product details">
          {body}
        </section>
      );
  }

  const body = (
    <div className="ru-details-wrap">
      <Accordion type="single" collapsible defaultValue={defaultValue} className="ru-acc">
        {hasNote ? (
          <AccordionItem value="note" className="ru-acc-item">
            <AccordionTrigger className="ru-acc-trigger">Description</AccordionTrigger>
            <AccordionContent className="ru-acc-content">{renderHtml(cleanNote)}</AccordionContent>
          </AccordionItem>
        ) : null}
        {items.map((d) => (
          <AccordionItem key={d.id} value={d.id} className="ru-acc-item">
            <AccordionTrigger className="ru-acc-trigger">{d.title}</AccordionTrigger>
            <AccordionContent className="ru-acc-content">
              {renderContent(d.content_type, d.content, { section: canonicalizeTitle(d.title), title: d.title })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  return embedded ? body : (
      <section className="ts-container ru-section" aria-label="Product details">
        {body}
      </section>
    );
}
