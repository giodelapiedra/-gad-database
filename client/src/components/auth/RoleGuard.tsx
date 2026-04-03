import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

interface RoleGuardProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
