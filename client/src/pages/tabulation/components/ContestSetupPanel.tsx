import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  PlusIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  LockIcon,
  ListPlusIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { TANAUAN_BARANGAYS } from '@/lib/location';
import { useSaveContestSetup, type RankingMethod, type TabContest, type ContestSetupPayload } from '@/hooks/useTabulation';
import { apiError, CONTESTANT_LABELS, METHOD_HINT, METHOD_LABEL } from '../tabulationUtils';

// ─── Draft model ──────────────────────────────────────────────────────────

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

interface CriterionRow { key: string; id?: string; name: string; description: string; weight: string }
interface ContestantRow { key: string; id?: string; name: string }
interface JudgeRow { key: string; id?: string; judgeNo: string; name: string; title: string }

interface Draft {
  name: string;
  contestantLabel: string;
  rankingMethod: RankingMethod;
  criteria: CriterionRow[];
  contestants: ContestantRow[];
  judges: JudgeRow[];
}

function fromContest(c: TabContest): Draft {
  return {
    name: c.name,
    contestantLabel: c.contestantLabel,
    rankingMethod: c.rankingMethod,
    criteria: c.criteria.length
      ? c.criteria.map((x) => ({ key: x.id, id: x.id, name: x.name, description: x.description, weight: String(x.weight) }))
      : [{ key: newKey(), name: '', description: '', weight: '' }],
    contestants: c.contestants.map((x) => ({ key: x.id, id: x.id, name: x.name })),
    judges: c.judges.map((x) => ({ key: x.id, id: x.id, judgeNo: String(x.judgeNo), name: x.name, title: x.title })),
  };
}

function toPayload(d: Draft): ContestSetupPayload {
  return {
    name: d.name.trim(),
    contestantLabel: d.contestantLabel.trim(),
    rankingMethod: d.rankingMethod,
    criteria: d.criteria.map((c) => ({ id: c.id, name: c.name.trim(), description: c.description.trim(), weight: Number(c.weight) })),
    contestants: d.contestants.map((c) => ({ id: c.id, name: c.name.trim() })),
    judges: d.judges.map((j) => ({ id: j.id, judgeNo: Number(j.judgeNo), name: j.name.trim(), title: j.title.trim() })),
  };
}

function validate(d: Draft): string | null {
  if (!d.name.trim()) return 'Competition name is required.';
  if (!d.contestantLabel.trim()) return 'Contestant label is required.';
  if (d.criteria.length === 0) return 'Add at least one criterion.';
  for (const c of d.criteria) {
    if (!c.name.trim()) return 'Every criterion needs a name.';
    const w = Number(c.weight);
    if (!c.weight || !Number.isFinite(w) || w <= 0) return `"${c.name}" needs a weight greater than 0.`;
  }
  const total = d.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  if (Math.abs(total - 100) > 0.001) return `Criteria weights add up to ${total}%. They must total exactly 100%.`;
  if (d.contestants.some((c) => !c.name.trim())) return 'Every contestant needs a name.';
  if (d.judges.some((j) => !j.name.trim())) return 'Every judge needs a name.';
  const nos = d.judges.map((j) => Number(j.judgeNo));
  if (nos.some((n) => !Number.isInteger(n) || n < 1)) return 'Judge numbers must be whole numbers starting at 1.';
  if (new Set(nos).size !== nos.length) return 'Two judges cannot share the same judge number.';
  return null;
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ─── Component ────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  contest: TabContest;
  onSaved: () => void;
}

