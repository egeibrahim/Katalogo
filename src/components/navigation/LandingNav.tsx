import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, Menu, ShoppingCart, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserMembership } from "@/hooks/useUserMembership";
import { getPlanDisplayName } from "@/lib/planFeatures";
import { useCart } from "@/contexts/CartContext";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { Logo } from "@/components/Logo";

import "@/pages/landing.css";
import "@/pages/landing-awake.css";

type NavItem = { label: string; to: string };

export function LandingNav() {
  const { t } = useI18n();
  const { user, isAdmin, signOut } = useAuth();
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

  const panelHref = isAdmin ? "/admin" : "/business";
  const closeMobile = () => setMobileOpen(false);

  const NAV: NavItem[] = [
    { label: "Ana Sayfa", to: "/" },
    { label: "Hakkımızda", to: "/#aboutus" },
    { label: t("nav.features"), to: "/features" },
    { label: "İşler", to: "/#work" },
    { label: t("nav.pricing"), to: "/pricing" },
    { label: t("nav.catalog"), to: "/catalog/all" },
    { label: "Markalar", to: "/brands" },
    { label: t("nav.blog"), to: "/blog" },
  ];

  return (
    <div className="landing-page landing-page--nav-only">
      <header className={`landing-header landing-header--sticky ${scrolled ? "landing-header--scrolled" : ""}`}>
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo" onClick={closeMobile} aria-label="Katalogo">
            <Logo asLink={false} />
          </Link>
          <button
            type="button"
            className="landing-nav-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Menü"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <nav className={`landing-nav ${mobileOpen ? "landing-nav-open" : ""}`}>
            {NAV.map((it) => (
              <Link key={it.label} to={it.to} onClick={closeMobile}>
                {it.label}
              </Link>
            ))}
            <Link to="/cart" className="relative flex items-center gap-1.5 rounded-full px-3 py-2" onClick={closeMobile} aria-label="Sepet">
              <ShoppingCart className="h-4 w-4" aria-hidden />
              {totalCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--awake-dark)] px-1 text-[10px] font-bold text-white">
                  {totalCount > 99 ? "99+" : totalCount}
                </span>
              )}
            </Link>
            {user ? (
              <>
                <span
                  className="hidden md:inline-flex items-center rounded-full border border-[var(--awake-gray-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--awake-dark)]"
                  aria-label="Hesap türü"
                  title="Hesap türü"
                >
                  {getPlanDisplayName(membership?.plan)}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-base font-medium text-[var(--awake-dark)] bg-transparent hover:bg-white hover:shadow-sm cursor-pointer"
                  onClick={() => { closeMobile(); signOut(); }}
                  aria-label="Çıkış yap"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span>Çıkış</span>
                </button>
                <Link to={panelHref} className="landing-cta" onClick={closeMobile}>
                  {t("nav.panel")}
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={closeMobile}>
                  Giriş
                </Link>
                <Link to="/pricing" className="landing-cta" onClick={closeMobile}>
                  Başla
                </Link>
              </>
            )}
          </nav>
        </div>
        {mobileOpen && <div className="landing-nav-overlay" onClick={closeMobile} aria-hidden />}
      </header>
    </div>
  );
}
