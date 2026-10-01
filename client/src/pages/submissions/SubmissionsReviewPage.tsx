import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  InboxIcon,
  EyeIcon,
  PencilIcon,
  MoreHorizontalIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ClockIcon,
  CheckCircle2Icon,
  CornerUpLeftIcon,
  LayersIcon,
  Building2Icon,
  XIcon,
  CheckIcon,
  BellIcon,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  useGetSubmissions,
  useReviewSubmission,
  useDepartmentStatus,
  generateFromSubmission,
  apiErrorMessage,
  type FormSubmission,
  type SubmissionStatus,
  type DepartmentStatusResponse,
} from '@/hooks/useSubmissions';
import { useGetDepartments } from '@/hooks/useDepartments';
import { TEMPLATE_LABELS, fmt, Pagination } from './shared';

// ─── Constants ────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

type TabKey = 'ALL' | SubmissionStatus;
type ViewTab = TabKey | 'ENCODING';

/** Pending this long (days) gets flagged as overdue in the list. */
const OVERDUE_DAYS = 3;

/** One-tap starters for the return comment; the reviewer can still edit. */
const RETURN_REASONS = [
  'Please complete the missing fields.',
  'Budget figures do not add up — please recheck the totals.',
  'Attach the required supporting documents.',
  'Please correct the GAD activity descriptions.',
];

const STATUS_META: Record<SubmissionStatus, { label: string; icon: LucideIcon; cls: string }> = {
  DRAFT:    { label: 'Draft',      icon: PencilIcon,       cls: 'bg-zinc-100 text-zinc-700 ring-zinc-200' },
  PENDING:  { label: 'To review',  icon: ClockIcon,        cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  APPROVED: { label: 'Approved',   icon: CheckCircle2Icon, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RETURNED: { label: 'Returned',   icon: CornerUpLeftIcon, cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** "just now", "5 min ago", "3 hr ago", "2 days ago", then the plain date. */
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-PH', { dateStyle: 'medium' });
}

// ─── Small UI bits ────────────────────────────────────────────────────────

function Avatar({ name, color }: { name: string; color?: string }) {
  const initials = name?.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color || '#71717A' }}
    >
      {initials}
    </span>
  );
}

function StatusPill({ status }: { status: SubmissionStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.cls}`}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

/** Clickable summary card that doubles as the list filter. */
function StatCard({
  label, hint, count, icon: Icon, active, tone, onClick,
}: {
  label: string;
  hint: string;
  count: number;
  icon: LucideIcon;
  active: boolean;
  tone: 'amber' | 'emerald' | 'orange' | 'zinc' | 'sky';
  onClick: () => void;
}) {
  const tones = {
    amber:   { icon: 'bg-amber-100 text-amber-700',     ring: 'ring-amber-400' },
    emerald: { icon: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-400' },
    orange:  { icon: 'bg-orange-100 text-orange-700',   ring: 'ring-orange-400' },
    zinc:    { icon: 'bg-zinc-100 text-zinc-700',       ring: 'ring-zinc-400' },
    sky:     { icon: 'bg-sky-100 text-sky-700',         ring: 'ring-sky-400' },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:border-[#D4D4D8] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
        active ? `border-transparent ring-2 ${tones.ring} shadow-sm` : 'border-[#E2E4E9]'
      }`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tones.icon}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[22px] font-semibold leading-none tabular-nums text-[#09090B]">{count}</span>
        <span className="mt-1 block truncate text-[12px] font-medium text-[#09090B]">{label}</span>
        <span className="block truncate text-[11px] text-[#A1A1AA]">{hint}</span>
      </span>
    </button>
  );
}

// ─── Encoding Status panel (which departments haven't submitted) ───────────

function EncodingPanel({ data }: { data?: DepartmentStatusResponse }) {
  const summary = data?.summary ?? { total: 0, submitted: 0, encoding: 0 };
  const departments = data?.departments ?? [];
  const encoding  = departments.filter((d) => d.status === 'encoding').sort((a, b) => a.name.localeCompare(b.name));
  const submitted = departments.filter((d) => d.status !== 'encoding').sort((a, b) => a.name.localeCompare(b.name));
  const pct = summary.total > 0 ? Math.round((summary.submitted / summary.total) * 100) : 0;

  return (
    <div className="space-y-6 p-5">
      {/* Progress */}
      <div>
        <div className="mb-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-[#09090B]">
              {summary.submitted} of {summary.total} departments have submitted
            </p>
            <p className="text-[12px] text-[#71717A]">
              {summary.encoding === 0
                ? 'Everyone is in. 🎉'
                : `${summary.encoding} still encoding${data ? ` for CY ${data.year}` : ''}.`}
            </p>
          </div>
          <span className="text-[20px] font-semibold tabular-nums text-[#09090B]">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F4F4F5]">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {departments.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[#A1A1AA]">No active departments.</p>
      ) : (
        <>
          <DeptGroup title="Not yet submitted" tone="orange" items={encoding} />
          <DeptGroup title="Submitted" tone="emerald" items={submitted} />
        </>
      )}
    </div>
  );
}

