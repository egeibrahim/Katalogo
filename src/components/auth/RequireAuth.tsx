import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  if (!session) return <Navigate to="/" replace state={{ from: location }} />;

  return <>{children}</>;
}

