import type { SubmissionStatus } from '@/hooks/useSubmissions';

// ─── Constants ──────────────────────────────────────────────────────────────

export const PAGE_SIZE = 15;

/** Pending this long (days) gets flagged as overdue in the list. */
export const OVERDUE_DAYS = 3;

/** One-tap starters for the return comment; the reviewer can still edit. */
export const RETURN_REASONS = [
  'Please complete the missing fields.',
  'Budget figures do not add up — please recheck the totals.',
  'Attach the required supporting documents.',
  'Please correct the GAD activity descriptions.',
];

// ─── Types ────────────────────────────────────────────────────────────────

/** The status-based list filters. */
export type TabKey = 'ALL' | SubmissionStatus;

/** Every selectable view: the status filters plus the "still encoding" panel. */
export type ViewTab = TabKey | 'ENCODING';

/** `'ALL'` means no form-type filter. */
export type TemplateFilter = 'ALL' | string;

// ─── Time helpers ─────────────────────────────────────────────────────────

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** "just now", "5 min ago", "3 hr ago", "2 days ago", then the plain date. */
export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-PH', { dateStyle: 'medium' });
}

// ─── List copy ──────────────────────────────────────────────────────────────

export const LIST_TITLE: Record<TabKey, string> = {
  ALL:      'All submissions',
  DRAFT:    'Drafts',
  PENDING:  'Waiting for your review',
  APPROVED: 'Approved submissions',
  RETURNED: 'Returned to encoders',
};

export const EMPTY_COPY: Record<TabKey, { title: string; body: string }> = {
  ALL:      { title: 'No submissions yet',   body: 'Submissions from departments will appear here.' },
  DRAFT:    { title: 'No drafts',            body: 'Nothing is in draft.' },
  PENDING:  { title: 'You’re all caught up', body: 'There are no submissions waiting for review.' },
  APPROVED: { title: 'Nothing approved yet', body: 'Approved submissions will show up here.' },
  RETURNED: { title: 'Nothing returned',     body: 'Submissions you return with comments will show up here.' },
};
