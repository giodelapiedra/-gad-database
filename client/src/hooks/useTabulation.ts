import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type RankingMethod = 'AVERAGE' | 'RANK_SUM';
export type ContestStatus = 'SETUP' | 'SCORING' | 'FINALIZED';

export interface TabulationEventSummary {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  venue: string;
  isPublished: boolean;
  contestCount: number;
  finalizedCount: number;
  publishedResultsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TabCriterion { id: string; name: string; description: string; weight: number }
export interface TabContestant { id: string; number: number; name: string }
export interface TabJudge { id: string; judgeNo: number; name: string; title: string }
export interface TabScore { judgeId: string; contestantId: string; criterionId: string; value: number }

export interface JudgeProgress { judgeId: string; filled: number; required: number; complete: boolean }

export interface ContestantResult {
  contestantId: string;
  number: number;
  name: string;
  judgeTotals: Record<string, number | null>;
  judgeRanks: Record<string, number | null>;
  average: number | null;
  rankSum: number | null;
  criterionAverages: Record<string, number | null>;
  finalRank: number | null;
  tied: boolean;
}

export interface ContestResults {
  method: RankingMethod;
  judges: JudgeProgress[];
  allJudgesComplete: boolean;
  rows: ContestantResult[];
}

export interface TabContest {
  id: string;
  name: string;
  contestantLabel: string;
  rankingMethod: RankingMethod;
  status: ContestStatus;
  resultsPublished: boolean;
  sortOrder: number;
  finalizedAt: string | null;
  criteria: TabCriterion[];
  contestants: TabContestant[];
  judges: TabJudge[];
  scores: TabScore[];
  results: ContestResults;
}

export interface TabulationEventDetail extends TabulationEventSummary {
  contests: TabContest[];
}

export interface EventPayload {
  title: string;
  description: string;
  eventDate: string;
  venue: string;
}

export interface ContestSetupPayload {
  name: string;
  contestantLabel: string;
  rankingMethod: RankingMethod;
  criteria: { id?: string; name: string; description: string; weight: number }[];
  contestants: { id?: string; name: string }[];
  judges: { id?: string; judgeNo: number; name: string; title: string }[];
}

export interface ScoreCellPayload { contestantId: string; criterionId: string; value: number | null }

const LIST_KEY = ['tabulation', 'events'];
const eventKey = (id: string) => ['tabulation', 'event', id];

// ─── Queries ─────────────────────────────────────────────────────────────

export function useTabulationEvents(options: { enabled?: boolean } = {}) {
  return useQuery<TabulationEventSummary[]>({
    queryKey: LIST_KEY,
    queryFn: async () => (await api.get('/tabulation/events')).data.data,
    enabled: options.enabled ?? true,
  });
}

/** Polls while open so live results follow encoders on other devices. */
export function useTabulationEvent(id: string | undefined, live = true) {
  return useQuery<TabulationEventDetail>({
    queryKey: eventKey(id ?? ''),
    queryFn: async () => (await api.get(`/tabulation/events/${id}`)).data.data,
    enabled: !!id,
    refetchInterval: live ? 5000 : false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────
// Every event-scoped mutation returns the refreshed event detail; write it straight into the cache.

function useEventMutation<V>(eventId: string, fn: (vars: V) => Promise<TabulationEventDetail>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(eventKey(eventId), detail);
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EventPayload) =>
      (await api.post('/tabulation/events', payload)).data.data as TabulationEventDetail,
    onSuccess: (detail) => {
      qc.setQueryData(eventKey(detail.id), detail);
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateEvent(eventId: string) {
  return useEventMutation(eventId, async (payload: EventPayload) =>
    (await api.put(`/tabulation/events/${eventId}`, payload)).data.data);
}

export function useSetEventPublished(eventId: string) {
  return useEventMutation(eventId, async (isPublished: boolean) =>
    (await api.patch(`/tabulation/events/${eventId}/publish`, { isPublished })).data.data);
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/tabulation/events/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useCreateContest(eventId: string) {
  return useEventMutation(eventId, async (payload: { name: string; contestantLabel: string; rankingMethod: RankingMethod }) =>
    (await api.post(`/tabulation/events/${eventId}/contests`, payload)).data.data);
}

export function useSaveContestSetup(eventId: string) {
  return useEventMutation(eventId, async ({ contestId, ...payload }: ContestSetupPayload & { contestId: string }) =>
    (await api.put(`/tabulation/contests/${contestId}`, payload)).data.data);
}

export function useSetContestStatus(eventId: string) {
  return useEventMutation(eventId, async ({ contestId, status }: { contestId: string; status: 'SCORING' | 'FINALIZED' }) =>
    (await api.patch(`/tabulation/contests/${contestId}/status`, { status })).data.data);
}

export function useSetContestResultsPublished(eventId: string) {
  return useEventMutation(eventId, async ({ contestId, resultsPublished }: { contestId: string; resultsPublished: boolean }) =>
    (await api.patch(`/tabulation/contests/${contestId}/publish`, { resultsPublished })).data.data);
}

export function useDeleteContest(eventId: string) {
  return useEventMutation(eventId, async (contestId: string) =>
    (await api.delete(`/tabulation/contests/${contestId}`)).data.data);
}

export function useSaveJudgeScores(eventId: string) {
  return useEventMutation(eventId, async ({ contestId, judgeId, scores }: { contestId: string; judgeId: string; scores: ScoreCellPayload[] }) =>
    (await api.put(`/tabulation/contests/${contestId}/judges/${judgeId}/scores`, { scores })).data.data);
}

export function useAddJudge(eventId: string) {
  return useEventMutation(eventId, async ({ contestId, ...payload }: { contestId: string; judgeNo?: number; name: string; title: string }) =>
    (await api.post(`/tabulation/contests/${contestId}/judges`, payload)).data.data);
}

// ─── PDF downloads ─────────────────────────────────────────────────────────

export type TabulationPdf =
  | { type: 'results' }
  | { type: 'judge'; judgeId: string; blank: boolean };

/** Downloads a server-rendered PDF (consolidated results or a judge's score sheet). */
export async function downloadTabulationPdf(contestId: string, pdf: TabulationPdf): Promise<void> {
  const params = pdf.type === 'results'
    ? { type: 'results' }
    : { type: 'judge', judgeId: pdf.judgeId, ...(pdf.blank ? { blank: '1' } : {}) };
  const res = await api.get(`/tabulation/contests/${contestId}/pdf`, { params, responseType: 'blob' });

  const disposition = res.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const fileName = match ? decodeURIComponent(match[1]) : 'tabulation.pdf';

  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
