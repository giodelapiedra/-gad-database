import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2Icon, DownloadIcon, LockIcon, SettingsIcon, UserIcon, UserPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadTabulationPdf, useSaveJudgeScores, type TabContest, type TabulationEventDetail } from '@/hooks/useTabulation';
import RankBadge from './RankBadge';
import AddJudgeDialog from './AddJudgeDialog';
import { apiError, formatScore } from '../tabulationUtils';

const cellKey = (contestantId: string, criterionId: string) => `${contestantId}|${criterionId}`;

interface Props {
  event: TabulationEventDetail;
  contest: TabContest;
  onGoToSetup: () => void;
}

export default function ScoreSheetPanel({ event, contest, onGoToSetup }: Props) {
  const save = useSaveJudgeScores(event.id);
  const locked = contest.status === 'FINALIZED';
  const { criteria, contestants, judges, results } = contest;

  const progress = useMemo(() => new Map(results.judges.map((p) => [p.judgeId, p])), [results.judges]);

  // Default to the first judge whose sheet is still incomplete.
  const [judgeId, setJudgeId] = useState<string | null>(null);
  const judge = judges.find((j) => j.id === judgeId)
    ?? judges.find((j) => !progress.get(j.id)?.complete)
    ?? judges[0];

  /** Saved values for the selected judge, keyed by cell. */
  const serverValues = useMemo(() => {
    const m = new Map<string, number>();
    if (!judge) return m;
    for (const s of contest.scores) if (s.judgeId === judge.id) m.set(cellKey(s.contestantId, s.criterionId), s.value);
    return m;
  }, [contest.scores, judge]);

  // Draft is reseeded only when the judge changes or after a save, never by background polling.
  const [version, setVersion] = useState(0);
  const syncKey = `${contest.id}:${judge?.id ?? ''}:${version}`;
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  if (draftKey !== syncKey) {
    setDraftKey(syncKey);
    const next: Record<string, string> = {};
    serverValues.forEach((v, k) => { next[k] = String(v); });
    setDraft(next);
  }

  const [downloading, setDownloading] = useState(false);
  const [addJudgeOpen, setAddJudgeOpen] = useState(false);

  const maxOf = useMemo(() => new Map(criteria.map((c) => [c.id, c.weight])), [criteria]);

  function cellError(criterionId: string, raw: string | undefined): boolean {
    if (raw === undefined || raw.trim() === '') return false;
    const n = Number(raw);
    return !Number.isFinite(n) || n < 0 || n > (maxOf.get(criterionId) ?? 0) + 1e-9;
  }

  const changes = useMemo(() => {
    const out: { contestantId: string; criterionId: string; value: number | null }[] = [];
    for (const ct of contestants) {
      for (const cr of criteria) {
        const k = cellKey(ct.id, cr.id);
        const raw = (draft[k] ?? '').trim();
        const saved = serverValues.get(k);
        const value = raw === '' ? null : Number(raw);
        if (value === null ? saved !== undefined : saved === undefined || Math.abs(saved - value) > 1e-9) {
          out.push({ contestantId: ct.id, criterionId: cr.id, value });
        }
      }
    }
    return out;
  }, [draft, serverValues, contestants, criteria]);

  const hasErrors = contestants.some((ct) => criteria.some((cr) => cellError(cr.id, draft[cellKey(ct.id, cr.id)])));
  const dirty = changes.length > 0;

  // Live totals and this judge's own ranking from the draft.
  const totals = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const ct of contestants) {
      let sum = 0;
      let complete = true;
      for (const cr of criteria) {
        const raw = (draft[cellKey(ct.id, cr.id)] ?? '').trim();
        const n = Number(raw);
        if (raw === '' || !Number.isFinite(n)) complete = false;
        else sum += n;
      }
      m.set(ct.id, complete ? Math.round(sum * 100) / 100 : null);
    }
    return m;
  }, [draft, contestants, criteria]);

  /** This judge's placing from the draft: 1st, 2nd… (equal totals share a place). */
  const ranks = useMemo(() => {
    const m = new Map<string, { place: number; tied: boolean }>();
    const scored = contestants.filter((c) => totals.get(c.id) !== null);
    for (const c of scored) {
      const t = totals.get(c.id)!;
      const better = scored.filter((o) => totals.get(o.id)! > t + 1e-9).length;
      const same = scored.filter((o) => Math.abs(totals.get(o.id)! - t) < 1e-9).length;
      m.set(c.id, { place: better + 1, tied: same > 1 });
    }
    return m;
  }, [totals, contestants]);

  async function persist(): Promise<boolean> {
    if (!judge || !dirty) return true;
    if (hasErrors) {
      toast.error('Fix the highlighted scores first — each must be between 0 and the criterion’s maximum.');
      return false;
    }
    try {
      await save.mutateAsync({ contestId: contest.id, judgeId: judge.id, scores: changes });
      setVersion((v) => v + 1);
      return true;
    } catch (err) {
      toast.error(apiError(err, 'Failed to save scores'));
      return false;
    }
  }

  async function handleSave() {
    if (await persist()) toast.success(`Saved Judge ${judge?.judgeNo}’s score sheet`);
  }

  /** Saves pending edits first so the PDF matches what's on screen. */
  async function downloadSheet(blank: boolean) {
    if (!judge || downloading) return;
    if (!blank && dirty && !(await persist())) return;
    setDownloading(true);
    try {
      await downloadTabulationPdf(contest.id, { type: 'judge', judgeId: judge.id, blank });
    } catch (err) {
      toast.error(apiError(err, 'Failed to generate the PDF'));
    } finally {
      setDownloading(false);
    }
  }

  async function switchJudge(id: string) {
    if (id === judge?.id) return;
    if (dirty && !(await persist())) return;
    setJudgeId(id);
  }

  /** Enter moves down the column, like a spreadsheet. */
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const nextRow = e.shiftKey ? row - 1 : row + 1;
    const target = document.querySelector<HTMLInputElement>(`[data-cell="${nextRow}-${col}"]`)
      ?? (!e.shiftKey ? document.querySelector<HTMLInputElement>(`[data-cell="0-${col + 1}"]`) : null);
    target?.focus();
    target?.select();
  }

  const addJudgeDialog = (
    <AddJudgeDialog
      open={addJudgeOpen}
      onClose={() => setAddJudgeOpen(false)}
      eventId={event.id}
      contest={contest}
      onAdded={(id) => switchJudge(id)}
    />
  );

  if (criteria.length === 0 || contestants.length === 0) {
    return (
      <div className="py-10 text-center">
        <SettingsIcon className="mx-auto mb-2 size-8 text-[#D4D4D8]" />
        <p className="text-[13px] text-[#71717A]">Finish the setup first</p>
        <p className="mt-0.5 text-[12px] text-[#A1A1AA]">Score sheets need criteria and contestants.</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={onGoToSetup}>Go to Setup</Button>
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div className="py-10 text-center">
        <UserPlusIcon className="mx-auto mb-2 size-8 text-[#D4D4D8]" />
        <p className="text-[13px] text-[#71717A]">No judges yet</p>
        <p className="mt-0.5 text-[12px] text-[#A1A1AA]">Add each judge, then encode their score sheet.</p>
        {!locked && (
          <Button size="sm" className="mt-4" onClick={() => setAddJudgeOpen(true)}>
            <UserPlusIcon className="mr-1.5 size-4" /> Add judge
          </Button>
        )}
        {addJudgeDialog}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Judge picker */}
      <div className="flex flex-wrap items-center gap-2">
        {judges.map((j) => {
          const p = progress.get(j.id);
          const active = j.id === judge?.id;
          return (
            <button
              key={j.id}
              type="button"
              onClick={() => switchJudge(j.id)}
              disabled={save.isPending}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 text-left transition-colors ${
                active ? 'border-blue-600 bg-blue-50' : 'border-[#E4E4E7] bg-white hover:bg-[#F4F4F5]'
              }`}
            >
              {p?.complete
                ? <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" />
                : <UserIcon className="size-5 shrink-0 text-[#A1A1AA]" />}
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-[#09090B]">Judge {j.judgeNo}</span>
                <span className="block max-w-[200px] truncate text-[12px] text-[#71717A]">{j.name}</span>
                <JudgeProgress filled={p?.filled ?? 0} required={p?.required ?? 0} />
              </span>
            </button>
          );
        })}
        {!locked && (
          <button
            type="button"
            onClick={() => setAddJudgeOpen(true)}
            disabled={save.isPending}
            className="flex items-center gap-2 self-stretch rounded-xl border-2 border-dashed border-[#D4D4D8] px-4 py-2.5 text-[13px] font-medium text-[#52525B] transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
          >
            <UserPlusIcon className="size-4" /> Add judge
          </button>
        )}
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" disabled={downloading} />}>
            <DownloadIcon className="mr-1 size-3.5" /> {downloading ? 'Preparing…' : 'Download PDF'}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadSheet(false)}>
              Judge {judge?.judgeNo}’s score sheet (with scores)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadSheet(true)}>
              Blank score sheet for Judge {judge?.judgeNo}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {locked ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <LockIcon className="size-3.5" /> Results are finalized — score sheets are read-only.
        </div>
      ) : (
        <p className="text-[12px] text-[#71717A]">
          Encode exactly what Judge {judge?.judgeNo} wrote on the paper score sheet. Press <kbd className="rounded border px-1 text-[10px]">Enter</kbd> to move down.
        </p>
      )}

      {/* Sheet */}
      <div className="overflow-x-auto rounded-lg border border-[#E4E4E7]">
        <table className="w-full min-w-[760px] border-collapse text-[15px]">
          <thead>
            <tr className="bg-[#FAFAFA] text-[13px] text-[#52525B]">
              <th className="w-14 border-b border-r border-[#E4E4E7] px-2 py-3 text-center font-medium">No.</th>
              <th className="min-w-[200px] border-b border-r border-[#E4E4E7] px-4 py-3 text-left font-medium">{contest.contestantLabel}</th>
              {criteria.map((c) => (
                <th key={c.id} className="min-w-[130px] border-b border-r border-[#E4E4E7] px-2 py-3 text-center align-top font-medium" title={c.description}>
                  <span className="line-clamp-2 block font-semibold text-[#09090B]">{c.name}</span>
                  <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-semibold text-blue-700">max {c.weight}</span>
                </th>
              ))}
              <th className="w-24 border-b border-r border-[#E4E4E7] px-2 py-3 text-center font-semibold text-[#09090B]">TOTAL<span className="block text-[11px] font-normal text-[#A1A1AA]">of 100</span></th>
              <th className="w-28 border-b border-[#E4E4E7] px-2 py-3 text-center font-semibold text-[#09090B]">RANK</th>
            </tr>
          </thead>
          <tbody>
            {contestants.map((ct, row) => (
              <tr key={ct.id} className="hover:bg-[#FAFAFA]">
                <td className="border-b border-r border-[#F4F4F5] px-2 py-2 text-center text-[16px] font-semibold tabular-nums text-[#71717A]">{ct.number}</td>
                <td className="border-b border-r border-[#F4F4F5] px-4 py-2 text-[15px] font-semibold text-[#09090B]">{ct.name}</td>
                {criteria.map((cr, col) => {
                  const k = cellKey(ct.id, cr.id);
                  const bad = cellError(cr.id, draft[k]);
                  return (
                    <td key={cr.id} className="border-b border-r border-[#F4F4F5] p-1.5">
                      <input
                        data-cell={`${row}-${col}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={cr.weight}
                        step="any"
                        disabled={locked || save.isPending}
                        value={draft[k] ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                        onKeyDown={(e) => onKeyDown(e, row, col)}
                        onFocus={(e) => e.target.select()}
                        aria-label={`${ct.name} – ${cr.name}`}
                        aria-invalid={bad}
                        className={`h-12 w-full rounded-lg border-2 px-2 text-center text-[18px] font-semibold tabular-nums outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 disabled:bg-[#FAFAFA] disabled:text-[#52525B] ${
                          bad ? 'border-red-400 bg-red-50 text-red-700' : 'border-[#E4E4E7] bg-white text-[#09090B] hover:border-[#A1A1AA]'
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="border-b border-r border-[#F4F4F5] bg-[#FAFAFA] px-2 py-2 text-center text-[20px] font-bold tabular-nums text-[#09090B]">
                  {formatScore(totals.get(ct.id))}
                </td>
                <td className="border-b border-[#F4F4F5] px-2 py-2 text-center text-[17px] font-semibold tabular-nums text-[#52525B]">
                  <RankBadge place={ranks.get(ct.id)?.place ?? null} tied={ranks.get(ct.id)?.tied} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-end gap-2 border-t border-[#F4F4F5] bg-white/95 px-4 py-3 backdrop-blur">
          {dirty && <span className="mr-auto text-[13px] font-medium text-amber-700">{changes.length} unsaved change{changes.length === 1 ? '' : 's'}</span>}
          {dirty && (
            <Button size="sm" variant="ghost" onClick={() => setVersion((v) => v + 1)} disabled={save.isPending}>
              Discard
            </Button>
          )}
          <Button size="lg" onClick={handleSave} disabled={!dirty || save.isPending}>
            {save.isPending ? 'Saving...' : 'Save Score Sheet'}
          </Button>
        </div>
      )}

      {addJudgeDialog}
    </div>
  );
}

/** "Not started" → "12 of 30 scores" → "Complete", with a thin progress bar. */
function JudgeProgress({ filled, required }: { filled: number; required: number }) {
  const done = required > 0 && filled === required;
  const pct = required ? Math.round((filled / required) * 100) : 0;
  return (
    <span className="mt-1 block">
      <span className={`block text-[11px] font-medium ${done ? 'text-emerald-700' : filled === 0 ? 'text-[#A1A1AA]' : 'text-blue-700'}`}>
        {done ? 'Complete' : filled === 0 ? 'Not started' : `${filled} of ${required} scores`}
      </span>
      <span className="mt-0.5 block h-1 w-28 overflow-hidden rounded-full bg-[#E4E4E7]">
        <span className={`block h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
