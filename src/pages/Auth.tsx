import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chrome } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/lib/i18n/LocaleProvider";

import "./landing-awake.css";
import "./auth-awake.css";

type AuthValues = {
  email: string;
  password: string;
};

function authErrorMessage(
  error: { message?: string } | null,
  t: (key: string) => string,
): string {
  if (!error?.message) return t("auth.genericError");
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials"))
    return t("auth.error.invalidCredentials");
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed"))
    return t("auth.error.emailNotConfirmed");
  if (msg.includes("user not found")) return t("auth.error.userNotFound");
  if (msg.includes("already registered") || msg.includes("user_already_exists") || msg.includes("already in use"))
    return t("auth.error.alreadyExists");
  if (msg.includes("password") && msg.includes("weak"))
    return t("auth.error.weakPassword");
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch"))
    return t("auth.error.network");
  return error.message;
}

type LocationState = {
  from?: { pathname?: string };
  pendingPlan?: "individual" | "brand";
  pendingInterval?: "monthly" | "yearly";
  authError?: "session_expired";
};

const AUTH_PENDING_CHECKOUT_KEY = "auth_pending_checkout";

function getPendingCheckoutFromStorage(): { plan: "individual" | "brand"; interval: "monthly" | "yearly" } | null {
  try {
    const raw = sessionStorage.getItem(AUTH_PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { plan?: string; interval?: string };
    if (parsed.plan === "individual" || parsed.plan === "brand")
      return { plan: parsed.plan, interval: parsed.interval === "yearly" ? "yearly" : "monthly" };
  } catch {
    /* ignore */
  }
  return null;
}

function setPendingCheckoutInStorage(plan: "individual" | "brand", interval: "monthly" | "yearly") {
  try {
    sessionStorage.setItem(AUTH_PENDING_CHECKOUT_KEY, JSON.stringify({ plan, interval }));
  } catch {
    /* ignore */
  }
}

function clearPendingCheckoutFromStorage() {
  try {
    sessionStorage.removeItem(AUTH_PENDING_CHECKOUT_KEY);
  } catch {
    /* ignore */
  }
}

function isAuthIssue(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("invalid jwt") ||
    lower.includes("jwt") ||
    lower.includes("token")
  );
}

