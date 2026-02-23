import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MembershipPlan } from "@/lib/planFeatures";

export type { MembershipPlan };

export type UserMembership = {
  plan: MembershipPlan;
  status: string;
};

export function useUserMembership(userId: string | null) {
  return useQuery({
    queryKey: ["user_membership", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<UserMembership> => {
      if (!userId) return { plan: "free", status: "active" };

      const { data, error } = await supabase
        .from("user_memberships")
        .select("plan,status")
        .eq("user_id", userId)
        .maybeSingle();

      // Kayıt yok veya hata: free plan varsayılan.
      if (error) return { plan: "free", status: "active" };
      if (!data) return { plan: "free", status: "active" };
      const plan = data.plan as string;
      const allowed: MembershipPlan[] = ["free", "individual", "brand", "corporate", "custom_request"];
      return {
        plan: (allowed.includes(plan) ? plan : "free") as MembershipPlan,
        status: data.status ?? "active",
      };
    },
    staleTime: 60 * 1000,
  });
}
