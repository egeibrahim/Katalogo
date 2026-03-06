import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  BookOpen,
  Tags,
  SlidersHorizontal,
  Image as ImageIcon,
  Users,
  Download,
  FileDown,
  Settings,
  LogOut,
} from "lucide-react";

import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { title: "admin.dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "admin.products", url: "/admin/products", icon: Package },
  { title: "admin.catalog", url: "/admin/catalog", icon: BookOpen },
  { title: "admin.categories", url: "/admin/categories", icon: Tags },
  { title: "admin.filters", url: "/admin/filters", icon: SlidersHorizontal },
  { title: "admin.media", url: "/admin/media", icon: ImageIcon },
  { title: "admin.users", url: "/admin/users", icon: Users },
  { title: "admin.import", url: "/admin/import", icon: Download },
  { title: "admin.export", url: "/admin/export", icon: FileDown },
  { title: "admin.settings", url: "/admin/settings", icon: Settings },
] as const;

export function AdminSidebar() {
  const { t } = useI18n();
  const { collapsed } = useSidebar() as unknown as { collapsed?: boolean };
  const location = useLocation();
  const navigate = useNavigate();
  const { session, role, isAdmin, signOut } = useAuth();
  const currentPath = location.pathname;
  const email = session?.user?.email ?? "";
  const initials = (email || "U").slice(0, 2).toUpperCase();

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={cn("bg-white", collapsed ? "w-14" : "w-60")} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.title)}>
                    <NavLink
                      to={item.url}
                      className="w-full"
                      activeClassName="text-sidebar-accent-foreground"
                      aria-current={isActive(item.url) ? "page" : undefined}
                    >
                      <item.icon />
                      {!collapsed ? <span>{t(item.title)}</span> : null}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="shrink-0 border-t border-sidebar-border">
        {!session ? (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/auth">{t("nav.login")}</Link>
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-full justify-start gap-2 px-2 py-2 font-normal"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="min-w-0 truncate text-left text-xs">
                    {email}
                    {isAdmin ? " · admin" : role ? ` · ${role}` : ""}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="truncate text-xs">{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate("/", { replace: true });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("nav.logoutLong")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
