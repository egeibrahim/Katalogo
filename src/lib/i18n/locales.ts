export type Locale = "tr" | "en";

export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALES: { value: Locale; label: string }[] = [
  { value: "tr", label: "TR" },
  { value: "en", label: "EN" },
];
