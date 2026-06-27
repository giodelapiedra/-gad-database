/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-side PDF generator that mirrors the official DILG Excel layout
// (same columns, black headers with column numbers, olive section bands,
// yellow grand total, blue signatory block, thin black borders).
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// pdfmake's vfs module exports the font files keyed by filename.
const FONT_VFS: Record<string, string> = require('pdfmake/build/vfs_fonts');

const printer = new (PdfPrinter as any)({
  Roboto: {
    normal:      Buffer.from(FONT_VFS['Roboto-Regular.ttf'], 'base64'),
    bold:        Buffer.from(FONT_VFS['Roboto-Medium.ttf'], 'base64'),
    italics:     Buffer.from(FONT_VFS['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(FONT_VFS['Roboto-MediumItalic.ttf'], 'base64'),
  },
});

// ─── Palette (matches the Excel ARGB values) ───────────────────────────────
const COL = {
  BLACK:  '#000000',
  WHITE:  '#FFFFFF',
  OLIVE:  '#948A54',
  YELLOW: '#FFFF00',
  BLUE:   '#B8CCE4',
};

const peso = (v: number) =>
  (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Cell helpers ──────────────────────────────────────────────────────────
const hdr  = (text: string, extra: any = {}): any => ({ text, fillColor: COL.BLACK, color: COL.WHITE, bold: true, fontSize: 7, alignment: 'center', ...extra });
const sect = (text: string, colSpan: number, bold = true): any => ({ text, colSpan, fillColor: COL.OLIVE, color: COL.WHITE, bold, fontSize: 8, alignment: 'left' });
const sub  = (text: string, colSpan: number): any => ({ text, colSpan, fillColor: COL.OLIVE, color: COL.WHITE, bold: true, fontSize: 7, alignment: 'left' });
const grand = (text: string, colSpan: number): any => ({ text, colSpan, fillColor: COL.YELLOW, color: COL.BLACK, bold: true, fontSize: 8, alignment: 'left' });
const txt  = (text: any): any => ({ text: text == null ? '' : String(text), fontSize: 7, alignment: 'left' });
const num  = (v: number, fill?: string): any => ({ text: peso(v), fontSize: 7, alignment: 'right', ...(fill ? { fillColor: fill } : {}) });
const blank = (fill?: string): any => ({ text: '', ...(fill ? { fillColor: fill } : {}) });

// A colSpan cell must be followed by (n-1) empty placeholders.
const sp = (cell: any, n: number): any[] => [cell, ...Array(Math.max(0, n - 1)).fill({})];

// ─── Sum helpers ───────────────────────────────────────────────────────────
const sumGPB = (rows: any[]) => ({
  mooe: rows.reduce((s, r) => s + (Number(r?.mooe) || 0), 0),
  ps:   rows.reduce((s, r) => s + (Number(r?.ps)   || 0), 0),
  co:   rows.reduce((s, r) => s + (Number(r?.co)   || 0), 0),
});
const sumAR = (rows: any[]) => ({
  approved: rows.reduce((s, r) => s + (Number(r?.approvedBudget) || 0), 0),
  actual:   rows.reduce((s, r) => s + (Number(r?.actualCost)     || 0), 0),
});
const attrSum = (rows: any[]) => ({
  total: rows.reduce((s, r) => s + (Number(r?.totalBudget) || 0), 0),
  gad:   rows.reduce((s, r) => s + (Number(r?.gadAttributedBudget) || 0), 0),
});

const CELL_PAD = 2;   // paddingLeft + paddingRight is added by pdfmake ON TOP of the column width
const BORDER_W = 0.5;
const gridLayout = {
  hLineWidth: () => BORDER_W,
  vLineWidth: () => BORDER_W,
  hLineColor: () => COL.BLACK,
  vLineColor: () => COL.BLACK,
  paddingLeft:   () => CELL_PAD,
  paddingRight:  () => CELL_PAD,
  paddingTop:    () => 2,
  paddingBottom: () => 2,
};

function infoColumns(left: [string, string][], right: [string, string][]): any {
  const mk = (pairs: [string, string][]) => ({
    table: {
      widths: ['auto', '*'],
      body: pairs.map(([k, v]) => [
        { text: k, bold: true, fontSize: 8, border: [false, false, false, false] },
        { text: v, fontSize: 8, border: [false, false, false, true] },
      ]),
    },
    layout: gridLayout,
  });
  return { columns: [mk(left), mk(right)], columnGap: 24, margin: [0, 0, 0, 6] };
}

function signatory(preparedBy: string, approvedBy: string, date: string, role1: string, role2: string): any {
  const c = (text: string, bold = false): any => ({ text: text || ' ', fillColor: COL.BLUE, color: COL.BLACK, bold, fontSize: 8 });
  return {
    table: {
      widths: ['*', '*', '*'],
      body: [
        [c('Prepared by:', true), c('Approved by:', true), c('Date:', true)],
        [c(preparedBy), c(approvedBy), c(date)],
        [c(role1), c(role2), c('')],
      ],
    },
    layout: gridLayout,
    margin: [0, 6, 0, 0],
  };
}

// A4 landscape printable width (841.89pt) minus L/R page margins.
const PAGE_MARGIN = 14;
const AVAIL_W = 841.89 - PAGE_MARGIN * 2 - 2; // small safety inset

function doc(title: string, subtitle: string, info: any, widths: number[], body: any[][], sig: any, headerRows: number): TDocumentDefinitions {
  const NC = widths.length;
  // pdfmake adds (paddingLeft+paddingRight) per column and a vertical border per
  // gridline ON TOP of the column widths — subtract those before distributing.
  const overhead = NC * (CELL_PAD * 2) + (NC + 1) * BORDER_W;
  const usable = AVAIL_W - overhead;
  const sum = widths.reduce((s, w) => s + w, 0);
  const factor = usable / sum;
  const ptWidths = widths.map((w) => Math.floor(w * factor * 100) / 100);
  return {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    pageMargins: [PAGE_MARGIN, 18, PAGE_MARGIN, 22],
    defaultStyle: { font: 'Roboto', fontSize: 7 },
    content: [
      { text: title, bold: true, fontSize: 12, alignment: 'center', margin: [0, 0, 0, 2] },
      { text: subtitle, fontSize: 10, alignment: 'center', margin: [0, 0, 0, 8] },
      info,
      { table: { headerRows, widths: ptWidths, body }, layout: gridLayout },
      sig,
    ],
  };
}

function render(dd: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(dd);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (c: Buffer) => chunks.push(c));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BARANGAY GPB — 7 cols
// ═══════════════════════════════════════════════════════════════════════════
function ddBrgyGPB(d: any): TDocumentDefinitions {
  const NC = 7;
  const body: any[][] = [];
  body.push([
    hdr('Gender Issue or\nGAD Mandate\n(1)', { rowSpan: 2 }),
    hdr('GAD Activity\n(4)', { rowSpan: 2 }),
    hdr('Performance Indicator\nand Target\n(5)', { rowSpan: 2 }),
    hdr('GAD Budget', { colSpan: 3 }), {}, {},
    hdr('Responsible\nOffice\n(9)', { rowSpan: 2 }),
  ]);
  body.push([{}, {}, {}, hdr('MOOE\n(6)'), hdr('PS\n(7)'), hdr('CO\n(8)'), {}]);

  const gpbRow = (r: any) => [txt(r?.gadIssue), txt(r?.activity), txt(r?.indicator), num(r?.mooe || 0), num(r?.ps || 0), num(r?.co || 0), txt(r?.responsibleOffice)];

  body.push(sp(sect('CLIENT-FOCUSED', NC), NC));
  const cf = (d.clientFocused?.length ? d.clientFocused : [null]);
  cf.forEach((r: any) => body.push(gpbRow(r)));
  const cfSum = sumGPB(d.clientFocused || []);
  body.push([...sp(sub('Sub Total A', 3), 3), num(cfSum.mooe, COL.OLIVE), num(cfSum.ps, COL.OLIVE), num(cfSum.co, COL.OLIVE), blank(COL.OLIVE)]);

  body.push(sp(sect('ORGANIZATION FOCUSED', NC), NC));
  const of = (d.organizationFocused?.length ? d.organizationFocused : [null]);
  of.forEach((r: any) => body.push(gpbRow(r)));
  const ofSum = sumGPB(d.organizationFocused || []);
  body.push([...sp(sub('Sub Total B', 3), 3), num(ofSum.mooe, COL.OLIVE), num(ofSum.ps, COL.OLIVE), num(ofSum.co, COL.OLIVE), blank(COL.OLIVE)]);

  body.push(sp(sect('ATTRIBUTED PROGRAMS', NC), NC));
  body.push([...sp(hdr('Title of Barangay Program or Project\n(9)'), 2), hdr('HGDG\nScore\n(10)'), ...sp(hdr('Total Annual\nProgram/Project Budget\n(11)'), 2), hdr('GAD Attributed\nBudget\n(13)'), hdr('Variance or\nRemarks')]);
  const at = (d.attributedPrograms?.length ? d.attributedPrograms : [null]);
  at.forEach((r: any) => body.push([...sp(txt(r?.projectTitle), 2), num(r?.hgdgScore || 0), ...sp(num(r?.totalBudget || 0), 2), num(r?.gadAttributedBudget || 0), txt(r?.varianceRemarks)]));
  const aS = attrSum(d.attributedPrograms || []);
  body.push([...sp(sub('Sub Total C', 2), 2), blank(COL.OLIVE), ...sp(num(aS.total, COL.OLIVE), 2), num(aS.gad, COL.OLIVE), blank(COL.OLIVE)]);

  body.push([...sp(grand('GRAND TOTAL (A+B+C)', 3), 3), num(cfSum.mooe + ofSum.mooe, COL.YELLOW), num(cfSum.ps + ofSum.ps, COL.YELLOW), num(cfSum.co + ofSum.co, COL.YELLOW), blank(COL.YELLOW)]);

  const info = infoColumns(
    [['Region:', d.region || ''], ['Province:', d.province || ''], ['City/Municipality:', d.cityMunicipality || ''], ['Barangay:', d.barangay || '']],
    [['Total Barangay Budget:', peso(d.totalBrgyBudget || 0)], ['Total GAD Budget:', peso(d.totalGadBudget || 0)]],
  );
  const sig = signatory(d.preparedBy || '', d.approvedBy || '', '', 'Barangay GAD Focal Point', 'Punong Barangay');
  return doc('BARANGAY ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET', `CY ${d.cy ?? ''}`, info, [38, 35, 35, 16, 14, 14, 28], body, sig, 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// BARANGAY AR — 7 cols
// ═══════════════════════════════════════════════════════════════════════════
function ddBrgyAR(d: any): TDocumentDefinitions {
  const NC = 7;
  const body: any[][] = [];
  body.push([
    hdr('Gender Issue or\nGAD Mandate\n(1)'),
    hdr('GAD Program/Project/\nActivity (PPA)\n(2)'),
    hdr('Performance Target\nand Indicator\n(3)'),
    hdr('Accomplishments\n(4)'),
    hdr('Approved GAD\nBudget\n(5)'),
    hdr('Actual GAD Cost or\nExpenditure\n(6)'),
    hdr('Variance or\nRemarks\n(7)'),
  ]);
  const arRow = (r: any) => [txt(r?.gadIssue), txt(r?.ppa), txt(r?.indicator), txt(r?.accomplishments), num(r?.approvedBudget || 0), num(r?.actualCost || 0), txt(r?.variance)];
  const addRows = (rows: any[]) => (rows?.length ? rows : [null]).forEach((r: any) => body.push(arRow(r)));

  body.push(sp(sect('CLIENT-FOCUSED', NC), NC));
  body.push(sp(sect('1. Gender Issues', NC, false), NC));
  addRows(d.clientFocusedGenderIssues);
  body.push(sp(sect('2. GAD Mandate', NC, false), NC));
  addRows(d.clientFocusedGadMandate);
  const cfS = sumAR([...(d.clientFocusedGenderIssues || []), ...(d.clientFocusedGadMandate || [])]);
  body.push([...sp(sub('Sub-total A', 4), 4), num(cfS.approved, COL.OLIVE), num(cfS.actual, COL.OLIVE), blank(COL.OLIVE)]);

  body.push(sp(sect('ORGANIZATION FOCUSED', NC), NC));
  body.push(sp(sect('1. Gender Issues', NC, false), NC));
  addRows(d.organizationGenderIssues);
  body.push(sp(sect('2. GAD Mandate', NC, false), NC));
  addRows(d.organizationGadMandate);
  const ofS = sumAR([...(d.organizationGenderIssues || []), ...(d.organizationGadMandate || [])]);
  body.push([...sp(sub('Sub-total B', 4), 4), num(ofS.approved, COL.OLIVE), num(ofS.actual, COL.OLIVE), blank(COL.OLIVE)]);

  body.push(sp(sect('ATTRIBUTED PROGRAMS', NC), NC));
  body.push([...sp(hdr('Title of Barangay Project\n(8)'), 2), hdr('HGDG\nScore\n(9)'), ...sp(hdr('Total Annual\nProgram/Project Cost\n(10)'), 2), hdr('GAD Attributed\nCost\n(11)'), hdr('Variance or\nRemarks\n(12)')]);
  const at = (d.attributedPrograms?.length ? d.attributedPrograms : [null]);
  at.forEach((r: any) => body.push([...sp(txt(r?.projectTitle), 2), num(r?.hgdgScore || 0), ...sp(num(r?.totalBudget || 0), 2), num(r?.gadAttributedBudget || 0), txt(r?.varianceRemarks)]));
  const aS = attrSum(d.attributedPrograms || []);
  body.push([...sp(sub('Sub-total C', 2), 2), blank(COL.OLIVE), ...sp(num(aS.total, COL.OLIVE), 2), num(aS.gad, COL.OLIVE), blank(COL.OLIVE)]);

  body.push([...sp(grand('GRAND TOTAL (A+B+C)', 4), 4), num(cfS.approved + ofS.approved + aS.gad, COL.YELLOW), num(cfS.actual + ofS.actual, COL.YELLOW), blank(COL.YELLOW)]);

  const info = infoColumns(
    [['Region:', d.region || ''], ['Province:', d.province || ''], ['City/Municipality:', d.cityMunicipality || ''], ['Barangay:', d.barangay || '']],
    [['Total Barangay Budget:', peso(d.totalBrgyBudget || 0)], ['Total GAD Budget:', peso(d.totalGadBudget || 0)]],
  );
  const sig = signatory(d.preparedBy || '', d.approvedBy || '', d.date || '', 'Barangay GAD Focal Point', 'Punong Barangay');
  return doc('BARANGAY ANNUAL GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT', `FY ${d.fy ?? ''}`, info, [36, 34, 32, 34, 18, 18, 22], body, sig, 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// CITY GPB — 9 cols — ANNEX D
// ═══════════════════════════════════════════════════════════════════════════
function ddCityGPB(d: any): TDocumentDefinitions {
  const NC = 9;
  const body: any[][] = [];
  body.push([
    hdr('Gender Issue or\nGAD Mandate\n(1)', { rowSpan: 2 }),
    hdr('GAD Objective\n(2)', { rowSpan: 2 }),
    hdr('Relevant LGU\nProgram or Project\n(3)', { rowSpan: 2 }),
    hdr('GAD Activity\n(4)', { rowSpan: 2 }),
    hdr('Performance Indicator\nand Target\n(5)', { rowSpan: 2 }),
    hdr('GAD Budget', { colSpan: 3 }), {}, {},
    hdr('Lead or Responsible\nOffice\n(9)', { rowSpan: 2 }),
  ]);
  body.push([{}, {}, {}, {}, {}, hdr('MOOE\n(6)'), hdr('PS\n(7)'), hdr('CO\n(8)'), {}]);

  const gpbRow = (r: any) => [txt(r?.gadIssue), txt(r?.gadObjective), txt(r?.relevantProgram), txt(r?.activity), txt(r?.indicator), num(r?.mooe || 0), num(r?.ps || 0), num(r?.co || 0), txt(r?.responsibleOffice)];

  body.push(sp(sect('CLIENT-FOCUSED', NC), NC));
  (d.clientFocused?.length ? d.clientFocused : [null]).forEach((r: any) => body.push(gpbRow(r)));
  const cfSum = sumGPB(d.clientFocused || []);
  body.push([...sp(sub('Sub Total A', 5), 5), num(cfSum.mooe, COL.OLIVE), num(cfSum.ps, COL.OLIVE), num(cfSum.co, COL.OLIVE), blank(COL.OLIVE)]);

  body.push(sp(sect('ORGANIZATION FOCUSED', NC), NC));
  (d.organizationFocused?.length ? d.organizationFocused : [null]).forEach((r: any) => body.push(gpbRow(r)));
  const ofSum = sumGPB(d.organizationFocused || []);

  body.push(sp(sect('ATTRIBUTED PROGRAMS', NC), NC));
  body.push([...sp(hdr('Title of LGU Program or Project'), 2), hdr('Funding Facility/\nGeneric Checklist\nScore'), ...sp(hdr('Total Annual\nProgram/Project Budget'), 2), ...sp(hdr('GAD Attributed\nProgram/Project Budget'), 3), hdr('Lead or\nResponsible Office')]);
  (d.attributedPrograms?.length ? d.attributedPrograms : [null]).forEach((r: any) =>
    body.push([...sp(txt(r?.projectTitle), 2), num(r?.hgdgScore || 0), ...sp(num(r?.totalBudget || 0), 2), ...sp(num(r?.gadAttributedBudget || 0), 3), txt(r?.responsibleOffice)]));

  body.push([...sp(sub('Sub Total B', 5), 5), num(ofSum.mooe, COL.OLIVE), num(ofSum.ps, COL.OLIVE), num(ofSum.co, COL.OLIVE), blank(COL.OLIVE)]);
  body.push([...sp(grand('GRAND TOTAL (A+B)', 5), 5), num(cfSum.mooe + ofSum.mooe, COL.YELLOW), num(cfSum.ps + ofSum.ps, COL.YELLOW), num(cfSum.co + ofSum.co, COL.YELLOW), blank(COL.YELLOW)]);

  const left: [string, string][] = [['Region:', d.region || ''], ['Province:', d.province || ''], ['City/ Municipality:', d.cityMunicipality || '']];
  if (d.officeName) left.push(['Office/Department:', d.officeName]);
  const info = infoColumns(left, [['Total LGU Budget:', peso(d.totalLguBudget || 0)], ['Total GAD Budget:', peso(d.totalGadBudget || 0)]]);
  const sig = signatory(d.preparedBy || '', d.approvedBy || '', d.date || '', 'GAD Focal Person / TWG Member', 'Department Head');
  return doc('ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET — ANNEX D', `FY ${d.fy ?? ''}`, info, [38, 26, 26, 30, 30, 16, 14, 14, 26], body, sig, 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// CITY AR — 10 cols — ANNEX E
// ═══════════════════════════════════════════════════════════════════════════
function ddCityAR(d: any): TDocumentDefinitions {
  const NC = 10;
  const body: any[][] = [];
  body.push([
    hdr('Gender Issue or\nGAD Mandate\n(1)', { rowSpan: 2 }),
    hdr('GAD Objective\n(2)', { rowSpan: 2 }),
    hdr('Relevant LGU\nProgram or Project\n(3)', { rowSpan: 2 }),
    hdr('GAD Activity\n(4)', { rowSpan: 2 }),
    hdr('Performance Indicator\nand Target\n(5)', { rowSpan: 2 }),
    hdr('Actual Results\n(6)', { rowSpan: 2 }),
    hdr('GAD Budget', { colSpan: 3 }), {}, {},
    hdr('Lead or Responsible\nOffice\n(10)', { rowSpan: 2 }),
  ]);
  body.push([{}, {}, {}, {}, {}, {}, hdr('Approved\nBudget\n(7)'), hdr('Actual\nCost\n(8)'), hdr('Variance\n(9)'), {}]);

  const arRow = (r: any) => [txt(r?.gadIssue), txt(r?.gadObjective), txt(r?.relevantProgram), txt(r?.activity), txt(r?.indicator), txt(r?.actualResults), num(r?.approvedBudget || 0), num(r?.actualCost || 0), txt(r?.variance), txt(r?.responsibleOffice)];

  body.push(sp(sect('CLIENT-FOCUSED', NC), NC));
  (d.clientFocused?.length ? d.clientFocused : [null]).forEach((r: any) => body.push(arRow(r)));
  const cfS = sumAR(d.clientFocused || []);
  body.push([...sp(sub('SUB TOTAL A', 6), 6), num(cfS.approved, COL.OLIVE), num(cfS.actual, COL.OLIVE), blank(COL.OLIVE), blank(COL.OLIVE)]);

  body.push(sp(sect('ORGANIZATION FOCUSED', NC), NC));
  (d.organizationFocused?.length ? d.organizationFocused : [null]).forEach((r: any) => body.push(arRow(r)));
  const ofS = sumAR(d.organizationFocused || []);
  body.push([...sp(sub('SUB TOTAL B', 6), 6), num(ofS.approved, COL.OLIVE), num(ofS.actual, COL.OLIVE), blank(COL.OLIVE), blank(COL.OLIVE)]);

  body.push(sp(sect('ATTRIBUTED PROGRAMS', NC), NC));
  body.push([...sp(hdr('Title of LGU Program or Project'), 4), hdr('HGDG\nScore\n(9)'), ...sp(hdr('Total Annual\nProgram/Project Budget\n(10)'), 2), ...sp(hdr('GAD Attributed\nBudget\n(11)'), 2), hdr('Lead or\nResponsible Office\n(12)')]);
  (d.attributedPrograms?.length ? d.attributedPrograms : [null]).forEach((r: any) =>
    body.push([...sp(txt(r?.projectTitle), 4), num(r?.hgdgScore || 0), ...sp(num(r?.totalBudget || 0), 2), ...sp(num(r?.gadAttributedBudget || 0), 2), txt(r?.responsibleOffice)]));
  const aS = attrSum(d.attributedPrograms || []);
  body.push([...sp(sub('SUB TOTAL C', 4), 4), blank(COL.OLIVE), ...sp(num(aS.total, COL.OLIVE), 2), ...sp(num(aS.gad, COL.OLIVE), 2), blank(COL.OLIVE)]);

  body.push([...sp(grand('GRAND TOTAL (A+B+C)', 6), 6), num(cfS.approved + ofS.approved + aS.gad, COL.YELLOW), num(cfS.actual + ofS.actual, COL.YELLOW), blank(COL.YELLOW), blank(COL.YELLOW)]);

  const left: [string, string][] = [['Region:', d.region || ''], ['Province:', d.province || ''], ['City/ Municipality:', d.cityMunicipality || '']];
  if (d.officeName) left.push(['Office/Department:', d.officeName]);
  const info = infoColumns(left, [['Total LGU Budget:', peso(d.totalLguBudget || 0)], ['Total GAD Budget:', peso(d.totalGadBudget || 0)]]);
  const sig = signatory(d.preparedBy || '', d.approvedBy || '', d.date || '', 'GAD Focal Person / TWG Member', 'Department Head');
  const title = `${(d.quarter ? String(d.quarter).toUpperCase() : 'ANNUAL')} GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT — ANNEX E`;
  return doc(title, `FY ${d.fy ?? ''}`, info, [36, 24, 24, 28, 28, 26, 18, 18, 18, 24], body, sig, 2);
}

const safe = (s: any) => String(s ?? '').replace(/[^\w.\-]+/g, '_') || 'submission';

export async function buildPdfForType(
  templateId: string,
  formData: unknown,
): Promise<{ buffer: Buffer; fileName: string }> {
  const d = (formData ?? {}) as any;
  switch (templateId) {
    case 'BARANGAY_GPB':
      return { buffer: await render(ddBrgyGPB(d)), fileName: `Brgy_GPB_${safe(d.barangay)}_CY${d.cy ?? ''}.pdf` };
    case 'BARANGAY_AR':
      return { buffer: await render(ddBrgyAR(d)), fileName: `Brgy_AR_${safe(d.barangay)}_FY${d.fy ?? ''}.pdf` };
    case 'CITY_GPB':
      return { buffer: await render(ddCityGPB(d)), fileName: `City_GPB_${safe(d.cityMunicipality)}_FY${d.fy ?? ''}.pdf` };
    case 'CITY_AR':
      return { buffer: await render(ddCityAR(d)), fileName: `City_AR_${safe(d.cityMunicipality)}_FY${d.fy ?? ''}.pdf` };
    default:
      throw new Error(`Unknown template type: ${templateId}`);
  }
}
