import { Outlet } from "react-router-dom";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const SITE_TOPNAV_HEIGHT = 64;

export function AdminLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div
        className="admin-with-site-nav flex min-h-0 flex-1 flex-col bg-white"
        style={{ "--admin-topnav-h": `${SITE_TOPNAV_HEIGHT}px` } as React.CSSProperties}
      >
        <SidebarProvider>
          <div className="flex min-h-0 flex-1 w-full bg-white">
            <AdminSidebar />
            <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="admin-content-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-white">
                <Outlet />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
