import { Response } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

// ─── Template Definitions ──────────────────────────────────────────────────

export const TEMPLATE_TYPES = [
  {
    id: 'BARANGAY_GPB',
    name: 'Barangay GAD Plan and Budget',
    shortName: 'Barangay GPB',
    description: 'Barangay Annual Gender and Development (GAD) Plan and Budget',
    level: 'Barangay',
    type: 'GPB',
    annex: '',
    fileName: 'BARANGAY GPB TEMPLATE.xlsx',
  },
  {
    id: 'BARANGAY_AR',
    name: 'Barangay GAD Accomplishment Report',
    shortName: 'Barangay AR',
    description: 'Barangay Annual Gender and Development (GAD) Accomplishment Report',
    level: 'Barangay',
    type: 'AR',
    annex: '',
    fileName: 'BARANGAY GPB AR TEMPLATE.pdf',
  },
  {
    id: 'CITY_GPB',
    name: 'City/Municipality GAD Plan and Budget',
    shortName: 'City/Mun GPB',
    description: 'Annual Gender and Development (GAD) Plan and Budget — Annex D',
    level: 'City/Municipality',
    type: 'GPB',
    annex: 'ANNEX D',
    fileName: 'CITY GPB TEMPLATE.xlsx',
  },
  {
    id: 'CITY_AR',
    name: 'City/Municipality GAD Accomplishment Report',
    shortName: 'City/Mun AR',
    description: 'Gender and Development (GAD) Accomplishment Report — Annex E',
    level: 'City/Municipality',
    type: 'AR',
    annex: 'ANNEX E',
    fileName: 'CITY AR TEMPLATE.xlsx',
  },
] as const;

type TemplateId = typeof TEMPLATE_TYPES[number]['id'];

// ─── Shared sub-schemas ────────────────────────────────────────────────────

const attributedRowSchema = z.object({
  projectTitle: z.string().default(''),
  hgdgScore: z.number().default(0),
  totalBudget: z.number().min(0).default(0),
  gadAttributedBudget: z.number().min(0).default(0),
  varianceRemarks: z.string().default(''),
  responsibleOffice: z.string().default(''),
});

// ─── Barangay GPB schema ───────────────────────────────────────────────────

const brgyGPBRowSchema = z.object({
  gadIssue: z.string().default(''),
  activity: z.string().default(''),
  indicator: z.string().default(''),
  mooe: z.number().min(0).default(0),
  ps: z.number().min(0).default(0),
  co: z.number().min(0).default(0),
  responsibleOffice: z.string().default(''),
});

const brgyGPBFormSchema = z.object({
  region: z.string().default(''),
  province: z.string().default(''),
  cityMunicipality: z.string().default(''),
  barangay: z.string().min(1, 'Barangay name is required'),
  cy: z.number().int().min(2000).max(2100),
  totalBrgyBudget: z.number().min(0).default(0),
  totalGadBudget: z.number().min(0).default(0),
  clientFocused: z.array(brgyGPBRowSchema).default([]),
  organizationFocused: z.array(brgyGPBRowSchema).default([]),
  attributedPrograms: z.array(attributedRowSchema).default([]),
  preparedBy: z.string().default(''),
  approvedBy: z.string().default(''),
});

// ─── Barangay AR schema ────────────────────────────────────────────────────

const brgyARRowSchema = z.object({
  gadIssue: z.string().default(''),
  ppa: z.string().default(''),
  indicator: z.string().default(''),
  accomplishments: z.string().default(''),
  approvedBudget: z.number().min(0).default(0),
  actualCost: z.number().min(0).default(0),
  variance: z.string().default(''),
});

const brgyARFormSchema = z.object({
  region: z.string().default(''),
  province: z.string().default(''),
  cityMunicipality: z.string().default(''),
  barangay: z.string().min(1, 'Barangay name is required'),
  fy: z.number().int().min(2000).max(2100),
  totalBrgyBudget: z.number().min(0).default(0),
  totalGadBudget: z.number().min(0).default(0),
  clientFocusedGenderIssues: z.array(brgyARRowSchema).default([]),
  clientFocusedGadMandate: z.array(brgyARRowSchema).default([]),
  organizationGenderIssues: z.array(brgyARRowSchema).default([]),
  organizationGadMandate: z.array(brgyARRowSchema).default([]),
  attributedPrograms: z.array(attributedRowSchema).default([]),
  preparedBy: z.string().default(''),
  approvedBy: z.string().default(''),
  date: z.string().default(''),
});

// ─── City GPB schema ───────────────────────────────────────────────────────

const cityGPBRowSchema = z.object({
  gadIssue: z.string().default(''),
  gadObjective: z.string().default(''),
  relevantProgram: z.string().default(''),
  activity: z.string().default(''),
  indicator: z.string().default(''),
  mooe: z.number().min(0).default(0),
  ps: z.number().min(0).default(0),
  co: z.number().min(0).default(0),
  responsibleOffice: z.string().default(''),
});

const cityGPBFormSchema = z.object({
  region: z.string().default(''),
  province: z.string().default(''),
  cityMunicipality: z.string().min(1, 'City/Municipality name is required'),
  officeName: z.string().default(''),
  fy: z.number().int().min(2000).max(2100),
  totalLguBudget: z.number().min(0).default(0),
  totalGadBudget: z.number().min(0).default(0),
  clientFocused: z.array(cityGPBRowSchema).default([]),
  organizationFocused: z.array(cityGPBRowSchema).default([]),
  attributedPrograms: z.array(attributedRowSchema).default([]),
  preparedBy: z.string().default(''),
  approvedBy: z.string().default(''),
  date: z.string().default(''),
});

// ─── City AR schema ────────────────────────────────────────────────────────

const cityARRowSchema = z.object({
  gadIssue: z.string().default(''),
  gadObjective: z.string().default(''),
  relevantProgram: z.string().default(''),
  activity: z.string().default(''),
  indicator: z.string().default(''),
  actualResults: z.string().default(''),
  approvedBudget: z.number().min(0).default(0),
  actualCost: z.number().min(0).default(0),
  variance: z.string().default(''),
  responsibleOffice: z.string().default(''),
});

const cityARFormSchema = z.object({
  region: z.string().default(''),
  province: z.string().default(''),
  cityMunicipality: z.string().min(1, 'City/Municipality name is required'),
  officeName: z.string().default(''),
  quarter: z.string().default('Annual'),
  fy: z.number().int().min(2000).max(2100),
  totalLguBudget: z.number().min(0).default(0),
  totalGadBudget: z.number().min(0).default(0),
  clientFocused: z.array(cityARRowSchema).default([]),
  organizationFocused: z.array(cityARRowSchema).default([]),
  attributedPrograms: z.array(attributedRowSchema).default([]),
  preparedBy: z.string().default(''),
  approvedBy: z.string().default(''),
  date: z.string().default(''),
});

