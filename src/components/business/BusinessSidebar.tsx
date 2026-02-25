import { useLocation } from "react-router-dom";
import { BookOpen, Package, Library, Users } from "lucide-react";

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
  { title: "brand.sidebarProducts", url: "/brand/products", icon: Package },
  { title: "brand.sidebarCatalog", url: "/brand/catalog", icon: Library },
  { title: "brand.sidebarCatalogs", url: "/brand/catalogs", icon: BookOpen },
  { title: "brand.sidebarUsers", url: "/brand/users", icon: Users },
] as const;

export function BusinessSidebar() {
  const { t } = useI18n();
  const { collapsed } = useSidebar() as unknown as { collapsed?: boolean };
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

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
