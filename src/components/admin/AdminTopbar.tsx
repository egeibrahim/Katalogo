import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useUserMembership } from "@/hooks/useUserMembership";
import { getPlanDisplayName } from "@/lib/planFeatures";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { Search } from "lucide-react";

const TITLES: Array<{ prefix: string; title: string; subtitle: string }> = [
  { prefix: "/admin/dashboard", title: "admin.dashboard", subtitle: "admin.subtitle.dashboard" },
  { prefix: "/admin/products", title: "admin.products", subtitle: "admin.subtitle.products" },
  { prefix: "/admin/categories", title: "admin.categories", subtitle: "admin.subtitle.categories" },
  { prefix: "/admin/filters", title: "admin.filters", subtitle: "admin.subtitle.filters" },
  { prefix: "/admin/media", title: "admin.media", subtitle: "admin.subtitle.media" },
  { prefix: "/admin/users", title: "admin.users", subtitle: "admin.subtitle.users" },
  { prefix: "/admin/import", title: "admin.import", subtitle: "admin.subtitle.import" },
  { prefix: "/admin/export", title: "admin.export", subtitle: "admin.subtitle.export" },
  { prefix: "/admin/settings", title: "admin.settings", subtitle: "admin.subtitle.settings" },
];

export function AdminTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, role, isAdmin, signOut } = useAuth();
  const { data: membership } = useUserMembership(session?.user?.id ?? null);
  const [scrolled, setScrolled] = useState(false);
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const meta = useMemo(() => {
    const hit = TITLES.find((t) => location.pathname.startsWith(t.prefix));
    return hit ?? { title: "admin.titleAdmin", subtitle: "" };
  }, [location.pathname]);

  const email = session?.user?.email ?? "";
  const initials = (email || "U").slice(0, 2).toUpperCase();

  return (
    <header className={`sticky top-0 z-40 border-b topbar-landing-standard ${scrolled ? "topbar-landing-standard--scrolled" : ""}`}>
      <div className="flex h-14 items-center gap-3 px-4">
        {/* IMPORTANT: single global trigger lives here */}
        <SidebarTrigger />

        <Separator orientation="vertical" className="h-6" />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{t(meta.title)}</p>
          <p className="truncate text-xs text-muted-foreground">{meta.subtitle ? t(meta.subtitle) : ""}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 w-[280px] pl-8" placeholder={t("admin.searchPlaceholder")} aria-label={t("nav.search")} />
          </div>

          <div className="hidden md:inline-flex items-center">
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-9 w-[84px] bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {LOCALES.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!session ? (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-[160px] truncate">{email}</span>
                  <Badge variant="outline" className="font-normal">{getPlanDisplayName(membership?.plan)}</Badge>
                  {isAdmin && <Badge variant="default">{role ?? "admin"}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {getPlanDisplayName(membership?.plan)}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate("/", { replace: true });
                  }}
                >
                  {t("nav.logoutLong")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
