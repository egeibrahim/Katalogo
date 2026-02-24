import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chrome } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

import "./landing-awake.css";
import "./auth-awake.css";

const authSchema = z.object({
  email: z.string().email("Geçerli bir e‑posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

type AuthValues = z.infer<typeof authSchema>;

function authErrorMessage(error: { message?: string } | null, isSignUp = false): string {
  if (!error?.message) return "Bir hata oluştu.";
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials"))
    return "E‑posta veya şifre hatalı. Lütfen kontrol edin.";
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed"))
    return "Giriş yapmak için e‑posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzu (ve spam klasörünü) kontrol edin.";
  if (msg.includes("user not found")) return "Bu e‑posta ile kayıtlı kullanıcı bulunamadı.";
  if (msg.includes("already registered") || msg.includes("user_already_exists") || msg.includes("already in use"))
    return "Bu e‑posta adresi zaten kayıtlı. Giriş sekmesinden giriş yapın veya farklı bir e‑posta kullanın.";
  if (msg.includes("password") && msg.includes("weak"))
    return "Şifre yeterince güçlü değil. En az 6 karakter ve mümkünse harf + rakam kullanın.";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch"))
    return "Bağlantı hatası. Kontrol edin: (1) İnternet bağlantısı (2) .env veya Vercel ortam değişkenlerinde VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY tanımlı mı? (3) Supabase projesi aktif mi (pause edilmemiş olmalı).";
  return error.message;
}

type LocationState = {
  from?: { pathname?: string };
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading, signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth();

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const st = (location.state as LocationState | null) ?? null;
    return st?.from?.pathname ?? "/catalog/all";
  }, [location.state]);

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  usePageMeta({
    title: showForgotPassword ? "Şifremi Unuttum" : tab === "login" ? "Giriş Yap" : "Kayıt Ol",
    noIndex: true,
  });

  useEffect(() => {
    setAuthError(null);
  }, [tab]);

  useEffect(() => {
    if (!isLoading && session) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, session, navigate, redirectTo]);

  // Oturum varsa formu gösterme; yönlendirme mesajı göster (açılıp kapanma hissini önler)
  if (session) {
    return (
      <div className="landing-page awake-auth-page">
        <div className="awake-auth-inner flex items-center justify-center">
          <p className="awake-auth-desc">Yönlendiriliyorsunuz…</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: AuthValues) => {
    setAuthError(null);
    if (tab === "login") {
      const { error } = await signIn(values.email, values.password);
      if (error) {
        const message = authErrorMessage(error, false);
        setAuthError(message);
        toast({ title: "İşlem başarısız", description: message, variant: "destructive" });
        return;
      }
      toast({ title: "Giriş başarılı", description: "Yönlendiriliyorsunuz…" });
      return;
    }
    const { error, needsEmailConfirmation } = await signUp(values.email, values.password);
    if (error) {
      const message = authErrorMessage(error, true);
      setAuthError(message);
      toast({ title: "Kayıt başarısız", description: message, variant: "destructive" });
      return;
    }
    if (needsEmailConfirmation) {
      setAuthError(null);
      toast({
        title: "Kayıt başarılı",
        description: "Giriş yapmak için e‑posta adresinize gelen doğrulama linkine tıklayın.",
      });
      return;
    }
    toast({ title: "Kayıt başarılı", description: "Yönlendiriliyorsunuz…" });
  };

  const onGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google ile giriş başarısız",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email) {
      toast({ title: "E‑posta girin", variant: "destructive" });
      return;
    }
    setForgotSubmitting(true);
    const { error } = await resetPasswordForEmail(email);
    setForgotSubmitting(false);
    if (error) {
      toast({ title: "Gönderilemedi", description: error.message, variant: "destructive" });
      return;
    }
    setForgotSent(true);
    toast({
      title: "E‑posta gönderildi",
      description: "Şifre sıfırlama linki e‑posta adresinize gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.",
    });
  };

  return (
    <div className="landing-page awake-auth-page">
      <div className="awake-auth-inner">
        {!isSupabaseConfigured && (
          <div className="awake-auth-warning">
            <strong>Supabase ayarları eksik.</strong> Giriş yapabilmek için proje kökünde <code>.env</code> dosyasında <code>VITE_SUPABASE_URL</code> ve <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> tanımlayın (Supabase Dashboard → Project Settings → API). Canlı sitede ise Vercel → Project → Settings → Environment Variables.
          </div>
        )}
        <div className="awake-auth-card">
          <div className="awake-auth-card-header">
            <h1 className="awake-auth-title">
              {showForgotPassword ? "Şifremi unuttum" : "Hesabınıza giriş yapın"}
            </h1>
            <p className="awake-auth-desc">
              {showForgotPassword
                ? "E‑posta adresinizi girin, size şifre sıfırlama linki gönderelim."
                : "Kayıtlı e‑posta ve şifrenizle giriş yapın veya yeni hesap oluşturun."}
            </p>
          </div>
          <div className="awake-auth-card-body">
            {showForgotPassword ? (
              forgotSent ? (
                <>
                  <p className="awake-auth-forgot-success">
                    Şifre sıfırlama linki <strong>{forgotEmail}</strong> adresine gönderildi. E‑postanızı kontrol edin.
                  </p>
                  <button type="button" className="awake-auth-btn-outline" onClick={() => setShowForgotPassword(false)}>
                    Girişe dön
                  </button>
                </>
              ) : (
                <form onSubmit={onForgotSubmit} className="space-y-4">
                  <div className="awake-auth-field">
                    <Label htmlFor="forgot-email" className="awake-auth-label">E‑posta</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="ornek@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotSubmitting}
                      className="awake-auth-input"
                    />
                  </div>
                  <button type="submit" className="awake-auth-btn-primary" disabled={forgotSubmitting}>
                    {forgotSubmitting ? "Gönderiliyor…" : "Sıfırlama linki gönder"}
                  </button>
                  <a href="#" className="awake-auth-back-link" onClick={(e) => { e.preventDefault(); setShowForgotPassword(false); }}>
                    Girişe dön
                  </a>
                </form>
              )
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                <TabsList className="awake-auth-tabs-list">
                  <TabsTrigger value="login" className="awake-auth-tabs-trigger">Giriş</TabsTrigger>
                  <TabsTrigger value="signup" className="awake-auth-tabs-trigger">Kayıt ol</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <button type="button" className="awake-auth-btn-outline" onClick={onGoogle}>
                    <Chrome className="h-4 w-4" aria-hidden /> Google ile devam et
                  </button>

                  <div className="awake-auth-divider">
                    <span className="awake-auth-divider-line" />
                    <span className="awake-auth-divider-text">veya</span>
                    <span className="awake-auth-divider-line" />
                  </div>

                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="awake-auth-field">
                      <Label htmlFor="email" className="awake-auth-label">E‑posta</Label>
                      <Input id="email" type="email" autoComplete="email" className="awake-auth-input" {...form.register("email")} />
                      {form.formState.errors.email && (
                        <p className="awake-auth-error">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="awake-auth-field">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="awake-auth-label">Şifre</Label>
                        <button type="button" className="awake-auth-forgot-link" onClick={() => setShowForgotPassword(true)}>
                          Şifremi unuttum
                        </button>
                      </div>
                      <Input id="password" type="password" autoComplete="current-password" className="awake-auth-input" {...form.register("password")} />
                      {form.formState.errors.password && (
                        <p className="awake-auth-error">{form.formState.errors.password.message}</p>
                      )}
                    </div>

                    {authError && <p className="awake-auth-error" role="alert">{authError}</p>}
                    <button type="submit" className="awake-auth-btn-primary" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Bekleyin…" : "Giriş Yap"}
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <button type="button" className="awake-auth-btn-outline" onClick={onGoogle}>
                    <Chrome className="h-4 w-4" aria-hidden /> Google ile kayıt ol
                  </button>

                  <div className="awake-auth-divider">
                    <span className="awake-auth-divider-line" />
                    <span className="awake-auth-divider-text">veya</span>
                    <span className="awake-auth-divider-line" />
                  </div>

                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="awake-auth-field">
                      <Label htmlFor="email2" className="awake-auth-label">E‑posta</Label>
                      <Input id="email2" type="email" autoComplete="email" className="awake-auth-input" {...form.register("email")} />
                      {form.formState.errors.email && (
                        <p className="awake-auth-error">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="awake-auth-field">
                      <Label htmlFor="password2" className="awake-auth-label">Şifre</Label>
                      <Input id="password2" type="password" autoComplete="new-password" className="awake-auth-input" {...form.register("password")} />
                      {form.formState.errors.password && (
                        <p className="awake-auth-error">{form.formState.errors.password.message}</p>
                      )}
                    </div>

                    {authError && <p className="awake-auth-error" role="alert">{authError}</p>}
                    <button type="submit" className="awake-auth-btn-primary" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Bekleyin…" : "Kayıt Ol"}
                    </button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
