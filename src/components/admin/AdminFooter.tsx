import { Link } from "react-router-dom";

export function AdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="shrink-0 border-t border-border bg-background px-4 py-3"
      aria-label="Admin footer"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© {year} Admin Panel. All rights reserved.</span>
        <nav className="flex items-center gap-4" aria-label="Footer links">
          <Link to="/" className="hover:text-foreground">
            Site
          </Link>
          <Link to="/admin/settings" className="hover:text-foreground">
            Settings
          </Link>
        </nav>
      </div>
    </footer>
  );
}
