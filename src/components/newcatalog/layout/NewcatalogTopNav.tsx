import { Link } from "react-router-dom";
import { Globe, Search, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

type NavItem = { label: string; to: string };

export function NewcatalogTopNav() {
  const { locale, setLocale, t } = useI18n();
  const { user, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { totalCount } = useCart();

  const panelHref = isAdmin ? "/admin" : "/business";

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

  const NAV: NavItem[] = [
    { label: t("nav.catalog"), to: "/catalog/all" },
    { label: "Markalar", to: "/brands" },
    { label: t("nav.features"), to: "/features" },
    { label: t("nav.pricing"), to: "/pricing" },
    { label: t("nav.blog"), to: "/blog" },
  ];

  return (
    <header className="ru-topnav" aria-label="Top navigation">
      <div className="ru-promo">
        <div className="ru-max">
          <div className="flex h-8 items-center justify-center px-6 text-xs font-semibold">
            Create by you, built with Newcatalog
          </div>
        </div>
      </div>

      <div className="ru-max">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <Link to="/catalog/all" className="ru-logo" aria-label="Newcatalog">
            Newcatalog
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex" aria-label="Primary">
            {NAV.map((it) => (
              <Link key={it.label} to={it.to} className="ru-navlink">
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" className="ru-iconbtn" aria-label="Search">
              <Search className="h-4 w-4" aria-hidden />
            </button>
            <Link to="/cart" className="ru-iconbtn relative" aria-label="Sepet">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden text-sm font-semibold md:inline-flex"
                  onClick={onLogout}
                >
                  {t("nav.logout")}
                </Button>
                <Link to={panelHref} className="ru-cta">
                  {t("nav.panel")}
                </Link>
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
                  Continue with Google
                </Button>
                <Link to="/auth" className="ru-cta">
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
