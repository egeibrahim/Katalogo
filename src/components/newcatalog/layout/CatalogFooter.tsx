import * as React from "react";
import { Link } from "react-router-dom";

const footerCols = [
  {
    title: "Info",
    links: [
      { label: "About", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", to: "/faq" },
      { label: "Shipping", to: "/shipping" },
      { label: "Returns", to: "/returns" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Contact", to: "/contact" },
    ],
  },
];

export const CatalogFooter = React.forwardRef<HTMLElement>(function CatalogFooter(_props, ref) {
  return (
    <footer ref={ref as React.RefObject<HTMLElement>} className="ru-footer" aria-label="Footer">
      <div className="ru-footer-top">
        <div className="ru-footer-hero">
          <p className="ru-footer-tagline">Custom products, made for you</p>
        </div>

        <div className="ru-footer-cols" aria-label="Footer links">
          {footerCols.map((col) => (
            <div key={col.title} className="ru-footer-col">
              <h3 className="ru-footer-title">{col.title}</h3>
              {col.links.map((l) => (
                <Link key={l.label} to={l.to} className="ru-footer-link">
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="ru-footer-divider" />
      <div className="ru-footer-bottom">
        <p className="ru-footer-copy">© {new Date().getFullYear()} All rights reserved.</p>
      </div>
    </footer>
  );
});

CatalogFooter.displayName = "CatalogFooter";
