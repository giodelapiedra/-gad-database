import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface TemplateDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  level: string;
  type: 'GPB' | 'AR';
  annex: string;
  fileName: string;
}

// ─── Shared ───────────────────────────────────────────────────────────────

export interface AttributedRow {
  projectTitle: string;
  hgdgScore: number;
  totalBudget: number;
  gadAttributedBudget: number;
  varianceRemarks: string;   // barangay AR
  responsibleOffice: string; // city
}

export const blankAttrRow = (): AttributedRow => ({
  projectTitle: '', hgdgScore: 0, totalBudget: 0,
  gadAttributedBudget: 0, varianceRemarks: '', responsibleOffice: '',
});

// ─── Barangay GPB ─────────────────────────────────────────────────────────

export interface BrgyGPBRow {
  gadIssue: string;
  activity: string;
  indicator: string;
  mooe: number;
  ps: number;
  co: number;
  responsibleOffice: string;
}

export interface BrgyGPBFormData {
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
  cy: number;
  totalBrgyBudget: number;
  totalGadBudget: number;
  clientFocused: BrgyGPBRow[];
  organizationFocused: BrgyGPBRow[];
  attributedPrograms: AttributedRow[];
  preparedBy: string;
  approvedBy: string;
}

export const blankBrgyGPBRow = (): BrgyGPBRow => ({
  gadIssue: '', activity: '', indicator: '',
  mooe: 0, ps: 0, co: 0, responsibleOffice: '',
});

// ─── Barangay AR ──────────────────────────────────────────────────────────

export interface BrgyARRow {
  gadIssue: string;
  ppa: string;
  indicator: string;
  accomplishments: string;
  approvedBudget: number;
  actualCost: number;
  variance: string;
}

export interface BrgyARFormData {
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
  fy: number;
  totalBrgyBudget: number;
  totalGadBudget: number;
  clientFocusedGenderIssues: BrgyARRow[];
  clientFocusedGadMandate: BrgyARRow[];
  organizationGenderIssues: BrgyARRow[];
  organizationGadMandate: BrgyARRow[];
  attributedPrograms: AttributedRow[];
  preparedBy: string;
  approvedBy: string;
  date: string;
}

export const blankBrgyARRow = (): BrgyARRow => ({
  gadIssue: '', ppa: '', indicator: '',
  accomplishments: '', approvedBudget: 0, actualCost: 0, variance: '',
});

// ─── City GPB ─────────────────────────────────────────────────────────────

export interface CityGPBRow {
  gadIssue: string;
  gadObjective: string;
  relevantProgram: string;
  activity: string;
  indicator: string;
  mooe: number;
  ps: number;
  co: number;
  responsibleOffice: string;
}

export interface CityGPBFormData {
  region: string;
  province: string;
  cityMunicipality: string;
  officeName: string;
  fy: number;
  totalLguBudget: number;
  totalGadBudget: number;
  clientFocused: CityGPBRow[];
  organizationFocused: CityGPBRow[];
  attributedPrograms: AttributedRow[];
  preparedBy: string;
  approvedBy: string;
  date: string;
}

export const blankCityGPBRow = (): CityGPBRow => ({
  gadIssue: '', gadObjective: '', relevantProgram: '',
  activity: '', indicator: '', mooe: 0, ps: 0, co: 0, responsibleOffice: '',
});

// ─── City AR ──────────────────────────────────────────────────────────────

export interface CityARRow {
  gadIssue: string;
  gadObjective: string;
  relevantProgram: string;
  activity: string;
  indicator: string;
  actualResults: string;
  approvedBudget: number;
  actualCost: number;
  variance: string;
  responsibleOffice: string;
}

export interface CityARFormData {
  region: string;
  province: string;
  cityMunicipality: string;
  officeName: string;
  quarter: string;
  fy: number;
  totalLguBudget: number;
  totalGadBudget: number;
  clientFocused: CityARRow[];
  organizationFocused: CityARRow[];
  attributedPrograms: AttributedRow[];
  preparedBy: string;
  approvedBy: string;
  date: string;
}

export const blankCityARRow = (): CityARRow => ({
  gadIssue: '', gadObjective: '', relevantProgram: '',
  activity: '', indicator: '', actualResults: '',
  approvedBudget: 0, actualCost: 0, variance: '', responsibleOffice: '',
});

// ─── Query ────────────────────────────────────────────────────────────────

export function useGetTemplates() {
  return useQuery<TemplateDef[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/templates');
      return res.data.data;
    },
    staleTime: Infinity,
  });
}

// ─── Generate (blob download) ─────────────────────────────────────────────

export type AnyFormData =
  | BrgyGPBFormData
  | BrgyARFormData
  | CityGPBFormData
  | CityARFormData;

export async function generateTemplateExcel(
  templateId: string,
  formData: AnyFormData
): Promise<void> {
  const res = await api.post(`/templates/${templateId}/generate`, formData, {
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'] as string | undefined;
  let fileName = `${templateId}.xlsx`;
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
