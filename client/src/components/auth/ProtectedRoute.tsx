import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

interface ProtectedRouteProps {
  /** If provided, user's role must be in this list; otherwise → role fallback */
  roles?: Role[];
}

/** Returns the default landing page for each role */
export function roleFallback(role: Role | undefined): string {
  if (role === 'ENCODER') return '/templates';
  return '/home';
}

export function ProtectedRoute({ roles }: ProtectedRouteProps = {}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#71717A]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If this route requires specific roles and the user doesn't match → redirect
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={roleFallback(user.role)} replace />;
  }

  return <Outlet />;
}
