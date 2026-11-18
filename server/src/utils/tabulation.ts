import type {
  Prisma,
  TabulationContest,
  TabulationCriterion,
  TabulationContestant,
  TabulationJudge,
  TabulationScore,
  TabulationEvent,
} from '@prisma/client';
import { toDateOnly } from './training';

// ─── Pure ranking engine ───────────────────────────────────────────────────
// Kept free of Prisma/Express so it is easy to reason about and test.

const EPS = 1e-9;

export type RankingMethod = 'AVERAGE' | 'RANK_SUM';

export interface CriterionInput { id: string; weight: number; sortOrder: number }
export interface ContestantInput { id: string; number: number; name: string }
export interface JudgeInput { id: string; judgeNo: number }
export interface ScoreInput { judgeId: string; contestantId: string; criterionId: string; value: number }

export interface JudgeProgress {
  judgeId: string;
  filled: number;
  required: number;
  complete: boolean;
}

export interface ContestantResult {
  contestantId: string;
  number: number;
  name: string;
  /** Judge's total for this contestant; null until that judge scored every criterion for them. */
  judgeTotals: Record<string, number | null>;
  /** Judge's own placing (1 = best; ties share the averaged rank, e.g. 2.5). Only for complete sheets. */
  judgeRanks: Record<string, number | null>;
  /** Mean of the judges' totals over judges who fully scored this contestant. */
  average: number | null;
  /** Sum of judge ranks over complete sheets (RANK_SUM method; lower wins). */
  rankSum: number | null;
  /** Mean score per criterion, used for the tie-breaker. */
  criterionAverages: Record<string, number | null>;
  finalRank: number | null;
  /** True when tie-breakers could not separate this contestant from another. */
  tied: boolean;
}

export interface ContestResults {
  method: RankingMethod;
  judges: JudgeProgress[];
  allJudgesComplete: boolean;
  rows: ContestantResult[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Fractional ("average") ranks: totals [90, 85, 85, 70] → [1, 2.5, 2.5, 4]. Higher total = better. */
function averageRanks(entries: { id: string; total: number }[]): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  const ranks = new Map<string, number>();
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && Math.abs(sorted[j + 1].total - sorted[i].total) < EPS) j++;
    const shared = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) ranks.set(sorted[k].id, shared);
    i = j + 1;
  }
  return ranks;
}

export function computeContestResults(input: {
  method: RankingMethod;
  criteria: CriterionInput[];
  contestants: ContestantInput[];
  judges: JudgeInput[];
  scores: ScoreInput[];
}): ContestResults {
  const { method, contestants, judges, scores } = input;
  const criteria = [...input.criteria].sort((a, b) => a.sortOrder - b.sortOrder);

  const cell = new Map<string, number>();
  for (const s of scores) cell.set(`${s.judgeId}|${s.contestantId}|${s.criterionId}`, s.value);

  // Per-judge totals (null if any criterion for that contestant is blank)
  const totals = new Map<string, Map<string, number | null>>();
  const progress: JudgeProgress[] = judges.map((j) => {
    let filled = 0;
    const byContestant = new Map<string, number | null>();
    for (const c of contestants) {
      let sum = 0;
      let complete = criteria.length > 0;
      for (const cr of criteria) {
        const v = cell.get(`${j.id}|${c.id}|${cr.id}`);
        if (v === undefined) complete = false;
        else { filled++; sum += v; }
      }
      byContestant.set(c.id, complete ? sum : null);
    }
    totals.set(j.id, byContestant);
    const required = contestants.length * criteria.length;
    return { judgeId: j.id, filled, required, complete: required > 0 && filled === required };
  });

  // Each complete judge's own ranking of the contestants
  const judgeRankMaps = new Map<string, Map<string, number>>();
  for (const p of progress) {
    if (!p.complete) continue;
    const t = totals.get(p.judgeId)!;
    judgeRankMaps.set(p.judgeId, averageRanks(contestants.map((c) => ({ id: c.id, total: t.get(c.id) as number }))));
  }

  const rows: ContestantResult[] = contestants.map((c) => {
    const judgeTotals: Record<string, number | null> = {};
    const judgeRanks: Record<string, number | null> = {};
    const scored: number[] = [];
    const ranks: number[] = [];
    for (const j of judges) {
      const t = totals.get(j.id)?.get(c.id) ?? null;
      judgeTotals[j.id] = t === null ? null : round2(t);
      if (t !== null) scored.push(t);
      const r = judgeRankMaps.get(j.id)?.get(c.id) ?? null;
      judgeRanks[j.id] = r;
      if (r !== null) ranks.push(r);
    }
    const criterionAverages: Record<string, number | null> = {};
    for (const cr of criteria) {
      const vals = judges
        .map((j) => cell.get(`${j.id}|${c.id}|${cr.id}`))
        .filter((v): v is number => v !== undefined);
      const m = mean(vals);
      criterionAverages[cr.id] = m === null ? null : round2(m);
    }
    const avg = mean(scored);
    return {
      contestantId: c.id,
      number: c.number,
      name: c.name,
      judgeTotals,
      judgeRanks,
      average: avg === null ? null : round2(avg),
      rankSum: ranks.length ? round2(ranks.reduce((a, b) => a + b, 0)) : null,
      criterionAverages,
      finalRank: null,
      tied: false,
    };
  });

  // Tie-break order: highest-weighted criterion first (stable by sheet order for equal weights)
  const tieCriteria = [...criteria].sort((a, b) => b.weight - a.weight || a.sortOrder - b.sortOrder);

  /** Negative → a ranks ahead of b. */
  const compare = (a: ContestantResult, b: ContestantResult): number => {
    const keys: [number | null, number | null, 'asc' | 'desc'][] = [];
    if (method === 'RANK_SUM') {
      keys.push([a.rankSum, b.rankSum, 'asc']);
      keys.push([a.average, b.average, 'desc']);
    } else {
      keys.push([a.average, b.average, 'desc']);
    }
    for (const cr of tieCriteria) keys.push([a.criterionAverages[cr.id], b.criterionAverages[cr.id], 'desc']);

    for (const [x, y, dir] of keys) {
      if (x === null && y === null) continue;
      if (x === null) return 1;
      if (y === null) return -1;
      if (Math.abs(x - y) < EPS) continue;
      return dir === 'asc' ? x - y : y - x;
    }
    return 0;
  };

  const rankable = rows.filter((r) => (method === 'RANK_SUM' ? r.rankSum !== null : r.average !== null));
  rankable.sort(compare);
  for (let i = 0; i < rankable.length; i++) {
    const prev = rankable[i - 1];
    if (prev && compare(prev, rankable[i]) === 0) {
      rankable[i].finalRank = prev.finalRank;
      rankable[i].tied = true;
      prev.tied = true;
    } else {
      rankable[i].finalRank = i + 1;
    }
  }

  rows.sort((a, b) => {
    if (a.finalRank !== null && b.finalRank !== null) return a.finalRank - b.finalRank || a.number - b.number;
    if (a.finalRank !== null) return -1;
    if (b.finalRank !== null) return 1;
    return a.number - b.number;
  });

  return {
    method,
    judges: progress,
    allJudgesComplete: progress.length > 0 && progress.every((p) => p.complete),
    rows,
  };
}

