import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ApiResponse, DashboardSummary, Record as GadRecord } from '@/types';

interface GrowthDataset {
  dept: string;
  code: string;
  color: string;
  data: number[];
}

interface GrowthData {
  labels: string[];
  datasets: GrowthDataset[];
}

export function useGetSummary(year?: number) {
  return useQuery({
    queryKey: ['dashboard', 'summary', year],
    queryFn: async () => {
      const params = year ? `?year=${year}` : '';
      const res = await api.get<ApiResponse<DashboardSummary>>(`/dashboard/summary${params}`);
      return res.data.data;
    },
  });
}

export function useGetGrowth() {
  return useQuery({
    queryKey: ['dashboard', 'growth'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GrowthData>>('/dashboard/growth');
      return res.data.data;
    },
  });
}

export function useGetAvailableYears() {
  return useQuery({
    queryKey: ['dashboard', 'years'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<number[]>>('/dashboard/years');
      return res.data.data;
    },
  });
}

export function useGetRecent(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'recent', limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GadRecord[]>>(`/dashboard/recent?limit=${limit}`);
      return res.data.data;
    },
  });
}

export type { GrowthData, GrowthDataset };
