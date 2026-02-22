import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function AdminDashboard() {
  usePageMeta({ title: "Admin Dashboard", noIndex: true });

  const { data: productCount } = useQuery({
    queryKey: ["admin", "stats", "products"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("id", { head: true, count: "exact" });
      return count ?? 0;
    },
  });

  const { data: categoryCount } = useQuery({
    queryKey: ["admin", "stats", "categories"],
    queryFn: async () => {
      const { count } = await supabase.from("categories").select("id", { head: true, count: "exact" });
      return count ?? 0;
    },
  });

  const { data: currentAdmin } = useQuery({
    queryKey: ["admin", "stats", "current-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  return (
    <div className="p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{productCount ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Total products in catalog</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{categoryCount ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Total categories</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">OK</div>
            <p className="text-xs text-muted-foreground">Backend & policies active</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Current Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              <span className="font-mono break-all">{currentAdmin?.user_id ?? "—"}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Created: {currentAdmin?.created_at ? format(new Date(currentAdmin.created_at), "yyyy-MM-dd HH:mm") : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
