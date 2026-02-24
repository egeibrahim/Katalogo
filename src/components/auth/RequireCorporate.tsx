import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

interface RequireCorporateProps {
  children: ReactNode;
}

/** Sadece giriş yapmış kullanıcıların panele erişmesini sağlar. Free/Kişisel/Marka/Kurumsal hepsi panele girebilir; çıkış yapabilir. */
export function RequireCorporate({ children }: RequireCorporateProps) {
  const location = useLocation();
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />;

  return <>{children}</>;
}
