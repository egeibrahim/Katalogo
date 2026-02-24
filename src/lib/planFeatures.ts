/**
 * Plan bazlı özellik matrisi.
 * Free: günde 2 indirme, sadece Design Now.
 * Kişisel (individual): sınırsız mockup, sadece Design Now.
 * Brand: kendi kataloğu, sepete ekle, teklif.
 * Kurumsal (corporate / custom_request): marka + özel domain, iletişim.
 */

export type MembershipPlan = "free" | "individual" | "brand" | "corporate" | "custom_request";

/** Profil ve arayüzde gösterilecek plan adı. */
export function getPlanDisplayName(plan: MembershipPlan | null | undefined): string {
  if (!plan || plan === "free") return "Free Plan";
  if (plan === "individual") return "Kişisel";
  if (plan === "brand") return "Marka";
  if (plan === "corporate") return "Kurumsal";
  if (plan === "custom_request") return "Özel";
  return "Free Plan";
}

/** Günlük dışa aktarma limiti. Free=2, diğerleri sınırsız (999 kullanılıyor). */
export function getExportDailyLimit(plan: MembershipPlan | null | undefined): number {
  if (!plan || plan === "free") return 2;
  return 999;
}

/** Sepete ekle / sepet sayfası: sadece brand ve corporate/custom_request. */
export function canUseCart(plan: MembershipPlan | null | undefined): boolean {
  if (!plan) return false;
  return plan === "brand" || plan === "corporate" || plan === "custom_request";
}

/** Teklif talebi gönderme: brand ve corporate/custom_request. */
export function canRequestQuote(plan: MembershipPlan | null | undefined): boolean {
  if (!plan) return false;
  return plan === "brand" || plan === "corporate" || plan === "custom_request";
}

/** Kendi kataloğunu oluşturma (marka sayfası): brand ve corporate/custom_request. */
export function canCreateOwnCatalog(plan: MembershipPlan | null | undefined): boolean {
  if (!plan) return false;
  return plan === "brand" || plan === "corporate" || plan === "custom_request";
}