function DeptGroup({
  title, tone, items,
}: {
  title: string;
  tone: 'orange' | 'emerald';
  items: DepartmentStatusResponse['departments'];
}) {
  if (items.length === 0) return null;
  const badge = tone === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700';
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#71717A]">
        {title}
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] normal-case tracking-normal ${badge}`}>{items.length}</span>
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d) => (
          <div key={d.id} className="flex items-center gap-2.5 rounded-lg border border-[#E2E4E9] bg-white px-3 py-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#09090B]" title={d.name}>{d.name}</p>
              <p className="text-[11px] text-[#A1A1AA]">{d.code}</p>
            </div>
            {d.status === 'encoding' ? (
              <span className="shrink-0 text-[11px] font-medium text-orange-700">Encoding</span>
            ) : (
              <span className="shrink-0 text-[11px] font-medium text-emerald-700">
                {d.submissionCount} submitted
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function SubmissionsReviewPage() {
  const [activeStatus, setActiveStatus] = useState<ViewTab>('PENDING');
  const [page, setPage]                 = useState(1);
  const [reviewing, setReviewing]       = useState<FormSubmission | null>(null);
  const [approving, setApproving]       = useState<FormSubmission | null>(null);
  const [remarks, setRemarks]           = useState('');
  const [remarksError, setRemarksError] = useState(false);
  const [downloading, setDownloading]   = useState<string | null>(null);
  const navigate = useNavigate();

  // Department filter is driven by the app sidebar via the ?dept= URL param.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDept = searchParams.get('dept') ?? 'ALL';

  const { data, isLoading, isError, refetch } = useGetSubmissions({
    status: activeStatus === 'ENCODING' ? 'ALL' : activeStatus,
    department: activeDept,
    page,
    limit: PAGE_SIZE,
  });
  const { data: departments } = useGetDepartments();
  const { data: deptStatus } = useDepartmentStatus();
  const reviewMutation = useReviewSubmission();

  const encodingCount = deptStatus?.summary.encoding ?? 0;

  const submissions = data?.submissions ?? [];
  const counts      = data?.counts ?? { all: 0, draft: 0, pending: 0, approved: 0, returned: 0 };
  const total       = data?.total ?? 0;
  const totalPages  = data?.totalPages ?? 1;

  // Reset to page 1 whenever the status filter or the (sidebar) department changes.
  useEffect(() => { setPage(1); }, [activeStatus, activeDept]);

  function clearDept() { setSearchParams({}); }

  function openReturn(s: FormSubmission) {
    setReviewing(s);
    setRemarks('');
    setRemarksError(false);
  }

  function addReason(reason: string) {
    setRemarks((r) => (r.trim() ? `${r.trim()}\n${reason}` : reason));
    setRemarksError(false);
  }

  async function confirmApprove() {
    if (!approving) return;
    try {
      await reviewMutation.mutateAsync({ id: approving.id, status: 'APPROVED', expectedUpdatedAt: approving.updatedAt });
      toast.success(`"${approving.title}" approved. The encoder has been notified.`);
      setApproving(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to approve.'));
      setApproving(null);
    }
  }

  async function confirmReturn() {
    if (!reviewing) return;
    if (!remarks.trim()) { setRemarksError(true); return; }
    try {
      await reviewMutation.mutateAsync({
        id: reviewing.id, status: 'RETURNED', remarks: remarks.trim(), expectedUpdatedAt: reviewing.updatedAt,
      });
      toast.success('Returned with comments. The encoder has been notified.');
      setReviewing(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to return submission.'));
    }
  }

  async function handleDownload(id: string, format: 'xlsx' | 'pdf') {
    setDownloading(id);
    try {
      await generateFromSubmission(id, format);
      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch {
      toast.error(`Failed to download ${format.toUpperCase()}.`);
    } finally {
      setDownloading(null);
    }
  }

  const activeDeptName = activeDept === 'ALL'
    ? null
    : (departments ?? []).find((d) => d.id === activeDept)?.name ?? null;

  const listTitle: Record<TabKey, string> = {
    ALL:      'All submissions',
    DRAFT:    'Drafts',
    PENDING:  'Waiting for your review',
    APPROVED: 'Approved submissions',
    RETURNED: 'Returned to encoders',
  };

  const emptyCopy: Record<TabKey, { title: string; body: string }> = {
    ALL:      { title: 'No submissions yet',  body: 'Submissions from departments will appear here.' },
    DRAFT:    { title: 'No drafts',           body: 'Nothing is in draft.' },
    PENDING:  { title: 'You’re all caught up', body: 'There are no submissions waiting for review.' },
    APPROVED: { title: 'Nothing approved yet', body: 'Approved submissions will show up here.' },
    RETURNED: { title: 'Nothing returned',    body: 'Submissions you return with comments will show up here.' },
  };

  return (
    <DashboardLayout title="Form Submissions" breadcrumb="Admin / Form Submissions">
      <p className="mb-5 text-[13px] text-[#71717A]">
        Review GAD form submissions from all departments. Approve them, or return them with comments for correction.
      </p>

      {/* ── Summary cards (also the filter) ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="To review" hint="Needs your decision" count={counts.pending} icon={ClockIcon} tone="amber"
          active={activeStatus === 'PENDING'} onClick={() => setActiveStatus('PENDING')}
        />
        <StatCard
          label="Returned" hint="Waiting on encoder fixes" count={counts.returned} icon={CornerUpLeftIcon} tone="orange"
          active={activeStatus === 'RETURNED'} onClick={() => setActiveStatus('RETURNED')}
        />
        <StatCard
          label="Approved" hint="By Budget / GAD" count={counts.approved} icon={CheckCircle2Icon} tone="emerald"
          active={activeStatus === 'APPROVED'} onClick={() => setActiveStatus('APPROVED')}
        />
        <StatCard
          label="All submissions" hint="Every status" count={counts.all} icon={LayersIcon} tone="zinc"
          active={activeStatus === 'ALL'} onClick={() => setActiveStatus('ALL')}
        />
        <StatCard
          label="Still encoding" hint="Departments not submitted" count={encodingCount} icon={Building2Icon} tone="sky"
          active={activeStatus === 'ENCODING'} onClick={() => setActiveStatus('ENCODING')}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E4E9] bg-white">
        {activeStatus === 'ENCODING' ? (
          <EncodingPanel data={deptStatus} />
        ) : (
          <>
            {/* List header */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E4E9] px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-[#09090B]">{listTitle[activeStatus]}</h2>
              <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#71717A]">
                {total}
              </span>
              <div className="ml-auto">
                {activeDeptName ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] py-1 pl-2.5 pr-1 text-[12px] font-medium text-[#1D4ED8]">
                    <Building2Icon className="size-3.5" />
                    {activeDeptName}
                    <button
                      type="button"
                      onClick={clearDept}
                      aria-label="Clear department filter"
                      className="rounded-full p-0.5 hover:bg-[#DBEAFE]"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="text-[12px] text-[#A1A1AA]">All departments · pick one in the sidebar to filter</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E2E4E9] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                    <th className="px-5 py-2.5 font-semibold">Submission</th>
                    <th className="px-4 py-2.5 font-semibold">Encoder</th>
                    <th className="px-4 py-2.5 font-semibold">Submitted</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#F4F4F5]">
                        <td className="px-5 py-4" colSpan={5}><Skeleton className="h-8 rounded" /></td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <p className="text-[14px] font-medium text-[#09090B]">Couldn’t load submissions</p>
                          <p className="mt-1 text-[12px] text-[#A1A1AA]">Check your connection and try again.</p>
                          <Button size="sm" variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
                        </div>
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#F4F4F5]">
                            {activeStatus === 'PENDING'
                              ? <CheckIcon className="size-6 text-emerald-600" />
                              : <InboxIcon className="size-6 text-[#A1A1AA]" />}
                          </span>
                          <p className="text-[14px] font-medium text-[#09090B]">{emptyCopy[activeStatus].title}</p>
                          <p className="mt-1 text-[12px] text-[#A1A1AA]">
                            {emptyCopy[activeStatus].body}
                            {activeDeptName && ' Try clearing the department filter.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    submissions.map((s) => {
                      const waitDays = daysSince(s.submittedAt);
                      const overdue  = s.status === 'PENDING' && waitDays >= OVERDUE_DAYS;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => navigate(`/submissions/${s.id}`)}
                          className="group cursor-pointer border-b border-[#F4F4F5] text-[13px] transition-colors last:border-b-0 hover:bg-[#F8FAFC]"
                        >
                          {/* Submission (title + form type) */}
                          <td className="px-5 py-3.5">
                            <p className="max-w-[300px] truncate font-medium text-[#09090B] group-hover:text-[#2563EB]" title={s.title}>
                              {s.title}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[#71717A]">{TEMPLATE_LABELS[s.templateId] ?? s.templateId}</p>
                          </td>
                          {/* Encoder */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={s.submitter.name} color={s.submitter.department?.color} />
                              <div className="min-w-0">
                                <p className="max-w-[180px] truncate font-medium text-[#09090B]">{s.submitter.name}</p>
                                {s.submitter.department && (
                                  <p className="max-w-[180px] truncate text-[12px] text-[#71717A]" title={s.submitter.department.name}>
                                    {s.submitter.department.code}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Submitted */}
                          <td className="whitespace-nowrap px-4 py-3.5" title={fmt(s.submittedAt)}>
                            <p className="text-[13px] text-[#09090B]">{timeAgo(s.submittedAt)}</p>
                            {overdue && (
                              <p className="mt-0.5 text-[11px] font-medium text-red-600">Waiting {waitDays} days</p>
                            )}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3.5"><StatusPill status={s.status} /></td>
                          {/* Actions — clicks here must not open the row */}
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {s.status === 'PENDING' ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                                    onClick={() => openReturn(s)}
                                  >
                                    <CornerUpLeftIcon className="mr-1.5 size-3.5" /> Return
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8 bg-emerald-600 px-3 hover:bg-emerald-700"
                                    onClick={() => setApproving(s)}
                                  >
                                    <CheckIcon className="mr-1.5 size-3.5" /> Approve
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3"
                                  onClick={() => navigate(`/submissions/${s.id}`)}
                                >
                                  <EyeIcon className="mr-1.5 size-3.5" /> View
                                </Button>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-[#71717A]"
                                      disabled={downloading === s.id}
                                      aria-label="More actions"
                                      title="More actions"
                                    />
                                  }
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => navigate(`/submissions/${s.id}`)}>
                                    <EyeIcon className="mr-2 size-3.5" /> Open full form
                                  </DropdownMenuItem>
                                  {s.status === 'RETURNED' && (
                                    <DropdownMenuItem onClick={() => navigate(`/submissions/${s.id}/edit`)}>
                                      <PencilIcon className="mr-2 size-3.5" /> Edit
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDownload(s.id, 'pdf')}>
                                    <FileTextIcon className="mr-2 size-3.5" /> Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownload(s.id, 'xlsx')}>
                                    <FileSpreadsheetIcon className="mr-2 size-3.5" /> Download Excel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={PAGE_SIZE}
                onPage={setPage}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Approve confirmation ── */}
      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve this submission?</DialogTitle>
            <DialogDescription>
              {approving && (
                <>
                  <span className="font-medium text-[#09090B]">{approving.title}</span> from{' '}
                  <span className="font-medium text-[#09090B]">{approving.submitter.name}</span> will be marked approved.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2 text-[12px] text-[#71717A]">
            <BellIcon className="size-3.5 shrink-0" /> The encoder gets a notification right away.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={reviewMutation.isPending} onClick={() => setApproving(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={reviewMutation.isPending}
              onClick={confirmApprove}
            >
              <CheckIcon className="mr-1.5 size-4" />
              {reviewMutation.isPending ? 'Approving…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return dialog (comment required) ── */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Return for correction</DialogTitle>
            <DialogDescription>Tell the encoder what to fix. They’ll be notified and can resubmit.</DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-[#E2E4E9] bg-[#FAFAFA] p-3">
                <Avatar name={reviewing.submitter.name} color={reviewing.submitter.department?.color} />
                <div className="min-w-0 text-[13px]">
                  <p className="truncate font-semibold text-[#09090B]">{reviewing.title}</p>
                  <p className="truncate text-[12px] text-[#71717A]">
                    {TEMPLATE_LABELS[reviewing.templateId] ?? reviewing.templateId} · {reviewing.submitter.name}
                    {reviewing.submitter.department && ` · ${reviewing.submitter.department.code}`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-remarks" className="text-[13px]">
                  What needs to be fixed? <span className="text-red-600">*</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {RETURN_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => addReason(r)}
                      className="rounded-full border border-[#E2E4E9] bg-white px-2.5 py-1 text-[11px] text-[#3F3F46] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                    >
                      + {r}
                    </button>
                  ))}
                </div>
                <Textarea
                  id="return-remarks"
                  rows={4}
                  autoFocus
                  placeholder="e.g. Row 3 under Client-Focused activities is missing the budget source."
                  value={remarks}
                  onChange={(e) => { setRemarks(e.target.value); if (remarksError) setRemarksError(false); }}
                  aria-invalid={remarksError}
                  className={`resize-none text-[13px] ${remarksError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {remarksError && <p className="text-[12px] text-red-600">Please add a comment so the encoder knows what to fix.</p>}
                <p className="text-[11px] text-[#A1A1AA]">
                  Need to flag a specific section or row? Open the full form and comment there.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={reviewMutation.isPending} onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={reviewMutation.isPending}
              onClick={confirmReturn}
            >
              <CornerUpLeftIcon className="mr-1.5 size-4" />
              {reviewMutation.isPending ? 'Returning…' : 'Return to encoder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
