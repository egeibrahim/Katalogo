import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type UnitPriceTierDraft = {
  id?: string;
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
  currency: string;
  sort_order: number;
};

function clampInt(v: string, fallback: number) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Virgül veya nokta ile yazılmış ondalık sayıyı parse eder (örn. "3,8" -> 3.8). */
function parseDecimal(v: string): number {
  const normalized = String(v).trim().replace(",", ".");
  return Number(normalized);
}

function clampNum(v: string, fallback: number) {
  const n = parseDecimal(v);
  return Number.isFinite(n) ? n : fallback;
}

export function UnitPriceTiersEditor({
  value,
  onChange,
  currency = "USD",
}: {
  value: UnitPriceTierDraft[];
  onChange: (next: UnitPriceTierDraft[]) => void;
  currency?: string;
}) {
  const items = [...(value ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const [minQtyLocal, setMinQtyLocal] = useState<Record<number, string>>({});
  const [maxQtyLocal, setMaxQtyLocal] = useState<Record<number, string>>({});
  const [unitPriceLocal, setUnitPriceLocal] = useState<Record<number, string>>({});

  const getMinQtyDisplay = (idx: number, t: UnitPriceTierDraft) => {
    if (idx in minQtyLocal) return minQtyLocal[idx];
    return String(t.min_qty);
  };

  const getMaxQtyDisplay = (idx: number, t: UnitPriceTierDraft) => {
    if (idx in maxQtyLocal) return maxQtyLocal[idx];
    return t.max_qty === null || t.max_qty === undefined ? "" : String(t.max_qty);
  };

  const commitMinQty = (idx: number, raw: string) => {
    const next = { ...minQtyLocal };
    delete next[idx];
    setMinQtyLocal(next);
    const trimmed = raw.trim();
    const n = trimmed === "" ? 1 : Math.max(1, clampInt(trimmed, 1));
    onChange(
      items.map((t, i) => {
        if (i !== idx) return t;
        const newT = { ...t, min_qty: n };
        if (newT.max_qty != null && newT.max_qty < n) newT.max_qty = n;
        return newT;
      })
    );
    setMaxQtyLocal((prev) => {
      const nextMax = { ...prev };
      delete nextMax[idx];
      return nextMax;
    });
  };

  const commitMaxQty = (idx: number, raw: string, minQty: number) => {
    const next = { ...maxQtyLocal };
    delete next[idx];
    setMaxQtyLocal(next);
    const trimmed = raw.trim();
    if (trimmed === "") {
      onChange(items.map((t, i) => (i === idx ? { ...t, max_qty: null } : t)));
      return;
    }
    const n = clampInt(trimmed, minQty);
    onChange(items.map((t, i) => (i === idx ? { ...t, max_qty: Math.max(n, minQty) } : t)));
  };

  const getUnitPriceDisplay = (idx: number, t: UnitPriceTierDraft) => {
    if (idx in unitPriceLocal) return unitPriceLocal[idx];
    return String(t.unit_price).replace(".", ",");
  };

  const commitUnitPrice = (idx: number, raw: string) => {
    const next = { ...unitPriceLocal };
    delete next[idx];
    setUnitPriceLocal(next);
    const trimmed = raw.trim();
    const num = trimmed === "" ? 0 : Math.max(0, clampNum(trimmed, 0));
    onChange(items.map((t, i) => (i === idx ? { ...t, unit_price: num } : t)));
  };

  const add = () => {
    const nextSort = items.length ? Math.max(...items.map((x) => x.sort_order)) + 1 : 0;
    onChange([
      ...items,
      { min_qty: 1, max_qty: 5, unit_price: 0, currency: currency.toUpperCase(), sort_order: nextSort },
    ]);
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx).map((t, i) => ({ ...t, sort_order: i })));
  };

  const update = (idx: number, patch: Partial<UnitPriceTierDraft>) => {
    onChange(
      items.map((t, i) => {
        if (i !== idx) return t;
        const next = { ...t, ...patch };
        if (
          typeof next.min_qty === "number" &&
          next.max_qty != null &&
          next.max_qty < next.min_qty
        ) {
          next.max_qty = next.min_qty;
        }
        return next;
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Unit Price tiers</p>
          <p className="text-xs text-muted-foreground">Each row contains a range (min/max) and unit price.</p>
        </div>
        <Button type="button" variant="outline" onClick={add}>
          Add tier
        </Button>
      </div>

      <div className="grid gap-3">
        {items.map((t, idx) => (
          <div key={t.id ?? `${t.sort_order}-${idx}`} className="rounded-md border p-3">
            <div className="grid gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-3 space-y-2">
                <Label>Min qty</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={getMinQtyDisplay(idx, t)}
                  placeholder="1"
                  onChange={(e) => setMinQtyLocal((prev) => ({ ...prev, [idx]: e.target.value }))}
                  onBlur={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    commitMinQty(idx, raw);
                  }}
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Max qty (optional)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={getMaxQtyDisplay(idx, t)}
                  placeholder="(blank = ≥ min)"
                  onChange={(e) => {
                    const raw = e.target.value;
                    setMaxQtyLocal((prev) => ({ ...prev, [idx]: raw }));
                  }}
                  onBlur={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    commitMaxQty(idx, raw, t.min_qty);
                  }}
                />
              </div>

              <div className="md:col-span-6 space-y-2">
                <Label>Unit price ({t.currency})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={getUnitPriceDisplay(idx, t)}
                  placeholder="0"
                  onChange={(e) => setUnitPriceLocal((prev) => ({ ...prev, [idx]: e.target.value }))}
                  onBlur={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    commitUnitPrice(idx, raw);
                  }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">UI etiketi: {t.max_qty == null ? `≥ ${t.min_qty}` : `${t.min_qty}-${t.max_qty}`}</p>
              <Button type="button" variant="destructive" onClick={() => remove(idx)}>
                Remove
              </Button>
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No tiers yet. Add one with "Add tier".
          </div>
        ) : null}
      </div>
    </div>
  );
}
