import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe, LogOut, Menu, Search, ShoppingCart, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useUserMembership } from "@/hooks/useUserMembership";
import { getPlanDisplayName } from "@/lib/planFeatures";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

type NavItem = { label: string; to: string };

export function NewcatalogTopNav() {
  const { locale, setLocale, t } = useI18n();
  const { user, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { data: membership } = useUserMembership(user?.id ?? null);
  const { totalCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const panelHref = isAdmin ? "/admin" : "/brand";
  const canAccessPanel = isAdmin || membership?.plan === "brand";

  const onGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onLogout = async () => {
    await signOut();
  };

  /* Tek menü: landing + dashboard linkleri */
  const NAV: NavItem[] = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.about"), to: "/#aboutus" },
    { label: t("nav.works"), to: "/#work" },
    { label: t("nav.pricing"), to: "/pricing" },
    ...(user ? [{ label: t("nav.catalog"), to: "/catalog/all" }] : []),
    { label: t("nav.brands"), to: "/brands" },
    { label: t("nav.blog"), to: "/blog" },
  ];

  return (
    <header className={`ru-topnav topbar-landing-standard ${scrolled ? "ru-topnav--scrolled topbar-landing-standard--scrolled" : ""}`} aria-label="Top navigation">
      <div className="ru-promo">
        <div className="ru-max">
          <div className="flex h-8 items-center justify-center px-6 text-xs font-semibold">
            Create by you, built with {t("legacy.topmenu.brand")}
          </div>
        </div>
      </div>

      <div className="ru-max">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <Link to="/" className="ru-logo" aria-label="Katalogo">
            Katalogo
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex" aria-label="Primary">
            {NAV.map((it) => (
              <Link key={it.label} to={it.to} className="ru-navlink">
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="ru-iconbtn md:hidden"
              aria-label={mobileOpen ? t("nav.menuClose") : t("nav.menu")}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
            <button type="button" className="ru-iconbtn" aria-label={t("nav.search")}>
              <Search className="h-4 w-4" aria-hidden />
            </button>
            <Link to="/cart" className="ru-iconbtn relative" aria-label={t("nav.cart")}>
              <ShoppingCart className="h-4 w-4" aria-hidden />
              {totalCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {totalCount > 99 ? "99+" : totalCount}
                </span>
              ) : null}
            </Link>

            <div className="hidden items-center gap-2 md:flex" aria-label="Language">
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger className="h-9 w-[84px] bg-transparent">
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

            <div className="hidden items-center gap-2 text-sm font-semibold text-foreground/80 md:flex" aria-label="Currency">
              <Globe className="h-4 w-4" aria-hidden />
              <span>{t("common.currency")}</span>
            </div>

            {user ? (
              <>
                <button
                  type="button"
                  className="ru-iconbtn"
                  onClick={onLogout}
                  aria-label={t("nav.logout")}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
                <span
                  className="hidden sm:inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground/80"
                  aria-label={t("nav.accountType")}
                  title={t("nav.accountType")}
                >
                  {getPlanDisplayName(membership?.plan)}
                </span>
                {canAccessPanel ? (
                  <Link to={panelHref} className="ru-cta">
                    {t("nav.panel")}
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <Link className="hidden text-sm font-semibold md:inline-flex" to="/auth">
                  {t("nav.login")}
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  className="hidden md:inline-flex"
                  onClick={onGoogle}
                >
                  {t("nav.continueWithGoogle")}
                </Button>
                <Link to="/pricing" className="ru-cta">
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobil menü: linkler */}
        {mobileOpen && (
          <div className="border-t border-border bg-background md:hidden">
            <nav className="flex flex-col gap-0 px-6 py-3" aria-label="Mobil menü">
              {NAV.map((it) => (
                <Link
                  key={it.label}
                  to={it.to}
                  className="ru-navlink block rounded-lg px-3 py-2.5 text-sm font-semibold"
                  onClick={() => setMobileOpen(false)}
                >
                  {it.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
