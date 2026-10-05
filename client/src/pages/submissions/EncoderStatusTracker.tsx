import { useNavigate } from 'react-router-dom';
import { CheckIcon, ChevronRightIcon, FlagIcon, InboxIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useGetSubmissions, type FormSubmission } from '@/hooks/useSubmissions';
import { StatusBadge, TEMPLATE_LABELS, fmt } from './shared';

// ─── Status model ────────────────────────────────────────────────────────────

type Stage = 'draft' | 'review' | 'correction' | 'approved';

/** Open correction flags; an approved form has nothing left to fix. */
const flagsOf = (s: FormSubmission) => (s.status === 'APPROVED' ? 0 : s.openFlags ?? 0);

function stageOf(s: FormSubmission): Stage {
  if (s.status === 'DRAFT') return 'draft';
  if (s.status === 'APPROVED') return 'approved';
  if (s.status === 'RETURNED' || flagsOf(s) > 0) return 'correction';
  return 'review';
}

/** Which submission the tracker features: whatever needs the encoder first, then the newest. */
const PRIORITY: Record<Stage, number> = { correction: 0, review: 1, draft: 2, approved: 3 };

function pickFeatured(list: FormSubmission[]): FormSubmission | undefined {
  return [...list].sort((a, b) =>
    PRIORITY[stageOf(a)] - PRIORITY[stageOf(b)] ||
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

const STAGE_COPY: Record<Stage, string> = {
  draft:      'You have a form saved as a draft. Finish it and submit it for review.',
  review:     'Your submission is being reviewed. We’ll notify you once there’s a decision.',
  correction: 'The reviewer asked for corrections. Fix the parts marked red and save.',
  approved:   'Your latest submission was approved. You can download the official Excel file.',
};

const BAR: Record<Stage, { width: string; color: string }> = {
  draft:      { width: '25%',  color: 'bg-zinc-400' },
  review:     { width: '66%',  color: 'bg-amber-400' },
  correction: { width: '66%',  color: 'bg-red-500' },
  approved:   { width: '100%', color: 'bg-emerald-500' },
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

interface Step { label: string; sub?: string; state: 'done' | 'current' | 'todo' | 'alert' }

function stepsFor(s: FormSubmission): Step[] {
  const stage = stageOf(s);
  const flags = flagsOf(s);
  const submitted = stage !== 'draft';
  return [
    { label: 'Filled out', state: submitted ? 'done' : 'current', sub: submitted ? undefined : 'Draft saved' },
    { label: 'Submitted', state: submitted ? 'done' : 'todo', sub: submitted ? fmt(s.submittedAt) : undefined },
    stage === 'correction'
      ? { label: 'For correction', state: 'alert',
          sub: flags > 0 ? `${flags} ${flags === 1 ? 'part' : 'parts'} flagged` : 'Returned by reviewer' }
      : { label: 'Under review', state: stage === 'approved' ? 'done' : stage === 'review' ? 'current' : 'todo',
          sub: stage === 'review' ? 'Ongoing review' : undefined },
    { label: 'Approved', state: stage === 'approved' ? 'done' : 'todo',
      sub: stage === 'approved' && s.reviewedAt ? fmt(s.reviewedAt) : undefined },
  ];
}

function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid grid-cols-4">
      {steps.map((step, i) => {
        const reached = step.state !== 'todo';
        const nextReached = i < steps.length - 1 && steps[i + 1].state !== 'todo';
        return (
          <li key={step.label} className="relative flex flex-col items-center text-center">
            {/* Connector to the next step */}
            {i < steps.length - 1 && (
              <span aria-hidden className={cn(
                'absolute left-1/2 top-4 h-0.5 w-full',
                nextReached ? 'bg-[#18181B]' : 'bg-[#E4E4E7]',
              )} />
            )}
            <span className={cn(
              'relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-[12px] font-semibold',
              step.state === 'done' && 'border-[#18181B] bg-[#18181B] text-white',
              step.state === 'current' && 'border-[#18181B] bg-white text-[#18181B] ring-4 ring-zinc-100',
              step.state === 'alert' && 'border-red-500 bg-red-500 text-white ring-4 ring-red-100',
              step.state === 'todo' && 'border-[#E4E4E7] bg-white text-[#A1A1AA]',
            )}>
              {step.state === 'done' ? <CheckIcon className="size-4" />
                : step.state === 'alert' ? <FlagIcon className="size-3.5" />
                : i + 1}
            </span>
            <span className={cn(
              'mt-2 px-1 text-[12px] font-semibold leading-tight',
              step.state === 'alert' ? 'text-red-700' : reached ? 'text-[#09090B]' : 'text-[#A1A1AA]',
            )}>
              {step.label}
            </span>
            {step.sub && (
              <span className={cn('mt-0.5 hidden px-1 text-[11px] leading-tight sm:block',
                step.state === 'alert' ? 'text-red-600' : 'text-[#71717A]')}>
                {step.sub}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Tracker ─────────────────────────────────────────────────────────────────

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">{label}</p>
      <div className="mt-0.5 truncate text-[13px] font-semibold text-[#09090B]">{children}</div>
    </div>
  );
}

/** Encoder home: where their submissions stand, so they can monitor them at a glance. */
export function EncoderStatusTracker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useGetSubmissions({ limit: 20 });

  const list = data?.submissions ?? [];
  const featured = pickFeatured(list);
  const others = featured ? list.filter((s) => s.id !== featured.id)
    .sort((a, b) => PRIORITY[stageOf(a)] - PRIORITY[stageOf(b)]).slice(0, 3) : [];
  const stage = featured ? stageOf(featured) : null;
  const firstName = (user?.name ?? '').split(' ')[0];

  const open = (s: FormSubmission) =>
    navigate(s.status === 'DRAFT' || stageOf(s) === 'correction' ? `/my-submissions/${s.id}/edit` : `/my-submissions/${s.id}`);

  return (
    <section className="mb-8 space-y-3">
      {/* Greeting */}
      <div className="flex flex-col gap-3 rounded-[12px] bg-[#18181B] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
          <p className="mt-0.5 text-[13px] text-zinc-300">
            {isLoading ? 'Checking your submissions…'
              : stage ? STAGE_COPY[stage]
              : 'No submissions yet. Pick a template below to fill out your first GAD form.'}
          </p>
        </div>
        <Button size="sm" variant="secondary" className="shrink-0 self-start sm:self-auto"
          onClick={() => navigate('/my-submissions')}>
          <InboxIcon className="mr-1.5 size-3.5" /> My Submissions
          {data && data.counts.all > 0 && (
            <span className="ml-1.5 rounded-full bg-[#18181B]/10 px-1.5 text-[11px]">{data.counts.all}</span>
          )}
        </Button>
      </div>

      {isLoading && <Skeleton className="h-56 rounded-[12px]" />}

      {featured && stage && (
        <div className={cn(
          'overflow-hidden rounded-[12px] border bg-white',
          stage === 'correction' ? 'border-red-200' : 'border-[#EBEBEB]',
        )}>
          {/* Summary */}
          <button type="button" onClick={() => open(featured)}
            className="block w-full p-5 text-left transition-colors hover:bg-[#FAFAFA]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded bg-[#F4F4F5] px-2 py-0.5 font-mono text-[11px] font-medium text-[#52525B]">
                {TEMPLATE_LABELS[featured.templateId] ?? featured.templateId}
              </span>
              <StatusBadge status={featured.status} />
              {flagsOf(featured) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                  <FlagIcon className="size-3" /> {flagsOf(featured)} for correction
                </span>
              )}
              <ChevronRightIcon className="ml-auto size-4 text-[#A1A1AA]" />
            </div>
            <p className="mb-4 truncate text-[15px] font-semibold text-[#09090B]">{featured.title}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Meta label="Form">{TEMPLATE_LABELS[featured.templateId] ?? featured.templateId}</Meta>
              <Meta label={featured.status === 'DRAFT' ? 'Started' : 'Submitted'}>{fmt(featured.submittedAt)}</Meta>
              <Meta label="Last updated">{fmt(featured.updatedAt)}</Meta>
              <Meta label="Corrections">
                {flagsOf(featured) > 0
                  ? <span className="text-red-700">{flagsOf(featured)} open</span>
                  : <span className="text-[#71717A]">None</span>}
              </Meta>
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#F4F4F5]">
              <div className={cn('h-full rounded-full transition-all', BAR[stage].color)} style={{ width: BAR[stage].width }} />
            </div>
          </button>

          {/* Stepper */}
          <div className="border-t border-[#F4F4F5] px-3 py-5 sm:px-6">
            <Stepper steps={stepsFor(featured)} />
          </div>

          {stage === 'correction' && (
            <div className="flex flex-col gap-2 border-t border-red-100 bg-red-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-red-800">Only the parts marked red can be changed.</p>
              <Button size="sm" onClick={() => open(featured)}>Fix now</Button>
            </div>
          )}
          {stage === 'draft' && (
            <div className="flex justify-end border-t border-[#F4F4F5] px-5 py-3">
              <Button size="sm" onClick={() => open(featured)}>Continue editing</Button>
            </div>
          )}
        </div>
      )}

      {/* Other submissions */}
      {others.length > 0 && (
        <div className="divide-y divide-[#F4F4F5] overflow-hidden rounded-[12px] border border-[#EBEBEB] bg-white">
          {others.map((s) => (
            <button key={s.id} type="button" onClick={() => open(s)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#FAFAFA]">
              <span className="hidden w-24 shrink-0 font-mono text-[11px] text-[#71717A] sm:block">
                {TEMPLATE_LABELS[s.templateId] ?? s.templateId}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#09090B]">{s.title}</span>
              {flagsOf(s) > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-red-700">
                  <FlagIcon className="size-3" />{flagsOf(s)}
                </span>
              )}
              <StatusBadge status={s.status} />
              <ChevronRightIcon className="size-4 shrink-0 text-[#A1A1AA]" />
            </button>
          ))}
          {data && data.counts.all > others.length + 1 && (
            <button type="button" onClick={() => navigate('/my-submissions')}
              className="w-full px-4 py-2 text-center text-[12px] font-medium text-[#52525B] hover:bg-[#FAFAFA]">
              View all {data.counts.all} submissions
            </button>
          )}
        </div>
      )}
    </section>
  );
}
