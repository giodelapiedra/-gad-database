import { createContext, useContext } from 'react';
import type { SubmissionComment } from '@/hooks/useSubmissions';

/** The exact spot a reviewer is commenting on: a cell (section · row · column) or a header field. */
export interface FlagTarget {
  section: string;
  rowNumber: number | null;
  field: string;
  /** Column heading as shown on screen, for the comment dialog. */
  label?: string;
  /** Current value of the cell, shown in the comment dialog for context. */
  value?: string;
}

/**
 * Open reviewer flags for the submission on screen. Provided by ReviewFlagsProvider
 * around a submission's view or edit form; outside a provider nothing is flagged,
 * so new (unsubmitted) forms render exactly as before.
 */
export interface ReviewFlagsValue {
  /** Unresolved comments tagged with a form section. */
  flags: SubmissionComment[];
  /** Present when the viewer may resolve flags (reviewers). */
  onResolve?: (comment: SubmissionComment) => void;
  /** Present when the viewer may comment straight on a cell (reviewers on the view page). */
  requestFlag?: (target: FlagTarget) => void;
  /**
   * Encoder correcting a submitted form: only flagged parts are editable.
   * Must match server/src/utils/correctionScope.ts.
   */
  restrictEdits?: boolean;
}

export const ReviewFlagsContext = createContext<ReviewFlagsValue>({ flags: [] });

export function useReviewFlags(): ReviewFlagsValue {
  return useContext(ReviewFlagsContext);
}

/**
 * Where a field sits in the form. FlaggedSection sets the section and FlaggedRow
 * adds the row, so a cell only has to name its own column.
 */
export interface FlagScope {
  section: string;
  row?: number;
}

export const FlagScopeContext = createContext<FlagScope | null>(null);

export function useFlagScope(): FlagScope | null {
  return useContext(FlagScopeContext);
}

/** Open flags on one section of the form. */
export function useSectionFlags(section: string): SubmissionComment[] {
  return useReviewFlags().flags.filter((c) => c.section === section);
}

/** Whether a specific row (1-based) has an open flag on the row as a whole (not on one of its cells). */
export function useRowFlagged(section: string, rowNumber: number): boolean {
  return useReviewFlags().flags.some((c) => c.section === section && c.rowNumber === rowNumber && !c.field);
}

/** Open flags on one column at the current scope (header field, or a cell of the current row). */
export function useFieldFlags(field: string | undefined): SubmissionComment[] {
  const { flags } = useReviewFlags();
  const scope = useFlagScope();
  if (!field || !scope) return [];
  const row = scope.row ?? null;
  return flags.filter((c) => c.section === scope.section && c.field === field && (c.rowNumber ?? null) === row);
}

/**
 * Whether a flag opens the given spot: a section flag (no row, no column) opens the
 * whole section, a row flag the whole row, a cell flag that one cell.
 */
function opens(c: SubmissionComment, section: string, row: number | null, field: string | null): boolean {
  if (c.section !== section) return false;
  if (c.rowNumber == null && !c.field) return true;
  if (row != null && c.rowNumber === row && !c.field) return true;
  return field != null && (c.rowNumber ?? null) === row && c.field === field;
}

/** Whether the field at the current scope may be edited (always, unless edits are restricted to flags). */
export function useCanEdit(field: string | undefined): boolean {
  const { flags, restrictEdits } = useReviewFlags();
  const scope = useFlagScope();
  if (!restrictEdits) return true;
  if (!scope) return false;
  return flags.some((c) => opens(c, scope.section, scope.row ?? null, field ?? null));
}

/** Whether rows may be added to / removed from the current section. */
export function useSectionEditable(): boolean {
  const { flags, restrictEdits } = useReviewFlags();
  const scope = useFlagScope();
  if (!restrictEdits) return true;
  if (!scope) return false;
  return flags.some((c) => opens(c, scope.section, null, null));
}
