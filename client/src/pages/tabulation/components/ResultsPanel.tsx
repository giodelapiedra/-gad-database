import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  GlobeIcon,
  LockIcon,
  LockOpenIcon,
  DownloadIcon,
  RadioIcon,
  TrophyIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  useSetContestStatus,
  useSetContestResultsPublished,
  downloadTabulationPdf,
  type TabContest,
  type TabulationEventDetail,
} from '@/hooks/useTabulation';
import { apiError, formatScore, METHOD_LABEL } from '../tabulationUtils';
import RankBadge from './RankBadge';

interface Props {
  event: TabulationEventDetail;
  contest: TabContest;
}

export default function ResultsPanel({ event, contest }: Props) {
  const setStatus = useSetContestStatus(event.id);
  const setPublished = useSetContestResultsPublished(event.id);
  const [confirm, setConfirm] = useState<'finalize' | 'reopen' | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { results, judges, criteria } = contest;
  const isFinal = contest.status === 'FINALIZED';
  const isRankSum = contest.rankingMethod === 'RANK_SUM';
  const completeJudges = results.judges.filter((j) => j.complete).length;
  const tiedRows = results.rows.filter((r) => r.tied);
  const topWeight = [...criteria].sort((a, b) => b.weight - a.weight)[0];

  async function changeStatus(status: 'SCORING' | 'FINALIZED') {
    try {
      await setStatus.mutateAsync({ contestId: contest.id, status });
      toast.success(status === 'FINALIZED' ? 'Results finalized and locked' : 'Scoring reopened');
      setConfirm(null);
    } catch (err) {
      toast.error(apiError(err, 'Failed to update the competition'));
    }
  }

  async function downloadResults() {
    setDownloading(true);
    try {
      await downloadTabulationPdf(contest.id, { type: 'results' });
    } catch (err) {
      toast.error(apiError(err, 'Failed to generate the PDF'));
    } finally {
      setDownloading(false);
    }
  }

  async function togglePublished() {
    try {
      await setPublished.mutateAsync({ contestId: contest.id, resultsPublished: !contest.resultsPublished });
      toast.success(contest.resultsPublished ? 'Results hidden from the website' : 'Results published to the website');
    } catch (err) {
      toast.error(apiError(err, 'Failed to update the website'));
    }
  }

  if (judges.length === 0 || contest.contestants.length === 0) {
    return (
      <div className="py-10 text-center">
        <TrophyIcon className="mx-auto mb-2 size-8 text-[#D4D4D8]" />
        <p className="text-[13px] text-[#71717A]">No results yet</p>
        <p className="mt-0.5 text-[12px] text-[#A1A1AA]">Add contestants and judges in Setup, then encode the score sheets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status strip */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {isFinal ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700">
              <LockIcon className="size-3.5" /> Final results
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-700">
              <RadioIcon className="size-3.5 animate-pulse" /> Live · visible to admins only
            </span>
          )}
          <span className="text-[12px] text-[#71717A]">
            {completeJudges} of {judges.length} score sheets complete · {METHOD_LABEL[contest.rankingMethod]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadResults} disabled={downloading}>
            <DownloadIcon className="mr-1 size-3.5" /> {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
          {isFinal ? (
            <Button size="sm" variant="outline" onClick={() => setConfirm('reopen')} disabled={setStatus.isPending}>
              <LockOpenIcon className="mr-1 size-3.5" /> Reopen scoring
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setConfirm('finalize')}
              disabled={!results.allJudgesComplete || setStatus.isPending}
              title={results.allJudgesComplete ? undefined : 'All score sheets must be complete first'}
            >
              <LockIcon className="mr-1 size-3.5" /> Finalize results
            </Button>
          )}
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${isFinal ? 'border-[#EBEBEB]' : 'border-dashed border-[#E4E4E7] opacity-60'}`}
            title={isFinal ? undefined : 'Finalize the results before publishing'}
          >
            <GlobeIcon className={`size-3.5 ${contest.resultsPublished ? 'text-emerald-600' : 'text-[#A1A1AA]'}`} />
            <span className="text-[12px] font-medium text-[#09090B]">Publish results</span>
            <Switch
              checked={contest.resultsPublished}
              onCheckedChange={togglePublished}
              disabled={!isFinal || setPublished.isPending}
            />
          </div>
        </div>
      </div>

      {/* Judge progress */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {judges.map((j) => {
          const p = results.judges.find((x) => x.judgeId === j.id);
          const pct = p && p.required ? Math.round((p.filled / p.required) * 100) : 0;
          return (
            <div key={j.id} className="rounded-lg border border-[#EBEBEB] px-3 py-2">
              <div className="flex items-center gap-1.5">
                {p?.complete && <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-600" />}
                <p className="truncate text-[12px] font-medium text-[#09090B]">Judge {j.judgeNo}</p>
                <span className="ml-auto text-[11px] tabular-nums text-[#A1A1AA]">{pct}%</span>
              </div>
              <p className="truncate text-[11px] text-[#71717A]">{j.name}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#F4F4F5]">
                <div
                  className={`h-full rounded-full transition-all ${p?.complete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {tiedRows.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Still tied after the tie-breaker{topWeight ? ` (${topWeight.name}, then the next-highest criteria)` : ''}:{' '}
            <strong>{tiedRows.map((r) => r.name).join(', ')}</strong>. Resolve per the competition rules before announcing.
          </span>
        </div>
      )}

      {/* Consolidated table */}
      <div className="overflow-x-auto rounded-lg border border-[#E4E4E7]">
        <table className="w-full min-w-[640px] border-collapse text-[15px]">
          <thead>
            <tr className="bg-[#FAFAFA] text-[13px] text-[#52525B]">
              <th className="w-32 border-b border-[#E4E4E7] px-3 py-2 text-left font-semibold">Rank</th>
              <th className="border-b border-[#E4E4E7] px-3 py-2 text-left font-medium">{contest.contestantLabel}</th>
              {judges.map((j) => (
                <th key={j.id} className="border-b border-[#E4E4E7] px-2 py-2 text-center font-medium" title={j.name}>
                  Judge {j.judgeNo}
                </th>
              ))}
              <th className="border-b border-[#E4E4E7] px-2 py-2 text-center font-semibold text-[#09090B]">Average</th>
              {isRankSum && <th className="border-b border-[#E4E4E7] px-2 py-2 text-center font-semibold text-[#09090B]">Rank Sum</th>}
            </tr>
          </thead>
          <tbody>
            {results.rows.map((r) => (
              <tr key={r.contestantId} className={r.finalRank === 1 ? 'bg-amber-50/50' : r.finalRank === 2 ? 'bg-slate-50/60' : r.finalRank === 3 ? 'bg-orange-50/40' : ''}>
                <td className="border-b border-[#F4F4F5] px-3 py-2">
                  <RankBadge place={r.finalRank} tied={r.tied} size="lg" />
                </td>
                <td className="border-b border-[#F4F4F5] px-3 py-2">
                  <span className="mr-1.5 text-[11px] tabular-nums text-[#A1A1AA]">#{r.number}</span>
                  <span className="font-semibold text-[#09090B]">{r.name}</span>
                </td>
                {judges.map((j) => (
                  <td key={j.id} className="border-b border-[#F4F4F5] px-2 py-2 text-center tabular-nums text-[#52525B]">
                    {formatScore(r.judgeTotals[j.id])}
                    {isRankSum && r.judgeRanks[j.id] !== null && (
                      <span className="ml-1 text-[11px] text-[#A1A1AA]">({formatScore(r.judgeRanks[j.id])})</span>
                    )}
                  </td>
                ))}
                <td className="border-b border-[#F4F4F5] px-2 py-3 text-center text-[18px] font-bold tabular-nums text-[#09090B]">
                  {formatScore(r.average)}
                </td>
                {isRankSum && (
                  <td className="border-b border-[#F4F4F5] px-2 py-2 text-center font-semibold tabular-nums text-[#09090B]">
                    {formatScore(r.rankSum)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isFinal && (
        <p className="text-[11px] text-[#A1A1AA]">
          Ranks update every few seconds while judges’ sheets are encoded. Incomplete sheets are left out of a contestant’s
          average until filled in.
        </p>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'finalize' ? 'Finalize results?' : 'Reopen scoring?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'finalize'
                ? 'All score sheets will be locked. You can then print the consolidated result and publish it to the website.'
                : contest.resultsPublished
                  ? 'Score sheets become editable again and the published results will be taken off the website until you finalize again.'
                  : 'Score sheets become editable again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => changeStatus(confirm === 'finalize' ? 'FINALIZED' : 'SCORING')}
              disabled={setStatus.isPending}
            >
              {setStatus.isPending ? 'Saving...' : confirm === 'finalize' ? 'Finalize' : 'Reopen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
