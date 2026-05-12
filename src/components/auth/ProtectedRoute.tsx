import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center max-w-md p-8 bg-surface-elevated rounded-lg border border-border">
          <h2 className="text-lg font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You do not have permission to access this page. Your role ({role}) is not authorized.
          </p>
          <a href={`/dashboard?role=${role}`} className="text-sm text-primary hover:underline">
            Go to your dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
