import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse, Record as GadRecord } from '@/types';

interface RecordFilters {
  dept?: string;
  year?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useGetRecords(filters: RecordFilters) {
  const params = new URLSearchParams();
  if (filters.dept) params.set('dept', filters.dept);
  if (filters.year && filters.year !== 'all') params.set('year', filters.year);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();

  return useQuery({
    queryKey: ['records', filters],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<GadRecord>>>(
        `/records${qs ? `?${qs}` : ''}`
      );
      return res.data.data;
    },
  });
}

export function useCreateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      departmentId: string;
      year: number;
      status?: string;
      data?: Record<string, unknown>;
    }) => {
      const res = await api.post<ApiResponse<GadRecord>>('/records', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      departmentId?: string;
      year?: number;
      status?: string;
      data?: Record<string, unknown>;
    }) => {
      const res = await api.put<ApiResponse<GadRecord>>(`/records/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiResponse<null>>(`/records/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
