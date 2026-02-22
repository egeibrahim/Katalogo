import "./landing.css";
import "./landing-awake.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Check, ArrowRight, Menu, X } from "lucide-react";

const AWAKE_BASE = "/awake";

export default function Pricing() {
  usePageMeta({ title: "Fiyatlandırma – Newcatalog" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const plans = [
    {
      name: "Kişisel",
      description: "Bireysel kullanım, ücretsiz başlangıç.",
      price: "Ücretsiz",
      period: "",
      features: [
        "Sınırsız ürün",
        "Koleksiyonlar",
        "Tasarımcı erişimi",
        "Temel dışa aktarma",
      ],
      cta: "Ücretsiz başla",
      href: "/auth",
      highlighted: false,
    },
    {
      name: "Marka",
      description: "Marka sayfası ve teklif yönetimi.",
      price: "Yakında",
      period: "",
      features: [
        "Kişisel plan özellikleri",
        "Marka sayfası (özel URL)",
        "Teklif talepleri",
        "Müşteri yönetimi",
      ],
      cta: "Bilgi al",
      href: "/auth",
      highlighted: true,
    },
    {
      name: "Premium",
      description: "Özel alan adı ve gelişmiş özellikler.",
      price: "Yakında",
      period: "",
      features: [
        "Marka plan özellikleri",
        "Özel alan adı (custom domain)",
        "Öncelikli destek",
        "Gelişmiş analitik",
      ],
      cta: "İletişime geç",
      href: "/auth",
      highlighted: false,
    },
  ];

  return (
    <div className="landing-page" data-landing>
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo" onClick={closeMobileMenu}>
            <img src={`${AWAKE_BASE}/logos/logo-dark.svg`} alt="Newcatalog" />
          </Link>
          <button
            type="button"
            className="landing-nav-toggle"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label="Menü"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <nav className={`landing-nav ${mobileMenuOpen ? "landing-nav-open" : ""}`}>
            <Link to="/#aboutus" onClick={closeMobileMenu}>Hakkımızda</Link>
            <Link to="/features" onClick={closeMobileMenu}>Özellikler</Link>
            <Link to="/#work" onClick={closeMobileMenu}>İşler</Link>
            <Link to="/pricing" onClick={closeMobileMenu}>Fiyat</Link>
            <Link to="/auth" className="landing-cta" onClick={closeMobileMenu}>Giriş</Link>
          </nav>
        </div>
        {mobileMenuOpen && (
          <div className="landing-nav-overlay" onClick={closeMobileMenu} aria-hidden />
        )}
      </header>

      <main className="landing-section" style={{ paddingTop: "120px" }}>
        <div className="landing-section-inner">
          <h1 className="landing-title-center" style={{ marginBottom: "0.5rem" }}>
            İhtiyacına uygun planı seç
          </h1>
          <p className="landing-muted landing-text-center" style={{ maxWidth: 480, margin: "0 auto 3rem" }}>
            Ücretsiz planla hemen başla. Marka ve Premium planları yakında.
          </p>

          <div className="landing-pricing-grid">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`landing-pricing-card ${plan.highlighted ? "landing-pricing-card--highlight" : ""}`}
              >
                {plan.highlighted && <span className="landing-pricing-badge">Önerilen</span>}
                <h2 className="landing-pricing-name">{plan.name}</h2>
                <p className="landing-pricing-desc">{plan.description}</p>
                <div className="landing-pricing-price">
                  {plan.price}
                  {plan.period && <span className="landing-pricing-period">{plan.period}</span>}
                </div>
                <ul className="landing-pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check className="landing-pricing-check" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={plan.highlighted ? "landing-btn-primary landing-pricing-cta" : "landing-pricing-cta-outline"}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-grid">
            <div>
              <h3>Hazır mısın?</h3>
              <p className="landing-muted">Newcatalog ile bugün başla.</p>
              <Link to="/auth" className="landing-link-blue landing-mt-3">
                Ücretsiz başla
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div>
              <h3>Ürün</h3>
              <ul>
                <li><Link to="/features">Özellikler</Link></li>
                <li><Link to="/designer">Tasarımcı</Link></li>
                <li><Link to="/pricing">Fiyatlandırma</Link></li>
              </ul>
            </div>
            <div>
              <h3>Newcatalog</h3>
              <ul>
                <li><Link to="/auth">Giriş</Link></li>
                <li><Link to="/catalog/all">Katalog</Link></li>
              </ul>
            </div>
          </div>
          <p className="landing-copy">
            © {new Date().getFullYear()} Newcatalog. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}
