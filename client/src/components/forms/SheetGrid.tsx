import * as React from 'react';
import { PlusIcon, Trash2Icon, LockIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldAnchor } from '@/lib/reviewSections';
import { useFieldFlags, useFlagScope } from '@/hooks/useReviewFlags';
import { FieldNotes, CellCommentButton } from '@/components/review/ReviewFlags';

/**
 * Spreadsheet-style form grid.
 *
 * The DILG GAD forms are wide landscape tables, so rendering each entry as a
 * stack of labelled fields loses the shape encoders recognise from the Excel
 * file. These primitives lay a form out as the sheet itself: the template's
 * columns in the template's order, at widths proportional to the real column
 * widths, with the numbered header band on top and live sub-totals underneath.
 *
 * The grid scrolls horizontally inside its own container; the row-number gutter
 * and the first data column stay pinned so context survives the scroll.
 */

// ─── Column model ──────────────────────────────────────────────────────────

export interface SheetColumn {
  /** Header text, e.g. "Gender Issue or GAD Mandate". */
  label: string;
  /** Form-data key the column edits — lets a reviewer's comment point at this cell. */
  key?: string;
  /** The template's column number, rendered under the label. */
  num?: number;
  /** Rendered width in px — keep these proportional to the Excel widths. */
  width: number;
  align?: 'left' | 'right' | 'center';
  required?: boolean;
  /** Pin this column to the left edge while scrolling horizontally. */
  sticky?: boolean;
  /**
   * Two-tier header: consecutive columns sharing a group get one spanning
   * label above them (e.g. "GAD Budget" over MOOE / PS / CO).
   */
  group?: string;
}

const GUTTER = 40; // row-number column

/** Total intrinsic width, so header/rows/totals all line up. */
function sheetWidth(cols: SheetColumn[]): number {
  return GUTTER + cols.reduce((sum, c) => sum + c.width, 0) + GUTTER;
}

/**
 * Every band is at least the sheet's own width and stretches to fill a wider
 * card, so narrow tables (attributed programs) don't stop short of the edge.
 * The trailing gutter absorbs the extra space.
 */
function bandStyle(cols: SheetColumn[]): React.CSSProperties {
  return { minWidth: sheetWidth(cols) };
}
const BAND = 'w-full';
const TAIL = 'min-w-[40px] flex-1 shrink-0';

/** Left offset for a sticky column (gutter + every preceding column). */
function stickyLeft(cols: SheetColumn[], index: number): number {
  let left = GUTTER;
  for (let i = 0; i < index; i++) left += cols[i].width;
  return left;
}

// ─── Shell ─────────────────────────────────────────────────────────────────

