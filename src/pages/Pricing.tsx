import "./landing.css";
import "./landing-awake.css";
import "./pricing-awake.css";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Check, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/LocaleProvider";

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
  const { t, locale } = useI18n();
  const isTr = locale === "tr";
  const queryClient = useQueryClient();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const handledResult = useRef(false);
  const handledAccessWarning = useRef(false);
  usePageMeta({ title: t("pages.pricing.title") });

  useEffect(() => {
    const state = location.state as { blockedPanelAccess?: boolean } | null;
    if (handledAccessWarning.current || !state?.blockedPanelAccess) return;
    handledAccessWarning.current = true;
    toast.info(t("pricing.blockedPanel"));
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
      toast.success(t("pricing.paymentSuccess"));
    } else if (canceled) {
      toast.info(t("pricing.paymentCanceled"));
    }

    const clearPending = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionId = searchParams.get("session_id");
        await supabase.functions.invoke("clear-pending-plan", {
          body: sessionId ? { session_id: sessionId } : {},
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["user_membership"] });
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
  }, [searchParams, queryClient, t]);

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
        toast.info(t("pricing.authNeeded"));
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
      else throw new Error(t("pricing.checkoutUnavailable"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("pricing.checkoutFailed");
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
        toast.error(t("pricing.sessionExpired"));
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
      description: isTr ? "İhtiyaç halinde kullanım için ideal." : "Ideal for occasional use.",
      priceMonthly: null as string | null,
      priceYearly: null as string | null,
      priceLabel: isTr ? "Ücretsiz" : "Free",
      cta: isTr ? "Ücretsiz başla" : "Start free",
      href: "/auth",
      features: isTr
        ? ["Tüm kataloğa erişim", "Designer ile mockup oluştur", "Günlük 2 adet indirme"]
        : ["Access full catalog", "Create mockups in Designer", "2 downloads per day"],
      variant: "free" as const,
    },
    {
      name: isTr ? "Kişisel" : "Personal",
      description: isTr
        ? "Düzenli ürün tasarlayanlar için sınırsız erişim planı."
        : "Unlimited access for regular product creators.",
      priceMonthly: "$7",
      priceYearly: "$70",
      priceLabel: null,
      cta: isTr ? "Başla" : "Start",
      href: "/auth",
      stripePlanId: "individual" as const,
      features: isTr
        ? ["Tüm kataloğa erişim", "Sınırsız Designer kullanımı", "Sınırsız mockup indirme"]
        : ["Access full catalog", "Unlimited Designer usage", "Unlimited mockup downloads"],
      variant: "warning" as const,
    },
    {
      name: isTr ? "Marka" : "Brand",
      description: isTr
        ? "Kendi ürün kataloğunuzu oluşturun, müşteri tekliflerini yönetin. Özel marka sayfanızla satışı büyütün."
        : "Build your own product catalog, manage customer quotes, and grow sales with your dedicated brand page.",
      priceMonthly: "$20",
      priceYearly: "$200",
      priceLabel: null,
      cta: isTr ? "Marka planı" : "Brand plan",
      href: "/auth",
      stripePlanId: "brand" as const,
      features: isTr
        ? [
            "Markanıza ait web kataloğu",
            "Özel marka sayfası (kendi URL adınız)",
            "Müşterilerin ürünlerinizle mockup oluşturması",
            "Müşterilerden teklif alma",
          ]
        : [
            "A web catalog dedicated to your brand",
            "Private brand page (your custom URL slug)",
            "Customers create mockups with your products",
            "Receive quote requests from customers",
          ],
      variant: "primary" as const,
    },
    {
      name: isTr ? "Kurumsal" : "Enterprise",
      description: isTr
        ? "Kurumsal ihtiyaçlarınız için özel alan adı, markaya özel tasarım ve entegre ödeme çözümleri."
        : "Custom domain, brand-specific design, and integrated payment solutions for enterprise needs.",
      priceMonthly: null,
      priceYearly: null,
      priceLabel: isTr ? "Teklif" : "Quote",
      cta: isTr ? "İletişime geç" : "Contact us",
      href: "/auth",
      stripePlanId: null as "individual" | "brand" | null,
      features: isTr
        ? [
            "Marka planındaki tüm özellikler dahil",
            "Kurumsal kimliğinize uygun özel alan adı (custom domain)",
            "Markanıza özel web tasarım ve arayüz",
            "Entegre ödeme altyapısı",
          ]
        : [
            "Includes all features in the Brand plan",
            "Custom domain aligned with your corporate identity",
            "Brand-specific web design and interface",
            "Integrated payment infrastructure",
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
              {isTr ? "İhtiyacına uygun planı seç" : "Choose the plan that fits your needs"}
            </h2>
            <div className="awake-pricing-toggle-wrap">
              <button
                type="button"
                className={`awake-pricing-toggle-btn ${billingPeriod === "monthly" ? "awake-pricing-toggle-btn--active" : ""}`}
                onClick={() => setBillingPeriod("monthly")}
              >
                {isTr ? "Aylık" : "Monthly"}
              </button>
              <button
                type="button"
                className={`awake-pricing-toggle-btn ${billingPeriod === "yearly" ? "awake-pricing-toggle-btn--active" : ""}`}
                onClick={() => setBillingPeriod("yearly")}
              >
                {isTr ? "Yıllık" : "Yearly"}
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
                              {billingPeriod === "monthly" ? `${plan.priceMonthly}/${isTr ? "ay" : "mo"}` : `${plan.priceYearly}/${isTr ? "yıl" : "yr"}`}
                            </span>
                            <span className="awake-pricing-btn-icon">
                              <ArrowUpRight className="awake-pricing-btn-icon-svg" aria-hidden />
                            </span>
                          </button>
                        ) : (
                          <Link to={plan.href} className={`awake-pricing-btn ${plan.variant === "free" ? "awake-pricing-btn--dark" : "awake-pricing-btn--white"}`}>
                            <span className="awake-pricing-btn-text">
                              {plan.priceLabel
                                ? plan.cta
                                : billingPeriod === "monthly"
                                  ? `${plan.priceMonthly}/${isTr ? "ay" : "mo"} — ${plan.cta}`
                                  : `${plan.priceYearly}/${isTr ? "yıl" : "yr"} — ${plan.cta}`}
                            </span>
                            <span className="awake-pricing-btn-icon">
                              <ArrowUpRight className="awake-pricing-btn-icon-svg" aria-hidden />
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="awake-pricing-card-right">
                      <h6 className="awake-pricing-features-title">{isTr ? "Özellikler" : "Features"}</h6>
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
