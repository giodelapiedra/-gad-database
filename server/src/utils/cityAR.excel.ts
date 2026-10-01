import ExcelJS from 'exceljs';
import {
  loadTemplate,
  harvestRow,
  cloneSheetShell,
  SheetBuilder,
  setPrintArea,
  sumRange,
  sumCells,
  type RowProto,
  type CellValue,
} from './excelTemplate';

/**
 * CITY / MUNICIPALITY GAD ACCOMPLISHMENT REPORT — ANNEX E
 *
 * Rendered from the shipped `CITY AR TEMPLATE.xlsx`, so the download is visually
 * identical to the form departments are used to filling in by hand.
 *
 * Template layout (11 columns, A–K):
 *
 *   1      title                          A:K
 *   2      FY                             A:K
 *   3      ANNEX E                        A:I + K
 *   4      Region:      | office name     A:B, C, D:H, J, K
 *   5      Province:    | Total GAD Bgt   A:B, C, J, K
 *   6      City/Mun:                      A:B, C
 *   7      spacer                         A:B
 *   8–9    column header band (1)–(10)    each column merged over both rows
 *   10     CLIENT- FOCUSED
 *   11–16  data slots
 *   17     SUB TOTAL A                    A:F
 *   18     ORGANIZATION FOCUSED
 *   19–23  data slots
 *   24     SUB TOTAL B                    A:F
 *   25     ATTRIBUTED PROGRAMS (yellow)   A:K
 *   26     attributed header (8)–(12)     A:D, E, F:G, H:I, K
 *   27–29  attributed data slots          A:D, E, F:G, H:I, K
 *   30     SUB TOTAL C                    A:E, H:I
 *   31     GRAND TOTAL (yellow)           A:E, H:I
 *   32–33  signatories                    A:C, D:F, G:K
 *
 * The fixed data slots become elastic here — each band emits one row per entry
 * (or a single blank row when empty, matching the template's look) and the
 * sub-total formulas are re-pointed at the real ranges.
 */

const TEMPLATE_FILE = 'CITY AR TEMPLATE.xlsx';
const NC = 11; // columns A..K

/** 1-based column positions, mirroring the template's header band. */
const COL = {
  issue: 1,        // A:B merged — Gender Issue or GAD Mandate (1)
  objective: 3,    // C          — GAD Objective (2)
  program: 4,      // D          — Relevant LGU Program or Project (3)
  activity: 5,     // E          — GAD Activity (4)
  indicator: 6,    // F          — Performance Indicator and Target (5)
  results: 7,      // G          — Actual Results (6)
  approved: 8,     // H          — Approved GAD Budget (7)
  actual: 9,       // I          — Actual GAD Cost or Expenditure (8)
  variance: 10,    // J          — Variance or Remarks (9)
  office: 11,      // K          — Lead or Responsible Office (10)
  // Attributed-programs band
  attrTitle: 1,    // A:D merged — Title of LGU Program or Project (8)
  attrScore: 5,    // E          — HGDG score (9)
  attrTotal: 6,    // F:G merged — Total Annual Program/Project Budget (10)
  attrGad: 8,      // H:I merged — GAD Attributed Program/Project Budget (11)
  attrOffice: 11,  // K          — Lead or Responsible Office (12)
} as const;

/** Template rows harvested as style prototypes. */
interface Protos {
  title: RowProto;
  fy: RowProto;
  annex: RowProto;
  info1: RowProto;
  info2: RowProto;
  info3: RowProto;
  spacer: RowProto;
  headerTop: RowProto;
  headerBottom: RowProto;
  banner: RowProto;
  banner2: RowProto;
  data: RowProto;
  dataOrg: RowProto;
  subTotalA: RowProto;
  subTotalB: RowProto;
  attrBanner: RowProto;
  attrHeader: RowProto;
  attrData: RowProto;
  subTotalC: RowProto;
  grandTotal: RowProto;
  sigTop: RowProto;
  sigBottom: RowProto;
}

let protoCache: { protos: Protos; sheet: ExcelJS.Worksheet } | null = null;

async function getProtos(): Promise<{ protos: Protos; sheet: ExcelJS.Worksheet }> {
  if (protoCache) return protoCache;

  const wb = await loadTemplate(TEMPLATE_FILE);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`${TEMPLATE_FILE} has no worksheets`);

  const h = (r: number) => harvestRow(ws, r, NC);

  protoCache = {
    sheet: ws,
    protos: {
      title: h(1),
      fy: h(2),
      annex: h(3),
      info1: h(4),
      info2: h(5),
      info3: h(6),
      spacer: h(7),
      headerTop: h(8),
      headerBottom: h(9),
      banner: h(10),   // CLIENT- FOCUSED
      banner2: h(18),  // ORGANIZATION FOCUSED — styled slightly differently
      // Row 11 carries the "(please include the breakdown here)" hint, so the
      // second slot is the clean data prototype. Rows 11–16 are byte-identical.
      data: h(12),
      // The organisation band is styled differently from the client band in
      // every column (centred column D, accounting format on J, no top rule on
      // K), so it needs its own prototype. Row 19 holds the breakdown hint and
      // row 23 is a one-off, leaving 20–22 as the consistent core.
      dataOrg: h(21),
      // The template styles its two sub-total rows slightly differently (row 17
      // aligns top with a plain number format, row 24 middle with accounting),
      // so each gets its own prototype rather than sharing one.
      subTotalA: h(17),
      subTotalB: h(24),
      attrBanner: h(25),
      attrHeader: h(26),
      attrData: h(27),
      subTotalC: h(30),
      grandTotal: h(31),
      sigTop: h(32),
      sigBottom: h(33),
    },
  };
  return protoCache;
}

