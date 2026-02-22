import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/hooks/useAuth";

const TITLES: Array<{ prefix: string; title: string; subtitle: string }> = [
  { prefix: "/business/catalogs", title: "Kataloglarım", subtitle: "Kataloglarını oluştur, yayınla ve yönet" },
];

export function BusinessTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  const meta = useMemo(() => {
    const hit = TITLES.find((t) => location.pathname.startsWith(t.prefix));
    return hit ?? { title: "Business", subtitle: "" };
  }, [location.pathname]);

  const email = session?.user?.email ?? "";
  const initials = (email || "U").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{meta.title}</p>
          <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="max-w-[220px] truncate">{email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate("/auth", { replace: true });
                }}
              >
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
