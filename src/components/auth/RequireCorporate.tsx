import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useUserMembership } from "@/hooks/useUserMembership";

interface RequireCorporateProps {
  children: ReactNode;
}

export function RequireCorporate({ children }: RequireCorporateProps) {
  const location = useLocation();
  const { session, user, isLoading, isAdmin } = useAuth();
  const { data: membership, isLoading: membershipLoading } = useUserMembership(user?.id ?? null);

  if (isLoading || membershipLoading) return null;

  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />;

  // Admins can access corporate-only areas.
  if (!isAdmin && membership?.plan !== "corporate") {
    return <Navigate to="/pricing" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
