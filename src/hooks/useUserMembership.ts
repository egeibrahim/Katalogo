import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MembershipPlan = "individual" | "corporate" | "custom_request";

export type UserMembership = {
  plan: MembershipPlan;
  status: string;
};

export function useUserMembership(userId: string | null) {
  return useQuery({
    queryKey: ["user_membership", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<UserMembership> => {
      if (!userId) return { plan: "individual", status: "active" };

      const { data, error } = await supabase
        .from("user_memberships")
        .select("plan,status")
        .eq("user_id", userId)
        .maybeSingle();

      // If missing row or blocked, default to individual.
      if (error) return { plan: "individual", status: "active" };
      if (!data) return { plan: "individual", status: "active" };
      return {
        plan: (data.plan as MembershipPlan) ?? "individual",
        status: data.status ?? "active",
      };
    },
    staleTime: 60 * 1000,
  });
}
