import * as XLSX from 'xlsx';

/**
 * Reads a filled-in GAD template workbook back into form data — the reverse of
 * the Excel export.
 *
 * Columns are found by their header text, not fixed cell addresses: the
 * official DILG sheets, the files this system exports and the copies offices
 * have tweaked by hand (an extra title row, a renamed "Sub Total", the
 * attributed band moved) all put the same words in their headers. Walking the
 * rows, the CLIENT-FOCUSED / ORGANIZATION FOCUSED / ATTRIBUTED PROGRAMS banners
 * decide which band a row belongs to; sub-totals, hints and the signatory block
 * are recognised and skipped.
 */

export type ImportTemplateId = 'BARANGAY_GPB' | 'BARANGAY_AR' | 'CITY_GPB' | 'CITY_AR';

type Cell = string | number;
type Grid = Cell[][];

export interface ImportResult {
  templateId: ImportTemplateId;
  sheet: string;
  sheets: string[];
  formData: Record<string, unknown>;
  counts: Record<string, number>;
  warnings: string[];
}

// ─── Cell helpers ──────────────────────────────────────────────────────────

const text = (v: Cell | undefined): string =>
  v === undefined || v === null ? '' : String(v).replace(/\r/g, '').trim();

/** Header text reduced to comparable words: "GAD Activity\n\n(4)" → "gad activity". */
const norm = (v: Cell | undefined): string =>
  text(v).toLowerCase().replace(/\(\s*\d+\s*\)/g, ' ').replace(/[^a-z0-9%/]+/g, ' ').trim();

function num(v: Cell | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = text(v).replace(/[₱,\s]/g, '').replace(/^php/i, '');
  if (!s || s === '-') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function readGrid(ws: XLSX.WorkSheet): Grid {
  // raw values: formulas come back as their cached result, which is what the
  // encoder saw on screen.
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, defval: '', raw: true, blankrows: true });
}

const rowText = (row: Cell[] = []): string => row.map(norm).filter(Boolean).join(' ');

// ─── Column layouts per template ───────────────────────────────────────────

type FieldKind = 'text' | 'number';
interface FieldDef { key: string; kind: FieldKind; match: RegExp }

// Order matters: each header cell is claimed by the first field whose pattern
// fits and that has no column yet.
const F = (key: string, match: RegExp, kind: FieldKind = 'text'): FieldDef => ({ key, kind, match });

const ISSUE = F('gadIssue', /gender issue|gad mandate/);
const OBJECTIVE = F('gadObjective', /objective/);
const PROGRAM = F('relevantProgram', /relevant|lgu program/);
const INDICATOR = F('indicator', /indicator|target/);
const MOOE = F('mooe', /\bmooe\b/, 'number');
const PS = F('ps', /^ps\b/, 'number');
const CO = F('co', /^co\b/, 'number');
const OFFICE = F('responsibleOffice', /office/);
const APPROVED = F('approvedBudget', /approved/, 'number');
const ACTUAL_COST = F('actualCost', /actual gad cost|actual cost|expenditure/, 'number');
const VARIANCE = F('variance', /variance|remarks/);

const MAIN_FIELDS: Record<ImportTemplateId, FieldDef[]> = {
  BARANGAY_GPB: [ISSUE, F('activity', /activity|ppa/), INDICATOR, MOOE, PS, CO, OFFICE],
  BARANGAY_AR: [
    ISSUE, F('ppa', /activity|ppa|program/), INDICATOR, F('accomplishments', /accomplishment/),
    APPROVED, ACTUAL_COST, VARIANCE,
  ],
  CITY_GPB: [ISSUE, OBJECTIVE, PROGRAM, F('activity', /activity/), INDICATOR, MOOE, PS, CO, OFFICE],
  CITY_AR: [
    ISSUE, OBJECTIVE, PROGRAM, F('activity', /activity/), INDICATOR, F('actualResults', /actual result/),
    APPROVED, ACTUAL_COST, VARIANCE, OFFICE,
  ],
};