export default function Auth() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading, signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth();

  const st = location.state as LocationState | null;
  const fromPricing = st?.from?.pathname === "/pricing" || !!st?.pendingPlan;
  const hasPendingPlan = !!st?.pendingPlan;
  const [tab, setTab] = useState<"login" | "signup">(hasPendingPlan ? "signup" : "login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const st = (location.state as LocationState | null) ?? null;
    return st?.from?.pathname ?? "/catalog";
  }, [location.state]);

  const form = useForm<AuthValues>({
    resolver: zodResolver(
      z.object({
        email: z.string().email(t("auth.invalidEmail")),
        password: z.string().min(6, t("auth.passwordMin")),
      }),
    ),
    defaultValues: { email: "", password: "" },
  });

  usePageMeta({
    title: showForgotPassword ? t("auth.meta.forgot") : tab === "login" ? t("auth.meta.login") : t("auth.meta.signup"),
    noIndex: true,
  });

  useEffect(() => {
    setAuthError(null);
  }, [tab]);

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.authError === "session_expired") {
      setAuthError(t("auth.sessionExpired"));
    }
  }, [location.state, t]);

  // Plan seçiliyse sessionStorage’a yaz (state kaybolmasın diye)
  useEffect(() => {
    if (st?.pendingPlan && st?.pendingInterval) {
      setPendingCheckoutInStorage(st.pendingPlan, st.pendingInterval);
    }
  }, [st?.pendingPlan, st?.pendingInterval]);

  useEffect(() => {
    if (!isLoading && session) {
      const fromState = location.state as LocationState | null;
      const stored = getPendingCheckoutFromStorage();
      const plan = fromState?.pendingPlan ?? stored?.plan;
      const interval = fromState?.pendingInterval ?? stored?.interval ?? "monthly";

      if (plan) {
        const runCheckout = async () => {
          const firstSession = await supabase.auth.getSession();
          let activeSession = firstSession.data.session;
          const nowSec = Math.floor(Date.now() / 1000);
          if (!activeSession || ((activeSession.expires_at ?? 0) <= nowSec + 30)) {
            const refreshed = await supabase.auth.refreshSession();
            if (!refreshed.error && refreshed.data.session) activeSession = refreshed.data.session;
          }
          const token = activeSession?.access_token;
          const first = await supabase.functions.invoke("create-checkout-session", {
            body: { plan, interval },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!first.error) {
            clearPendingCheckoutFromStorage();
            const firstUrl = (first.data as { url?: string } | null)?.url;
            if (firstUrl) {
              window.location.href = firstUrl;
              return;
            }
            toast({ title: t("auth.checkoutUnavailable"), variant: "destructive" });
            navigate("/pricing", { replace: true });
            return;
          }

          // JWT expired/invalid ise bir kez yenileyip tekrar dene.
          const firstMessage = (first.error as { message?: string })?.message ?? "";
          if (isAuthIssue(firstMessage)) {
            const refreshed = await supabase.auth.refreshSession();
            if (!refreshed.error && refreshed.data.session) {
              const retry = await supabase.functions.invoke("create-checkout-session", {
                body: { plan, interval },
                headers: { Authorization: `Bearer ${refreshed.data.session.access_token}` },
              });
              if (!retry.error) {
                clearPendingCheckoutFromStorage();
                const retryUrl = (retry.data as { url?: string } | null)?.url;
                if (retryUrl) {
                  window.location.href = retryUrl;
                  return;
                }
              }
            }
          }

          toast({
            title: t("auth.checkoutUnavailable"),
            description: firstMessage || t("auth.pleaseLoginAgain"),
            variant: "destructive",
          });
          navigate("/pricing", { replace: true });
        };
        requestAnimationFrame(() => setTimeout(runCheckout, 150));
        return;
      }
      clearPendingCheckoutFromStorage();
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, session, navigate, redirectTo, location.state]);

  // Oturum varsa formu gösterme; yönlendirme mesajı göster (açılıp kapanma hissini önler)
  if (session) {
    return (
      <div className="landing-page awake-auth-page">
        <div className="awake-auth-inner flex items-center justify-center">
          <p className="awake-auth-desc">{t("auth.redirecting")}</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: AuthValues) => {
    setAuthError(null);
    if (tab === "login") {
      const { error } = await signIn(values.email, values.password);
      if (error) {
        const message = authErrorMessage(error, t);
        setAuthError(message);
        toast({ title: t("auth.operationFailed"), description: message, variant: "destructive" });
        return;
      }
      toast({ title: t("auth.loginSuccess"), description: t("auth.redirecting") });
      return;
    }
    const { error, needsEmailConfirmation } = await signUp(values.email, values.password);
    if (error) {
      const message = authErrorMessage(error, t);
      setAuthError(message);
      toast({ title: t("auth.signupFailed"), description: message, variant: "destructive" });
      return;
    }
    if (needsEmailConfirmation) {
      setAuthError(null);
      toast({
        title: t("auth.signupSuccess"),
        description: t("auth.signupConfirmEmail"),
      });
      return;
    }
    toast({ title: t("auth.signupSuccess"), description: t("auth.redirecting") });
  };

  const onGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: t("auth.googleFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email) {
      toast({ title: t("auth.emailRequired"), variant: "destructive" });
      return;
    }
    setForgotSubmitting(true);
    const { error } = await resetPasswordForEmail(email);
    setForgotSubmitting(false);
    if (error) {
      toast({ title: t("auth.sendFailed"), description: error.message, variant: "destructive" });
      return;
    }
    setForgotSent(true);
    toast({
      title: t("auth.emailSent"),
      description: t("auth.resetSentDescription"),
    });
  };

  return (
    <div className="landing-page awake-auth-page">
      <div className="awake-auth-inner">
        {!isSupabaseConfigured && (
          <div className="awake-auth-warning">
            <strong>{t("auth.supabaseMissing")}</strong>
          </div>
        )}
        <div className="awake-auth-card">
          <div className="awake-auth-card-header">
            <h1 className="awake-auth-title">
              {showForgotPassword ? t("auth.titleForgot") : t("auth.titleDefault")}
            </h1>
            <p className="awake-auth-desc">
              {showForgotPassword
                ? t("auth.descForgot")
                : fromPricing
                  ? t("auth.descFromPricing")
                  : t("auth.descDefault")}
            </p>
          </div>
          <div className="awake-auth-card-body">
            {!fromPricing && !showForgotPassword && (
              <p className="awake-auth-forgot-success mb-4">
                {t("auth.noAccount")}{" "}
                <Link to="/pricing" className="awake-auth-back-link inline">
                  {t("auth.choosePlan")}
                </Link>
              </p>
            )}
            {showForgotPassword ? (
              forgotSent ? (
                <>
                  <p className="awake-auth-forgot-success">
                    {t("auth.resetMailSentTo")} <strong>{forgotEmail}</strong>.
                  </p>
                  <button type="button" className="awake-auth-btn-outline" onClick={() => setShowForgotPassword(false)}>
                    {t("auth.backToLogin")}
                  </button>
                </>
              ) : (
                <form onSubmit={onForgotSubmit} className="space-y-4">
                  <div className="awake-auth-field">
                    <Label htmlFor="forgot-email" className="awake-auth-label">{t("auth.email")}</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotSubmitting}
                      className="awake-auth-input"
                    />
                  </div>
                  <button type="submit" className="awake-auth-btn-primary" disabled={forgotSubmitting}>
                    {forgotSubmitting ? t("auth.sending") : t("auth.sendReset")}
                  </button>
                  <a href="#" className="awake-auth-back-link" onClick={(e) => { e.preventDefault(); setShowForgotPassword(false); }}>
                    {t("auth.backToLogin")}
                  </a>
                </form>
              )
            ) : fromPricing ? (
              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                <TabsList className="awake-auth-tabs-list">
                  <TabsTrigger value="login" className="awake-auth-tabs-trigger">{t("auth.tabLogin")}</TabsTrigger>
                  <TabsTrigger value="signup" className="awake-auth-tabs-trigger">{t("auth.tabSignup")}</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <button type="button" className="awake-auth-btn-outline" onClick={onGoogle}>
                    <Chrome className="h-4 w-4" aria-hidden /> {t("auth.googleContinue")}
                  </button>

                  <div className="awake-auth-divider">
                    <span className="awake-auth-divider-line" />
                    <span className="awake-auth-divider-text">{t("auth.or")}</span>
                    <span className="awake-auth-divider-line" />
                  </div>

                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="awake-auth-field">
                      <Label htmlFor="email" className="awake-auth-label">{t("auth.email")}</Label>
                      <Input id="email" type="email" autoComplete="email" className="awake-auth-input" {...form.register("email")} />
                      {form.formState.errors.email && (
                        <p className="awake-auth-error">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="awake-auth-field">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="awake-auth-label">{t("auth.password")}</Label>
                        <button type="button" className="awake-auth-forgot-link" onClick={() => setShowForgotPassword(true)}>
                          {t("auth.forgotPassword")}
                        </button>
                      </div>
                      <Input id="password" type="password" autoComplete="current-password" className="awake-auth-input" {...form.register("password")} />
                      {form.formState.errors.password && (
                        <p className="awake-auth-error">{form.formState.errors.password.message}</p>
                      )}
                    </div>

                    {authError && <p className="awake-auth-error" role="alert">{authError}</p>}
                    <button type="submit" className="awake-auth-btn-primary" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? t("auth.wait") : t("auth.meta.login")}
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <button type="button" className="awake-auth-btn-outline" onClick={onGoogle}>
                    <Chrome className="h-4 w-4" aria-hidden /> {t("auth.googleSignup")}
                  </button>

                  <div className="awake-auth-divider">
                    <span className="awake-auth-divider-line" />
                    <span className="awake-auth-divider-text">{t("auth.or")}</span>
                    <span className="awake-auth-divider-line" />
                  </div>

                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="awake-auth-field">
                      <Label htmlFor="email2" className="awake-auth-label">{t("auth.email")}</Label>
                      <Input id="email2" type="email" autoComplete="email" className="awake-auth-input" {...form.register("email")} />
                      {form.formState.errors.email && (
                        <p className="awake-auth-error">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="awake-auth-field">
                      <Label htmlFor="password2" className="awake-auth-label">{t("auth.password")}</Label>
                      <Input id="password2" type="password" autoComplete="new-password" className="awake-auth-input" {...form.register("password")} />
                      {form.formState.errors.password && (
                        <p className="awake-auth-error">{form.formState.errors.password.message}</p>
                      )}
                    </div>

                    {authError && <p className="awake-auth-error" role="alert">{authError}</p>}
                    <button type="submit" className="awake-auth-btn-primary" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? t("auth.wait") : t("auth.meta.signup")}
                    </button>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="mt-6">
                <button type="button" className="awake-auth-btn-outline w-full" onClick={onGoogle}>
                  <Chrome className="h-4 w-4" aria-hidden /> {t("auth.googleLogin")}
                </button>
                <div className="awake-auth-divider">
                  <span className="awake-auth-divider-line" />
                  <span className="awake-auth-divider-text">{t("auth.or")}</span>
                  <span className="awake-auth-divider-line" />
                </div>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="awake-auth-field">
                    <Label htmlFor="email" className="awake-auth-label">{t("auth.email")}</Label>
                    <Input id="email" type="email" autoComplete="email" className="awake-auth-input" {...form.register("email")} />
                    {form.formState.errors.email && (
                      <p className="awake-auth-error">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="awake-auth-field">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="awake-auth-label">{t("auth.password")}</Label>
                      <button type="button" className="awake-auth-forgot-link" onClick={() => setShowForgotPassword(true)}>
                        {t("auth.forgotPassword")}
                      </button>
                    </div>
                    <Input id="password" type="password" autoComplete="current-password" className="awake-auth-input" {...form.register("password")} />
                    {form.formState.errors.password && (
                      <p className="awake-auth-error">{form.formState.errors.password.message}</p>
                    )}
                  </div>
                  {authError && <p className="awake-auth-error" role="alert">{authError}</p>}
                  <button type="submit" className="awake-auth-btn-primary w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? t("auth.wait") : t("auth.meta.login")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
