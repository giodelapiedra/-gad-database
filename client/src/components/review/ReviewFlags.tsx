import { useCallback, useMemo, useState } from 'react';
import { AlertCircleIcon, CheckIcon, FlagIcon, MessageSquarePlusIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sectionAnchor, sectionLabel, fieldAnchor, fieldLabel, flagWhere, REVIEW_SECTIONS } from '@/lib/reviewSections';
import type { SubmissionComment } from '@/hooks/useSubmissions';
import {
  ReviewFlagsContext,
  FlagScopeContext,
  useReviewFlags,
  useSectionFlags,
  useRowFlagged,
  useFlagScope,
  useFieldFlags,
  type FlagTarget,
} from '@/hooks/useReviewFlags';

/**
 * Supplies the submission's open (unresolved, section-tagged) reviewer flags to the form below.
 * With `onAddFlag`, every field gets a hover button that opens a comment box pinned to that cell.
 */
export function ReviewFlagsProvider({ comments, onResolve, onAddFlag, children }: {
  comments: SubmissionComment[];
  onResolve?: (comment: SubmissionComment) => void;
  onAddFlag?: (target: FlagTarget, body: string) => Promise<void>;
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<FlagTarget | null>(null);
  const requestFlag = useCallback((t: FlagTarget) => setTarget(t), []);
  const value = useMemo(() => ({
    flags: comments.filter((c) => c.section && !c.resolvedAt),
    onResolve,
    requestFlag: onAddFlag ? requestFlag : undefined,
  }), [comments, onResolve, onAddFlag, requestFlag]);
  return (
    <ReviewFlagsContext.Provider value={value}>
      {children}
      {onAddFlag && (
        <CellCommentDialog target={target} onClose={() => setTarget(null)} onSubmit={onAddFlag} />
      )}
    </ReviewFlagsContext.Provider>
  );
}

function CellCommentDialog({ target, onClose, onSubmit }: {
  target: FlagTarget | null;
  onClose: () => void;
  onSubmit: (target: FlagTarget, body: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  function close() { setBody(''); onClose(); }

  async function submit() {
    if (!target || !body.trim()) return;
    setBusy(true);
    try {
      await onSubmit(target, body.trim());
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Flag this cell for correction</DialogTitle>
          <DialogDescription>
            {target && flagWhere({ section: target.section, rowNumber: target.rowNumber, field: target.field })}
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
              {target.label ?? fieldLabel(target.field)} — current entry
            </p>
            <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap text-[12px] text-[#09090B]">
              {target.value?.trim() ? target.value : <span className="text-[#A1A1AA]">(blank)</span>}
            </p>
          </div>
        )}
        <Textarea
          autoFocus rows={3} value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          placeholder="What needs to be corrected here?"
          className="resize-none text-[13px]"
        />
        <p className="text-[11px] text-[#71717A]">The encoder sees this cell in red, with your comment, until you resolve it.</p>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !body.trim()}>
            <FlagIcon className="mr-1.5 size-3.5" />
            {busy ? 'Flagging…' : 'Flag for correction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolveButton({ c }: { c: SubmissionComment }) {
  const { onResolve } = useReviewFlags();
  if (!onResolve) return null;
  return (
    <button type="button" onClick={() => onResolve(c)}
      className="no-print inline-flex shrink-0 items-center gap-1 rounded border border-red-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100">
      <CheckIcon className="size-3" /> Resolve
    </button>
  );
}

function FlagItem({ c }: { c: SubmissionComment }) {
  const where = [c.rowNumber != null ? `Row ${c.rowNumber}` : null, c.field ? fieldLabel(c.field) : null]
    .filter(Boolean).join(' · ');
  return (
    <li className="flex items-start gap-2">
      <span className="min-w-0 flex-1">
        {where && <strong className="mr-1">{where}:</strong>}
        <span className="whitespace-pre-wrap">{c.body}</span>
        <span className="ml-1.5 text-[11px] text-red-500">— {c.author.name}</span>
      </span>
      <ResolveButton c={c} />
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
  const scope = useMemo(() => ({ section }), [section]);
  return (
    <FlagScopeContext.Provider value={scope}>
      <div id={sectionAnchor(section)} className={cn('relative scroll-mt-20', className)}>
        {flagged && <RedFrame rounded />}
        <FlagNote section={section} />
        {children}
      </div>
    </FlagScopeContext.Provider>
  );
}

/**
 * Wraps one row (1-based). Cells inside it pick up the row for their own flags;
 * the whole row is framed in red only when the reviewer flagged the row itself.
 */
export function FlaggedRow({ section, row, children }: {
  section: string; row: number; children: React.ReactNode;
}) {
  const flagged = useRowFlagged(section, row);
  const scope = useMemo(() => ({ section, row }), [section, row]);
  return (
    <FlagScopeContext.Provider value={scope}>
      {flagged ? (
        <div className="relative" title={`Row ${row} is flagged for correction`}>
          <RedFrame />
          {children}
        </div>
      ) : children}
    </FlagScopeContext.Provider>
  );
}

/** The reviewer's comments, printed inside a flagged cell. */
export function FieldNotes({ flags, className }: { flags: SubmissionComment[]; className?: string }) {
  if (!flags.length) return null;
  return (
    <ul className={cn('space-y-1 px-2 pb-1.5 text-[11px] leading-snug text-red-700', className)}>
      {flags.map((c) => (
        <li key={c.id} className="flex items-start gap-1.5">
          <AlertCircleIcon className="mt-px size-3 shrink-0" />
          <span className="min-w-0 flex-1 whitespace-pre-wrap">
            {c.body}<span className="ml-1 text-red-400">— {c.author.name}</span>
          </span>
          <ResolveButton c={c} />
        </li>
      ))}
    </ul>
  );
}

/** Hover button a reviewer clicks to comment on one cell. */
export function CellCommentButton({ field, label, value }: { field: string; label?: string; value?: string }) {
  const { requestFlag } = useReviewFlags();
  const scope = useFlagScope();
  if (!requestFlag || !scope) return null;
  return (
    <button
      type="button"
      title="Comment on this cell"
      aria-label={`Comment on ${label ?? fieldLabel(field)}`}
      onClick={() => requestFlag({ section: scope.section, rowNumber: scope.row ?? null, field, label, value })}
      className="no-print absolute right-1 top-1 z-[26] rounded border border-[#E4E4E7] bg-white p-0.5 text-[#71717A] opacity-0 shadow-sm transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover/flag:opacity-100 [@media(hover:none)]:opacity-60"
    >
      <MessageSquarePlusIcon className="size-3.5" />
    </button>
  );
}

/**
 * One field of a form or viewer that a reviewer can comment on. Flagged fields turn
 * red with the comment inside; reviewers get a comment button on hover.
 */
export function FlaggableField({ field, label, value, className, children }: {
  /** Form-data key of the column, e.g. "indicator". */
  field: string;
  label?: string;
  /** Current value, shown to the reviewer while writing the comment. */
  value?: string | number;
  className?: string;
  children: React.ReactNode;
}) {
  const scope = useFlagScope();
  const flags = useFieldFlags(field);
  if (!scope) return <div className={className}>{children}</div>;
  const flagged = flags.length > 0;
  return (
    <div
      id={fieldAnchor(scope.section, scope.row, field)}
      className={cn(
        'group/flag relative scroll-mt-24 rounded-[4px]',
        flagged && 'bg-red-50 ring-2 ring-red-500',
        className,
      )}
    >
      {children}
      {flagged && <FieldNotes flags={flags} className="px-0 pt-1" />}
      <CellCommentButton field={field} label={label} value={value != null ? String(value) : undefined} />
    </div>
  );
}

function scrollToFlag(c: SubmissionComment) {
  const cell = c.field ? document.getElementById(fieldAnchor(c.section!, c.rowNumber, c.field)) : null;
  (cell ?? document.getElementById(sectionAnchor(c.section!)))
    ?.scrollIntoView({ behavior: 'smooth', block: cell ? 'center' : 'start' });
}

/** Summary of everything the reviewer flagged; each entry jumps to its cell (or section). */
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
              onClick={(e) => { e.preventDefault(); scrollToFlag(c); }}
              className="font-semibold underline underline-offset-2 hover:text-red-950">
              {flagWhere(c)}
            </a>
            <span className="ml-1.5 whitespace-pre-wrap">{c.body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
