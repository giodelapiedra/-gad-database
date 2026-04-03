import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ApiResponse, Department } from '@/types';

export function useGetDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Department[]>>('/departments');
      return res.data.data;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code: string; head: string; color: string }) => {
      const res = await api.post<ApiResponse<Department>>('/departments', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; code?: string; head?: string; color?: string }) => {
      const res = await api.put<ApiResponse<Department>>(`/departments/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiResponse<null>>(`/departments/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}
