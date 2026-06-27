import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type FieldDef = {
  id: string;
  page: number;
  x: number;  // % of page width
  y: number;  // % of page height
  w: number;
  h: number;
  type: 'text' | 'number' | 'radio' | 'checkbox' | 'textarea';
  label: string;
  options?: string[];
  fontSize?: number;
};

export type HGDGTemplate = {
  id: string;
  name: string;
  sector: string;
  pullout: string | null;
  isPublished: boolean;
  fieldMap: FieldDef[];
  createdAt: string;
  updatedAt: string;
};

export function useHGDGTemplates() {
  return useQuery<HGDGTemplate[]>({
    queryKey: ['hgdg-templates'],
    queryFn: async () => {
      const res = await api.get('/hgdg');
      return res.data.data;
    },
  });
}

export function useHGDGTemplate(id: string | undefined) {
  return useQuery<HGDGTemplate>({
    queryKey: ['hgdg-templates', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/hgdg/${id}`);
      return res.data.data;
    },
  });
}

export function useHGDGPdfUrl(id: string | undefined) {
  // PDF is served directly from server — build URL with auth token in header via axios blob fetch
  return useQuery<string>({
    queryKey: ['hgdg-pdf', id],
    enabled: !!id,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await api.get(`/hgdg/${id}/pdf`, { responseType: 'blob' });
      return URL.createObjectURL(res.data);
    },
  });
}

export function useCreateHGDGTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) => {
      const res = await api.post('/hgdg', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as HGDGTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hgdg-templates'] }),
  });
}

export function useUpdateFieldMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fieldMap }: { id: string; fieldMap: FieldDef[] }) => {
      const res = await api.patch(`/hgdg/${id}/fieldmap`, { fieldMap });
      return res.data.data as HGDGTemplate;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['hgdg-templates'] });
      qc.invalidateQueries({ queryKey: ['hgdg-templates', v.id] });
    },
  });
}

export function useSetHGDGPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await api.patch(`/hgdg/${id}/publish`, { isPublished });
      return res.data.data as HGDGTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hgdg-templates'] }),
  });
}

export function useDeleteHGDGTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hgdg/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hgdg-templates'] }),
  });
}

export async function downloadFilledPdf(templateId: string, formData: Record<string, string>, fileName: string) {
  const res = await api.post('/hgdg/generate-filled', { templateId, formData }, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