/** Last column of the attributed band: remarks on barangay forms, office on city forms. */
const ATTR_LAST: Record<ImportTemplateId, FieldDef> = {
  BARANGAY_GPB: F('varianceRemarks', /variance|remarks/),
  BARANGAY_AR: F('varianceRemarks', /variance|remarks/),
  CITY_GPB: F('responsibleOffice', /office/),
  CITY_AR: F('responsibleOffice', /office/),
};

const attrFields = (t: ImportTemplateId): FieldDef[] => [
  F('projectTitle', /title/),
  F('hgdgScore', /hgdg|score|checklist/, 'number'),
  F('totalBudget', /total annual|total program|total project|annual program|cost or expenditure/, 'number'),
  F('gadAttributedBudget', /attributed/, 'number'),
  ATTR_LAST[t],
];

/** Official column number printed under each header, e.g. "GAD Activity (4)". */
const MAIN_NUMS: Record<ImportTemplateId, number[]> = {
  BARANGAY_GPB: [1, 4, 5, 6, 7, 8, 9],
  BARANGAY_AR: [1, 2, 3, 4, 5, 6, 7],
  CITY_GPB: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  CITY_AR: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

type ColMap = Record<string, number>;

/**
 * Map fields to columns using one or two header rows (MOOE/PS/CO sit under a
 * "GAD Budget" span). Header words win; a field still unplaced falls back to
 * the official "(n)" number — offices sometimes relabel a column (the BAF sheet
 * titles (9) "Variance or Remarks" but fills it with the responsible office).
 */
function mapColumns(grid: Grid, rows: number[], fields: FieldDef[], nums?: number[]): ColMap {
  const map: ColMap = {};
  const taken = (c: number) => Object.values(map).includes(c);
  for (const r of rows) {
    (grid[r] ?? []).forEach((cell, c) => {
      const h = norm(cell);
      if (!h || taken(c)) return;
      const f = fields.find((fd) => map[fd.key] === undefined && fd.match.test(h));
      if (f) map[f.key] = c;
    });
  }
  nums?.forEach((n, i) => {
    const f = fields[i];
    if (map[f.key] !== undefined) return;
    const tag = new RegExp(`\\(\\s*${n}\\s*\\)`);
    for (const r of rows) {
      const c = (grid[r] ?? []).findIndex((cell, ci) => !taken(ci) && tag.test(text(cell)));
      if (c >= 0) { map[f.key] = c; return; }
    }
  });
  return map;
}

function readRow(row: Cell[], fields: FieldDef[], map: ColMap): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const f of fields) {
    const c = map[f.key];
    out[f.key] = f.kind === 'number' ? num(c === undefined ? '' : row[c]) : text(c === undefined ? '' : row[c]);
  }
  return out;
}

const isBlankRow = (r: Record<string, string | number>) =>
  Object.values(r).every((v) => v === '' || v === 0);

// ─── Row classification ───────────────────────────────────────────────────

const RX = {
  client: /^client\s*focused/,
  org: /^organi[sz]ation\s*focused/,
  attributed: /^attributed program/,
  bandIssues: /^1\s*gender issues?$/,
  bandMandate: /^2\s*gad mandates?$/,
  total: /sub\s*total|grand total|^total\b/,
  hint: /please include/,
  signatory: /prepared by|approved by/,
};

/** Text of the row's first non-empty cell — banners and totals live there. */
function lead(row: Cell[] = []): string {
  for (const c of row) { const n = norm(c); if (n) return n; }
  return '';
}

// ─── Header block (above the table) ────────────────────────────────────────

/** First non-empty cell to the right of the cell matching `label`, in the top rows. */
function labelValue(grid: Grid, until: number, label: RegExp): Cell | undefined {
  for (let r = 0; r < until; r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const raw = text(row[c]);
      // A "(NAME OF OFFICE)" placeholder is where the value goes, not a label.
      if (raw.startsWith('(') || !label.test(norm(raw.split(':')[0]))) continue;
      // "Region: IV-A" in one cell
      const inline = raw.split(':').slice(1).join(':').trim();
      if (inline) return inline;
      for (let k = c + 1; k < row.length; k++) if (text(row[k])) return row[k];
      return undefined;
    }
  }
  return undefined;
}

