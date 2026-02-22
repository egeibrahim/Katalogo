import { Outlet } from "react-router-dom";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessTopbar } from "@/components/business/BusinessTopbar";

export function BusinessLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-svh flex w-full">
        <BusinessSidebar />
        <SidebarInset>
          <BusinessTopbar />
          <div className="flex-1">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
