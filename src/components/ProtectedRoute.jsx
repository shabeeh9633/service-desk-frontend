import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute
 *
 * Props:
 *  - allowedRoles?: string[]   — optional list of roles that may access this route.
 *                                If omitted, any authenticated user is allowed.
 *  - children: ReactNode
 *
 * Behaviour:
 *  - Not authenticated → redirect to /
 *  - Authenticated but wrong role → redirect to their own dashboard
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  // Wait for session restore
  if (loading) return null;

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Role-gated route — check if current role is allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the user's correct dashboard
    const dashboardByRole = {
      admin: "/admin-dashboard",
      agent: "/agent-dashboard",
      user: "/dashboard",
    };
    const dest = dashboardByRole[role] ?? "/dashboard";
    return <Navigate to={dest} replace />;
  }

  return children;
}

export default ProtectedRoute;