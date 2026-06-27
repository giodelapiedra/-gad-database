import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  FileSpreadsheetIcon,
  FileEditIcon,
  DownloadIcon,
  InboxIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  CornerUpLeftIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  useGetSubmissions,
  useDeleteSubmission,
  generateFromSubmission,
  type FormSubmission,
  type SubmissionStatus,
} from '@/hooks/useSubmissions';
import { TEMPLATE_LABELS, fmt, StatusBadge, Pagination } from './shared';

// ─── Constants ────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

type TabKey = 'ALL' | SubmissionStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL',      label: 'All'      },
  { key: 'DRAFT',    label: 'Drafts'   },
  { key: 'PENDING',  label: 'Pending'  },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'RETURNED', label: 'Returned' },
];

// ─── Progress Stepper ───────────────────────────────────────────────────────

type StepState = 'complete' | 'active' | 'returned' | 'upcoming';
interface Step { label: string; caption: string; state: StepState }

function buildSteps(s: FormSubmission): Step[] {
  if (s.status === 'DRAFT') {
    return [
      { label: 'Draft', caption: 'In progress', state: 'active' },
      { label: 'Submit', caption: 'Send for review', state: 'upcoming' },
      { label: 'Decision', caption: 'Approve / Return', state: 'upcoming' },
    ];
  }
  const submitted: Step = { label: 'Submitted', caption: fmt(s.submittedAt), state: 'complete' };
  if (s.status === 'APPROVED') {
    return [
      submitted,
      { label: 'Reviewed', caption: 'Budget / GAD', state: 'complete' },
      { label: 'Approved', caption: s.reviewedAt ? fmt(s.reviewedAt) : 'Done', state: 'complete' },
    ];
  }
  if (s.status === 'RETURNED') {
    return [
      submitted,
      { label: 'Reviewed', caption: 'Budget / GAD', state: 'complete' },
      { label: 'Returned', caption: 'Needs correction', state: 'returned' },
    ];
  }
  // PENDING
  return [
    submitted,
    { label: 'Under Review', caption: 'Awaiting admin', state: 'active' },
    { label: 'Decision', caption: 'Approve / Return', state: 'upcoming' },
  ];
}

function StepNode({ state, index }: { state: StepState; index: number }) {
  const base = 'flex size-9 items-center justify-center rounded-full text-[13px] font-bold transition-colors';
  if (state === 'complete')
    return <div className={`${base} bg-emerald-500 text-white`}><CheckIcon className="size-4" /></div>;
  if (state === 'returned')
    return <div className={`${base} bg-orange-500 text-white`}><CornerUpLeftIcon className="size-4" /></div>;
  if (state === 'active')
    return (
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-40" />
        <div className={`${base} relative bg-blue-500 text-white`}>{index}</div>
      </div>
    );
  return <div className={`${base} bg-[#F4F4F5] text-[#A1A1AA] ring-1 ring-inset ring-[#E4E4E7]`}>{index}</div>;
}

