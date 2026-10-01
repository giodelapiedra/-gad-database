import { useMemo } from 'react';
import { AlertCircleIcon, CheckIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { sectionAnchor, sectionLabel, REVIEW_SECTIONS } from '@/lib/reviewSections';
import type { SubmissionComment } from '@/hooks/useSubmissions';
import { ReviewFlagsContext, useReviewFlags, useSectionFlags, useRowFlagged } from '@/hooks/useReviewFlags';

/** Supplies the submission's open (unresolved, section-tagged) reviewer flags to the form below. */
export function ReviewFlagsProvider({ comments, onResolve, children }: {
  comments: SubmissionComment[];
  onResolve?: (comment: SubmissionComment) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({
    flags: comments.filter((c) => c.section && !c.resolvedAt),
    onResolve,
  }), [comments, onResolve]);
  return <ReviewFlagsContext.Provider value={value}>{children}</ReviewFlagsContext.Provider>;
}

function FlagItem({ c }: { c: SubmissionComment }) {
  const { onResolve } = useReviewFlags();
  return (
    <li className="flex items-start gap-2">
      <span className="min-w-0 flex-1">
        {c.rowNumber != null && <strong className="mr-1">Row {c.rowNumber}:</strong>}
        <span className="whitespace-pre-wrap">{c.body}</span>
        <span className="ml-1.5 text-[11px] text-red-500">— {c.author.name}</span>
      </span>
      {onResolve && (
        <button type="button" onClick={() => onResolve(c)}
          className="no-print inline-flex shrink-0 items-center gap-1 rounded border border-red-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100">
          <CheckIcon className="size-3" /> Resolve
        </button>
      )}
    </li>
  );
}

/** Red callout with the reviewer's comments on one section. Renders nothing when not flagged. */
function FlagNote({ section }: { section: string }) {
  const flags = useSectionFlags(section);
  if (!flags.length) return null;
  return (
    <div className="sticky left-0 z-20 m-2 w-fit max-w-[min(48rem,calc(100vw-4rem))] rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-800">
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <AlertCircleIcon className="size-3.5" /> For correction — {sectionLabel(section)}
      </p>
      <ul className="space-y-1">{flags.map((c) => <FlagItem key={c.id} c={c} />)}</ul>
    </div>
  );
}

/**
 * Red frame drawn as an overlay above the content. An outline on the wrapper itself
 * would be painted over by the sheet grid's sticky columns (z-10); the overlay sits
 * above them (z-[25]) and below the sticky column header (z-30).
 */
function RedFrame({ rounded }: { rounded?: boolean }) {
  return (
    <div aria-hidden
      className={`pointer-events-none absolute inset-0 z-[25] border-2 border-red-500 ${rounded ? 'rounded-[10px]' : ''}`} />
  );
}

/**
 * Wraps one part of a form or viewer. When the reviewer flagged it, the part is
 * framed in red with the comments on top; otherwise it renders its children as-is.
 */
export function FlaggedSection({ section, children, className }: {
  section: string; children: React.ReactNode; className?: string;
}) {
  const flagged = useSectionFlags(section).length > 0;
  return (
    <div id={sectionAnchor(section)} className={cn('relative scroll-mt-20', className)}>
      {flagged && <RedFrame rounded />}
      <FlagNote section={section} />
      {children}
    </div>
  );
}

/** Wraps one row; frames it in red when the reviewer pointed at that row number (1-based). */
export function FlaggedRow({ section, row, children }: {
  section: string; row: number; children: React.ReactNode;
}) {
  const flagged = useRowFlagged(section, row);
  if (!flagged) return <>{children}</>;
  return (
    <div className="relative" title={`Row ${row} is flagged for correction`}>
      <RedFrame />
      {children}
    </div>
  );
}

/** Summary of everything the reviewer flagged; each entry jumps to its section. */
export function CorrectionChecklist() {
  const { flags } = useReviewFlags();
  if (!flags.length) return null;
  const order = REVIEW_SECTIONS.map((s) => s.key as string);
  const sorted = [...flags].sort((a, b) =>
    order.indexOf(a.section!) - order.indexOf(b.section!) || (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
  return (
    <div className="no-print mb-5 rounded-[10px] border border-red-300 bg-red-50 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-red-800">
        <AlertCircleIcon className="size-4" />
        {flags.length} {flags.length === 1 ? 'part needs' : 'parts need'} correction
      </p>
      <ul className="space-y-1.5 text-[12px] text-red-800">
        {sorted.map((c) => (
          <li key={c.id}>
            <a href={`#${sectionAnchor(c.section!)}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(sectionAnchor(c.section!))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="font-semibold underline underline-offset-2 hover:text-red-950">
              {sectionLabel(c.section)}{c.rowNumber != null ? ` · Row ${c.rowNumber}` : ''}
            </a>
            <span className="ml-1.5 whitespace-pre-wrap">{c.body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
