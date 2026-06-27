import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type SubmissionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'RETURNED';

export interface SubmissionComment {
  id: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  author: { id: string; name: string; role: 'ADMIN' | 'ENCODER' };
}

export interface FormSubmission {
  id: string;
  templateId: string;
  title: string;
  formData: unknown;
  status: SubmissionStatus;
  submittedBy: string;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  remarks: string | null;
  updatedAt: string;
  submitter: {
    id: string;
    name: string;
    email: string;
    department: { id: string; name: string; code: string; color: string } | null;
  };
  reviewer: { id: string; name: string } | null;
  comments?: SubmissionComment[];
}

export interface SubmissionCounts {
  all: number;
  draft: number;
  pending: number;
  approved: number;
  returned: number;
}

export interface SubmissionsPage {
  submissions: FormSubmission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: SubmissionCounts;
}

export interface SubmissionsParams {
  status?: SubmissionStatus | 'ALL';
  department?: string; // departmentId, '' or 'ALL' = no filter
  page?: number;
  limit?: number;
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useGetSubmissions(params: SubmissionsParams = {}) {
  // 'ALL' means no status filter — omit it from the request
  const { status, department, page = 1, limit = 15 } = params;
  const apiParams: Record<string, unknown> = { page, limit };
  if (status && status !== 'ALL') apiParams['status'] = status;
  if (department && department !== 'ALL') apiParams['department'] = department;

  return useQuery<SubmissionsPage>({
    queryKey: ['submissions', apiParams],
    queryFn: async () => {
      const res = await api.get('/submissions', { params: apiParams });
      return res.data.data as SubmissionsPage;
    },
    placeholderData: (prev) => prev, // keep previous data while fetching next page
  });
}

export function useGetSubmission(id: string | null) {
  return useQuery<FormSubmission>({
    queryKey: ['submissions', 'single', id],
    queryFn: async () => {
      const res = await api.get(`/submissions/${id}`);
      return res.data.data as FormSubmission;
    },
    enabled: !!id,
  });
}

export interface DepartmentStatusRow {
  id: string;
  name: string;
  code: string;
  color: string;
  submissionCount: number;
  status: 'submitted' | 'encoding';
}

export interface DepartmentStatusResponse {
  year: number;
  departments: DepartmentStatusRow[];
  summary: { total: number; submitted: number; encoding: number };
}

export function useDepartmentStatus(year?: number, options?: { enabled?: boolean }) {
  return useQuery<DepartmentStatusResponse>({
    queryKey: ['submissions', 'department-status', year ?? 'current'],
    queryFn: async () => {
      const res = await api.get('/submissions/department-status', { params: year ? { year } : {} });
      return res.data.data as DepartmentStatusResponse;
    },
    refetchInterval: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useGetPendingCount() {
  return useQuery<{ count: number }>({
    queryKey: ['submissions', 'pending-count'],
    queryFn: async () => {
      const res = await api.get('/submissions/pending-count');
      return res.data.data as { count: number };
    },
    refetchInterval: 10_000,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { templateId: string; formData: unknown }) => {
      const res = await api.post('/submissions', payload);
      return res.data.data as FormSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { templateId: string; formData: unknown }) => {
      const res = await api.post('/submissions', { ...payload, isDraft: true });
      return res.data.data as FormSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

export function useDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/submissions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

export function useUpdateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      formData: unknown;
      resubmit?: boolean;
    }) => {
      const { id, ...body } = payload;
      const res = await api.patch(`/submissions/${id}`, body);
      return res.data.data as FormSubmission;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['submissions', 'single', vars.id] });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; body: string; file?: File | null }) => {
      const fd = new FormData();
      fd.append('body', payload.body);
      if (payload.file) fd.append('attachment', payload.file);
      const res = await api.post(`/submissions/${payload.id}/comments`, fd);
      return res.data.data as SubmissionComment;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['submissions', 'single', vars.id] });
    },
  });
}

export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      status: 'APPROVED' | 'RETURNED';
      remarks?: string;
    }) => {
      const { id, ...body } = payload;
      const res = await api.patch(`/submissions/${id}/review`, body);
      return res.data.data as FormSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

// ── Blob download helper ───────────────────────────────────────────────────

export async function generateFromSubmission(id: string, format: 'xlsx' | 'pdf' = 'xlsx'): Promise<void> {
  const res = await api.post(
    `/submissions/${id}/generate`,
    { format },
    { responseType: 'blob' },
  );
  const disposition = res.headers['content-disposition'] as string | undefined;
  let fileName = `submission_${id}.${format}`;
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) fileName = decodeURIComponent(match[1]);
  }
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
