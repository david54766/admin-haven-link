import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireApproval = true,
  requireAdmin = false,
  requireSuperAdmin = false,
}: ProtectedRouteProps) {
  const { user, profile, isLoading, isApproved, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile.status === 'pending') {
    return <Navigate to="/pending" replace />;
  }

  if (profile.status === 'rejected') {
    return <Navigate to="/rejected" replace />;
  }

  if (profile.status === 'disabled' || profile.status === 'inactive') {
    return <Navigate to="/disabled" replace />;
  }

  if (requireApproval && !isApproved) {
    return <Navigate to="/pending" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
