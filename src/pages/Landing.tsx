import "./landing.css";
import "./landing-awake.css";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ArrowRight, Sparkles, Palette, LayoutGrid, FileText, BarChart3 } from "lucide-react";

const AWAKE_BASE = "/awake";

const FAQ_ITEMS = [
  { q: "Katalogo ne sunar?", a: "Ürün kataloğu yönetimi, koleksiyonlar, yerleşik ürün tasarımcısı ve marka sayfası ile teklif talepleri. Ücretsiz planla başlayabilirsin." },
  { q: "Nasıl başlarım?", a: "Giriş yap veya ücretsiz hesap oluştur, ürünlerini ekle, koleksiyonları kur. Marka sayfan ve tasarımcı tek panelden erişilebilir." },
  { q: "Fiyatlandırma nasıl?", a: "Kişisel plan ücretsiz. Marka ve Premium (özel alan adı) planları yakında. Fiyatlandırma sayfasından güncel bilgi alabilirsin." },
];

export default function Landing() {
  usePageMeta({ title: "Katalogo – Ürün kataloğunu tasarla ve yayınla" });

  const services = [
    { icon: Palette, title: "Koleksiyonlar", class: "landing-card--purple" },
    { icon: LayoutGrid, title: "Tasarımcı", class: "landing-card--blue" },
    { icon: FileText, title: "Marka sayfası", class: "landing-card--orange" },
    { icon: BarChart3, title: "Teklifler", class: "landing-card--green" },
    { icon: Sparkles, title: "Yayın", class: "landing-card--red" },
  ];

  const workItems = [
    { img: `${AWAKE_BASE}/work/work-img-1.jpg`, title: "Katalog projesi", tags: ["UX", "Tasarım"] },
    { img: `${AWAKE_BASE}/work/work-img-2.jpg`, title: "Marka sayfası", tags: ["Ürün", "Arayüz"] },
    { img: `${AWAKE_BASE}/work/work-img-3.jpg`, title: "Koleksiyon", tags: ["Marka", "UX"] },
    { img: `${AWAKE_BASE}/work/work-img-4.jpg`, title: "Görsel dil", tags: ["Görsel", "Mobil"] },
  ];

  const team = [
    { img: `${AWAKE_BASE}/team/team-img-1.png`, name: "Logan Dang", role: "Geliştirici" },
    { img: `${AWAKE_BASE}/team/team-img-2.png`, name: "Ana Belić", role: "Pazarlama" },
    { img: `${AWAKE_BASE}/team/team-img-3.png`, name: "Brian Hanley", role: "Ürün Tasarımcı" },
    { img: `${AWAKE_BASE}/team/team-img-4.png`, name: "Darko Stanković", role: "UI Tasarımcı" },
  ];

  const brandLogos = [
    `${AWAKE_BASE}/brands/logo-ipsum-1.svg`,
    `${AWAKE_BASE}/brands/logo-ipsum-2.svg`,
    `${AWAKE_BASE}/brands/logo-ipsum-3.svg`,
    `${AWAKE_BASE}/brands/logo-ipsum-4.svg`,
    `${AWAKE_BASE}/brands/logo-ipsum-5.svg`,
  ];

  return (
    <div className="landing-page" data-landing>
      {/* Üst menü AppLayout içinde NewcatalogTopNav ile tek menü */}
      <section className="landing-hero">
        <div className="landing-hero-inner landing-section-inner">
          <h1>
            Cesur markaları <em className="font-instrument">akıllı tasarımla</em> inşa ediyoruz
          </h1>
          <p className="landing-hero-p">
            Katalogo ile küçük işletmeler ürün kataloğunu tek yerden yönetir; stratejiden yayına kadar rehberlik ederiz.
          </p>
          <div className="landing-btn-wrap">
            <Link to="/pricing" className="landing-btn-primary">
              Ücretsiz başla
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="landing-trusted">
            <div className="landing-avatars">
              {[1, 2, 3, 4].map((i) => (
                <img key={i} src={`${AWAKE_BASE}/profile/user-${i}.jpg`} alt="" />
              ))}
            </div>
            <p className="landing-trusted-text">200+ marka tarafından güvenilir</p>
          </div>
        </div>
      </section>

      {/* Logo marquee */}
      <section className="landing-marquee">
        <div className="landing-section-inner">
          <div className="landing-marquee-inner">
            {[...brandLogos, ...brandLogos].map((src, i) => (
              <img key={i} src={src} alt="" />
            ))}
          </div>
        </div>
      </section>

      {/* Count – pills + stats */}
      <section className="landing-section" id="aboutus">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">
            Deneyim ve teknoloji odaklı stratejilerle <em className="font-instrument">etkili sonuçlar</em>
          </h2>
          <div className="landing-pills">
            <span className="landing-pill landing-pill--secondary">Yaratıcılık</span>
            <span className="landing-pill landing-pill--info">İnovasyon</span>
            <span className="landing-pill landing-pill--orange">Strateji</span>
          </div>
          <div className="landing-stats">
            <div>
              <div className="landing-stat-num">+40</div>
              <div className="landing-stat-label">Tamamlanan proje</div>
            </div>
            <div>
              <div className="landing-stat-num">+15</div>
              <div className="landing-stat-label">Yıllık deneyim</div>
            </div>
            <div>
              <div className="landing-stat-num">+12</div>
              <div className="landing-stat-label">Tasarım ödülü</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services – Where innovation meets aesthetics + cards + CTA bar */}
      <section className="landing-section" id="services">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">
            İnovasyon <em className="font-instrument">estetikle</em> buluşuyor
          </h2>
          <div className="landing-cards">
            {services.map(({ icon: Icon, title, class: c }) => (
              <div key={title} className={`landing-card ${c}`}>
                <Icon className="w-10 h-10" style={{ width: 40, height: 40 }} aria-hidden />
                <h4>{title}</h4>
              </div>
            ))}
          </div>
          <div className="landing-cta-bar">
            <h3>İşlerimizi inceleyin. Yaratıcı yolculuğa birlikte başlayalım.</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}>
              <Link to="/pricing" className="landing-btn-white">
                Hemen başla
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/catalog/all" className="landing-btn-outline-light">
                Kataloğu gör
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Work */}
      <section className="landing-section" id="work">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">
            Küçük işletmelerin <em className="font-instrument">çevrimiçi varlığını</em> nasıl dönüştürdük
          </h2>
          <div className="landing-work-grid">
            {workItems.map(({ img, title, tags }) => (
              <div key={title} className="landing-work-card">
                <div className="landing-work-img">
                  <img src={img} alt={title} />
                </div>
                <div>
                  <Link to="/features" className="landing-work-title">{title}</Link>
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

      {/* Team */}
      <section className="landing-section" id="team">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">
            Başarımızın arkasındaki <em className="font-instrument">yaratıcı ekip</em>
          </h2>
          <div className="landing-team-grid">
            {team.map(({ img, name, role }) => (
              <div key={name} className="landing-team-card">
                <img src={img} alt={name} />
                <h6>{name}</h6>
                <p>{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial – tek blok */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">Müşterilerimiz ne diyor?</h2>
          <div className="landing-quote-card" style={{ maxWidth: 640, margin: "0 auto" }}>
            <p>
              "Katalogo'nun uzmanlığı vizyonumu yaratıcılık, hassasiyet ve hedeflerimi anlayarak başarıya taşıdı."
            </p>
            <footer>
              <cite>
                <span className="landing-quote-name">Sarah Mitchell</span>
                <br />
                <span className="landing-quote-role">Chipsland Kurucusu</span>
              </cite>
            </footer>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section landing-section-alt" id="faq">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">Sorularınız mı var? Cevaplar burada</h2>
          <div className="landing-faq">
            {FAQ_ITEMS.map(({ q, a }) => (
              <details key={q} className="landing-faq-item">
                <summary className="landing-faq-q">{q}</summary>
                <p className="landing-faq-a">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="landing-section" id="pricing">
        <div className="landing-section-inner">
          <h2 className="landing-title-center">İhtiyacına uygun planı seç</h2>
          <p className="landing-muted landing-text-center landing-mt-4" style={{ maxWidth: 480, margin: "0 auto 2rem" }}>
            Ücretsiz planla hemen başla; marka sayfası ve özel alan adı için planlar yakında.
          </p>
          <div className="landing-btn-wrap landing-text-center">
            <Link to="/pricing" className="landing-btn-primary">
              Fiyatlandırmayı incele
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-grid">
            <div>
              <h3>Hazır mısın?</h3>
              <p className="landing-muted">Katalogo ile bugün başla.</p>
              <Link to="/pricing" className="landing-link-blue landing-mt-3">
                Ücretsiz başla
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div>
              <h3>Ürün</h3>
              <ul>
                <li><Link to="/features">Özellikler</Link></li>
                <li><Link to="/designer">Tasarımcı</Link></li>
                <li><Link to="/pricing">Fiyat</Link></li>
              </ul>
            </div>
            <div>
              <h3>Katalogo</h3>
              <ul>
                <li><Link to="/auth">Giriş</Link></li>
                <li><Link to="/catalog/all">Katalog</Link></li>
              </ul>
            </div>
          </div>
          <p className="landing-copy">
            © {new Date().getFullYear()} Katalogo. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}
