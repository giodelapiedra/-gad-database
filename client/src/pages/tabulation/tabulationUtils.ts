import { AxiosError } from 'axios';
import type { ContestStatus, RankingMethod } from '@/hooks/useTabulation';

export function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && typeof err.response?.data?.message === 'string') {
    return err.response.data.message;
  }
  return fallback;
}

/** eventDate is a calendar date (YYYY-MM-DD) — format without timezone shifting. */
export function formatEventDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatScore(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export const CONTESTANT_LABELS = ['School', 'Barangay', 'Contestant', 'Team', 'Office'];

export const METHOD_LABEL: Record<RankingMethod, string> = {
  AVERAGE: 'Average of judges’ totals',
  RANK_SUM: 'Sum of judges’ ranks',
};

export const METHOD_HINT: Record<RankingMethod, string> = {
  AVERAGE: 'Highest average total wins.',
  RANK_SUM: 'Each judge ranks the contestants; lowest rank total wins. Reduces the effect of one very strict or very generous judge.',
};

export const STATUS_STYLE: Record<ContestStatus, { label: string; className: string }> = {
  SETUP: { label: 'Setup', className: 'border-[#E4E4E7] bg-[#F4F4F5] text-[#71717A]' },
  SCORING: { label: 'Scoring', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  FINALIZED: { label: 'Final', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
};
