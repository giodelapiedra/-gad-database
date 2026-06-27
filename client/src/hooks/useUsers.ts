import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ENCODER';
  isActive: boolean;
  departmentId: string | null;
  department: { id: string; name: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'ENCODER';
  departmentId?: string;
}

export interface UpdateUserPayload {
  name?: string;
  role?: 'ADMIN' | 'ENCODER';
  isActive?: boolean;
  password?: string;
  departmentId?: string | null;
}

// ─── Queries ─────────────────────────────────────────────────────────────

export function useGetUsers() {
  return useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await api.post('/users', payload);
      return res.data.data as UserRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateUserPayload & { id: string }) => {
      const res = await api.put(`/users/${id}`, payload);
      return res.data.data as UserRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
