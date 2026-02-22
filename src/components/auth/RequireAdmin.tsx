import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RequireAdminProps {
  children: ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation();
  const { session, isAdmin, isLoading } = useAuth();

  if (isLoading) return null;

  // Not logged in → send to auth
  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />;

  // Logged in but not admin → send to home
  if (!isAdmin) return <Navigate to="/" replace state={{ from: location }} />;

  return <>{children}</>;
}