// ─── Row shapes ────────────────────────────────────────────────────────────

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

export interface AttributedRow {
  projectTitle: string;
  hgdgScore: number;
  totalBudget: number;
  gadAttributedBudget: number;
  responsibleOffice: string;
}

export interface CityARData {
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

/** Positional value array of length NC, defaulting to "leave empty". */
function blankRow(): CellValue[] {
  return Array.from({ length: NC }, () => null);
}

/**
 * The title reads "4th QUARTER GENDER AND DEVELOPMENT ..." on the template.
 * "Annual" should not become "ANNUAL QUARTER ...", so only append the word
 * QUARTER when the value looks like an ordinal.
 */
function titleFor(quarter: string): string {
  const q = (quarter || '').trim().toUpperCase();
  const suffix = 'GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT';
  if (!q) return suffix;
  const isOrdinal = /^\d+(ST|ND|RD|TH)?$/.test(q.replace(/\s*QUARTER$/, ''));
  if (isOrdinal && !q.endsWith('QUARTER')) return `${q} QUARTER ${suffix}`;
  return `${q} ${suffix}`;
}

// ─── Generator ─────────────────────────────────────────────────────────────

export async function generateCityAR(d: CityARData): Promise<Buffer> {
  const { protos: P, sheet: tpl } = await getProtos();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'GAD Portal';
  wb.created = new Date();
  const ws = wb.addWorksheet(tpl.name || 'AR');
  cloneSheetShell(tpl, ws, NC);

  const b = new SheetBuilder(ws);

  // ── Heading ─────────────────────────────────────────────────────────────
  b.row(P.title, [titleFor(d.quarter)], [{ from: 1, to: NC }]);
  b.row(P.fy, [`FY ${d.fy}`], [{ from: 1, to: NC }]);
  // A:I stays blank; K keeps the template's "ANNEX E".
  b.row(P.annex, [null, ...Array(8).fill(null), null, undefined], [{ from: 1, to: 9 }]);

  {
    const v = blankRow();
    v[0] = undefined;                                    // "Region:"
    v[2] = d.region;
    v[3] = d.officeName || '(NAME OF OFFICE)';
    v[9] = undefined;                                    // "Total LGU Budget"
    v[10] = d.totalLguBudget;
    b.row(P.info1, v, [{ from: 1, to: 2 }, { from: 4, to: 8 }]);
  }
  {
    const v = blankRow();
    v[0] = undefined;                                    // "Province:"
    v[2] = d.province;
    v[9] = undefined;                                    // "Total GAD Budget"
    v[10] = d.totalGadBudget;
    b.row(P.info2, v, [{ from: 1, to: 2 }]);
  }
  {
    const v = blankRow();
    v[0] = undefined;                                    // "City/ Municipality:"
    v[2] = d.cityMunicipality;
    b.row(P.info3, v, [{ from: 1, to: 2 }]);
  }
  b.row(P.spacer, blankRow(), [{ from: 1, to: 2 }]);

  // ── Column header band (labels replayed verbatim from the template) ─────
  b.row(P.headerTop, [], [
    { from: 1, to: 2, rowSpan: 2 },
    ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map((c) => ({ from: c, to: c, rowSpan: 2 })),
  ]);
  b.row(P.headerBottom, blankRow());

  // ── Data bands ──────────────────────────────────────────────────────────
  const dataRow = (row: CityARRow | null): CellValue[] => {
    const v = blankRow();
    v[COL.issue - 1] = row?.gadIssue ?? null;
    v[COL.objective - 1] = row?.gadObjective ?? null;
    v[COL.program - 1] = row?.relevantProgram ?? null;
    v[COL.activity - 1] = row?.activity ?? null;
    v[COL.indicator - 1] = row?.indicator ?? null;
    v[COL.results - 1] = row?.actualResults ?? null;
    v[COL.approved - 1] = row?.approvedBudget ?? 0;
    v[COL.actual - 1] = row?.actualCost ?? 0;
    v[COL.variance - 1] = row?.variance ?? null;
    v[COL.office - 1] = row?.responsibleOffice ?? null;
    return v;
  };

  /** Emit a section banner + its rows + sub-total. Returns the sub-total row. */
  function section(
    banner: RowProto,
    bannerLabel: string,
    rows: CityARRow[],
    dataProto: RowProto,
    subTotalProto: RowProto,
    subTotalLabel: string
  ): number {
    // Not merged — the template keeps this row's per-column vertical rules,
    // unlike the ATTRIBUTED PROGRAMS banner further down which spans A:K.
    b.row(banner, [bannerLabel]);

    const first = b.nextRow;
    // An empty band still shows one blank row, as the printed template does.
    for (const row of rows.length ? rows : [null]) {
      b.row(dataProto, dataRow(row), [{ from: 1, to: 2 }]);
    }
    const last = b.nextRow - 1;

    const v = blankRow();
    v[0] = subTotalLabel;
    v[COL.approved - 1] = rows.length ? sumRange(COL.approved, first, last) : 0;
    v[COL.actual - 1] = rows.length ? sumRange(COL.actual, first, last) : 0;
    return b.row(subTotalProto, v, [{ from: 1, to: 6 }]);
  }

  const subA = section(
    P.banner, 'CLIENT- FOCUSED', d.clientFocused, P.data, P.subTotalA, 'SUB TOTAL A'
  );
  const subB = section(
    P.banner2, 'ORGANIZATION FOCUSED', d.organizationFocused, P.dataOrg, P.subTotalB, 'SUB TOTAL B'
  );

  // ── Attributed programs ─────────────────────────────────────────────────
  b.row(P.attrBanner, [], [{ from: 1, to: NC }]);          // yellow, text from template
  b.row(P.attrHeader, [], [
    { from: 1, to: 4 },
    { from: 6, to: 7 },
    { from: 8, to: 9 },
  ]);

  const attrMerges = [
    { from: 1, to: 4 },
    { from: 6, to: 7 },
    { from: 8, to: 9 },
  ];
  const attrFirst = b.nextRow;
  for (const row of d.attributedPrograms.length ? d.attributedPrograms : [null]) {
    const v = blankRow();
    v[COL.attrTitle - 1] = row?.projectTitle ?? null;
    v[COL.attrScore - 1] = row?.hgdgScore ?? null;
    v[COL.attrTotal - 1] = row?.totalBudget ?? 0;
    v[COL.attrGad - 1] = row?.gadAttributedBudget ?? 0;
    v[COL.attrOffice - 1] = row?.responsibleOffice ?? null;
    b.row(P.attrData, v, attrMerges);
  }
  const attrLast = b.nextRow - 1;
  const hasAttr = d.attributedPrograms.length > 0;

  const subCValues = blankRow();
  subCValues[0] = 'SUB TOTAL C';
  subCValues[COL.attrTotal - 1] = hasAttr ? sumRange(COL.attrTotal, attrFirst, attrLast) : 0;
  subCValues[COL.attrGad - 1] = hasAttr ? sumRange(COL.attrGad, attrFirst, attrLast) : 0;
  const subC = b.row(P.subTotalC, subCValues, [
    { from: 1, to: 5 },
    { from: 8, to: 9 },
  ]);

  // ── Grand total ─────────────────────────────────────────────────────────
  // The template's own formulas here are broken (`=SUM(F30,H24,...,#REF!)`), so
  // they're rebuilt: F carries Sub Total C's programme budget, and the merged
  // H:I cell holds the GAD budget grand total — direct A + direct B + the
  // attributed share from C, which is the figure DILG reports.
  const grandValues = blankRow();
  grandValues[0] = 'GRAND TOTAL (A+B+C)';
  grandValues[COL.attrTotal - 1] = { formula: `${'F'}${subC}` };
  grandValues[COL.approved - 1] =
    sumCells(COL.approved, [subA, subB, subC]) ?? 0;
  b.row(P.grandTotal, grandValues, [
    { from: 1, to: 5 },
    { from: 8, to: 9 },
  ]);

  // ── Signatories (two rows, merged vertically) ──────────────────────────
  // Template text is "Prepared by:\n\nOFFICE- GAD TWG"; the signatory's name goes
  // on the blank line above their role, and is skipped when unfilled so the
  // block doesn't gain a stray empty line.
  const signatory = (label: string, name: string, role: string) =>
    [`${label}:`, '', ...(name ? [name] : []), role].join('\n');

  const sig = blankRow();
  sig[0] = signatory('Prepared by', d.preparedBy, 'OFFICE- GAD TWG');
  sig[3] = signatory('Approved by', d.approvedBy, 'DEPARTMENT MANAGER');
  sig[6] = `Date:\n\n${d.date || ''}`;
  b.row(P.sigTop, sig, [
    { from: 1, to: 3, rowSpan: 2 },
    { from: 4, to: 6, rowSpan: 2 },
    { from: 7, to: NC, rowSpan: 2 },
  ]);
  const lastRow = b.row(P.sigBottom, blankRow());

  b.finish();
  setPrintArea(ws, lastRow, NC);

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}
