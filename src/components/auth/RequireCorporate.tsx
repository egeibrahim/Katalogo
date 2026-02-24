import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useUserMembership } from "@/hooks/useUserMembership";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RequireCorporateProps {
  children: ReactNode;
}

function isAuthIssue(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("invalid jwt") ||
    lower.includes("jwt") ||
    lower.includes("token")
  );
}

/** Sadece giriş yapmış kullanıcıların panele erişmesini sağlar. Ücretli plan seçip ödeme yapmamış kullanıcılar Stripe'a yönlendirilir. */
export function RequireCorporate({ children }: RequireCorporateProps) {
  const location = useLocation();
  const { session, isLoading } = useAuth();
  const { data: membership, isLoading: membershipLoading } = useUserMembership(session?.user?.id ?? null);
  const [redirecting, setRedirecting] = useState(false);
  const redirectStarted = useRef(false);

  useEffect(() => {
    if (
      !session ||
      membershipLoading ||
      !membership ||
      redirectStarted.current ||
      redirecting
    )
      return;

    // Ücretli plan seçilmiş ama ödeme yapılmamış → Stripe Checkout'a yönlendir
    const paidPlans = ["individual", "brand"];
    const hasPendingPayment =
      membership.plan === "free" &&
      membership.pendingPlan &&
      paidPlans.includes(membership.pendingPlan);

    if (!hasPendingPayment) return;

    redirectStarted.current = true;
    setRedirecting(true);

    const plan = membership.pendingPlan;
    const interval = membership.pendingInterval ?? "monthly";

    (async () => {
      const firstSession = await supabase.auth.getSession();
      const token = firstSession.data.session?.access_token;
      const first = await supabase.functions.invoke("create-checkout-session", {
        body: { plan, interval },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!first.error) {
        const url = (first.data as { url?: string } | null)?.url;
        if (url) {
          window.location.href = url;
          return;
        }
        redirectStarted.current = false;
        setRedirecting(false);
        toast.error("Ödeme sayfası alınamadı.");
        return;
      }

      const firstMessage = (first.error as { message?: string })?.message ?? "";
      if (isAuthIssue(firstMessage)) {
        const refreshed = await supabase.auth.refreshSession();
        if (!refreshed.error && refreshed.data.session) {
          const retry = await supabase.functions.invoke("create-checkout-session", {
            body: { plan, interval },
            headers: { Authorization: `Bearer ${refreshed.data.session.access_token}` },
          });
          if (!retry.error) {
            const retryUrl = (retry.data as { url?: string } | null)?.url;
            if (retryUrl) {
              window.location.href = retryUrl;
              return;
            }
          }
        }
      }

      redirectStarted.current = false;
      setRedirecting(false);
      toast.error("Ödeme sayfası açılamadı. Lütfen tekrar giriş yapın.");
    })().catch(() => {
      redirectStarted.current = false;
      setRedirecting(false);
      toast.error("Ödeme sayfası açılamadı.");
    });
  }, [session, membership, membershipLoading, redirecting]);

  if (isLoading || membershipLoading || redirecting) return null;

  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />;

  return <>{children}</>;
}
