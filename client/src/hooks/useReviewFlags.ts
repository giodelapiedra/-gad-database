import { createContext, useContext } from 'react';
import type { SubmissionComment } from '@/hooks/useSubmissions';

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
}

export const ReviewFlagsContext = createContext<ReviewFlagsValue>({ flags: [] });

export function useReviewFlags(): ReviewFlagsValue {
  return useContext(ReviewFlagsContext);
}

/** Open flags on one section of the form. */
export function useSectionFlags(section: string): SubmissionComment[] {
  return useReviewFlags().flags.filter((c) => c.section === section);
}

/** Whether a specific row (1-based) of a section has an open flag. */
export function useRowFlagged(section: string, rowNumber: number): boolean {
  return useReviewFlags().flags.some((c) => c.section === section && c.rowNumber === rowNumber);
}
