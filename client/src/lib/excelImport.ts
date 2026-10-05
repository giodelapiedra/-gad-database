import api from '@/lib/axios';
import {
  blankAttrRow,
  blankBrgyARRow,
  blankBrgyGPBRow,
  blankCityARRow,
  blankCityGPBRow,
} from '@/hooks/useTemplates';

// Upload a filled-in template workbook and turn it back into form data, so an
// encoder who already has their GPB / AR in Excel doesn't retype it.
// The server reads the sheet by its header words (see utils/templateImport.ts).

export type ImportTemplateId = 'BARANGAY_GPB' | 'BARANGAY_AR' | 'CITY_GPB' | 'CITY_AR';

export interface ExcelImportResult {
  templateId: ImportTemplateId;
  fileName: string;
  /** Sheet that was read, and every sheet of the workbook that holds a GAD table. */
  sheet: string;
  sheets: string[];
  formData: Record<string, unknown>;
  counts: { clientFocused: number; organizationFocused: number; attributedPrograms: number };
  warnings: string[];
}

export async function importTemplateExcel(
  file: File,
  opts: { templateId?: string; sheet?: string } = {},
): Promise<ExcelImportResult> {
  const body = new FormData();
  body.append('file', file);
  if (opts.templateId) body.append('type', opts.templateId);
  if (opts.sheet) body.append('sheet', opts.sheet);
  const res = await api.post('/templates/import', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data as ExcelImportResult;
}

export function importSummary(r: ExcelImportResult): string {
  const c = r.counts;
  return `${c.clientFocused} client-focused, ${c.organizationFocused} organization-focused and ${c.attributedPrograms} attributed row(s)`;
}

// ─── Hand-off from the template list to the form it opens ─────────────────

let pending: ExcelImportResult | null = null;

/** Park a result read on the template list; the form for its template picks it up. */
export function setPendingImport(r: ExcelImportResult) { pending = r; }

export function takePendingImport(templateId: string): ExcelImportResult | null {
  if (pending?.templateId !== templateId) return null;
  const r = pending;
  pending = null;
  return r;
}

// ─── Merging into the form ────────────────────────────────────────────────

const ROW_BLANKS: Record<string, () => object> = {
  attributedPrograms: blankAttrRow,
};
const ROWS_BY_TEMPLATE: Record<ImportTemplateId, Record<string, () => object>> = {
  BARANGAY_GPB: { clientFocused: blankBrgyGPBRow, organizationFocused: blankBrgyGPBRow, ...ROW_BLANKS },
  BARANGAY_AR: {
    clientFocusedGenderIssues: blankBrgyARRow, clientFocusedGadMandate: blankBrgyARRow,
    organizationGenderIssues: blankBrgyARRow, organizationGadMandate: blankBrgyARRow, ...ROW_BLANKS,
  },
  CITY_GPB: { clientFocused: blankCityGPBRow, organizationFocused: blankCityGPBRow, ...ROW_BLANKS },
  CITY_AR: { clientFocused: blankCityARRow, organizationFocused: blankCityARRow, ...ROW_BLANKS },
};

/**
 * Lay the imported sheet over the current form. Every table is replaced by the
 * sheet's rows (a band the sheet leaves empty keeps one blank row to type in);
 * header fields the sheet doesn't fill keep what the form already had. The
 * caller re-stamps the fixed LGU location afterwards.
 */
export function mergeImported<D extends object>(prev: D, templateId: ImportTemplateId, imported: Record<string, unknown>): D {
  const tables = ROWS_BY_TEMPLATE[templateId];
  const out = { ...prev } as Record<string, unknown>;
  for (const [k, v] of Object.entries(imported)) {
    if (k in tables) {
      const rows = Array.isArray(v) ? v : [];
      out[k] = rows.length ? rows.map((r) => ({ ...tables[k](), ...(r as object) })) : [tables[k]()];
    } else if (v !== '' && v !== 0 && v !== null && v !== undefined) {
      out[k] = v;
    }
  }
  // Imported AR rows aren't tied to a GPB, so nothing on them is locked.
  if ('sourceGpbId' in out) delete out.sourceGpbId;
  return out as D;
}
