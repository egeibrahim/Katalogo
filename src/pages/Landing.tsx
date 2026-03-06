import "./landing.css";
import "./landing-awake.css";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ArrowRight, Sparkles, Palette, LayoutGrid, FileText, BarChart3 } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { Logo } from "@/components/Logo";

const AWAKE_BASE = "/awake";

export default function Landing() {
  const { t, locale } = useI18n();
  usePageMeta({ title: t("landing.metaTitle") });

  useEffect(() => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";

    const targets = Array.from(document.querySelectorAll<HTMLElement>(".landing-reveal"));
    if (targets.length === 0) return () => { document.documentElement.style.scrollBehavior = previous; };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      document.documentElement.style.scrollBehavior = previous;
    };
  }, []);

  const FAQ_ITEMS = [
    { q: t("landing.faqQ1"), a: t("landing.faqA1") },
    { q: t("landing.faqQ2"), a: t("landing.faqA2") },
    { q: t("landing.faqQ3"), a: t("landing.faqA3") },
  ];

  const services = [
    { icon: Palette, title: t("landing.servicesCollections"), class: "landing-card--purple" },
    { icon: LayoutGrid, title: t("landing.servicesDesigner"), class: "landing-card--blue" },
    { icon: FileText, title: t("landing.servicesBrandPage"), class: "landing-card--orange" },
    { icon: BarChart3, title: t("landing.servicesQuotes"), class: "landing-card--green" },
    { icon: Sparkles, title: t("landing.servicesPublish"), class: "landing-card--red" },
  ];

  const workItems = [
    { img: `${AWAKE_BASE}/work/work-img-1.jpg`, title: "Katalog projesi", tags: ["UX", "Tasarım"] },
    { img: `${AWAKE_BASE}/work/work-img-2.jpg`, title: "Marka sayfası", tags: ["Ürün", "Arayüz"] },
    { img: `${AWAKE_BASE}/work/work-img-3.jpg`, title: "Koleksiyon", tags: ["Marka", "UX"] },
    { img: `${AWAKE_BASE}/work/work-img-4.jpg`, title: "Görsel dil", tags: ["Görsel", "Mobil"] },
  ];

  const brandLogos = [
    `${AWAKE_BASE}/brands/mark-1.svg`,
    `${AWAKE_BASE}/brands/mark-2.svg`,
    `${AWAKE_BASE}/brands/mark-3.svg`,
    `${AWAKE_BASE}/brands/mark-4.svg`,
    `${AWAKE_BASE}/brands/mark-5.svg`,
    `${AWAKE_BASE}/brands/mark-6.svg`,
    `${AWAKE_BASE}/brands/mark-7.svg`,
    `${AWAKE_BASE}/brands/mark-8.svg`,
    `${AWAKE_BASE}/brands/mark-9.svg`,
    `${AWAKE_BASE}/brands/mark-10.svg`,
  ];
  const brandNames = [
    t("landing.brand1"),
    t("landing.brand2"),
    t("landing.brand3"),
    t("landing.brand4"),
    t("landing.brand5"),
    t("landing.brand6"),
    t("landing.brand7"),
    t("landing.brand8"),
    t("landing.brand9"),
    t("landing.brand10"),
  ];
  const brands = brandNames.map((name, i) => ({ name, logo: brandLogos[i] }));

  const heroTitle =
    locale === "tr"
      ? { pre: "Cesur markaların", em: "katalog ve mockup", post: "merkezi" }
      : { pre: "The", em: "catalog and mockup hub", post: "for bold brands" };

  const commsTitle =
    locale === "tr"
      ? { pre: "Müşteri iletişiminde", em: "harcanan zamanı", post: "geri kazanın" }
      : { pre: "Win back", em: "time spent", post: "in customer communication" };

  const servicesTitle =
    locale === "tr"
      ? { pre: "Üründen satışa", em: "yeni yol haritası", post: "" }
      : { pre: "A new roadmap", em: "from product to sale", post: "" };

  const workTitle =
    locale === "tr"
      ? { pre: "Markaların", em: "çevrimiçi varlığını", post: "nasıl dönüştürdük" }
      : { pre: "How we transformed small businesses'", em: "online presence", post: "" };

  return (
    <div className="landing-page" data-landing>
      {/* Üst menü AppLayout içinde NewcatalogTopNav ile tek menü */}
      <section className="landing-hero landing-reveal">
        <div className="landing-hero-inner landing-section-inner">
          <h1>
            {heroTitle.pre} <em className="font-instrument">{heroTitle.em}</em> {heroTitle.post}
          </h1>
          <p className="landing-hero-p">
            {t("landing.heroSubtitle")}
          </p>
          <div className="landing-btn-wrap">
            <Link to="/pricing" className="landing-btn-primary">
              {t("landing.startFree")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="landing-trusted">
            <div className="landing-avatars">
              {[1, 2, 3, 4].map((i) => (
                <img key={i} src={`${AWAKE_BASE}/profile/user-${i}.jpg`} alt="" />
              ))}
            </div>
            <p className="landing-trusted-text">{t("landing.trusted")}</p>
          </div>
        </div>
      </section>

      {/* Logo marquee — niş yabancı markalar + minimal logolar */}
      <section className="landing-marquee landing-reveal">
        <div className="landing-section-inner">
          <div className="landing-marquee-inner">
            {[...brands, ...brands].map((brand, i) => (
              <div key={i} className="landing-marquee-item">
                <img src={brand.logo} alt={brand.name} className="landing-marquee-logo" />
                <span className="landing-marquee-brand">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Communication pain + video snippets */}
      <section className="landing-section landing-reveal" id="aboutus">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">
            {commsTitle.pre} <em className="font-instrument">{commsTitle.em}</em> {commsTitle.post}
          </h2>
          <div className="landing-video-grid">
            <article className="landing-video-card">
              <video
                className="landing-video-el"
                controls
                muted
                loop
                playsInline
                preload="metadata"
                poster={`${AWAKE_BASE}/work/work-img-1.jpg`}
              >
                <source src={`${AWAKE_BASE}/videos/snippet-1.mp4`} type="video/mp4" />
              </video>
              <p>{t("landing.videoSnippet1")}</p>
            </article>
            <article className="landing-video-card">
              <video
                className="landing-video-el"
                controls
                muted
                loop
                playsInline
                preload="metadata"
                poster={`${AWAKE_BASE}/work/work-img-2.jpg`}
              >
                <source src={`${AWAKE_BASE}/videos/snippet-2.mp4`} type="video/mp4" />
              </video>
              <p>{t("landing.videoSnippet2")}</p>
            </article>
            <article className="landing-video-card">
              <video
                className="landing-video-el"
                controls
                muted
                loop
                playsInline
                preload="metadata"
                poster={`${AWAKE_BASE}/work/work-img-3.jpg`}
              >
                <source src={`${AWAKE_BASE}/videos/snippet-3.mp4`} type="video/mp4" />
              </video>
              <p>{t("landing.videoSnippet3")}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Services – Where innovation meets aesthetics + cards + CTA bar */}
      <section className="landing-section landing-reveal" id="services">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">
            {servicesTitle.pre} <em className="font-instrument">{servicesTitle.em}</em> {servicesTitle.post}
          </h2>
          <div className="landing-work-grid" style={{ marginBottom: "2rem" }}>
            {workItems.slice(0, 4).map(({ img, title, tags }) => (
              <div key={`services-${title}`} className="landing-work-card landing-reveal">
                <div className="landing-work-img">
                  <img src={img} alt={title} />
                </div>
                <div>
                  <span className="landing-work-title">{title}</span>
                  <div className="landing-work-badges">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="landing-cards">
            {services.map(({ icon: Icon, title, class: c }) => (
              <div key={title} className={`landing-card ${c} landing-reveal`}>
                <Icon className="w-10 h-10" style={{ width: 40, height: 40 }} aria-hidden />
                <h4>{title}</h4>
              </div>
            ))}
          </div>
          <div className="landing-cta-bar">
            <h3>{t("landing.workCtaTitle")}</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}>
              <Link to="/pricing" className="landing-btn-white">
                {t("landing.startNow")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/catalog" className="landing-btn-outline-light">
                {t("landing.viewCatalog")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Work */}
      <section className="landing-section landing-reveal" id="work">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">
            {workTitle.pre} <em className="font-instrument">{workTitle.em}</em> {workTitle.post}
          </h2>
          <div className="landing-work-grid">
            {workItems.map(({ img, title, tags }) => (
              <div key={title} className="landing-work-card landing-reveal">
                <div className="landing-work-img">
                  <img src={img} alt={title} />
                </div>
                <div>
                  <span className="landing-work-title">{title}</span>
                  <div className="landing-work-badges">
                    {tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial – tek blok */}
      <section className="landing-section landing-section-alt landing-reveal">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">{t("landing.testimonialTitle")}</h2>
          <div className="landing-quote-card" style={{ maxWidth: 640, margin: "0 auto" }}>
            <p>
              {t("landing.testimonialBody")}
            </p>
            <footer>
              <cite>
                <span className="landing-quote-name">Sarah Mitchell</span>
                <br />
                <span className="landing-quote-role">{t("landing.testimonialRole")}</span>
              </cite>
            </footer>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section landing-section-alt landing-reveal" id="faq">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">{t("landing.faqTitle")}</h2>
          <div className="landing-faq">
            {FAQ_ITEMS.map(({ q, a }) => (
              <details key={q} className="landing-faq-item landing-reveal">
                <summary className="landing-faq-q">{q}</summary>
                <p className="landing-faq-a">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="landing-section landing-reveal" id="pricing">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">{t("landing.pricingCtaTitle")}</h2>
          <p className="landing-muted landing-text-center landing-mt-4" style={{ maxWidth: 480, margin: "0 auto 2rem" }}>
            {t("landing.pricingCtaSubtitle")}
          </p>
          <div className="landing-btn-wrap landing-text-center">
            <Link to="/pricing" className="landing-btn-primary">
              {t("landing.reviewPricing")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer landing-reveal">
        <div className="landing-footer-inner">
          <div className="landing-footer-logo-wrap">
            <Logo asLink={true} className="landing-footer-logo" />
          </div>
          <div className="landing-footer-grid">
            <div>
              <h3>{t("landing.footerReady")}</h3>
              <p className="landing-muted">{t("landing.footerStartToday")}</p>
              <Link to="/pricing" className="landing-link-blue landing-mt-3">
                {t("landing.startFree")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div>
              <h3>{t("landing.footerProduct")}</h3>
              <ul>
                <li><Link to="/pricing">{t("nav.pricing")}</Link></li>
              </ul>
            </div>
            <div>
              <h3>{t("landing.footerCompany")}</h3>
              <ul>
                <li><Link to="/auth">{t("nav.login")}</Link></li>
              </ul>
            </div>
          </div>
          <p className="landing-copy">
            © {new Date().getFullYear()} Katalogo. {t("landing.footerRights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
