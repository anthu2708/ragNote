// PublicRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import {useCurrentUser} from "../utils/useCurrentUser";

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { user, loading } = useCurrentUser();

  if (loading) return <div>Loading...</div>;

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

export default PublicRoute;