function SubmissionStepper({ s }: { s: FormSubmission }) {
  const steps = buildSteps(s);
  return (
    <div className="flex items-start">
      {steps.map((st, i) => {
        const isLast = i === steps.length - 1;
        const nextReached = !isLast && steps[i + 1].state !== 'upcoming';
        const labelColor =
          st.state === 'complete' ? 'text-emerald-700'
          : st.state === 'returned' ? 'text-orange-700'
          : st.state === 'active' ? 'text-blue-700'
          : 'text-[#A1A1AA]';
        return (
          <Fragment key={i}>
            <div className="flex w-[88px] shrink-0 flex-col items-center text-center sm:w-[120px]">
              <StepNode state={st.state} index={i + 1} />
              <p className={`mt-2 text-[12px] font-semibold ${labelColor}`}>{st.label}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-[#A1A1AA]">{st.caption}</p>
            </div>
            {!isLast && (
              <div
                className="mt-[18px] h-[3px] flex-1 rounded-full"
                style={{ background: nextReached ? '#10b981' : '#E4E4E7' }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function MySubmissionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [page, setPage]           = useState(1);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const deleteMutation = useDeleteSubmission();

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const { data, isLoading } = useGetSubmissions({
    status: activeTab,
    page,
    limit: PAGE_SIZE,
  });

  const submissions = data?.submissions ?? [];
  const counts      = data?.counts ?? { all: 0, draft: 0, pending: 0, approved: 0, returned: 0 };
  const total       = data?.total ?? 0;
  const totalPages  = data?.totalPages ?? 1;

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setPage(1); // reset to page 1 whenever the filter changes
  }

  const tabCount: Record<TabKey, number> = {
    ALL:      counts.all,
    DRAFT:    counts.draft,
    PENDING:  counts.pending,
    APPROVED: counts.approved,
    RETURNED: counts.returned,
  };

  async function handleDownload(id: string) {
    setDownloading(id);
    try {
      await generateFromSubmission(id);
      toast.success('Excel downloaded!');
    } catch {
      toast.error('Failed to download Excel.');
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Draft deleted.');
    } catch {
      toast.error('Failed to delete draft.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <DashboardLayout title="My Submissions" breadcrumb="GAD Templates / My Submissions">
      <div className="mb-5">
        <p className="text-[13px] text-[#71717A]">
          Track the approval status of your submitted GAD forms.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total',          count: counts.all,      icon: FileSpreadsheetIcon, color: 'text-[#71717A]',   bg: 'bg-[#F4F4F5]'  },
          { label: 'Drafts',         count: counts.draft,    icon: FileEditIcon,        color: 'text-zinc-500',    bg: 'bg-zinc-100'   },
          { label: 'Pending Review', count: counts.pending,  icon: ClockIcon,           color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Approved',       count: counts.approved, icon: CheckCircle2Icon,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Returned',       count: counts.returned, icon: XCircleIcon,         color: 'text-orange-600',  bg: 'bg-orange-50'  },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-[10px] border border-[#EBEBEB] bg-white p-4">
            <div className={`mb-2 flex size-8 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`size-4 ${color}`} />
            </div>
            <p className="text-[22px] font-bold text-[#09090B]">
              {isLoading ? '—' : count}
            </p>
            <p className="text-[12px] text-[#71717A]">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-[#EBEBEB]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              activeTab === key
                ? 'border-[#18181B] text-[#09090B]'
                : 'border-transparent text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            {label}
            {!isLoading && (
              <span className="ml-1.5 rounded-full bg-[#F4F4F5] px-1.5 py-0.5 text-[11px]">
                {tabCount[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-[10px]" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#EBEBEB] py-16 text-center">
          <InboxIcon className="mb-3 size-10 text-[#D4D4D8]" />
          <p className="text-[14px] font-medium text-[#71717A]">
            {activeTab === 'ALL'
              ? 'No submissions yet'
              : `No ${activeTab.toLowerCase()} submissions`}
          </p>
          {activeTab === 'ALL' && (
            <p className="mt-1 text-[12px] text-[#A1A1AA]">
              Fill out a GAD template and submit it for approval.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => {
            const isOpen = expanded.has(s.id);
            return (
            <div
              key={s.id}
              className="overflow-hidden rounded-[10px] border border-[#EBEBEB] bg-white"
            >
              {/* Header (click to expand) */}
              <div className="flex items-center gap-4 p-4">
                <button
                  onClick={() => toggleExpand(s.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F4F5]">
                    <FileSpreadsheetIcon className="size-4 text-[#71717A]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#09090B]">{s.title}</span>
                    <span className="block text-[12px] text-[#71717A]">
                      {TEMPLATE_LABELS[s.templateId] ?? s.templateId}
                      {' • '}
                      {s.status === 'DRAFT' ? 'Saved' : 'Submitted'} {fmt(s.submittedAt)}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={`size-4 shrink-0 text-[#A1A1AA] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <StatusBadge status={s.status} />
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/my-submissions/${s.id}`)}>
                    <EyeIcon className="mr-1.5 size-3.5" />
                    View
                  </Button>
                  {s.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloading === s.id}
                      onClick={() => handleDownload(s.id)}
                    >
                      <DownloadIcon className="mr-1.5 size-3.5" />
                      {downloading === s.id ? 'Downloading…' : 'Download Excel'}
                    </Button>
                  )}
                  {s.status === 'DRAFT' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-300"
                        onClick={() => navigate(`/my-submissions/${s.id}/edit`)}
                      >
                        <FileEditIcon className="mr-1.5 size-3.5" />
                        Continue Editing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        disabled={deleting === s.id}
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2Icon className="mr-1.5 size-3.5" />
                        {deleting === s.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </>
                  )}
                  {s.status === 'RETURNED' && (
                    <Button
                      size="sm"
                      className="bg-[#18181B] hover:bg-[#18181B]/90"
                      onClick={() => navigate(`/my-submissions/${s.id}/edit`)}
                    >
                      <PencilIcon className="mr-1.5 size-3.5" />
                      Edit & Resubmit
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded progress panel */}
              {isOpen && (
                <div className="border-t border-[#EBEBEB] bg-[#FAFAFA] px-5 py-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                    Submission Progress
                  </p>
                  <SubmissionStepper s={s} />

                  {s.status !== 'PENDING' && s.reviewedAt && (
                    <div className={`mt-5 rounded-md border px-3 py-2 text-[12px] ${
                      s.status === 'APPROVED'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-orange-200 bg-orange-50 text-orange-800'
                    }`}>
                      {s.status === 'APPROVED' ? (
                        <>✓ Approved by <strong>{s.reviewer?.name ?? 'Admin'}</strong> on {fmt(s.reviewedAt)}</>
                      ) : (
                        <>↩ Returned by <strong>{s.reviewer?.name ?? 'Admin'}</strong> on {fmt(s.reviewedAt)}
                          {s.remarks ? <> — <em>"{s.remarks}"</em></> : ''}
                          <span className="mt-1 block text-[11px] text-orange-700/80">
                            Click <strong>Edit &amp; Resubmit</strong> to correct and send it back for review.
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {s.status === 'DRAFT' && (
                    <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-700">
                      This form is saved as a draft. Click <strong>Continue Editing</strong> to finish filling it out and submit for approval.
                    </div>
                  )}
                  {s.status === 'PENDING' && (
                    <p className="mt-5 text-[12px] text-[#71717A]">
                      Your submission is waiting for the admin to review. You'll be notified once there's a decision.
                    </p>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={PAGE_SIZE}
        onPage={setPage}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
