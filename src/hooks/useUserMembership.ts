import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MembershipPlan } from "@/lib/planFeatures";

export type { MembershipPlan };

export type UserMembership = {
  plan: MembershipPlan;
  status: string;
  pendingPlan: "individual" | "brand" | null;
  pendingInterval: "monthly" | "yearly" | null;
};

export function useUserMembership(userId: string | null) {
  return useQuery({
    queryKey: ["user_membership", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<UserMembership> => {
      if (!userId) return { plan: "free", status: "active", pendingPlan: null, pendingInterval: null };

      const { data, error } = await supabase
        .from("user_memberships")
        .select("plan,status,pending_plan,pending_interval")
        .eq("user_id", userId)
        .maybeSingle();

      // Kayıt yok veya hata: free plan varsayılan.
      if (error) return { plan: "free", status: "active", pendingPlan: null, pendingInterval: null };
      if (!data) return { plan: "free", status: "active", pendingPlan: null, pendingInterval: null };
      const plan = data.plan as string;
      const allowed: MembershipPlan[] = ["free", "individual", "brand", "corporate", "custom_request"];
      const pendingPlan = (data.pending_plan === "individual" || data.pending_plan === "brand")
        ? data.pending_plan
        : null;
      const pendingInterval = pendingPlan && (data.pending_interval === "monthly" || data.pending_interval === "yearly")
        ? data.pending_interval
        : (pendingPlan ? "monthly" : null);
      return {
        plan: (allowed.includes(plan) ? plan : "free") as MembershipPlan,
        status: data.status ?? "active",
        pendingPlan,
        pendingInterval,
      };
    },
    staleTime: 60 * 1000,
  });
}