// ─── Serializers ───────────────────────────────────────────────────────────

export type FullContest = TabulationContest & {
  criteria: TabulationCriterion[];
  contestants: TabulationContestant[];
  judges: TabulationJudge[];
  scores: TabulationScore[];
};

export type FullEvent = TabulationEvent & { contests: FullContest[] };

export const FULL_CONTEST_INCLUDE = {
  criteria: { orderBy: { sortOrder: 'asc' } },
  contestants: { orderBy: { number: 'asc' } },
  judges: { orderBy: { judgeNo: 'asc' } },
  scores: true,
} satisfies Prisma.TabulationContestInclude;

/** Event with every contest fully loaded — used by both the admin detail and the public API. */
export const FULL_EVENT_INCLUDE = {
  contests: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: FULL_CONTEST_INCLUDE,
  },
} satisfies Prisma.TabulationEventInclude;

export function resultsFor(c: FullContest): ContestResults {
  return computeContestResults({
    method: c.rankingMethod,
    criteria: c.criteria,
    contestants: c.contestants,
    judges: c.judges,
    scores: c.scores,
  });
}

export function serializeEventSummary(
  e: TabulationEvent & { contests: Pick<TabulationContest, 'status' | 'resultsPublished'>[] },
) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    eventDate: toDateOnly(e.eventDate),
    venue: e.venue,
    isPublished: e.isPublished,
    contestCount: e.contests.length,
    finalizedCount: e.contests.filter((c) => c.status === 'FINALIZED').length,
    publishedResultsCount: e.contests.filter((c) => c.resultsPublished).length,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** Admin shape: everything, including per-judge scores and live results. */
export function serializeEventDetail(e: FullEvent) {
  return {
    ...serializeEventSummary(e),
    contests: e.contests.map((c) => ({
      id: c.id,
      name: c.name,
      contestantLabel: c.contestantLabel,
      rankingMethod: c.rankingMethod,
      status: c.status,
      resultsPublished: c.resultsPublished,
      sortOrder: c.sortOrder,
      finalizedAt: c.finalizedAt?.toISOString() ?? null,
      criteria: c.criteria.map(({ id, name, description, weight }) => ({ id, name, description, weight })),
      contestants: c.contestants.map(({ id, number, name }) => ({ id, number, name })),
      judges: c.judges.map(({ id, judgeNo, name, title }) => ({ id, judgeNo, name, title })),
      scores: c.scores.map(({ judgeId, contestantId, criterionId, value }) => ({ judgeId, contestantId, criterionId, value })),
      results: resultsFor(c),
    })),
  };
}

/**
 * Public shape: no judge names or per-judge scores. Rankings appear only for contests
 * whose results were explicitly published; other contests list contestants only.
 */
export function serializePublicEvent(e: FullEvent) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    eventDate: toDateOnly(e.eventDate),
    venue: e.venue,
    contests: e.contests.map((c) => {
      const base = {
        id: c.id,
        name: c.name,
        contestantLabel: c.contestantLabel,
        criteria: c.criteria.map(({ name, description, weight }) => ({ name, description, weight })),
        resultsPublished: c.resultsPublished,
      };
      if (!c.resultsPublished) {
        return { ...base, contestants: c.contestants.map((x) => x.name), rankings: [] };
      }
      const r = resultsFor(c);
      return {
        ...base,
        contestants: c.contestants.map((x) => x.name),
        rankings: r.rows
          .filter((row) => row.finalRank !== null)
          .map((row) => ({
            rank: row.finalRank as number,
            name: row.name,
            score: row.average,
            tied: row.tied,
          })),
      };
    }),
  };
}