// ═══════════════════════════════════════════════════════════════════════════
// Styling helpers
// ═══════════════════════════════════════════════════════════════════════════

// ARGB colors — verified from actual DILG Excel template files (Excel Interior.Color decoded)
const CLR = {
  BLACK:   'FF000000',
  WHITE:   'FFFFFFFF',
  SECTION: 'FF948A54',  // CLIENT-FOCUSED / ORGANIZATION FOCUSED / ATTRIBUTED row  (#948A54 brownish-khaki)
  OLIVE:   'FF948A54',  // alias — same brownish-khaki used for section banners, sub-labels, and sub-total rows
  SUBTOT:  'FFBFBFBF',  // Sub Total A / B / C rows  (#BFBFBF light gray)
  YELLOW:  'FFFFFF00',  // GRAND TOTAL row  (#FFFF00 yellow)
  BLUE:    'FFB8CCE4',  // Signatory area  (#B8CCE4 light blue)
} as const;

const THIN: ExcelJS.Border = { style: 'thin', color: { argb: CLR.BLACK } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = {
  top: THIN, left: THIN, bottom: THIN, right: THIN,
};

/** Apply thin borders to every cell in row [r], columns [c1..c2] */
function borderRow(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number) {
  for (let c = c1; c <= c2; c++) {
    ws.getCell(r, c).border = ALL_BORDERS as ExcelJS.Borders;
  }
}

/** Merge, set value, alignment, font, fill for a cell range */
function mergeSet(
  ws: ExcelJS.Worksheet,
  r1: number, c1: number, r2: number, c2: number,
  value: ExcelJS.CellValue,
  opts: {
    bold?: boolean;
    hAlign?: ExcelJS.Alignment['horizontal'];
    vAlign?: ExcelJS.Alignment['vertical'];
    fill?: string;
    fontColor?: string;
    size?: number;
    wrapText?: boolean;
    border?: boolean;
  } = {}
) {
  if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2);
  const cell = ws.getCell(r1, c1);
  cell.value = value;
  cell.font = {
    name: 'Calibri',
    size: opts.size ?? 11,
    bold: opts.bold ?? false,
    color: { argb: opts.fontColor ?? CLR.BLACK },
  };
  cell.alignment = {
    horizontal: opts.hAlign ?? 'center',
    vertical: opts.vAlign ?? 'middle',
    wrapText: opts.wrapText ?? true,
  };
  if (opts.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
  }
  if (opts.border !== false) {
    cell.border = ALL_BORDERS as ExcelJS.Borders;
  }
}

/** Set a single cell value + style */
function setCell(
  ws: ExcelJS.Worksheet, r: number, c: number,
  value: ExcelJS.CellValue,
  opts: {
    bold?: boolean;
    hAlign?: ExcelJS.Alignment['horizontal'];
    fill?: string;
    fontColor?: string;
    size?: number;
    wrapText?: boolean;
    numFmt?: string;
    border?: boolean;
  } = {}
) {
  const cell = ws.getCell(r, c);
  cell.value = value;
  cell.font = {
    name: 'Calibri',
    size: opts.size ?? 11,
    bold: opts.bold ?? false,
    color: { argb: opts.fontColor ?? CLR.BLACK },
  };
  cell.alignment = {
    horizontal: opts.hAlign ?? 'left',
    vertical: 'middle',
    wrapText: opts.wrapText ?? true,
  };
  if (opts.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
  }
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  if (opts.border !== false) {
    cell.border = ALL_BORDERS as ExcelJS.Borders;
  }
}

/** Fill entire row with a solid background + BLACK bold text (section labels, sub-totals, signatory) */
function sectionRow(
  ws: ExcelJS.Worksheet, r: number, c1: number, c2: number,
  fill: string,
  fontColor: string = CLR.BLACK,
) {
  for (let c = c1; c <= c2; c++) {
    const cell = ws.getCell(r, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: fontColor } };
    cell.border = ALL_BORDERS as ExcelJS.Borders;
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  }
}

/** Fill row with black background + white bold (column headers) */
function headerFill(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number) {
  for (let c = c1; c <= c2; c++) {
    const cell = ws.getCell(r, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.BLACK } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: CLR.WHITE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = ALL_BORDERS as ExcelJS.Borders;
  }
}

/** Budget number cell helper */
function numCell(ws: ExcelJS.Worksheet, r: number, c: number, v: number, fill?: string) {
  const cell = ws.getCell(r, c);
  cell.value = v;
  cell.numFmt = '#,##0.00';
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.font = { name: 'Calibri', size: 11 };
  cell.border = ALL_BORDERS as ExcelJS.Borders;
  if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
}

// ═══════════════════════════════════════════════════════════════════════════
// Budget sum helpers
// ═══════════════════════════════════════════════════════════════════════════

function sumGPB(rows: { mooe: number; ps: number; co: number }[]) {
  return {
    mooe: rows.reduce((s, r) => s + r.mooe, 0),
    ps:   rows.reduce((s, r) => s + r.ps,   0),
    co:   rows.reduce((s, r) => s + r.co,   0),
  };
}

