// What an encoder may change on a submission the reviewer flagged for correction.
// Only the flagged parts open up: a cell flag opens that cell, a row flag the
// whole row, a section flag (no row, no column) the whole section — including
// adding or removing its rows. Mirrors client/src/hooks/useReviewFlags.ts.

export interface OpenFlag {
  section: string | null;
  rowNumber: number | null;
  field: string | null;
}

type Data = Record<string, unknown>;

const SIGNATORY_KEYS = new Set(['preparedBy', 'approvedBy', 'date']);

/**
 * Row arrays → the review section they belong to. The Barangay AR splits each
 * section into a gender-issue band and a mandate band, numbered continuously,
 * so a band's rows start after the band before it.
 */
const ROW_ARRAYS: Record<string, { section: string; after?: string }> = {
  clientFocused:             { section: 'clientFocused' },
  organizationFocused:       { section: 'organizationFocused' },
  attributedPrograms:        { section: 'attributedPrograms' },
  clientFocusedGenderIssues: { section: 'clientFocused' },
  clientFocusedGadMandate:   { section: 'clientFocused', after: 'clientFocusedGenderIssues' },
  organizationGenderIssues:  { section: 'organizationFocused' },
  organizationGadMandate:    { section: 'organizationFocused', after: 'organizationGenderIssues' },
};

/** Row keys edited through another column's cell (proof files sit under Variance / Remarks). */
const CELL_OF: Record<string, string> = { evidence: 'variance' };

function isEmpty(v: unknown): boolean {
  return v == null || v === '' || v === 0 || (Array.isArray(v) && v.length === 0);
}

/** Deep equality that treats blank-ish values alike, so client-side defaults ("" vs missing) aren't edits. */
function same(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => same(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a as Data), ...Object.keys(b as Data)]);
    return [...keys].every((k) => same((a as Data)[k], (b as Data)[k]));
  }
  if (typeof a === 'object' || typeof b === 'object') return false;
  return String(a) === String(b);
}

function allowed(flags: OpenFlag[], section: string, row: number | null, field: string | null): boolean {
  return flags.some((f) => {
    if (f.section !== section) return false;
    if (f.rowNumber == null && f.field == null) return true;                 // whole section
    if (row != null && f.rowNumber === row && f.field == null) return true;  // whole row
    return field != null && (f.rowNumber ?? null) === row && f.field === field; // one cell
  });
}

/**
 * The first change in `next` that falls outside the open flags, described for the
 * encoder (e.g. "clientFocused row 2 · activity"), or null when every change is allowed.
 */
export function disallowedChange(prev: Data, next: Data, flags: OpenFlag[]): string | null {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    const a = prev[key];
    const b = next[key];
    if (same(a, b)) continue;

    const band = ROW_ARRAYS[key];
    if (!band) {
      const section = SIGNATORY_KEYS.has(key) ? 'signatories' : 'header';
      if (!allowed(flags, section, null, key)) return `${section} · ${key}`;
      continue;
    }

    const oldRows = Array.isArray(a) ? (a as Data[]) : [];
    const newRows = Array.isArray(b) ? (b as Data[]) : [];
    if (oldRows.length !== newRows.length) {
      if (!allowed(flags, band.section, null, null)) return `${band.section} · adding or removing rows`;
      continue;
    }
    const offset = band.after && Array.isArray(prev[band.after]) ? (prev[band.after] as unknown[]).length : 0;
    for (let i = 0; i < newRows.length; i++) {
      const o = oldRows[i] ?? {};
      const n = newRows[i] ?? {};
      for (const col of new Set([...Object.keys(o), ...Object.keys(n)])) {
        if (same(o[col], n[col])) continue;
        const row = offset + i + 1;
        if (!allowed(flags, band.section, row, CELL_OF[col] ?? col)) return `${band.section} row ${row} · ${col}`;
      }
    }
  }
  return null;
}
