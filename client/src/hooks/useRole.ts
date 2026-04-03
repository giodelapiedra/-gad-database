import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

type Action =
  | 'create_department'
  | 'edit_department'
  | 'delete_department'
  | 'create_record'
  | 'edit_record'
  | 'delete_record'
  | 'upload_file'
  | 'manage_users';

const PERMISSIONS: Record<Action, Role[]> = {
  create_department: ['ADMIN'],
  edit_department: ['ADMIN'],
  delete_department: ['ADMIN'],
  create_record: ['ADMIN', 'ENCODER'],
  edit_record: ['ADMIN', 'ENCODER'],
  delete_record: ['ADMIN'],
  upload_file: ['ADMIN', 'ENCODER'],
  manage_users: ['ADMIN'],
};

export function useRole() {
  const { user } = useAuth();
  const role = user?.role;

  return useMemo(
    () => ({
      isAdmin: role === 'ADMIN',
      isEncoder: role === 'ENCODER',
      can: (action: Action) => !!role && PERMISSIONS[action].includes(role),
    }),
    [role]
  );
}

export type { Action };
