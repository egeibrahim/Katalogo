import { Outlet } from "react-router-dom";
import { LandingNav } from "@/components/navigation/LandingNav";
import { useDefaultMeta } from "@/hooks/usePageMeta";

export default function AppLayout() {
  useDefaultMeta();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <LandingNav />
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
