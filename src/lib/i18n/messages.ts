import type { Locale } from "@/lib/i18n/locales";

export type MessageKey =
  | "nav.catalog"
  | "nav.features"
  | "nav.pricing"
  | "nav.blog"
  | "nav.login"
  | "nav.logout"
  | "nav.getStarted"
  | "nav.panel"
  | "common.currency"
  | "pages.features.title"
  | "pages.features.subtitle"
  | "pages.pricing.title"
  | "pages.pricing.subtitle"
  | "pages.blog.title"
  | "pages.blog.subtitle";

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  tr: {
    "nav.catalog": "Katalog",
    "nav.features": "Özellikler",
    "nav.pricing": "Fiyatlandırma",
    "nav.blog": "Blog",
    "nav.login": "Giriş",
    "nav.logout": "Çıkış",
    "nav.getStarted": "Başla",
    "nav.panel": "Panel",
    "common.currency": "USD",
    "pages.features.title": "Özellikler",
    "pages.features.subtitle": "Yakında: ürün özellikleri ve entegrasyonlar burada olacak.",
    "pages.pricing.title": "Fiyatlandırma",
    "pages.pricing.subtitle": "Yakında: planlar ve fiyat detayları burada olacak.",
    "pages.blog.title": "Blog",
    "pages.blog.subtitle": "Yakında: duyurular ve içerikler burada olacak.",
  },
  en: {
    "nav.catalog": "Catalog",
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "nav.blog": "Blog",
    "nav.logout": "Log out",
    "nav.login": "Login",
    "nav.getStarted": "Get Started",
    "nav.panel": "Panel",
    "common.currency": "USD",
    "pages.features.title": "Features",
    "pages.features.subtitle": "Coming soon: product features and integrations will live here.",
    "pages.pricing.title": "Pricing",
    "pages.pricing.subtitle": "Coming soon: plans and pricing details will live here.",
    "pages.blog.title": "Blog",
    "pages.blog.subtitle": "Coming soon: announcements and content will live here.",
  },
};
