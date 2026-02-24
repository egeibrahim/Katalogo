import "./landing.css";
import "./landing-awake.css";
import "./pricing-awake.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Check, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type BillingPeriod = "monthly" | "yearly";

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  usePageMeta({ title: "Fiyat – Katalogo" });

  async function handleStripeCheckout(planId: "individual" | "brand") {
    setCheckoutLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan: planId, interval: billingPeriod },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (url) window.location.href = url;
      else throw new Error("Ödeme sayfası alınamadı");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ödeme başlatılamadı");
    } finally {
      setCheckoutLoading(null);
    }
  }

  const plans = [
    {
      name: "Free",
      description: "İhtiyaç halinde kullanım için ideal.",
      priceMonthly: null as string | null,
      priceYearly: null as string | null,
      priceLabel: "Ücretsiz",
      cta: "Ücretsiz başla",
      href: "/auth",
      features: [
        "Tüm kataloğa erişim",
        "Designer ile mockup oluştur",
        "Günlük 2 adet indirme",
      ],
      variant: "free" as const,
    },
    {
      name: "Kişisel",
      description: "Düzenli ürün tasarlayanlar için sınırsız erişim planı.",
      priceMonthly: "$7",
      priceYearly: "$70",
      priceLabel: null,
      cta: "Başla",
      href: "/auth",
      features: [
        "Tüm kataloğa erişim",
        "Sınırsız Designer kullanımı",
        "Sınırsız mockup indirme",
      ],
      variant: "warning" as const,
    },
    {
      name: "Marka",
      description: "Kendi ürün kataloğunuzu oluşturun, müşteri tekliflerini yönetin. Özel marka sayfanızla satışı büyütün.",
      priceMonthly: "$20",
      priceYearly: "$200",
      priceLabel: null,
      cta: "Marka planı",
      href: "/auth",
      features: [
        "Markanıza ait web kataloğu",
        "Özel marka sayfası (kendi URL adınız)",
        "Müşterilerin ürünlerinizle mockup oluşturması",
        "Müşterilerden teklif alma",
      ],
      variant: "primary" as const,
    },
    {
      name: "Kurumsal",
      description: "Kurumsal ihtiyaçlarınız için özel alan adı, markaya özel tasarım ve entegre ödeme çözümleri.",
      priceMonthly: null,
      priceYearly: null,
      priceLabel: "Teklif",
      cta: "İletişime geç",
      href: "/auth",
      stripePlanId: null as "individual" | "brand" | null,
      features: [
        "Marka planındaki tüm özellikler dahil",
        "Kurumsal kimliğinize uygun özel alan adı (custom domain)",
        "Markanıza özel web tasarım ve arayüz",
        "Entegre ödeme altyapısı",
      ],
      variant: "dark" as const,
    },
  ];

  return (
    <div className="landing-page" data-landing>
      <section className="awake-pricing-section" id="pricing">
        <div className="awake-pricing-container">
          <div className="awake-pricing-header">
            <h2 className="awake-pricing-title">
              İhtiyacına uygun planı seç
            </h2>
            <div className="awake-pricing-toggle-wrap">
              <button
                type="button"
                className={`awake-pricing-toggle-btn ${billingPeriod === "monthly" ? "awake-pricing-toggle-btn--active" : ""}`}
                onClick={() => setBillingPeriod("monthly")}
              >
                Aylık
              </button>
              <button
                type="button"
                className={`awake-pricing-toggle-btn ${billingPeriod === "yearly" ? "awake-pricing-toggle-btn--active" : ""}`}
                onClick={() => setBillingPeriod("yearly")}
              >
                Yıllık
              </button>
              <span className="awake-pricing-toggle-slider" data-active={billingPeriod} />
            </div>
          </div>
          <div className="awake-pricing-row">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`awake-pricing-card awake-pricing-card--${plan.variant}`}
              >
                <div className="awake-pricing-card-body">
                  <div className="awake-pricing-card-inner">
                    <div className="awake-pricing-card-left">
                      <div className="awake-pricing-card-head">
                        <span className="awake-pricing-badge">{plan.name}</span>
                        <p className="awake-pricing-desc">{plan.description}</p>
                      </div>
                      <div className="awake-pricing-card-price-block">
                        {plan.stripePlanId ? (
                          <button
                            type="button"
                            className={`awake-pricing-btn ${plan.variant === "free" ? "awake-pricing-btn--dark" : "awake-pricing-btn--white"}`}
                            onClick={() => handleStripeCheckout(plan.stripePlanId!)}
                            disabled={!!checkoutLoading}
                          >
                            <span className="awake-pricing-btn-text">
                              {billingPeriod === "monthly" ? `${plan.priceMonthly}/ay` : `${plan.priceYearly}/yıl`}
                            </span>
                            <span className="awake-pricing-btn-icon">
                              <ArrowUpRight className="awake-pricing-btn-icon-svg" aria-hidden />
                            </span>
                          </button>
                        ) : (
                          <Link to={plan.href} className={`awake-pricing-btn ${plan.variant === "free" ? "awake-pricing-btn--dark" : "awake-pricing-btn--white"}`}>
                            <span className="awake-pricing-btn-text">
                              {plan.priceLabel ? plan.cta : billingPeriod === "monthly" ? `${plan.priceMonthly}/ay — ${plan.cta}` : `${plan.priceYearly}/yıl — ${plan.cta}`}
                            </span>
                            <span className="awake-pricing-btn-icon">
                              <ArrowUpRight className="awake-pricing-btn-icon-svg" aria-hidden />
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="awake-pricing-card-right">
                      <h6 className="awake-pricing-features-title">Özellikler</h6>
                      <ul className="awake-pricing-features-list">
                        {plan.features.map((feature) => (
                          <li key={feature} className="awake-pricing-feature">
                            <Check className="awake-pricing-feature-icon" aria-hidden />
                            <p className="awake-pricing-feature-text">{feature}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
