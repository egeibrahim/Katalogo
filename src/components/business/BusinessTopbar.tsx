import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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

const TITLES: Array<{ prefix: string; title: string; subtitle: string }> = [
  { prefix: "/brand/catalogs", title: "brand.topbarCatalogs", subtitle: "brand.topbarCatalogsSubtitle" },
];

export function BusinessTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
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
    return hit ?? { title: "brand.topbarDefault", subtitle: "" };
  }, [location.pathname]);

  const email = session?.user?.email ?? "";
  const initials = (email || "U").slice(0, 2).toUpperCase();

  return (
    <header className={`sticky top-0 z-40 border-b topbar-landing-standard ${scrolled ? "topbar-landing-standard--scrolled" : ""}`}>
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{t(meta.title)}</p>
          <p className="truncate text-xs text-muted-foreground">{meta.subtitle ? t(meta.subtitle) : ""}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="max-w-[180px] truncate">{email}</span>
                <Badge variant="outline" className="font-normal shrink-0">{getPlanDisplayName(membership?.plan)}</Badge>
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
                  navigate("/auth", { replace: true });
                }}
              >
                {t("nav.logoutLong")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