export default function ContestSetupPanel({ eventId, contest, onSaved }: Props) {
  const save = useSaveContestSetup(eventId);
  const locked = contest.status === 'FINALIZED';

  // The draft is seeded once per contest (and after each save) — live polling never clobbers edits.
  const [version, setVersion] = useState(0);
  const syncKey = `${contest.id}:${version}`;
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => fromContest(contest));
  if (draftKey !== syncKey) {
    setDraftKey(syncKey);
    setDraft(fromContest(contest));
  }

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null);

  const totalWeight = draft.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.001;
  const dirty = useMemo(
    () => JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(fromContest(contest))),
    [draft, contest],
  );

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const patchRow = <K extends 'criteria' | 'contestants' | 'judges'>(k: K, i: number, patch: Partial<Draft[K][number]>) =>
    setDraft((d) => ({ ...d, [k]: d[k].map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  const removeRow = (k: 'criteria' | 'contestants' | 'judges', i: number) =>
    setDraft((d) => ({ ...d, [k]: d[k].filter((_, idx) => idx !== i) }));

  function addJudge() {
    const used = new Set(draft.judges.map((j) => Number(j.judgeNo)));
    let n = 1;
    while (used.has(n)) n++;
    set('judges', [...draft.judges, { key: newKey(), judgeNo: String(n), name: '', title: '' }]);
  }

  function addBulk() {
    const names = bulkText.split(/\r?\n/).map((s) => s.replace(/^\s*\d+[.)\-\s]+/, '').trim()).filter(Boolean);
    if (names.length === 0) { setBulkOpen(false); return; }
    set('contestants', [...draft.contestants, ...names.map((name) => ({ key: newKey(), name }))]);
    setBulkText('');
    setBulkOpen(false);
  }

  /** Rows that existed on the server, are gone from the draft, and already have scores. */
  function removalWarning(): string | null {
    const scored = (field: 'criterionId' | 'contestantId' | 'judgeId', ids: string[]) =>
      ids.filter((id) => contest.scores.some((s) => s[field] === id)).length;
    const keep = (rows: { id?: string }[]) => new Set(rows.map((r) => r.id).filter(Boolean));
    const kc = keep(draft.criteria), kn = keep(draft.contestants), kj = keep(draft.judges);
    const parts: string[] = [];
    const c = scored('criterionId', contest.criteria.filter((x) => !kc.has(x.id)).map((x) => x.id));
    const n = scored('contestantId', contest.contestants.filter((x) => !kn.has(x.id)).map((x) => x.id));
    const j = scored('judgeId', contest.judges.filter((x) => !kj.has(x.id)).map((x) => x.id));
    if (c) parts.push(`${c} criteri${c === 1 ? 'on' : 'a'}`);
    if (n) parts.push(`${n} ${contest.contestantLabel.toLowerCase()}${n === 1 ? '' : 's'}`);
    if (j) parts.push(`${j} judge${j === 1 ? '' : 's'}`);
    return parts.length ? `You removed ${parts.join(', ')} that already have scores. Those scores will be deleted.` : null;
  }

  async function handleSave(skipConfirm = false) {
    const err = validate(draft);
    if (err) { toast.error(err); return; }
    if (!skipConfirm) {
      const warn = removalWarning();
      if (warn) { setConfirmRemoval(warn); return; }
    }
    try {
      await save.mutateAsync({ contestId: contest.id, ...toPayload(draft) });
      setVersion((v) => v + 1);
      toast.success('Setup saved');
      setConfirmRemoval(null);
      // First complete setup → jump straight to encoding scores.
      if (contest.status === 'SETUP' && draft.contestants.length > 0 && draft.judges.length > 0) onSaved();
    } catch (e) {
      toast.error(apiError(e, 'Failed to save setup'));
    }
  }

  const disabled = locked || save.isPending;
  const isBarangay = draft.contestantLabel.trim().toLowerCase() === 'barangay';

  return (
    <div className="space-y-6">
      {locked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <LockIcon className="size-3.5" />
          Results are finalized. Reopen scoring in the Results tab to change the setup.
        </div>
      )}

      {/* General */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="cs-name">Competition Name</Label>
          <Input id="cs-name" value={draft.name} disabled={disabled} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cs-label">Contestants are</Label>
          <Input
            id="cs-label"
            list="cs-label-options"
            value={draft.contestantLabel}
            disabled={disabled}
            onChange={(e) => set('contestantLabel', e.target.value)}
          />
          <datalist id="cs-label-options">
            {CONTESTANT_LABELS.map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label>Ranking Method</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['AVERAGE', 'RANK_SUM'] as RankingMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => set('rankingMethod', m)}
                className={`rounded-md border px-2 py-1.5 text-[12px] transition-colors disabled:opacity-60 ${
                  draft.rankingMethod === m ? 'border-[#09090B] bg-[#09090B] text-white' : 'border-[#E4E4E7] text-[#52525B] hover:bg-[#F4F4F5]'
                }`}
              >
                {m === 'AVERAGE' ? 'Average score' : 'Rank-sum'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#A1A1AA]">{METHOD_LABEL[draft.rankingMethod]}. {METHOD_HINT[draft.rankingMethod]}</p>
        </div>
      </section>

      {/* Criteria */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[#09090B]">Criteria</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              weightOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {weightOk ? <CheckCircle2Icon className="size-3" /> : <AlertCircleIcon className="size-3" />}
            {totalWeight}% of 100%
          </span>
          <p className="text-[11px] text-[#A1A1AA]">The weight is also the maximum points a judge can give.</p>
        </div>
        <div className="space-y-2">
          {draft.criteria.map((c, i) => (
            <div key={c.key} className="grid grid-cols-[1fr_90px_auto] gap-2 rounded-lg border border-[#F4F4F5] bg-[#FAFAFA] p-2 md:grid-cols-[1fr_1.4fr_90px_auto]">
              <Input
                placeholder="Criterion, e.g. Delivery and Voice Quality"
                value={c.name}
                disabled={disabled}
                onChange={(e) => patchRow('criteria', i, { name: e.target.value })}
                className="bg-white"
              />
              <Input
                placeholder="What judges look for (optional)"
                value={c.description}
                disabled={disabled}
                onChange={(e) => patchRow('criteria', i, { description: e.target.value })}
                className="order-last col-span-3 bg-white md:order-none md:col-span-1"
              />
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={c.weight}
                  disabled={disabled}
                  onChange={(e) => patchRow('criteria', i, { weight: e.target.value })}
                  className="bg-white pr-6 text-right"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#A1A1AA]">%</span>
              </div>
              <RowActions
                disabled={disabled}
                onUp={() => set('criteria', move(draft.criteria, i, -1))}
                onDown={() => set('criteria', move(draft.criteria, i, 1))}
                onRemove={() => removeRow('criteria', i)}
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={disabled}
          onClick={() => set('criteria', [...draft.criteria, { key: newKey(), name: '', description: '', weight: '' }])}
        >
          <PlusIcon className="mr-1 size-3.5" /> Add criterion
        </Button>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contestants */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-[#09090B]">{draft.contestantLabel || 'Contestant'}s</h3>
            <span className="text-[11px] text-[#A1A1AA]">{draft.contestants.length} · numbered in this order</span>
          </div>
          {draft.contestants.length === 0 && (
            <p className="mb-2 rounded-lg border border-dashed border-[#E4E4E7] px-3 py-4 text-center text-[12px] text-[#A1A1AA]">
              No {(draft.contestantLabel || 'contestant').toLowerCase()}s yet.
            </p>
          )}
          <div className="space-y-1.5">
            {draft.contestants.map((c, i) => (
              <div key={c.key} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-[#A1A1AA]">{i + 1}.</span>
                <Input
                  value={c.name}
                  list={isBarangay ? 'cs-barangays' : undefined}
                  placeholder={`${draft.contestantLabel || 'Contestant'} name`}
                  disabled={disabled}
                  onChange={(e) => patchRow('contestants', i, { name: e.target.value })}
                />
                <RowActions
                  disabled={disabled}
                  onUp={() => set('contestants', move(draft.contestants, i, -1))}
                  onDown={() => set('contestants', move(draft.contestants, i, 1))}
                  onRemove={() => removeRow('contestants', i)}
                />
              </div>
            ))}
          </div>
          {isBarangay && (
            <datalist id="cs-barangays">
              {TANAUAN_BARANGAYS.map((b) => <option key={b} value={b} />)}
            </datalist>
          )}

          {bulkOpen ? (
            <div className="mt-2 space-y-2 rounded-lg border border-[#EBEBEB] p-2">
              <Textarea
                rows={5}
                autoFocus
                placeholder={'Paste names, one per line\nLily Rose\nTanauan Institute'}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={addBulk}>Add names</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => set('contestants', [...draft.contestants, { key: newKey(), name: '' }])}
              >
                <PlusIcon className="mr-1 size-3.5" /> Add
              </Button>
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setBulkOpen(true)}>
                <ListPlusIcon className="mr-1 size-3.5" /> Paste a list
              </Button>
            </div>
          )}
        </section>

        {/* Judges */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-[#09090B]">Judges</h3>
            <span className="text-[11px] text-[#A1A1AA]">Name and title appear on the signature lines</span>
          </div>
          {draft.judges.length === 0 && (
            <p className="mb-2 rounded-lg border border-dashed border-[#E4E4E7] px-3 py-4 text-center text-[12px] text-[#A1A1AA]">
              No judges yet.
            </p>
          )}
          <div className="space-y-1.5">
            {draft.judges.map((j, i) => (
              <div key={j.key} className="grid grid-cols-[64px_1fr_1fr_auto] items-center gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#A1A1AA]">No.</span>
                  <Input
                    type="number"
                    min={1}
                    value={j.judgeNo}
                    disabled={disabled}
                    onChange={(e) => patchRow('judges', i, { judgeNo: e.target.value })}
                    className="pl-8 text-right"
                    aria-label="Judge number"
                  />
                </div>
                <Input
                  placeholder="Full name"
                  value={j.name}
                  disabled={disabled}
                  onChange={(e) => patchRow('judges', i, { name: e.target.value })}
                />
                <Input
                  placeholder="Title / office, e.g. DILG"
                  value={j.title}
                  disabled={disabled}
                  onChange={(e) => patchRow('judges', i, { title: e.target.value })}
                />
                <Button variant="ghost" size="icon-xs" disabled={disabled} onClick={() => removeRow('judges', i)} title="Remove judge">
                  <Trash2Icon className="size-3.5 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" className="mt-2" disabled={disabled} onClick={addJudge}>
            <PlusIcon className="mr-1 size-3.5" /> Add judge
          </Button>
        </section>
      </div>

      {!locked && (
        <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-end gap-2 border-t border-[#F4F4F5] bg-white/95 px-4 py-3 backdrop-blur">
          {dirty && <span className="mr-auto text-[12px] text-amber-700">Unsaved changes</span>}
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => setVersion((v) => v + 1)} disabled={save.isPending}>
              Discard
            </Button>
          )}
          <Button size="sm" onClick={() => handleSave()} disabled={save.isPending || !dirty}>
            {save.isPending ? 'Saving...' : 'Save Setup'}
          </Button>
        </div>
      )}

      <AlertDialog open={!!confirmRemoval} onOpenChange={(o) => !o && setConfirmRemoval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete existing scores?</AlertDialogTitle>
            <AlertDialogDescription>{confirmRemoval}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSave(true)}
              disabled={save.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Save and delete scores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({ disabled, onUp, onDown, onRemove }: {
  disabled: boolean; onUp: () => void; onDown: () => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center">
      <Button variant="ghost" size="icon-xs" disabled={disabled} onClick={onUp} title="Move up"><ArrowUpIcon className="size-3.5" /></Button>
      <Button variant="ghost" size="icon-xs" disabled={disabled} onClick={onDown} title="Move down"><ArrowDownIcon className="size-3.5" /></Button>
      <Button variant="ghost" size="icon-xs" disabled={disabled} onClick={onRemove} title="Remove"><Trash2Icon className="size-3.5 text-red-500" /></Button>
    </div>
  );
}
