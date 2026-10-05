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

/** A proof file attached to an AR row's "Variance or Remarks". */
export interface EvidenceFile {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

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

/** Band of a Barangay GPB section row: "1. Gender Issues" or "2. GAD Mandate". */
export type GpbKind = 'issue' | 'mandate';

export interface BrgyGPBRow {
  /** Rows saved before the split have no kind — they count as gender issues. */
  kind?: GpbKind;
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

export const blankBrgyGPBRow = (kind: GpbKind = 'issue'): BrgyGPBRow => ({
  kind, gadIssue: '', activity: '', indicator: '',
  mooe: 0, ps: 0, co: 0, responsibleOffice: '',
});

export const gpbKind = (r: BrgyGPBRow): GpbKind => r.kind ?? 'issue';

/** A row nothing was typed into — skipped by validation and when copying to the AR. */
export const isBlankBrgyGPBRow = (r: BrgyGPBRow) =>
  !r.gadIssue?.trim() && !r.activity?.trim() && !r.indicator?.trim()
  && !r.mooe && !r.ps && !r.co && !r.responsibleOffice?.trim();

// ─── Barangay AR ──────────────────────────────────────────────────────────

export interface BrgyARRow {
  gadIssue: string;
  ppa: string;
  indicator: string;
  accomplishments: string;
  approvedBudget: number;
  actualCost: number;
  variance: string;
  /** Proof of the activity, uploaded against Variance or Remarks (7). */
  evidence?: EvidenceFile[];
  /** Set when the row was copied from a GPB: "<gpb section>:<row index>". */
  gpbRef?: string;
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
  /** The GPB submission the planned rows were copied from. */
  sourceGpbId?: string;
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

/** A row nothing was typed into — never copied to the AR. */
export const isBlankCityGPBRow = (r: CityGPBRow) =>
  !r.gadIssue?.trim() && !r.gadObjective?.trim() && !r.relevantProgram?.trim() && !r.activity?.trim()
  && !r.indicator?.trim() && !r.mooe && !r.ps && !r.co && !r.responsibleOffice?.trim();

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
  /** Proof of the activity, uploaded against Variance or Remarks (9). */
  evidence?: EvidenceFile[];
  /** Set when the row was copied from a GPB: "<gpb section>:<row index>". */
  gpbRef?: string;
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
  /** The GPB submission the planned rows were copied from. */
  sourceGpbId?: string;
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