function findYear(grid: Grid, until: number): number | undefined {
  for (let r = 0; r < until; r++) {
    for (const c of grid[r] ?? []) {
      const m = text(c).match(/\b(?:CY|FY|C\.Y\.|F\.Y\.)\s*(20\d{2})\b/i);
      if (m) return Number(m[1]);
    }
  }
  return undefined;
}

/** "4th QUARTER GENDER AND DEVELOPMENT…" → "4th"; "ANNUAL GENDER…" → "Annual". */
function findQuarter(grid: Grid, until: number): string | undefined {
  for (let r = 0; r < until; r++) {
    for (const c of grid[r] ?? []) {
      const t = text(c);
      const m = t.match(/\b(1st|2nd|3rd|4th|first|second|third|fourth)\s+quarter\b/i);
      if (m) {
        const q = m[1].toLowerCase();
        return ({ first: '1st', second: '2nd', third: '3rd', fourth: '4th' } as Record<string, string>)[q] ?? q;
      }
      if (/^annual\s+gender/i.test(t)) return 'Annual';
    }
  }
  return undefined;
}

/** Office name: an explicit label, or a title line above the form title (CDRRMO sample). */
function findOffice(grid: Grid, until: number): string {
  const labelled = text(labelValue(grid, until, /^(name of )?office( department)?$|^office department$/));
  if (labelled) return labelled;
  for (let r = 0; r < until; r++) {
    for (const c of grid[r] ?? []) {
      const t = text(c);
      if (!t || t.includes(':') || /gender|gad|plan and budget|accomplishment|annex|^(c|f)y\s|region|province|^city\s*\/?\s*municipality|tanauan|batangas|total|name of office/i.test(t)) continue;
      if (/office|department|council|division|section|unit|cdrrmo|\b[A-Z]{3,}\b/.test(t) && t.length < 120) return t;
    }
  }
  return '';
}

// ─── Signatories ──────────────────────────────────────────────────────────

/** Captions printed under the signature line — a blank template has these where the name goes. */
const ROLE_CAPTION = /^(office\s*-?\s*)?gad twg$|^department (manager|head)$|focal (point|person)|^twg member$|^punong barangay$|^dd\/mm\/y/i;

/**
 * "Prepared by:\n\n   JED A. MARFORI" in one cell, or the label with the name
 * on the row below (the system's own export).
 */
function signatory(grid: Grid, from: number, label: RegExp): string {
  for (let r = from; r < grid.length; r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const raw = text(row[c]);
      if (!label.test(raw.toLowerCase())) continue;
      const after = raw.replace(/^[^:]*:/, '').split('\n').map((s) => s.trim()).filter(Boolean)[0];
      const below = text(grid[r + 1]?.[c]);
      const name = after || (below && !/:\s*$/.test(below) ? below.split('\n')[0].trim() : '');
      return ROLE_CAPTION.test(name) ? '' : name;
    }
  }
  return '';
}

// ─── Template detection ───────────────────────────────────────────────────

interface Located { headerRow: number; text: string }

/** The column-header row: the one that names "Gender Issue or GAD Mandate". */
function locateHeader(grid: Grid): Located | null {
  const limit = Math.min(grid.length, 60);
  for (let r = 0; r < limit; r++) {
    if ((grid[r] ?? []).some((c) => /gender issue|gad mandate/.test(norm(c)))) {
      return { headerRow: r, text: `${rowText(grid[r])} ${rowText(grid[r + 1])}` };
    }
  }
  return null;
}

function detectTemplate(grid: Grid, loc: Located): ImportTemplateId {
  const h = loc.text;
  const top = grid.slice(0, loc.headerRow).map(rowText).join(' ');
  const barangay = /\bbarangay\b/.test(top);
  if (/actual result/.test(h)) return 'CITY_AR';
  if (/accomplishment/.test(h)) return 'BARANGAY_AR';
  if (/approved/.test(h) || /accomplishment report/.test(top)) return barangay ? 'BARANGAY_AR' : 'CITY_AR';
  if (/objective|relevant/.test(h)) return 'CITY_GPB';
  return barangay ? 'BARANGAY_GPB' : 'CITY_GPB';
}

// ─── Main walk ─────────────────────────────────────────────────────────────

type MainSection = 'client' | 'org';
type Band = 'issues' | 'mandate';

