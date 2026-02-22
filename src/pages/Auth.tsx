import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chrome } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

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
  if (msg.includes("network") || msg.includes("fetch"))
    return "Bağlantı hatası. İnternet bağlantınızı ve Supabase ayarlarınızı kontrol edin.";
  return error.message;
}

type LocationState = {
  from?: { pathname?: string };
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading, signIn, signUp, signInWithGoogle } = useAuth();

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const st = (location.state as LocationState | null) ?? null;
    return st?.from?.pathname ?? "/catalog/all";
  }, [location.state]);

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  usePageMeta({ title: tab === "login" ? "Giriş Yap" : "Kayıt Ol", noIndex: true });

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
      <div className="min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-4">
        <p className="text-muted-foreground">Yönlendiriliyorsunuz…</p>
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

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Yönetim Girişi</CardTitle>
            <CardDescription className="space-y-2">
              <span className="block">
                <strong>Admin giriş bilgileri:</strong> Projede hazır kullanıcı yok. Önce <strong>Kayıt</strong> sekmesinden
                bir e‑posta ve en az 6 karakterlik şifre ile kayıt olun. İlk kayıt olan kullanıcı otomatik <strong>admin</strong> olur.
              </span>
              <span className="block">
                Giriş yapmak için aynı e‑posta ve şifreyi <strong>Giriş</strong> sekmesinde kullanın. Daha önce admin oluştuysa
                yeni kayıtlar admin olmaz.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Giriş</TabsTrigger>
                <TabsTrigger value="signup">Kayıt</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
                  <Chrome className="mr-2 h-4 w-4" /> Google ile devam et
                </Button>

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">veya</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="email">E‑posta</Label>
                    <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
                    {form.formState.errors.email ? (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
                    {form.formState.errors.password ? (
                      <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                    ) : null}
                  </div>

                  {authError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {authError}
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Bekleyin…" : "Giriş Yap"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
                  <Chrome className="mr-2 h-4 w-4" /> Google ile kayıt ol
                </Button>

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">veya</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="email2">E‑posta</Label>
                    <Input id="email2" type="email" autoComplete="email" {...form.register("email")} />
                    {form.formState.errors.email ? (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password2">Şifre</Label>
                    <Input id="password2" type="password" autoComplete="new-password" {...form.register("password")} />
                    {form.formState.errors.password ? (
                      <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                    ) : null}
                  </div>

                  {authError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {authError}
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Bekleyin…" : "Kayıt Ol"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
