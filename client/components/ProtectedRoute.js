import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../services/auth.js";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="screen-loading">Loading your workspace…</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
