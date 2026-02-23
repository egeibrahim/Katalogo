import "./landing.css";
import "./landing-awake.css";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { Check, ArrowRight } from "lucide-react";

export default function Pricing() {
  usePageMeta({ title: "Fiyat – Katalogo" });
  const { t } = useI18n();

  const plans = [
    {
      name: "Free",
      description: "Günde 2 indirme, sadece Design Now.",
      price: "Ücretsiz",
      period: "",
      features: [
        "Design Now ile tasarım",
        "Günde 2 mockup indirme",
        "Katalog görüntüleme",
      ],
      cta: "Ücretsiz başla",
      href: "/auth",
      highlighted: false,
    },
    {
      name: "Kişisel",
      description: "Sınırsız mockup, sadece Design Now.",
      price: "$7",
      period: "/ay",
      features: [
        "Free plan özellikleri",
        "Sınırsız mockup indirme",
        "Tasarımcı erişimi",
      ],
      cta: "Başla",
      href: "/auth",
      highlighted: false,
    },
    {
      name: "Marka",
      description: "Kendi kataloğu ve teklif yönetimi.",
      price: "$20",
      period: "/ay",
      features: [
        "Kişisel plan özellikleri",
        "Marka sayfası (özel URL)",
        "Sepet ve teklif talepleri",
        "Kendi kataloğunu oluşturma",
      ],
      cta: "Marka planı",
      href: "/auth",
      highlighted: true,
    },
    {
      name: "Kurumsal",
      description: "Özel alan adı ve öncelikli destek.",
      price: "Teklif",
      period: "",
      features: [
        "Marka plan özellikleri",
        "Özel alan adı (custom domain)",
        "Öncelikli destek",
        "Gelişmiş ihtiyaçlar için iletişim",
      ],
      cta: "İletişime geç",
      href: "/auth",
      highlighted: false,
    },
  ];

  return (
    <div className="landing-page" data-landing>
      <section className="landing-section ru-max w-full" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div className="landing-section-inner">
          <h1 className="landing-title-center" style={{ marginBottom: "0.5rem" }}>
            {t("pages.pricing.title")}
          </h1>
          <p className="landing-muted landing-text-center" style={{ maxWidth: 480, margin: "0 auto 3rem" }}>
            {t("pages.pricing.subtitle")}
          </p>

          <div className="landing-pricing-grid">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`landing-pricing-card ${plan.highlighted ? "landing-pricing-card--highlight" : ""}`}
              >
                {plan.highlighted && <span className="landing-pricing-badge">Önerilen</span>}
                <h2 className="landing-pricing-name">{plan.name}</h2>
                <p className="landing-pricing-desc">{plan.description}</p>
                <div className="landing-pricing-price">
                  {plan.price}
                  {plan.period && <span className="landing-pricing-period">{plan.period}</span>}
                </div>
                <ul className="landing-pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check className="landing-pricing-check" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={plan.highlighted ? "landing-btn-primary landing-pricing-cta" : "landing-pricing-cta-outline"}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
