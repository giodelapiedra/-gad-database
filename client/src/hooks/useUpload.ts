import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ApiResponse, UploadLog } from '@/types';

interface UploadResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

interface UploadLogsResponse {
  logs: UploadLog[];
  total: number;
  page: number;
  totalPages: number;
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({
      formData,
      onProgress,
    }: {
      formData: FormData;
      onProgress?: (pct: number) => void;
    }) => {
      const res = await api.post<ApiResponse<UploadResult>>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      return res.data.data;
    },
  });
}

export function useUploadLogs(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['upload-logs', page, limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UploadLogsResponse>>(
        `/upload/logs?page=${page}&limit=${limit}`
      );
      return res.data.data;
    },
  });
}
