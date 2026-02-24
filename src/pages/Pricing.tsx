import "./landing.css";
import "./landing-awake.css";
import "./pricing-awake.css";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Check, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AUTH_PENDING_CHECKOUT_KEY = "auth_pending_checkout";

type BillingPeriod = "monthly" | "yearly";

async function getFunctionErrorMessage(error: unknown, fallback = "Ödeme sayfası açılamadı"): Promise<string> {
  if (error instanceof Error && error.message && error.message !== "Edge Function returned a non-2xx status code") {
    return error.message;
  }

  // Supabase FunctionsHttpError: context çoğunlukla Response taşır.
  if (typeof error === "object" && error !== null && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const cloned = context.clone();
        const json = (await cloned.json().catch(() => null)) as { error?: string; message?: string } | null;
        const fromJson = json?.error ?? json?.message;
        if (fromJson) return fromJson;
      } catch {
        /* ignore */
      }
      try {
        const text = await context.text();
        if (text) return text;
      } catch {
        /* ignore */
      }
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isAuthErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("invalid jwt") ||
    lower.includes("jwt") ||
    lower.includes("token")
  );
}

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const handledResult = useRef(false);
  const handledAccessWarning = useRef(false);
  usePageMeta({ title: "Fiyat – Katalogo" });

  useEffect(() => {
    const state = location.state as { blockedPanelAccess?: boolean } | null;
    if (handledAccessWarning.current || !state?.blockedPanelAccess) return;
    handledAccessWarning.current = true;
    toast.info("Panel sadece Marka planında kullanılabilir.");
  }, [location.state]);

  // Stripe success/cancel dönüşünde pending_plan temizle
  useEffect(() => {
    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";
    if ((!success && !canceled) || handledResult.current) return;
    handledResult.current = true;

    try {
      sessionStorage.removeItem(AUTH_PENDING_CHECKOUT_KEY);
    } catch {
      /* ignore */
    }

    if (success) {
      toast.success("Ödeme başarıyla tamamlandı. Panele erişebilirsiniz.");
    } else if (canceled) {
      toast.info("Ödeme iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.");
    }

    const clearPending = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke("clear-pending-plan");
        }
      } catch {
        /* Sessizce yoksay – kritik değil */
      }
    };
    clearPending();

    // URL'den success/cancel parametrelerini temizle
    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("canceled");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  async function handleStripeCheckout(planId: "individual" | "brand") {
    setCheckoutLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let activeSession = session;
      const nowSec = Math.floor(Date.now() / 1000);
      if (!activeSession || ((activeSession.expires_at ?? 0) <= nowSec + 30)) {
        const refreshed = await supabase.auth.refreshSession();
        if (!refreshed.error && refreshed.data.session) activeSession = refreshed.data.session;
      }

      if (!activeSession) {
        // Auth sayfası state kaybederse de checkout tetiklensin diye yedekle
        try {
          sessionStorage.setItem(
            AUTH_PENDING_CHECKOUT_KEY,
            JSON.stringify({ plan: planId, interval: billingPeriod }),
          );
        } catch {
          /* ignore */
        }
        toast.info("Devam etmek için giriş / kayıt gerekiyor. Yönlendiriliyorsunuz…");
        navigate("/auth", {
          state: {
            from: { pathname: "/pricing" },
            pendingPlan: planId,
            pendingInterval: billingPeriod,
          },
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan: planId, interval: billingPeriod },
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
      });
      if (error) {
        const errBody = data as { error?: string } | null;
        const errMsg = errBody?.error ?? await getFunctionErrorMessage(error);

        // Geçersiz/expired JWT durumunda bir kez session yenileyip tekrar dene.
        if (isAuthErrorMessage(errMsg)) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          const refreshedSession = refreshed?.session;
          if (!refreshError && refreshedSession) {
            const retry = await supabase.functions.invoke("create-checkout-session", {
              body: { plan: planId, interval: billingPeriod },
              headers: { Authorization: `Bearer ${refreshedSession.access_token}` },
            });
            if (!retry.error) {
              const retryUrl = (retry.data as { url?: string } | null)?.url;
              if (retryUrl) {
                window.location.href = retryUrl;
                return;
              }
            }
          }
        }

        throw new Error(errMsg);
      }
      const url = (data as { url?: string })?.url;
      if (url) window.location.href = url;
      else throw new Error("Ödeme sayfası alınamadı");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ödeme başlatılamadı";
      // Token/oturum sorunu varsa kullanıcıyı auth’a yönlendir
      const isAuthIssue = isAuthErrorMessage(String(msg));
      if (isAuthIssue) {
        try {
          sessionStorage.setItem(
            AUTH_PENDING_CHECKOUT_KEY,
            JSON.stringify({ plan: planId, interval: billingPeriod }),
          );
        } catch {
          /* ignore */
        }
        toast.error("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
        navigate("/auth", {
          state: {
            from: { pathname: "/pricing" },
            pendingPlan: planId,
            pendingInterval: billingPeriod,
            authError: "session_expired",
          },
        });
      } else {
        toast.error(msg);
      }
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
      stripePlanId: "individual" as const,
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
      stripePlanId: "brand" as const,
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