function parseSheet(grid: Grid, loc: Located, t: ImportTemplateId) {
  const warnings: string[] = [];
  const fields = MAIN_FIELDS[t];
  const hr = loc.headerRow;
  const cols = mapColumns(grid, [hr, hr + 1], fields, MAIN_NUMS[t]);

  const missing = fields.filter((f) => cols[f.key] === undefined).map((f) => f.key);
  if (missing.length) warnings.push(`Columns not found in the sheet (left blank): ${missing.join(', ')}.`);

  const main: Record<MainSection, Record<Band, Record<string, string | number>[]>> = {
    client: { issues: [], mandate: [] },
    org: { issues: [], mandate: [] },
  };
  const attributed: Record<string, string | number>[] = [];

  let section: MainSection | 'attr' | null = null;
  let band: Band = 'issues';
  let attrCols: ColMap | null = null;
  const aFields = attrFields(t);
  let signRow = grid.length;

  for (let r = hr + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const first = lead(row);
    if (!first) continue;
    const all = rowText(row);

    if (RX.signatory.test(all)) { signRow = r; break; }
    if (RX.client.test(first)) { section = 'client'; band = 'issues'; continue; }
    if (RX.org.test(first)) { section = 'org'; band = 'issues'; continue; }
    if (RX.attributed.test(first)) { section = 'attr'; attrCols = null; continue; }
    if (RX.bandIssues.test(first)) { band = 'issues'; continue; }
    if (RX.bandMandate.test(first)) { band = 'mandate'; continue; }
    if (RX.total.test(first)) continue;
    if (RX.hint.test(all) && all.replace(RX.hint, '').length < 30) continue;

    if (section === 'attr') {
      // The attributed band has its own header row right under its banner.
      if (!attrCols && /title/.test(all)) { attrCols = mapColumns(grid, [r], aFields); continue; }
      if (!attrCols) continue;
      const rec = readRow(row, aFields, attrCols);
      if (!isBlankRow(rec)) attributed.push(rec);
      continue;
    }
    if (!section) {
      if (r <= hr + 1) continue;     // second header row (MOOE / PS / CO)
      section = 'client';            // data before any banner — treat as client-focused
    }
    const rec = readRow(row, fields, cols);
    if (isBlankRow(rec)) continue;
    main[section][band].push(rec);
  }

  return { main, attributed, warnings, signRow };
}

// ─── Public entry ──────────────────────────────────────────────────────────