function sumAR(rows: { approvedBudget: number; actualCost: number }[]) {
  return {
    approved: rows.reduce((s, r) => s + r.approvedBudget, 0),
    actual:   rows.reduce((s, r) => s + r.actualCost, 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BARANGAY GPB — 7 columns (A–G)
// Col: Gender Issue(1) | GAD Activity(4) | Indicator(5) | MOOE(6) | PS(7) | CO(8) | Office(9)
// ═══════════════════════════════════════════════════════════════════════════

async function genBrgyGPB(d: z.infer<typeof brgyGPBFormSchema>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GAD Portal';
  const ws = wb.addWorksheet('GPB');
  const NC = 7; // number of columns

  ws.columns = [
    { width: 38 }, // A: Gender Issue
    { width: 35 }, // B: GAD Activity
    { width: 35 }, // C: Indicator
    { width: 16 }, // D: MOOE
    { width: 14 }, // E: PS
    { width: 14 }, // F: CO
    { width: 28 }, // G: Office
  ];

  let r = 1;

  // ── Title ──────────────────────────────────────────────────────────────
  mergeSet(ws, r, 1, r, NC,
    'BARANGAY ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET',
    { bold: true, size: 13, border: false });
  ws.getRow(r).height = 22;
  r++;

  mergeSet(ws, r, 1, r, NC, `CY ${d.cy}`, { size: 12, border: false });
  ws.getRow(r).height = 18;
  r++;

  // ── Info rows ───────────────────────────────────────────────────────────
  r++; // blank row
  setCell(ws, r, 1, 'Region:', { bold: true, border: false });
  setCell(ws, r, 2, d.region, { border: false });
  setCell(ws, r, 5, 'Total Barangay Budget:', { bold: true, border: false });
  setCell(ws, r, 6, d.totalBrgyBudget, { numFmt: '#,##0.00', border: false });
  ws.getCell(r, 6).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'Province:', { bold: true, border: false });
  setCell(ws, r, 2, d.province, { border: false });
  setCell(ws, r, 5, 'Total GAD Budget:', { bold: true, border: false });
  setCell(ws, r, 6, d.totalGadBudget, { numFmt: '#,##0.00', border: false });
  ws.getCell(r, 6).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'City/Municipality:', { bold: true, border: false });
  setCell(ws, r, 2, d.cityMunicipality, { border: false });
  r++;

  setCell(ws, r, 1, 'Barangay:', { bold: true, border: false });
  setCell(ws, r, 2, d.barangay, { border: false });
  r++;

  r++; // blank row before headers

  // ── Column Headers (2 rows: D-F have "GAD Budget" span on row 1) ────────
  const hRow1 = r;
  // A: Gender Issue (spans 2 rows)
  mergeSet(ws, hRow1, 1, hRow1 + 1, 1,
    'Gender Issue or\nGAD Mandate\n(1)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  // B: GAD Activity (spans 2 rows)
  mergeSet(ws, hRow1, 2, hRow1 + 1, 2,
    'GAD Activity\n(4)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  // C: Indicator (spans 2 rows)
  mergeSet(ws, hRow1, 3, hRow1 + 1, 3,
    'Performance Indicator and Target\n(5)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  // D-F: GAD Budget span (row 1 only)
  mergeSet(ws, hRow1, 4, hRow1, 6,
    'GAD Budget',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  // G: Responsible Office (spans 2 rows)
  mergeSet(ws, hRow1, 7, hRow1 + 1, 7,
    'Responsible Office\n(9)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  ws.getRow(hRow1).height = 30;
  r++;

  // Row 2 of header: MOOE / PS / CO sub-labels
  headerFill(ws, r, 1, NC);
  setCell(ws, r, 4, 'MOOE\n(6)', { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 5, 'PS\n(7)',   { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 6, 'CO\n(8)',   { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  ws.getRow(r).height = 28;
  r++;

  // ── CLIENT-FOCUSED ──────────────────────────────────────────────────────
  mergeSet(ws, r, 1, r, NC, 'CLIENT-FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  const cfRows = d.clientFocused.length > 0 ? d.clientFocused : [null];
  for (const row of cfRows) {
    setCell(ws, r, 1, row?.gadIssue ?? '', { wrapText: true });
    setCell(ws, r, 2, row?.activity ?? '', { wrapText: true });
    setCell(ws, r, 3, row?.indicator ?? '', { wrapText: true });
    numCell(ws, r, 4, row?.mooe ?? 0);
    numCell(ws, r, 5, row?.ps ?? 0);
    numCell(ws, r, 6, row?.co ?? 0);
    setCell(ws, r, 7, row?.responsibleOffice ?? '', { wrapText: true });
    ws.getRow(r).height = 40;
    r++;
  }

  const cfSum = sumGPB(d.clientFocused);
  mergeSet(ws, r, 1, r, 3, 'Sub Total A', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 4, cfSum.mooe, CLR.OLIVE);
  numCell(ws, r, 5, cfSum.ps,   CLR.OLIVE);
  numCell(ws, r, 6, cfSum.co,   CLR.OLIVE);
  setCell(ws, r, 7, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ── ORGANIZATION FOCUSED ────────────────────────────────────────────────
  mergeSet(ws, r, 1, r, NC, 'ORGANIZATION FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  const ofRows = d.organizationFocused.length > 0 ? d.organizationFocused : [null];
  for (const row of ofRows) {
    setCell(ws, r, 1, row?.gadIssue ?? '', { wrapText: true });
    setCell(ws, r, 2, row?.activity ?? '', { wrapText: true });
    setCell(ws, r, 3, row?.indicator ?? '', { wrapText: true });
    numCell(ws, r, 4, row?.mooe ?? 0);
    numCell(ws, r, 5, row?.ps ?? 0);
    numCell(ws, r, 6, row?.co ?? 0);
    setCell(ws, r, 7, row?.responsibleOffice ?? '', { wrapText: true });
    ws.getRow(r).height = 40;
    r++;
  }

  const ofSum = sumGPB(d.organizationFocused);
  mergeSet(ws, r, 1, r, 3, 'Sub Total B', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 4, ofSum.mooe, CLR.OLIVE);
  numCell(ws, r, 5, ofSum.ps,   CLR.OLIVE);
  numCell(ws, r, 6, ofSum.co,   CLR.OLIVE);
  setCell(ws, r, 7, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ── ATTRIBUTED PROGRAMS ─────────────────────────────────────────────────
  mergeSet(ws, r, 1, r, NC, 'ATTRIBUTED PROGRAMS', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  // Attributed sub-headers
  mergeSet(ws, r, 1, r, 2,
    'Title of Barangay Program or Project\n(9)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  setCell(ws, r, 3, 'HGDG Score\n(10)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  mergeSet(ws, r, 4, r, 5,
    'Total Annual Program/Project Budget\n(11)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  setCell(ws, r, 6, 'GAD Attributed Budget\n(13)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 7, 'Variance or Remarks',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  ws.getRow(r).height = 35;
  r++;

  const attrRows = d.attributedPrograms.length > 0 ? d.attributedPrograms : [null];
  for (const row of attrRows) {
    mergeSet(ws, r, 1, r, 2, row?.projectTitle ?? '', { hAlign: 'left', border: true });
    numCell(ws, r, 3, row?.hgdgScore ?? 0);
    mergeSet(ws, r, 4, r, 5, row ? row.totalBudget : 0, { hAlign: 'right', border: true, wrapText: false });
    (ws.getCell(r, 4) as ExcelJS.Cell).numFmt = '#,##0.00';
    numCell(ws, r, 6, row?.gadAttributedBudget ?? 0);
    setCell(ws, r, 7, row?.varianceRemarks ?? '', { wrapText: true });
    ws.getRow(r).height = 30;
    r++;
  }

  const attrTotal = d.attributedPrograms.reduce((s, x) => s + x.totalBudget, 0);
  const attrGad   = d.attributedPrograms.reduce((s, x) => s + x.gadAttributedBudget, 0);
  mergeSet(ws, r, 1, r, 2, 'Sub Total C', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  setCell(ws, r, 3, '', { fill: CLR.OLIVE });
  mergeSet(ws, r, 4, r, 5, attrTotal, { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'right', wrapText: false });
  (ws.getCell(r, 4) as ExcelJS.Cell).numFmt = '#,##0.00';
  numCell(ws, r, 6, attrGad, CLR.OLIVE);
  setCell(ws, r, 7, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ── GRAND TOTAL ─────────────────────────────────────────────────────────
  const grandMOOE = cfSum.mooe + ofSum.mooe;
  const grandPS   = cfSum.ps   + ofSum.ps;
  const grandCO   = cfSum.co   + ofSum.co;

  mergeSet(ws, r, 1, r, 3, 'GRAND TOTAL (A+B+C)',
    { fill: CLR.YELLOW, fontColor: CLR.BLACK, bold: true, hAlign: 'left' });
  numCell(ws, r, 4, grandMOOE, CLR.YELLOW);
  numCell(ws, r, 5, grandPS,   CLR.YELLOW);
  numCell(ws, r, 6, grandCO,   CLR.YELLOW);
  setCell(ws, r, 7, '', { fill: CLR.YELLOW });
  ws.getRow(r).height = 20;
  r++;

  // ── Signatory ───────────────────────────────────────────────────────────
  r++;
  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'Prepared by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 3, 'Approved by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 6, 'Date:',         { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, d.preparedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 3, d.approvedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 22;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'Barangay GAD Focal Point', { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 3, 'Punong Barangay',          { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// ═══════════════════════════════════════════════════════════════════════════
// BARANGAY AR — 7 columns (A–G)
// Col: Gender Issue(1) | PPA(2) | Indicator(3) | Accomplishments(4) | Approved(5) | Actual(6) | Variance(7)
// ═══════════════════════════════════════════════════════════════════════════

async function genBrgyAR(d: z.infer<typeof brgyARFormSchema>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GAD Portal';
  const ws = wb.addWorksheet('AR');
  const NC = 7;

  ws.columns = [
    { width: 36 }, // A: Gender Issue
    { width: 34 }, // B: PPA
    { width: 32 }, // C: Indicator
    { width: 34 }, // D: Accomplishments
    { width: 18 }, // E: Approved Budget
    { width: 18 }, // F: Actual Cost
    { width: 22 }, // G: Variance
  ];

  let r = 1;

  // Title
  mergeSet(ws, r, 1, r, NC,
    'BARANGAY ANNUAL GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT',
    { bold: true, size: 13, border: false });
  ws.getRow(r).height = 22;
  r++;

  mergeSet(ws, r, 1, r, NC, `FY ${d.fy}`, { size: 12, border: false });
  ws.getRow(r).height = 18;
  r++;

  r++;
  setCell(ws, r, 1, 'Region:', { bold: true, border: false });
  setCell(ws, r, 2, d.region,  { border: false });
  setCell(ws, r, 5, 'Total Barangay Budget:', { bold: true, border: false });
  setCell(ws, r, 6, d.totalBrgyBudget, { numFmt: '#,##0.00', border: false });
  ws.getCell(r, 6).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'Province:', { bold: true, border: false });
  setCell(ws, r, 2, d.province,  { border: false });
  setCell(ws, r, 5, 'Total GAD Budget:', { bold: true, border: false });
  setCell(ws, r, 6, d.totalGadBudget, { numFmt: '#,##0.00', border: false });
  ws.getCell(r, 6).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'City/Municipality:', { bold: true, border: false });
  setCell(ws, r, 2, d.cityMunicipality,   { border: false });
  r++;

  setCell(ws, r, 1, 'Barangay:', { bold: true, border: false });
  setCell(ws, r, 2, d.barangay,  { border: false });
  r++;
  r++;

  // Column headers (1-row, no span needed)
  headerFill(ws, r, 1, NC);
  setCell(ws, r, 1, 'Gender Issue or\nGAD Mandate\n(1)',                        { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 2, 'GAD Program/Project/\nActivity (PPA)\n(2)',                 { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 3, 'Performance Target\nand Indicator\n(3)',                    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 4, 'Accomplishments\n(4)',                                      { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 5, 'Approved GAD\nBudget\n(5)',                                 { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 6, 'Actual GAD Cost or\nExpenditure\n(6)',                      { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 7, 'Variance or\nRemarks\n(7)',                                 { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  ws.getRow(r).height = 45;
  r++;

  const addARRows = (rows: z.infer<typeof brgyARRowSchema>[]) => {
    const src = rows.length > 0 ? rows : [null];
    for (const row of src) {
      setCell(ws, r, 1, row?.gadIssue      ?? '', { wrapText: true });
      setCell(ws, r, 2, row?.ppa           ?? '', { wrapText: true });
      setCell(ws, r, 3, row?.indicator     ?? '', { wrapText: true });
      setCell(ws, r, 4, row?.accomplishments ?? '', { wrapText: true });
      numCell(ws, r, 5, row?.approvedBudget ?? 0);
      numCell(ws, r, 6, row?.actualCost     ?? 0);
      setCell(ws, r, 7, row?.variance       ?? '', { wrapText: true });
      ws.getRow(r).height = 40;
      r++;
    }
  };

  // CLIENT-FOCUSED
  mergeSet(ws, r, 1, r, NC, 'CLIENT-FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  mergeSet(ws, r, 1, r, NC, '1. Gender Issues', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: false, hAlign: 'left' });
  ws.getRow(r).height = 16;
  r++;
  addARRows(d.clientFocusedGenderIssues);

  mergeSet(ws, r, 1, r, NC, '2. GAD Mandate', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: false, hAlign: 'left' });
  ws.getRow(r).height = 16;
  r++;
  addARRows(d.clientFocusedGadMandate);

  const allCF = [...d.clientFocusedGenderIssues, ...d.clientFocusedGadMandate];
  const cfS = sumAR(allCF);
  mergeSet(ws, r, 1, r, 4, 'Sub-total A', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 5, cfS.approved, CLR.OLIVE);
  numCell(ws, r, 6, cfS.actual,   CLR.OLIVE);
  setCell(ws, r, 7, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ORGANIZATION FOCUSED
  mergeSet(ws, r, 1, r, NC, 'ORGANIZATION FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  mergeSet(ws, r, 1, r, NC, '1. Gender Issues', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: false, hAlign: 'left' });
  ws.getRow(r).height = 16;
  r++;
  addARRows(d.organizationGenderIssues);

  mergeSet(ws, r, 1, r, NC, '2. GAD Mandate', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: false, hAlign: 'left' });
  ws.getRow(r).height = 16;
  r++;
  addARRows(d.organizationGadMandate);

  const allOF = [...d.organizationGenderIssues, ...d.organizationGadMandate];
  const ofS = sumAR(allOF);
  mergeSet(ws, r, 1, r, 4, 'Sub-total B', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 5, ofS.approved, CLR.OLIVE);
  numCell(ws, r, 6, ofS.actual,   CLR.OLIVE);
  setCell(ws, r, 7, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ATTRIBUTED PROGRAMS
  mergeSet(ws, r, 1, r, NC, 'ATTRIBUTED PROGRAMS', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  mergeSet(ws, r, 1, r, 2, 'Title of Barangay Project\n(8)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  setCell(ws, r, 3, 'HGDG Score\n(9)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  mergeSet(ws, r, 4, r, 5, 'Total Annual Program/\nProject Cost\n(10)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  setCell(ws, r, 6, 'GAD Attributed\nCost\n(11)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 7, 'Variance or\nRemarks\n(12)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  ws.getRow(r).height = 38;
  r++;

  const attrAR = d.attributedPrograms.length > 0 ? d.attributedPrograms : [null];
  for (const row of attrAR) {
    mergeSet(ws, r, 1, r, 2, row?.projectTitle ?? '', { hAlign: 'left', border: true });
    numCell(ws, r, 3, row?.hgdgScore ?? 0);
    mergeSet(ws, r, 4, r, 5, row ? row.totalBudget : 0, { hAlign: 'right', border: true, wrapText: false });
    (ws.getCell(r, 4) as ExcelJS.Cell).numFmt = '#,##0.00';
    numCell(ws, r, 6, row?.gadAttributedBudget ?? 0);
    setCell(ws, r, 7, row?.varianceRemarks ?? '', { wrapText: true });
    ws.getRow(r).height = 30;
    r++;
  }

  const attrTotal = d.attributedPrograms.reduce((s, x) => s + x.totalBudget, 0);
  const attrGad   = d.attributedPrograms.reduce((s, x) => s + x.gadAttributedBudget, 0);
  mergeSet(ws, r, 1, r, 2, 'Sub-total C', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  setCell(ws, r, 3, '', { fill: CLR.OLIVE });
  mergeSet(ws, r, 4, r, 5, attrTotal, { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'right', wrapText: false });
  (ws.getCell(r, 4) as ExcelJS.Cell).numFmt = '#,##0.00';
  numCell(ws, r, 6, attrGad, CLR.OLIVE);
  setCell(ws, r, 7, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // GRAND TOTAL
  mergeSet(ws, r, 1, r, 4, 'GRAND TOTAL (A+B+C)',
    { fill: CLR.YELLOW, fontColor: CLR.BLACK, bold: true, hAlign: 'left' });
  numCell(ws, r, 5, cfS.approved + ofS.approved + attrGad, CLR.YELLOW);
  numCell(ws, r, 6, cfS.actual   + ofS.actual,             CLR.YELLOW);
  setCell(ws, r, 7, '', { fill: CLR.YELLOW });
  ws.getRow(r).height = 20;
  r++;

  // Signatory
  r++;
  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'Prepared by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 3, 'Approved by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 6, 'Date:',         { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, d.preparedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 3, d.approvedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 6, d.date,       { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 22;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'Barangay GAD Focal Point', { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 3, 'Punong Barangay',          { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CITY GPB — 9 columns (A–I) — ANNEX D
// Col: Gender Issue(1) | Objective(2) | Relevant Program(3) | Activity(4) |
//      Indicator(5) | MOOE(6) | PS(7) | CO(8) | Office(9)
// ═══════════════════════════════════════════════════════════════════════════

async function genCityGPB(d: z.infer<typeof cityGPBFormSchema>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GAD Portal';
  const ws = wb.addWorksheet('GPB');
  const NC = 9;

  ws.columns = [
    { width: 38 }, // A
    { width: 26 }, // B
    { width: 26 }, // C
    { width: 30 }, // D
    { width: 30 }, // E
    { width: 16 }, // F: MOOE
    { width: 14 }, // G: PS
    { width: 14 }, // H: CO
    { width: 26 }, // I
  ];

  let r = 1;

  // Title
  mergeSet(ws, r, 1, r, NC,
    'ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET',
    { bold: true, size: 13, border: false });
  ws.getRow(r).height = 22;
  r++;

  // FY + ANNEX D
  mergeSet(ws, r, 1, r, NC - 1, `FY ${d.fy}`, { size: 12, border: false });
  setCell(ws, r, NC, 'ANNEX D', { bold: true, hAlign: 'right', border: false });
  ws.getRow(r).height = 18;
  r++;

  r++;
  setCell(ws, r, 1, 'Region:', { bold: true, border: false });
  setCell(ws, r, 2, d.region,  { border: false });
  setCell(ws, r, 7, 'Total LGU Budget', { bold: true, border: false });
  mergeSet(ws, r, 8, r, NC, d.totalLguBudget, { hAlign: 'right', border: false, wrapText: false });
  (ws.getCell(r, 8) as ExcelJS.Cell).numFmt = '#,##0.00';
  (ws.getCell(r, 8) as ExcelJS.Cell).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'Province:', { bold: true, border: false });
  setCell(ws, r, 2, d.province,  { border: false });
  setCell(ws, r, 7, 'Total GAD Budget', { bold: true, border: false });
  mergeSet(ws, r, 8, r, NC, d.totalGadBudget, { hAlign: 'right', border: false, wrapText: false });
  (ws.getCell(r, 8) as ExcelJS.Cell).numFmt = '#,##0.00';
  (ws.getCell(r, 8) as ExcelJS.Cell).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'City/ Municipality:', { bold: true, border: false });
  setCell(ws, r, 2, d.cityMunicipality,    { border: false });
  r++;

  if (d.officeName) {
    setCell(ws, r, 1, 'Office/Department:', { bold: true, border: false });
    setCell(ws, r, 2, d.officeName, { border: false });
    r++;
  }

  r++;

  // ── Two-row column header ───────────────────────────────────────────────
  const hRow1 = r;
  // Vertically-merged single-column headers
  mergeSet(ws, hRow1, 1, hRow1 + 1, 1,
    'Gender Issue or GAD Mandate\n(1)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 2, hRow1 + 1, 2,
    'GAD Objective\n(2)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 3, hRow1 + 1, 3,
    'Relevant LGU Program or Project\n(3)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 4, hRow1 + 1, 4,
    'GAD Activity\n(4)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 5, hRow1 + 1, 5,
    'Performance Indicator and Target\n(5)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  // F-H span = "GAD Budget"
  mergeSet(ws, hRow1, 6, hRow1, 8,
    'GAD Budget',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  // I spans 2 rows
  mergeSet(ws, hRow1, 9, hRow1 + 1, 9,
    'Lead or Responsible Office\n(9)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  ws.getRow(hRow1).height = 30;
  r++;

  // Row 2 of header
  headerFill(ws, r, 1, NC);
  setCell(ws, r, 6, 'MOOE\n(6)', { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 7, 'PS\n(7)',   { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 8, 'CO\n(8)',   { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  ws.getRow(r).height = 28;
  r++;

  // ── CLIENT-FOCUSED ──────────────────────────────────────────────────────
  mergeSet(ws, r, 1, r, NC, 'CLIENT-FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  const cfGPBRows = d.clientFocused.length > 0 ? d.clientFocused : [null];
  for (const row of cfGPBRows) {
    setCell(ws, r, 1, row?.gadIssue      ?? '', { wrapText: true });
    setCell(ws, r, 2, row?.gadObjective  ?? '', { wrapText: true });
    setCell(ws, r, 3, row?.relevantProgram ?? '', { wrapText: true });
    setCell(ws, r, 4, row?.activity      ?? '', { wrapText: true });
    setCell(ws, r, 5, row?.indicator     ?? '', { wrapText: true });
    numCell(ws, r, 6, row?.mooe ?? 0);
    numCell(ws, r, 7, row?.ps   ?? 0);
    numCell(ws, r, 8, row?.co   ?? 0);
    setCell(ws, r, 9, row?.responsibleOffice ?? '', { wrapText: true });
    ws.getRow(r).height = 45;
    r++;
  }

  const cfSum = sumGPB(d.clientFocused);
  mergeSet(ws, r, 1, r, 5, 'Sub Total A', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 6, cfSum.mooe, CLR.OLIVE);
  numCell(ws, r, 7, cfSum.ps,   CLR.OLIVE);
  numCell(ws, r, 8, cfSum.co,   CLR.OLIVE);
  setCell(ws, r, 9, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ── ORGANIZATION FOCUSED ────────────────────────────────────────────────
  mergeSet(ws, r, 1, r, NC, 'ORGANIZATION FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  const ofGPBRows = d.organizationFocused.length > 0 ? d.organizationFocused : [null];
  for (const row of ofGPBRows) {
    setCell(ws, r, 1, row?.gadIssue       ?? '', { wrapText: true });
    setCell(ws, r, 2, row?.gadObjective   ?? '', { wrapText: true });
    setCell(ws, r, 3, row?.relevantProgram ?? '', { wrapText: true });
    setCell(ws, r, 4, row?.activity       ?? '', { wrapText: true });
    setCell(ws, r, 5, row?.indicator      ?? '', { wrapText: true });
    numCell(ws, r, 6, row?.mooe ?? 0);
    numCell(ws, r, 7, row?.ps   ?? 0);
    numCell(ws, r, 8, row?.co   ?? 0);
    setCell(ws, r, 9, row?.responsibleOffice ?? '', { wrapText: true });
    ws.getRow(r).height = 45;
    r++;
  }

  const ofSum = sumGPB(d.organizationFocused);

  // ── ATTRIBUTED PROGRAMS ─────────────────────────────────────────────────
  // (Per official DILG template: Attributed Programs appears between Org-Focused
  //  and Sub Total B. Sub Total B still reflects Organization-Focused totals.)
  mergeSet(ws, r, 1, r, NC, 'ATTRIBUTED PROGRAMS', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  // Attributed sub-headers — row height 60 to show all 3 lines of wrapped text
  mergeSet(ws, r, 1, r, 2, 'Title of LGU Program or Project',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, vAlign: 'top' });
  setCell(ws, r, 3, 'Funding Facility/\nGeneric Checklist\nScore',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  (ws.getCell(r, 3) as ExcelJS.Cell).alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
  mergeSet(ws, r, 4, r, 5, 'Total Annual Program/\nProject Budget',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, vAlign: 'top' });
  mergeSet(ws, r, 6, r, 8, 'GAD Attributed Program/\nProject Budget',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, vAlign: 'top' });
  setCell(ws, r, 9, 'Lead or\nResponsible\nOffice',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  (ws.getCell(r, 9) as ExcelJS.Cell).alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
  ws.getRow(r).height = 60;
  r++;

  const attrRows = d.attributedPrograms.length > 0 ? d.attributedPrograms : [null];
  for (const row of attrRows) {
    mergeSet(ws, r, 1, r, 2, row?.projectTitle ?? '', { hAlign: 'left', border: true });
    numCell(ws, r, 3, row?.hgdgScore ?? 0);
    mergeSet(ws, r, 4, r, 5, row ? row.totalBudget : 0, { hAlign: 'right', border: true, wrapText: false });
    (ws.getCell(r, 4) as ExcelJS.Cell).numFmt = '#,##0.00';
    mergeSet(ws, r, 6, r, 8, row ? row.gadAttributedBudget : 0, { hAlign: 'right', border: true, wrapText: false });
    (ws.getCell(r, 6) as ExcelJS.Cell).numFmt = '#,##0.00';
    setCell(ws, r, 9, row?.responsibleOffice ?? '', { wrapText: true });
    ws.getRow(r).height = 30;
    r++;
  }

  // Sub Total B — Organization-Focused totals (placed after Attributed Programs
  // per official DILG Annex D layout)
  mergeSet(ws, r, 1, r, 5, 'Sub Total B', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 6, ofSum.mooe, CLR.OLIVE);
  numCell(ws, r, 7, ofSum.ps,   CLR.OLIVE);
  numCell(ws, r, 8, ofSum.co,   CLR.OLIVE);
  setCell(ws, r, 9, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ── GRAND TOTAL ─────────────────────────────────────────────────────────
  const grandMOOE = cfSum.mooe + ofSum.mooe;
  const grandPS   = cfSum.ps   + ofSum.ps;
  const grandCO   = cfSum.co   + ofSum.co;

  mergeSet(ws, r, 1, r, 5, 'GRAND TOTAL (A+B)',
    { fill: CLR.YELLOW, fontColor: CLR.BLACK, bold: true, hAlign: 'left' });
  numCell(ws, r, 6, grandMOOE, CLR.YELLOW);
  numCell(ws, r, 7, grandPS,   CLR.YELLOW);
  numCell(ws, r, 8, grandCO,   CLR.YELLOW);
  setCell(ws, r, 9, '', { fill: CLR.YELLOW });
  ws.getRow(r).height = 20;
  r++;

  // ── Signatory ───────────────────────────────────────────────────────────
  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'Prepared by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 4, 'Approved by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 7, 'Date:',         { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, d.preparedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 4, d.approvedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 7, d.date,       { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 22;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'GAD Focal Person / TWG Member', { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 4, 'Department Head',               { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 7, 'DD/MM/YEAR',                    { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CITY AR — 10 columns (A–J) — ANNEX E
// Col: Gender Issue(1) | Objective(2) | Relevant Program(3) | Activity(4) |
//      Indicator(5) | Actual Results(6) | Approved Budget(7) | Actual Cost(8) |
//      Variance(9) | Office(10)
// ═══════════════════════════════════════════════════════════════════════════

async function genCityAR(d: z.infer<typeof cityARFormSchema>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GAD Portal';
  const ws = wb.addWorksheet('AR');
  const NC = 10;

  ws.columns = [
    { width: 36 }, // A
    { width: 24 }, // B
    { width: 24 }, // C
    { width: 28 }, // D
    { width: 28 }, // E
    { width: 26 }, // F: Actual Results
    { width: 18 }, // G: Approved Budget
    { width: 18 }, // H: Actual Cost
    { width: 18 }, // I: Variance
    { width: 24 }, // J: Office
  ];

  let r = 1;

  // Title
  mergeSet(ws, r, 1, r, NC,
    `${d.quarter.toUpperCase()} GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT`,
    { bold: true, size: 13, border: false });
  ws.getRow(r).height = 22;
  r++;

  mergeSet(ws, r, 1, r, NC - 1, `FY ${d.fy}`, { size: 12, border: false });
  setCell(ws, r, NC, 'ANNEX E', { bold: true, hAlign: 'right', border: false });
  ws.getRow(r).height = 18;
  r++;

  r++;
  setCell(ws, r, 1, 'Region:', { bold: true, border: false });
  setCell(ws, r, 2, d.region,  { border: false });
  setCell(ws, r, 8, 'Total LGU Budget', { bold: true, border: false });
  mergeSet(ws, r, 9, r, NC, d.totalLguBudget, { hAlign: 'right', border: false, wrapText: false });
  (ws.getCell(r, 9) as ExcelJS.Cell).numFmt = '#,##0.00';
  (ws.getCell(r, 9) as ExcelJS.Cell).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'Province:', { bold: true, border: false });
  setCell(ws, r, 2, d.province,  { border: false });
  setCell(ws, r, 8, 'Total GAD Budget', { bold: true, border: false });
  mergeSet(ws, r, 9, r, NC, d.totalGadBudget, { hAlign: 'right', border: false, wrapText: false });
  (ws.getCell(r, 9) as ExcelJS.Cell).numFmt = '#,##0.00';
  (ws.getCell(r, 9) as ExcelJS.Cell).border = { bottom: THIN };
  r++;

  setCell(ws, r, 1, 'City/ Municipality:', { bold: true, border: false });
  setCell(ws, r, 2, d.cityMunicipality,    { border: false });
  r++;

  if (d.officeName) {
    setCell(ws, r, 1, 'Office/Department:', { bold: true, border: false });
    setCell(ws, r, 2, d.officeName, { border: false });
    r++;
  }

  r++;

  // ── Two-row column header ───────────────────────────────────────────────
  const hRow1 = r;
  mergeSet(ws, hRow1, 1,  hRow1 + 1, 1,  'Gender Issue or GAD Mandate\n(1)',        { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 2,  hRow1 + 1, 2,  'GAD Objective\n(2)',                      { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 3,  hRow1 + 1, 3,  'Relevant LGU Program or Project\n(3)',    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 4,  hRow1 + 1, 4,  'GAD Activity\n(4)',                       { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 5,  hRow1 + 1, 5,  'Performance Indicator and Target\n(5)',   { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 6,  hRow1 + 1, 6,  'Actual Results\n(6)',                     { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  // G-I span = "GAD Budget"
  mergeSet(ws, hRow1, 7,  hRow1, 9,      'GAD Budget',                              { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, hRow1, 10, hRow1 + 1, 10, 'Lead or Responsible Office\n(10)',        { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  ws.getRow(hRow1).height = 30;
  r++;

  headerFill(ws, r, 1, NC);
  setCell(ws, r, 7, 'Approved\nBudget\n(7)', { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 8, 'Actual\nCost\n(8)',     { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  setCell(ws, r, 9, 'Variance\n(9)',         { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  ws.getRow(r).height = 28;
  r++;

  const addCityARRows = (rows: z.infer<typeof cityARRowSchema>[]) => {
    const src = rows.length > 0 ? rows : [null];
    for (const row of src) {
      setCell(ws, r, 1,  row?.gadIssue        ?? '', { wrapText: true });
      setCell(ws, r, 2,  row?.gadObjective    ?? '', { wrapText: true });
      setCell(ws, r, 3,  row?.relevantProgram ?? '', { wrapText: true });
      setCell(ws, r, 4,  row?.activity        ?? '', { wrapText: true });
      setCell(ws, r, 5,  row?.indicator       ?? '', { wrapText: true });
      setCell(ws, r, 6,  row?.actualResults   ?? '', { wrapText: true });
      numCell(ws, r, 7,  row?.approvedBudget  ?? 0);
      numCell(ws, r, 8,  row?.actualCost      ?? 0);
      setCell(ws, r, 9,  row?.variance        ?? '', { wrapText: true });
      setCell(ws, r, 10, row?.responsibleOffice ?? '', { wrapText: true });
      ws.getRow(r).height = 45;
      r++;
    }
  };

  // CLIENT-FOCUSED
  mergeSet(ws, r, 1, r, NC, 'CLIENT-FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;
  addCityARRows(d.clientFocused);

  const cfS = sumAR(d.clientFocused);
  mergeSet(ws, r, 1, r, 6, 'SUB TOTAL A', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 7, cfS.approved, CLR.OLIVE);
  numCell(ws, r, 8, cfS.actual,   CLR.OLIVE);
  setCell(ws, r, 9,  '', { fill: CLR.OLIVE });
  setCell(ws, r, 10, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ORGANIZATION FOCUSED
  mergeSet(ws, r, 1, r, NC, 'ORGANIZATION FOCUSED', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;
  addCityARRows(d.organizationFocused);

  const ofS = sumAR(d.organizationFocused);
  mergeSet(ws, r, 1, r, 6, 'SUB TOTAL B', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  numCell(ws, r, 7, ofS.approved, CLR.OLIVE);
  numCell(ws, r, 8, ofS.actual,   CLR.OLIVE);
  setCell(ws, r, 9,  '', { fill: CLR.OLIVE });
  setCell(ws, r, 10, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // ATTRIBUTED PROGRAMS
  mergeSet(ws, r, 1, r, NC, 'ATTRIBUTED PROGRAMS', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  ws.getRow(r).height = 18;
  r++;

  mergeSet(ws, r, 1, r, 4, 'Title of LGU Program or Project',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  setCell(ws, r, 5, 'HGDG Score\n(9)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  mergeSet(ws, r, 6, r, 7, 'Total Annual Program/\nProject Budget\n(10)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  mergeSet(ws, r, 8, r, 9, 'GAD Attributed Budget\n(11)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10 });
  setCell(ws, r, 10, 'Lead or\nResponsible\nOffice\n(12)',
    { fill: CLR.BLACK, fontColor: CLR.WHITE, bold: true, size: 10, hAlign: 'center' });
  ws.getRow(r).height = 40;
  r++;

  const attrAR = d.attributedPrograms.length > 0 ? d.attributedPrograms : [null];
  for (const row of attrAR) {
    mergeSet(ws, r, 1, r, 4, row?.projectTitle ?? '', { hAlign: 'left', border: true });
    numCell(ws, r, 5, row?.hgdgScore ?? 0);
    mergeSet(ws, r, 6, r, 7, row ? row.totalBudget : 0, { hAlign: 'right', border: true, wrapText: false });
    (ws.getCell(r, 6) as ExcelJS.Cell).numFmt = '#,##0.00';
    mergeSet(ws, r, 8, r, 9, row ? row.gadAttributedBudget : 0, { hAlign: 'right', border: true, wrapText: false });
    (ws.getCell(r, 8) as ExcelJS.Cell).numFmt = '#,##0.00';
    setCell(ws, r, 10, row?.responsibleOffice ?? '', { wrapText: true });
    ws.getRow(r).height = 30;
    r++;
  }

  const attrTotal = d.attributedPrograms.reduce((s, x) => s + x.totalBudget, 0);
  const attrGad   = d.attributedPrograms.reduce((s, x) => s + x.gadAttributedBudget, 0);
  mergeSet(ws, r, 1, r, 4, 'SUB TOTAL C', { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'left' });
  setCell(ws, r, 5, '', { fill: CLR.OLIVE });
  mergeSet(ws, r, 6, r, 7, attrTotal, { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'right', wrapText: false });
  (ws.getCell(r, 6) as ExcelJS.Cell).numFmt = '#,##0.00';
  mergeSet(ws, r, 8, r, 9, attrGad, { fill: CLR.OLIVE, fontColor: CLR.WHITE, bold: true, hAlign: 'right', wrapText: false });
  (ws.getCell(r, 8) as ExcelJS.Cell).numFmt = '#,##0.00';
  setCell(ws, r, 10, '', { fill: CLR.OLIVE });
  ws.getRow(r).height = 18;
  r++;

  // GRAND TOTAL
  mergeSet(ws, r, 1, r, 6, 'GRAND TOTAL (A+B+C)',
    { fill: CLR.YELLOW, fontColor: CLR.BLACK, bold: true, hAlign: 'left' });
  numCell(ws, r, 7, cfS.approved + ofS.approved + attrGad, CLR.YELLOW);
  numCell(ws, r, 8, cfS.actual   + ofS.actual,             CLR.YELLOW);
  setCell(ws, r, 9,  '', { fill: CLR.YELLOW });
  setCell(ws, r, 10, '', { fill: CLR.YELLOW });
  ws.getRow(r).height = 20;
  r++;

  // Signatory
  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'Prepared by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 4, 'Approved by:',  { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 8, 'Date:',         { bold: true, fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, d.preparedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 4, d.approvedBy, { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 8, d.date,       { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 22;
  r++;

  sectionRow(ws, r, 1, NC, CLR.BLUE);
  setCell(ws, r, 1, 'GAD Focal Person / TWG Member', { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 4, 'Department Head',               { fill: CLR.BLUE, fontColor: CLR.BLACK });
  setCell(ws, r, 8, 'DD/MM/YEAR',                    { fill: CLR.BLUE, fontColor: CLR.BLACK });
  ws.getRow(r).height = 18;

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Controllers
// ═══════════════════════════════════════════════════════════════════════════

export async function listTemplates(_req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(res, TEMPLATE_TYPES, 'Templates retrieved successfully');
}

export async function generateTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type } = req.params as { type: TemplateId };
    const def = TEMPLATE_TYPES.find((t) => t.id === type);
    if (!def) { sendError(res, 'Template type not found.', 404); return; }

    let buffer: Buffer;
    let fileName: string;

    if (type === 'BARANGAY_GPB') {
      const p = brgyGPBFormSchema.safeParse(req.body);
      if (!p.success) { sendError(res, p.error.issues[0].message); return; }
      buffer = await genBrgyGPB(p.data);
      fileName = `Brgy_GPB_${p.data.barangay}_CY${p.data.cy}.xlsx`;

    } else if (type === 'BARANGAY_AR') {
      const p = brgyARFormSchema.safeParse(req.body);
      if (!p.success) { sendError(res, p.error.issues[0].message); return; }
      buffer = await genBrgyAR(p.data);
      fileName = `Brgy_AR_${p.data.barangay}_FY${p.data.fy}.xlsx`;

    } else if (type === 'CITY_GPB') {
      const p = cityGPBFormSchema.safeParse(req.body);
      if (!p.success) { sendError(res, p.error.issues[0].message); return; }
      buffer = await genCityGPB(p.data);
      fileName = `City_GPB_${p.data.cityMunicipality}_FY${p.data.fy}.xlsx`;

    } else {
      const p = cityARFormSchema.safeParse(req.body);
      if (!p.success) { sendError(res, p.error.issues[0].message); return; }
      buffer = await genCityAR(p.data);
      fileName = `City_AR_${p.data.cityMunicipality}_FY${p.data.fy}.xlsx`;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Generate template error:', err);
    sendError(res, 'Failed to generate template.', 500);
  }
}

/**
 * Build an Excel buffer for any template type from raw form data.
 * Used by the submission controller to generate approved submissions.
 */
export async function buildExcelForType(
  templateId: string,
  formData: unknown
): Promise<{ buffer: Buffer; fileName: string }> {
  if (templateId === 'BARANGAY_GPB') {
    const p = brgyGPBFormSchema.parse(formData);
    const buffer = await genBrgyGPB(p);
    return { buffer, fileName: `Brgy_GPB_${p.barangay}_CY${p.cy}.xlsx` };
  } else if (templateId === 'BARANGAY_AR') {
    const p = brgyARFormSchema.parse(formData);
    const buffer = await genBrgyAR(p);
    return { buffer, fileName: `Brgy_AR_${p.barangay}_FY${p.fy}.xlsx` };
  } else if (templateId === 'CITY_GPB') {
    const p = cityGPBFormSchema.parse(formData);
    const buffer = await genCityGPB(p);
    return { buffer, fileName: `City_GPB_${p.cityMunicipality}_FY${p.fy}.xlsx` };
  } else if (templateId === 'CITY_AR') {
    const p = cityARFormSchema.parse(formData);
    const buffer = await genCityAR(p);
    return { buffer, fileName: `City_AR_${p.cityMunicipality}_FY${p.fy}.xlsx` };
  } else {
    throw new Error(`Unknown template type: ${templateId}`);
  }
}
