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
