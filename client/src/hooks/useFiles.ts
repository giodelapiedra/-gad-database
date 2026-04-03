import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

export interface FileRecord {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  departmentId: string;
  year: number;
  url: string;
  createdAt: string;
  department: { name: string; code: string; color: string };
  uploadedBy: { name: string };
}

interface PaginatedFiles {
  files: FileRecord[];
  total: number;
  page: number;
  totalPages: number;
}

interface FileFilters {
  dept?: string;
  year?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useGetFiles(filters: FileFilters) {
  const params = new URLSearchParams();
  if (filters.dept) params.set('dept', filters.dept);
  if (filters.year && filters.year !== 'all') params.set('year', filters.year);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();

  return useQuery({
    queryKey: ['files', filters],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedFiles>>(`/files${qs ? `?${qs}` : ''}`);
      return res.data.data;
    },
  });
}

export function useGetFileYears(dept?: string) {
  return useQuery({
    queryKey: ['file-years', dept],
    queryFn: async () => {
      const params = dept ? `?dept=${dept}` : '';
      const res = await api.get<ApiResponse<number[]>>(`/files/years${params}`);
      return res.data.data;
    },
  });
}

export function useUploadFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formData,
      onProgress,
    }: {
      formData: FormData;
      onProgress?: (pct: number) => void;
    }) => {
      const res = await api.post<ApiResponse<FileRecord[]>>('/files', formData, {
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-years'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiResponse<null>>(`/files/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-years'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
