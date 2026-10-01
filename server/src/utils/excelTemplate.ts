import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

/**
 * Template-driven Excel generation.
 *
 * Instead of hand-building a workbook that only approximates the official DILG
 * forms, we ship the real `.xlsx` files and use them as the source of truth for
 * every visual property: fonts, borders, fills, number formats, column widths,
 * row heights and page setup.
 *
 * A template has fixed-size data bands (CITY AR, for example, gives 6
 * client-focused slots) but a submission can have any number of rows. We don't
 * mutate the template in place — ExcelJS does not reliably shift merge ranges
 * when rows are spliced. Instead each distinctive template row is harvested as a
 * *prototype* and re-emitted into a fresh sheet with its per-cell style cloned,
 * so the output looks identical while the row count follows the data.
 */

// ─── Template file resolution ──────────────────────────────────────────────

/** `dist/templates` after a build, `src/templates` under ts-node-dev. */
function templateDir(): string {
  const candidates = [
    path.join(__dirname, '..', 'templates'),
    path.join(__dirname, '..', '..', 'src', 'templates'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(
    `Excel template directory not found. Looked in:\n  ${candidates.join('\n  ')}`
  );
}

const cache = new Map<string, Promise<ExcelJS.Workbook>>();

/**
 * Load a shipped template. Cached per file — callers must treat the returned
 * workbook as read-only, since every request shares the same instance.
 */
export function loadTemplate(fileName: string): Promise<ExcelJS.Workbook> {
  const cached = cache.get(fileName);
  if (cached) return cached;

  const full = path.join(templateDir(), fileName);
  const promise = (async () => {
    if (!fs.existsSync(full)) {
      throw new Error(`Excel template missing: ${full}`);
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(full);
    return wb;
  })();

  // Don't cache a rejected load — let the next request retry.
  promise.catch(() => cache.delete(fileName));
  cache.set(fileName, promise);
  return promise;
}

// ─── Row prototypes ────────────────────────────────────────────────────────

interface CellProto {
  style: Partial<ExcelJS.Style>;
  numFmt?: string;
  /** Original template text, so static labels can be replayed verbatim. */
  text: string;
}

export interface RowProto {
  height?: number;
  cells: CellProto[];
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null)) as T;

/** Snapshot columns 1..colCount of a template row: styles, formats and text. */
export function harvestRow(
  ws: ExcelJS.Worksheet,
  rowNumber: number,
  colCount: number
): RowProto {
  const row = ws.getRow(rowNumber);
  const cells: CellProto[] = [];

  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    const value = cell.value;

    let text = '';
    if (typeof value === 'string') text = value;
    else if (typeof value === 'number') text = String(value);
    else if (value && typeof value === 'object' && 'richText' in value) {
      text = (value.richText as { text: string }[]).map((t) => t.text).join('');
    }

    cells.push({
      // Deep-clone: assigning a live template style would let one response's
      // tweak leak into the cached workbook and every later request.
      style: clone(cell.style ?? {}) as Partial<ExcelJS.Style>,
      numFmt: cell.numFmt,
      text,
    });
  }

  return { height: row.height, cells };
}

// ─── Building ──────────────────────────────────────────────────────────────

/**
 * A positional cell value.
 * - `undefined` replays the prototype's template text (for static labels)
 * - `null` / `''` forces an empty cell
 */
export type CellValue = string | number | null | undefined | { formula: string };

export interface MergeSpec {
  /** 1-based column the merge starts on. */
  from: number;
  /** 1-based column the merge ends on. */
  to: number;
  /** Rows the merge spans; defaults to 1. */
  rowSpan?: number;
}

/**
 * Emits prototype-styled rows into a fresh worksheet, tracking which prototype
 * each output row came from so merges can be given the right perimeter.
 *
 * Merges are deferred to `finish()` because ExcelJS points every merged cell's
 * style at the master's — merging first would discard the right/bottom borders
 * that live on the range's trailing cells. `finish()` re-composes the perimeter
 * from the prototypes (left/top from the top-left cell, right from the
 * top-right, bottom from the bottom-left) and assigns it to the master, which
 * propagates to the whole range.
 */
export class SheetBuilder {
  private protos = new Map<number, RowProto>();
  private pending: { r1: number; c1: number; r2: number; c2: number }[] = [];
  private cursor = 1;

  constructor(private readonly ws: ExcelJS.Worksheet) {}

  /** 1-based row number the next `row()` call will write to. */
  get nextRow(): number {
    return this.cursor;
  }

  /** Write one row; returns the row number used. */
  row(proto: RowProto, values: CellValue[] = [], merges: MergeSpec[] = []): number {
    const r = this.cursor++;
    const row = this.ws.getRow(r);
    if (proto.height != null) row.height = proto.height;

    proto.cells.forEach((protoCell, i) => {
      const cell = row.getCell(i + 1);
      const supplied = values[i];

      if (supplied === undefined) {
        if (protoCell.text) cell.value = protoCell.text;
      } else if (supplied === null || supplied === '') {
        cell.value = null;
      } else if (typeof supplied === 'object' && 'formula' in supplied) {
        cell.value = { formula: supplied.formula } as ExcelJS.CellFormulaValue;
      } else {
        cell.value = supplied;
      }

      cell.style = clone(protoCell.style) as Partial<ExcelJS.Style>;
      if (protoCell.numFmt) cell.numFmt = protoCell.numFmt;
    });

    row.commit();
    this.protos.set(r, proto);

    for (const m of merges) {
      this.pending.push({
        r1: r,
        c1: m.from,
        r2: r + (m.rowSpan ?? 1) - 1,
        c2: m.to,
      });
    }
    return r;
  }

  /** Apply every deferred merge and restore its perimeter. Call once, last. */
  finish(): void {
    for (const { r1, c1, r2, c2 } of this.pending) {
      const topRow = this.protos.get(r1);
      const bottomRow = this.protos.get(r2) ?? topRow;
      const topLeft = topRow?.cells[c1 - 1];
      const topRight = topRow?.cells[c2 - 1] ?? topLeft;
      const bottomLeft = bottomRow?.cells[c1 - 1] ?? topLeft;

      this.ws.mergeCells(r1, c1, r2, c2);

      const border: Partial<ExcelJS.Borders> = {};
      if (topLeft?.style.border?.left) border.left = topLeft.style.border.left;
      if (topLeft?.style.border?.top) border.top = topLeft.style.border.top;
      if (topRight?.style.border?.right) border.right = topRight.style.border.right;
      if (bottomLeft?.style.border?.bottom) border.bottom = bottomLeft.style.border.bottom;

      // Slaves share the master's style object, so this propagates across the
      // range — Excel draws only the perimeter of a merged region.
      this.ws.getCell(r1, c1).border = border;
    }
    this.pending = [];
  }
}

/** Copy sheet-level geometry (widths, page setup, view) from template to output. */
export function cloneSheetShell(
  src: ExcelJS.Worksheet,
  out: ExcelJS.Worksheet,
  colCount: number
): void {
  for (let c = 1; c <= colCount; c++) {
    const from = src.getColumn(c);
    const to = out.getColumn(c);
    if (from.width != null) to.width = from.width;
    if (from.hidden) to.hidden = from.hidden;
  }

  // `useFirstPageNumber` is written by ExcelJS but missing from its typings.
  const pageSetup = clone(src.pageSetup ?? {}) as Partial<ExcelJS.PageSetup> & {
    useFirstPageNumber?: boolean;
    firstPageNumber?: number;
  };
  // ExcelJS turns on useFirstPageNumber whenever firstPageNumber is present,
  // which the template does not ask for. Drop the hint to keep them in sync.
  if (!pageSetup.useFirstPageNumber) delete pageSetup.firstPageNumber;

  out.pageSetup = pageSetup as ExcelJS.PageSetup;
  out.properties = clone(src.properties ?? {});
  if (src.views?.length) out.views = clone(src.views);
}

/**
 * Re-point the template's print area at the rows actually emitted — otherwise it
 * still spans the template's fixed extent and clips (or pads) the output.
 * `printTitlesRow` is left alone so the column header keeps repeating per page.
 */
export function setPrintArea(
  ws: ExcelJS.Worksheet,
  lastRow: number,
  colCount: number
): void {
  ws.pageSetup = {
    ...ws.pageSetup,
    printArea: `A1:${colLetter(colCount)}${lastRow}`,
  };
}

// ─── Formula helpers ───────────────────────────────────────────────────────

/** Excel column letter for a 1-based index (1 → A, 27 → AA). */
export function colLetter(index: number): string {
  let n = index;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * `=SUM(H11:H16)` for a contiguous band, or `null` when the band is empty so
 * callers can fall back to a literal 0 instead of emitting `=SUM(H11:H10)`.
 */
export function sumRange(
  col: number,
  firstRow: number,
  lastRow: number
): { formula: string } | null {
  if (lastRow < firstRow) return null;
  const L = colLetter(col);
  return { formula: `SUM(${L}${firstRow}:${L}${lastRow})` };
}

/** `=SUM(H17,H24,H30)` over specific cells, skipping any that don't exist. */
export function sumCells(
  col: number,
  rows: (number | null | undefined)[]
): { formula: string } | null {
  const valid = rows.filter((r): r is number => r != null);
  if (!valid.length) return null;
  const L = colLetter(col);
  return { formula: `SUM(${valid.map((r) => `${L}${r}`).join(',')})` };
}
