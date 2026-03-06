import { useLocation } from "react-router-dom";
import { Library, Package, UserCog, FileText } from "lucide-react";

import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const ITEMS = [
  { title: "brand.sidebarCatalog", url: "/brand/catalog", icon: Library },
  { title: "brand.sidebarProducts", url: "/brand/products", icon: Package },
  { title: "brand.sidebarQuotes", url: "/brand/quotes", icon: FileText },
  { title: "brand.sidebarProfile", url: "/brand/profile", icon: UserCog },
] as const;

export function BusinessSidebar() {
  const { t } = useI18n();
  const { collapsed } = useSidebar() as unknown as { collapsed?: boolean };
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => {
    if (path === "/brand/catalog") {
      return currentPath === "/brand/catalog" || currentPath.startsWith("/brand/catalogs/");
    }
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="truncate">{t("brand.sidebarTitle")}</span>
          </SidebarGroupLabel>
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
    </Sidebar>
  );
}
