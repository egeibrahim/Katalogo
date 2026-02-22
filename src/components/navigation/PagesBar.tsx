import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type PageLink = { label: string; to: string };

const PAGES: PageLink[] = [];

export function PagesBar() {
  if (PAGES.length === 0) return null;

  const location = useLocation();
  const navigate = useNavigate();

  const current = PAGES.find((p) => p.to === location.pathname)?.to ?? PAGES[0].to;

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4">
        <div className="text-xs font-medium text-muted-foreground">Pages</div>

        {/* Mobile: dropdown */}
        <div className="min-w-0 flex-1 md:hidden">
          <label className="sr-only" htmlFor="pages-select">
            Pages
          </label>
          <select
            id="pages-select"
            value={current}
            onChange={(e) => navigate(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md border border-input bg-background px-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {PAGES.map((p) => (
              <option key={p.to} value={p.to}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop: pills */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Pages">
          {PAGES.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              {p.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
