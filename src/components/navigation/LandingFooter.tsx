import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n/LocaleProvider";

import "@/pages/landing.css";
import "@/pages/landing-awake.css";

export function LandingFooter() {
  const { t } = useI18n();

  return (
    <footer className="landing-footer landing-reveal">
      <div className="landing-footer-inner">
        <div className="landing-footer-logo-wrap">
          <Logo asLink className="landing-footer-logo" />
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
              <li>
                <Link to="/pricing">{t("nav.pricing")}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>{t("landing.footerCompany")}</h3>
            <ul>
              <li>
                <Link to="/auth">{t("nav.login")}</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="landing-copy">© {new Date().getFullYear()} Katalogo. {t("landing.footerRights")}</p>
      </div>
    </footer>
  );
}
