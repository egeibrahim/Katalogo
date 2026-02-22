import { Outlet } from "react-router-dom";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NewcatalogTopNav } from "@/components/newcatalog/layout/NewcatalogTopNav";

/** Üst menü yüksekliği (promo + ana satır) — sidebar ve içerik bu değere göre konumlanır */
const SITE_TOPNAV_HEIGHT = 88;

export function AdminLayout() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* Site üst menüsü: sticky yok, kayma olmasın */}
      <div className="shrink-0 [&_.ru-topnav]:!static">
        <NewcatalogTopNav />
      </div>
      {/* Admin alanı: kalan yükseklik, kendi içinde scroll */}
      <div
        className="admin-with-site-nav flex min-h-0 flex-1 flex-col"
        style={{ "--admin-topnav-h": `${SITE_TOPNAV_HEIGHT}px` } as React.CSSProperties}
      >
        <SidebarProvider>
          <div className="flex min-h-0 flex-1 w-full">
            <AdminSidebar />
            <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="admin-content-scroll min-h-0 min-w-0 flex-1 overflow-auto">
                <Outlet />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
