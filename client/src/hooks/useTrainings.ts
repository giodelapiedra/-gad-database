import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type TrainingType = 'SEMINAR' | 'WORKSHOP' | 'WEBINAR' | 'FORUM' | 'CONFERENCE';
export type TrainingStatus = 'upcoming' | 'ongoing' | 'completed';

/** Informational event listing for the public website (no online registration). */
export interface TrainingRecord {
  id: string;
  title: string;
  description: string;
  /** Lower-cased on the wire so the public site can use it as-is. */
  type: Lowercase<TrainingType>;
  /** Derived server-side from the dates (Asia/Manila). */
  status: TrainingStatus;
  startDate: string;
  endDate: string | null;
  venue: string;
  organizer: string;
  targetParticipants: string;
  tags: string[];
  featured: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPayload {
  title: string;
  description: string;
  type: TrainingType;
  startDate: string;
  endDate: string | null;
  venue: string;
  organizer: string;
  targetParticipants: string;
  tags: string[];
  featured: boolean;
  isPublished: boolean;
}

const KEY = ['trainings'];

// ─── Queries ─────────────────────────────────────────────────────────────

export function useGetTrainings() {
  return useQuery<TrainingRecord[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get('/trainings');
      return res.data.data;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TrainingPayload) => {
      const res = await api.post('/trainings', payload);
      return res.data.data as TrainingRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<TrainingPayload> & { id: string }) => {
      const res = await api.put(`/trainings/${id}`, payload);
      return res.data.data as TrainingRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetTrainingPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await api.patch(`/trainings/${id}/publish`, { isPublished });
      return res.data.data as TrainingRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/trainings/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
