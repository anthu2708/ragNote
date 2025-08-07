// ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import {useCurrentUser} from "../utils/useCurrentUser";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useCurrentUser();

  if (loading) return <div>Loading...</div>;

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
