import { Link } from "react-router-dom";

const logoImg = <img src="/logo.png" alt="Katalogo" className="logo-img" />;

export function Logo({ className = "", asLink = true }: { className?: string; asLink?: boolean }) {
  const cls = `logo ${className}`.trim();
  if (asLink) return <Link to="/" className={cls}>{logoImg}</Link>;
  return <span className={cls}>{logoImg}</span>;
}
