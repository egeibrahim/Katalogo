import { Link } from "react-router-dom";

const logoContent = (
  <>
    <span className="logo-mark" aria-hidden>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect className="logo-mark-bg" width="32" height="32" rx="8" />
        <path
          className="logo-mark-fg"
          d="M10 6v20h2.5v-8L18 26h2.5l-5.5-7 5.5-8h-2.5l-4 5.5V6H10z"
        />
      </svg>
    </span>
    <span className="logo-wordmark">Katalogo</span>
  </>
);

export function Logo({ className = "", asLink = true }: { className?: string; asLink?: boolean }) {
  const cls = `logo ${className}`.trim();
  if (asLink) return <Link to="/" className={cls}>{logoContent}</Link>;
  return <span className={cls}>{logoContent}</span>;
}
