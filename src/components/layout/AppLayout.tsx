import { Outlet, useLocation } from "react-router-dom";
import { PagesBar } from "@/components/navigation/PagesBar";
import { TopMenu } from "@/components/navigation/TopMenu";
import { NewcatalogTopNav } from "@/components/newcatalog/layout/NewcatalogTopNav";
import { useDefaultMeta } from "@/hooks/usePageMeta";

export default function AppLayout() {
  const location = useLocation();
  useDefaultMeta();
  const isAdminArea = location.pathname.startsWith("/admin");
  const isBusinessArea = location.pathname.startsWith("/business");
  const isPublicLanding = location.pathname === "/" || location.pathname === "/pricing";
  const hidePagesBar = location.pathname === "/" || location.pathname === "/auth";
  const isHomeOrAuth = location.pathname === "/" || location.pathname === "/auth";
  const isNewcatalogStorefront =
    isHomeOrAuth ||
    location.pathname.startsWith("/designer") ||
    location.pathname.startsWith("/product") ||
    location.pathname.startsWith("/collection") ||
    location.pathname.startsWith("/catalog") ||
    location.pathname.startsWith("/brand") ||
    location.pathname.startsWith("/cart") ||
    location.pathname.startsWith("/features") ||
    location.pathname.startsWith("/pricing") ||
    location.pathname.startsWith("/blog");

  if (isPublicLanding) {
    return <Outlet />;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {!isAdminArea && !isBusinessArea ? (
        isNewcatalogStorefront ? (
          <NewcatalogTopNav />
        ) : (
          <>
            <TopMenu />
            {hidePagesBar ? null : <PagesBar />}
          </>
        )
      ) : null}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