export function SheetGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edge, setEdge] = React.useState({ left: false, right: false });

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdge((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.6), behavior: 'smooth' });
  }

  // Only the horizontal axis scrolls here; vertical scrolling stays with the
  // page, so there is one scrollbar and the mouse wheel never gets trapped.
  // The pill is sticky to the bottom of the viewport while the sheet is on
  // screen, so the hidden columns are obvious without hunting for a scrollbar.
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        className={cn(
          'sheet-scroll overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[10px] border border-[#D4D4D8] bg-white',
          className
        )}
      >
        <div className="w-fit min-w-full">{children}</div>
      </div>

      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-px right-px z-30 w-10 rounded-r-[10px] bg-gradient-to-l from-black/10 to-transparent transition-opacity',
          edge.right ? 'opacity-100' : 'opacity-0'
        )}
      />

      {(edge.left || edge.right) && (
        <div className="pointer-events-none sticky bottom-4 z-40 mt-2 flex justify-end">
          <div className="pointer-events-auto flex items-center overflow-hidden rounded-full bg-[#18181B]/90 text-white shadow-lg ring-1 ring-black/10 backdrop-blur">
            <button
              type="button" onClick={() => scroll(-1)} disabled={!edge.left} aria-label="Scroll left"
              className="flex h-8 items-center px-2.5 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span className="h-4 w-px bg-white/20" />
            <button
              type="button" onClick={() => scroll(1)} disabled={!edge.right}
              className="flex h-8 items-center gap-1 pl-3 pr-2.5 text-[11px] font-semibold hover:bg-white/10 disabled:opacity-30"
            >
              More columns <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

function HeadLabel({ col }: { col: SheetColumn }) {
  const align = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '';
  return (
    <>
      <p className={cn('text-[10px] font-bold uppercase leading-tight tracking-wide text-white', align)}>
        {col.label}
        {col.required && <span className="ml-0.5 text-red-400">*</span>}
      </p>
      {col.num != null && (
        <p className={cn('mt-0.5 text-[10px] font-semibold text-[#A1A1AA]', align)}>({col.num})</p>
      )}
    </>
  );
}

/** The numbered column-header band, mirroring the template's header rows. */
export function SheetHead({ cols }: { cols: SheetColumn[] }) {
  // Split into runs: ungrouped columns stand alone, grouped ones share a label.
  const runs: { group?: string; items: { col: SheetColumn; i: number }[] }[] = [];
  cols.forEach((col, i) => {
    const last = runs[runs.length - 1];
    if (col.group && last?.group === col.group) last.items.push({ col, i });
    else runs.push({ group: col.group, items: [{ col, i }] });
  });

  return (
    <div className={cn('flex bg-[#18181B]', BAND)} style={bandStyle(cols)}>
      <div
        className="sticky left-0 z-10 shrink-0 border-r border-[#3F3F46] bg-[#18181B]"
        style={{ width: GUTTER }}
      />
      {runs.map((run) =>
        run.group ? (
          <div key={`${run.group}-${run.items[0].i}`} className="flex shrink-0 flex-col">
            <p className="border-b border-r border-[#3F3F46] px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white">
              {run.group}
            </p>
            <div className="flex flex-1">
              {run.items.map(({ col }) => (
                <div key={col.label} className="shrink-0 border-r border-[#3F3F46] px-2 py-1.5" style={{ width: col.width }}>
                  <HeadLabel col={col} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          run.items.map(({ col, i }) => (
            <div
              key={col.label}
              className={cn(
                'shrink-0 border-r border-[#3F3F46] px-2 py-2',
                col.sticky && 'sticky z-10 bg-[#18181B]'
              )}
              style={{
                width: col.width,
                ...(col.sticky ? { left: stickyLeft(cols, i) } : null),
              }}
            >
              <HeadLabel col={col} />
            </div>
          ))
        )
      )}
      <div className={TAIL} />
    </div>
  );
}

// ─── Section bands ─────────────────────────────────────────────────────────

/**
 * A section banner — CLIENT-FOCUSED, ORGANIZATION FOCUSED, ATTRIBUTED PROGRAMS.
 * `accent` marks the yellow-highlighted bands in the template.
 */
export function SheetBanner({
  children,
  cols,
  accent,
}: {
  children: React.ReactNode;
  cols: SheetColumn[];
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center border-b border-t border-[#D4D4D8] px-3 py-1.5',
        accent ? 'bg-[#FEF9C3]' : 'bg-[#F4F4F5]',
        BAND
      )}
      style={bandStyle(cols)}
    >
      <span
        className={cn(
          'sticky left-3 text-[11px] font-bold uppercase tracking-widest',
          accent ? 'text-[#713F12]' : 'text-[#3F3F46]'
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** A sub-heading inside a section, e.g. "1. Gender Issues" / "2. GAD Mandate". */
export function SheetSubBanner({
  children,
  cols,
  tone = 'blue',
}: {
  children: React.ReactNode;
  cols: SheetColumn[];
  tone?: 'blue' | 'amber';
}) {
  return (
    <div
      className={cn(
        'flex items-center border-b border-[#E4E4E7] px-3 py-1.5',
        tone === 'blue' ? 'bg-[#EEF2FF]' : 'bg-[#FFF7ED]',
        BAND
      )}
      style={bandStyle(cols)}
    >
      <span className={cn(
        'sticky left-3 text-[12px] font-semibold',
        tone === 'blue' ? 'text-[#3730A3]' : 'text-[#9A3412]'
      )}>
        {children}
      </span>
    </div>
  );
}

// ─── Rows ──────────────────────────────────────────────────────────────────

export function SheetRow({
  index,
  cols,
  onRemove,
  children,
}: {
  index: number;
  cols: SheetColumn[];
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn('group flex border-b border-[#E4E4E7] last:border-b-0', BAND)}
      style={bandStyle(cols)}
    >
      <div
        className="sticky left-0 z-10 flex shrink-0 items-start justify-center border-r border-[#E4E4E7] bg-[#FAFAFA] pt-2 group-hover:bg-[#F4F4F5]"
        style={{ width: GUTTER }}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">
          {index + 1}
        </span>
      </div>

      {children}

      <div className={cn('flex items-start justify-center pt-2', TAIL)}>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove row"
            aria-label={`Remove row ${index + 1}`}
            className="rounded p-1 text-[#A1A1AA] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/** A plain cell wrapper for custom content (e.g. remarks + proof upload). */
export function SheetSlot({
  col,
  children,
}: {
  col: SheetColumn;
  children: React.ReactNode;
}) {
  const flags = useFieldFlags(col.key);
  const anchor = useCellAnchor(col.key);
  return (
    <div id={anchor}
      className={cn('group/flag relative shrink-0 scroll-mt-24 border-r border-[#E4E4E7] p-1.5', flags.length && 'bg-red-50 ring-2 ring-inset ring-red-500')}
      style={{ width: col.width }}>
      {children}
      <FieldNotes flags={flags} className="px-0.5 pt-1" />
      {col.key && <CellCommentButton field={col.key} label={col.label} />}
    </div>
  );
}

/**
 * An editable cell.
 *
 * Auto-sizing uses the grid-overlay trick: an invisible span holding the same
 * text defines the cell's intrinsic height, and the textarea is stacked on top
 * of it in the same grid area. Because rows are flex containers that stretch,
 * every textarea in a row ends up as tall as the row's tallest content — no
 * resize listeners, and no scrollbars inside a cell.
 */
export function SheetCell({
  col,
  cols,
  index,
  value,
  onChange,
  placeholder,
  numeric,
  readOnly,
  locked,
}: {
  col: SheetColumn;
  cols: SheetColumn[];
  index: number;
  value: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  readOnly?: boolean;
  /** Copied from another form (e.g. the GPB): read-only, shaded, with a lock. */
  locked?: boolean;
}) {
  const align = col.align ?? (numeric ? 'right' : 'left');
  const shown = numeric ? (value === 0 || value === '' ? '' : String(value)) : String(value ?? '');
  const noEdit = readOnly || locked;
  const flags = useFieldFlags(col.key);
  const anchor = useCellAnchor(col.key);
  const flagged = flags.length > 0;

  return (
    <div
      id={anchor}
      className={cn(
        'group/flag relative flex shrink-0 scroll-mt-24 flex-col border-r border-[#E4E4E7]',
        col.sticky && 'sticky z-10 bg-white group-hover:bg-[#FAFAFA]',
        locked && 'bg-[#F1F5F9] group-hover:bg-[#EEF2F7]',
        flagged && 'bg-red-50 ring-2 ring-inset ring-red-500 group-hover:bg-red-50'
      )}
      style={{
        width: col.width,
        ...(col.sticky ? { left: stickyLeft(cols, index) } : null),
      }}
      title={locked ? 'Copied from the GAD Plan and Budget — edit it there, then sync.' : undefined}
    >
      {locked && <LockIcon aria-hidden className="absolute right-1.5 top-1.5 size-3 text-[#94A3B8]" />}
      <div className="grid flex-1">
        <span
          aria-hidden
          className={cn(
            'invisible whitespace-pre-wrap break-words px-2 py-2 text-[12px] leading-snug [grid-area:1/1/2/2]',
            locked && 'pr-5'
          )}
        >
          {shown || placeholder || ' '}
          {'​'}
        </span>
        <textarea
          value={shown}
          readOnly={noEdit}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={noEdit ? undefined : placeholder}
          inputMode={numeric ? 'decimal' : undefined}
          className={cn(
            'resize-none overflow-hidden border-0 bg-transparent px-2 py-2 text-[12px] leading-snug text-[#09090B] outline-none [grid-area:1/1/2/2]',
            'placeholder:text-[#C4C4CC] focus:bg-[#FAFAFA] focus:ring-2 focus:ring-inset focus:ring-[#18181B]',
            noEdit && 'cursor-default text-[#475569] focus:bg-transparent focus:ring-0',
            locked && 'pr-5',
            align === 'right' && 'text-right tabular-nums',
            align === 'center' && 'text-center'
          )}
        />
      </div>
      <FieldNotes flags={flags} />
      {col.key && <CellCommentButton field={col.key} label={col.label} value={shown} />}
    </div>
  );
}

/** DOM id of a cell carrying a column key, inside a flag scope (section / row). */
function useCellAnchor(key: string | undefined): string | undefined {
  const scope = useFlagScope();
  return key && scope ? fieldAnchor(scope.section, scope.row, key) : undefined;
}

/** Digits-only parse used by the numeric cells. Blank / junk becomes 0. */
function parseAmount(text: string): number {
  const n = parseFloat(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Numeric cell.
 *
 * It keeps the typed text locally and only reports the parsed number upward, so
 * an in-progress entry like "1200." isn't rewritten to "1200" mid-keystroke. The
 * local text resyncs from the prop only when they genuinely disagree — which is
 * what happens when a draft loads or a row is deleted.
 */
export function SheetNumCell({
  col,
  cols,
  index,
  value,
  onChange,
}: {
  col: SheetColumn;
  cols: SheetColumn[];
  index: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = React.useState(value ? String(value) : '');

  React.useEffect(() => {
    if (parseAmount(text) !== value) setText(value ? String(value) : '');
    // `text` is intentionally omitted — this guards against external changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <SheetCell
      col={col}
      cols={cols}
      index={index}
      value={text}
      numeric
      placeholder="0.00"
      onChange={(v) => {
        setText(v);
        onChange(parseAmount(v));
      }}
    />
  );
}

/** A read-only computed row: sub-totals and the grand total. */
export function SheetTotalRow({
  label,
  cols,
  values,
  accent,
}: {
  label: string;
  cols: SheetColumn[];
  /** Keyed by column index; formatted strings. */
  values: Record<number, string>;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex border-t',
        accent ? 'border-[#FDE047] bg-[#FEF9C3]' : 'border-[#D4D4D8] bg-[#F4F4F5]',
        BAND
      )}
      style={bandStyle(cols)}
    >
      <div
        className={cn(
          'sticky left-0 z-10 shrink-0 border-r border-[#D4D4D8]',
          accent ? 'bg-[#FEF9C3]' : 'bg-[#F4F4F5]'
        )}
        style={{ width: GUTTER }}
      />
      {cols.map((col, i) => (
        <div
          key={col.label}
          className={cn(
            'flex shrink-0 items-center border-r border-[#E4E4E7] px-2 py-2',
            col.sticky && 'sticky z-10',
            col.sticky && (accent ? 'bg-[#FEF9C3]' : 'bg-[#F4F4F5]')
          )}
          style={{
            width: col.width,
            ...(col.sticky ? { left: stickyLeft(cols, i) } : null),
          }}
        >
          {i === 0 ? (
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wide',
                accent ? 'text-[#713F12]' : 'text-[#09090B]'
              )}
            >
              {label}
            </span>
          ) : values[i] ? (
            <span
              className={cn(
                'block w-full text-right text-[12px] font-bold tabular-nums',
                accent ? 'text-[#713F12]' : 'text-[#09090B]'
              )}
            >
              {values[i]}
            </span>
          ) : null}
        </div>
      ))}
      <div className={TAIL} />
    </div>
  );
}

/** Full-width "add row" affordance pinned to the left edge of the grid. */
export function SheetAddRow({
  onClick,
  label = 'Add Row',
  cols,
}: {
  onClick: () => void;
  label?: string;
  cols: SheetColumn[];
}) {
  return (
    <div
      className={cn('border-t border-[#E4E4E7] bg-white', BAND)}
      style={bandStyle(cols)}
    >
      <button
        type="button"
        onClick={onClick}
        className="sticky left-0 flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
      >
        <PlusIcon className="size-3.5" /> {label}
      </button>
    </div>
  );
}
