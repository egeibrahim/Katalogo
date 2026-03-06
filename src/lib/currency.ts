export const SUPPORTED_CURRENCIES = ["USD", "TRY"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function normalizeCurrency(value: string | null | undefined): SupportedCurrency {
  const upper = String(value ?? "").toUpperCase();
  return upper === "TRY" ? "TRY" : "USD";
}

export function formatMoney(amount: number, currency: string | null | undefined): string {
  const safeCurrency = normalizeCurrency(currency);
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: safeCurrency }).format(amount);
  } catch {
    return `${amount}`;
  }
}
