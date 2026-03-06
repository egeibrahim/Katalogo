import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessTopbar } from "@/components/business/BusinessTopbar";

const SITE_TOPNAV_HEIGHT = 64;

export function BusinessLayout() {
  return (
    <div
      className="business-with-site-nav flex min-h-0 flex-1 flex-col"
      style={{ "--site-topnav-h": `${SITE_TOPNAV_HEIGHT}px` } as CSSProperties}
    >
      <SidebarProvider>
        <div className="business-layout-shell flex min-h-0 flex-1 w-full bg-white">
          <BusinessSidebar />
          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <BusinessTopbar />
            <div className="business-content-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-white">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