function buildFormData(t: ImportTemplateId, grid: Grid, loc: Located) {
  const { main, attributed, warnings, signRow } = parseSheet(grid, loc, t);
  const hr = loc.headerRow;
  const year = findYear(grid, hr);
  if (!year) warnings.push('No CY/FY year found in the sheet — kept the year already on the form.');

  const fullAttr = attributed.map((a) => ({
    projectTitle: '', hgdgScore: 0, totalBudget: 0, gadAttributedBudget: 0,
    varianceRemarks: '', responsibleOffice: '', ...a,
  }));
  const header = {
    region: text(labelValue(grid, hr, /^region$/)),
    province: text(labelValue(grid, hr, /^province$/)),
    // Official sheets say "City/ Municipality:", this system's exports just "City:".
    cityMunicipality: text(labelValue(grid, hr, /^city(\s*municipality)?$/)),
  };
  const preparedBy = signatory(grid, signRow, /prepared by/);
  const approvedBy = signatory(grid, signRow, /approved by/);
  const date = signatory(grid, signRow, /^date\b/);
  const both = (s: MainSection) => [...main[s].issues, ...main[s].mandate];
  // Barangay GPB rows carry their band; issues first, then mandates.
  const withKind = (s: MainSection) => [
    ...main[s].issues.map((x) => ({ kind: 'issue', ...x })),
    ...main[s].mandate.map((x) => ({ kind: 'mandate', ...x })),
  ];

  let formData: Record<string, unknown>;
  let counts: Record<string, number>;

  if (t === 'BARANGAY_GPB' || t === 'BARANGAY_AR') {
    const barangay = text(labelValue(grid, hr, /^barangay$/));
    const totals = {
      totalBrgyBudget: num(labelValue(grid, hr, /total barangay budget|total brgy budget/)),
      totalGadBudget: num(labelValue(grid, hr, /total gad budget/)),
    };
    if (t === 'BARANGAY_GPB') {
      formData = {
        ...header, barangay, ...(year ? { cy: year } : {}), ...totals,
        clientFocused: withKind('client'), organizationFocused: withKind('org'),
        attributedPrograms: fullAttr, preparedBy, approvedBy,
      };
      counts = { clientFocused: both('client').length, organizationFocused: both('org').length, attributedPrograms: fullAttr.length };
    } else {
      formData = {
        ...header, barangay, ...(year ? { fy: year } : {}), ...totals,
        clientFocusedGenderIssues: main.client.issues, clientFocusedGadMandate: main.client.mandate,
        organizationGenderIssues: main.org.issues, organizationGadMandate: main.org.mandate,
        attributedPrograms: fullAttr, preparedBy, approvedBy, date,
      };
      counts = {
        clientFocused: both('client').length, organizationFocused: both('org').length,
        attributedPrograms: fullAttr.length,
      };
    }
  } else {
    const totals = {
      totalLguBudget: num(labelValue(grid, hr, /total lgu budget/)),
      totalGadBudget: num(labelValue(grid, hr, /total gad budget/)),
    };
    formData = {
      ...header, officeName: findOffice(grid, hr), ...(year ? { fy: year } : {}), ...totals,
      clientFocused: both('client'), organizationFocused: both('org'),
      attributedPrograms: fullAttr, preparedBy, approvedBy, date,
      ...(t === 'CITY_AR' ? { quarter: findQuarter(grid, hr) ?? 'Annual' } : {}),
    };
    counts = { clientFocused: both('client').length, organizationFocused: both('org').length, attributedPrograms: fullAttr.length };
  }

  if (!counts.clientFocused && !counts.organizationFocused && !counts.attributedPrograms) {
    warnings.push('No filled-in rows were found under CLIENT-FOCUSED, ORGANIZATION FOCUSED or ATTRIBUTED PROGRAMS.');
  }
  return { formData, counts, warnings };
}

/** Score a sheet so the one with the most real data is opened by default. */
function sheetScore(grid: Grid, loc: Located | null): number {
  if (!loc) return -1;
  let filled = 0;
  for (let r = loc.headerRow + 2; r < grid.length; r++) if (rowText(grid[r]).length > 20) filled++;
  return filled;
}

export class TemplateImportError extends Error {}

export function importTemplateWorkbook(
  buffer: Buffer,
  opts: { templateId?: ImportTemplateId; sheet?: string } = {},
): ImportResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer', cellFormula: false, cellHTML: false });
  } catch {
    throw new TemplateImportError('The file could not be read as an Excel workbook.');
  }
  if (!wb.SheetNames.length) throw new TemplateImportError('The workbook has no sheets.');

  const candidates = wb.SheetNames.map((name) => {
    const grid = readGrid(wb.Sheets[name]);
    const loc = locateHeader(grid);
    return { name, grid, loc, score: sheetScore(grid, loc) };
  });
  const usable = candidates.filter((c) => c.loc);
  if (!usable.length) {
    throw new TemplateImportError(
      'This does not look like a GAD template — no "Gender Issue or GAD Mandate" column header was found.',
    );
  }

  let pick = opts.sheet ? usable.find((c) => c.name === opts.sheet) : undefined;
  if (opts.sheet && !pick) throw new TemplateImportError(`Sheet "${opts.sheet}" has no GAD template table.`);
  pick ??= [...usable].sort((a, b) => b.score - a.score)[0];

  const loc = pick.loc!;
  const detected = detectTemplate(pick.grid, loc);
  const templateId = opts.templateId ?? detected;
  const { formData, counts, warnings } = buildFormData(templateId, pick.grid, loc);
  if (opts.templateId && opts.templateId !== detected) {
    warnings.unshift(`This sheet looks like a ${detected.replace('_', ' ')} — imported into ${opts.templateId.replace('_', ' ')} anyway. Check the columns.`);
  }

  return { templateId, sheet: pick.name, sheets: usable.map((c) => c.name), formData, counts, warnings };
}
