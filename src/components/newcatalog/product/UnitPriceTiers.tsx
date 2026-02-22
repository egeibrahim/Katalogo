import { useMemo } from "react";

export type UnitPriceTier = {
  id?: string;
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
  currency?: string;
  sort_order?: number;
};

function labelForTier(t: UnitPriceTier) {
  const min = Number.isFinite(t.min_qty) ? t.min_qty : 1;
  const max = t.max_qty == null ? null : t.max_qty;
  if (max == null) return `≥ ${min} Pieces`;
  if (min === max) return `${min} Pieces`;
  return `${min}-${max} Pieces`;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount}`;
  }
}

export function UnitPriceTiers({
  tiers,
  activeIndex = 0,
  currency = "USD",
}: {
  tiers: UnitPriceTier[];
  activeIndex?: number;
  currency?: string;
}) {
  const items = useMemo(
    () =>
      [...(tiers ?? [])]
        .filter((t) => t && typeof t.min_qty === "number" && typeof t.unit_price === "number")
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.min_qty - b.min_qty),
    [tiers]
  );

  if (items.length === 0) return null;

  return (
    <div className="ru-unit-grid" aria-label="Unit price tiers">
      {items.map((t, idx) => {
        const isActive = idx === activeIndex;
        const ccy = (t.currency || currency || "USD").toUpperCase();
        return (
          <div key={`${t.min_qty}-${t.max_qty ?? "plus"}-${idx}`} className={isActive ? "ru-unit-card ru-unit-card--active" : "ru-unit-card"}>
            <p className="ru-muted">{labelForTier(t)}</p>
            <p className="ru-unit-price">{formatMoney(t.unit_price, ccy)}</p>
          </div>
        );
      })}
    </div>
  );
}
