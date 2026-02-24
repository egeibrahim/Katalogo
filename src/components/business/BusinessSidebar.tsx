import { useLocation } from "react-router-dom";
import { BookOpen, Package, Library } from "lucide-react";

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

const ITEMS = [
  { title: "Ürünler", url: "/business/products", icon: Package },
  { title: "Katalog", url: "/business/catalog", icon: Library },
  { title: "Kataloglarım", url: "/business/catalogs", icon: BookOpen },
] as const;

export function BusinessSidebar() {
  const { collapsed } = useSidebar() as unknown as { collapsed?: boolean };
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="truncate">İş Paneli</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="w-full"
                      activeClassName="text-sidebar-accent-foreground"
                      aria-current={isActive(item.url) ? "page" : undefined}
                    >
                      <item.icon />
                      {!collapsed ? <span>{item.title}</span> : null}
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
