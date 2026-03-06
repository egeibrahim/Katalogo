import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

const TOP_NAV = [
  { label: "Catalog", to: "/catalog" },
  { label: "Solutions", to: "#" },
  { label: "Academy", to: "#" },
  { label: "Blog", to: "#" },
  { label: "Enterprise", to: "#" },
  { label: "Affiliate", to: "#" },
] as const;

export function TopMenu() {
  const { user, signInWithGoogle } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <header className={`sticky top-0 z-50 border-b topbar-landing-standard ${scrolled ? "topbar-landing-standard--scrolled" : ""}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/home" className="text-sm font-semibold tracking-tight" aria-label={t("legacy.topmenu.brand")}>
          {t("legacy.topmenu.brand").toUpperCase()}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Top menu">
          {TOP_NAV.map((item) =>
            item.to === "#" ? (
              <a key={item.label} href="#" className="text-muted-foreground hover:text-foreground">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} to={item.to} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("nav.cart")}>
            <ShoppingCart className="h-4 w-4" />
          </Button>

          <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground md:flex">
            <Globe className="h-4 w-4" aria-hidden />
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-8 w-[80px] bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {LOCALES.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!user ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="hidden md:inline-flex"
                onClick={onGoogle}
              >
                {t("nav.continueWithGoogle")}
              </Button>

              <Link className="hidden text-sm font-medium md:inline-flex" to="/auth">
                {t("nav.login")}
              </Link>

              <Button asChild>
                <Link to="/pricing">{t("nav.getStarted")}</Link>
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/catalog">{t("nav.catalog")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
