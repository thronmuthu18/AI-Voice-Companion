import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuthStore } from "../stores/auth.store";

interface PublicRouteProps {
  children: ReactNode;
}

export default function PublicRoute({
  children,
}: PublicRouteProps) {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}