import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  InboxIcon,
  XIcon,
  ThumbsUpIcon,
  EyeIcon,
  PencilIcon,
  MoreVerticalIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
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

const STATUS_FILTERS: { key: TabKey; label: string }[] = [
  { key: 'ALL',      label: 'All'                    },
  { key: 'PENDING',  label: 'To Approve'             },
  { key: 'APPROVED', label: 'Approved by Budget/GAD' },
  { key: 'RETURNED', label: 'Returned with comments' },
];

// ─── Small UI bits ────────────────────────────────────────────────────────

function Avatar({ name, color }: { name: string; color?: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold text-white"
      style={{ backgroundColor: color || '#71717A' }}
    >
      {initial}
    </span>
  );
}

function StatusPill({ status }: { status: SubmissionStatus }) {
  const map = {
    PENDING:  { label: 'To Approve', cls: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'Approved',   cls: 'bg-emerald-100 text-emerald-800' },
    RETURNED: { label: 'Returned',   cls: 'bg-orange-100 text-orange-800' },
  }[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${map.cls}`}>
      {map.label}
    </span>
  );
}

// ─── Encoding Status panel (which departments haven't submitted) ───────────

function EncodingPanel({ data }: { data?: DepartmentStatusResponse }) {
  const summary = data?.summary ?? { total: 0, submitted: 0, encoding: 0 };
  const departments = data?.departments ?? [];
  // Encoding (not yet submitted) first, then alphabetical.
  const ordered = [...departments].sort((a, b) =>
    a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'encoding' ? -1 : 1,
  );
  const pct = summary.total > 0 ? Math.round((summary.submitted / summary.total) * 100) : 0;

  return (
    <div className="p-4">
      {/* Summary */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-[13px] font-semibold text-[#09090B]">
          {summary.encoding} of {summary.total} departments still encoding
          {data && <span className="ml-1 font-normal text-[#A1A1AA]">· CY {data.year}</span>}
        </span>
        <div className="flex min-w-[180px] flex-1 items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F4F4F5]">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#09090B]">{pct}% submitted</span>
        </div>
      </div>

      {/* Department grid (encoding ones surfaced first) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.length === 0 ? (
          <p className="col-span-full py-10 text-center text-[12px] text-[#A1A1AA]">No active departments.</p>
        ) : (
          ordered.map((d) => (
            <div
              key={d.id}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                d.status === 'encoding' ? 'border-orange-200 bg-orange-50/50' : 'border-emerald-200 bg-emerald-50/40'
              }`}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-[#09090B]">{d.name}</p>
                <p className="text-[11px] text-[#71717A]">{d.code}</p>
              </div>
              {d.status === 'encoding' ? (
                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                  Encoding
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {d.submissionCount} submitted
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function SubmissionsReviewPage() {
  const [activeStatus, setActiveStatus] = useState<ViewTab>('PENDING');
  const [page, setPage]                 = useState(1);
  const [reviewing, setReviewing]       = useState<FormSubmission | null>(null);
  const [remarks, setRemarks]           = useState('');
  const [remarksError, setRemarksError] = useState(false);
  const [downloading, setDownloading]   = useState<string | null>(null);
  const [actingId, setActingId]         = useState<string | null>(null);
  const navigate = useNavigate();

  // Department filter is driven by the app sidebar via the ?dept= URL param.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDept = searchParams.get('dept') ?? 'ALL';

  const { data, isLoading } = useGetSubmissions({
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

  const statusCount: Record<TabKey, number> = {
    ALL:      counts.all,
    PENDING:  counts.pending,
    APPROVED: counts.approved,
    RETURNED: counts.returned,
  };

  // Reset to page 1 whenever the status tab or the (sidebar) department changes.
  useEffect(() => { setPage(1); }, [activeStatus, activeDept]);

  function pickStatus(key: ViewTab) { setActiveStatus(key); }
  function clearDept() { setSearchParams({}); }

  function openReturn(s: FormSubmission) {
    setReviewing(s);
    setRemarks('');
    setRemarksError(false);
  }

  async function quickApprove(s: FormSubmission) {
    setActingId(s.id);
    try {
      await reviewMutation.mutateAsync({ id: s.id, status: 'APPROVED' });
      toast.success(`"${s.title}" approved.`);
    } catch {
      toast.error('Failed to approve.');
    } finally {
      setActingId(null);
    }
  }

  async function confirmReturn() {
    if (!reviewing) return;
    if (!remarks.trim()) { setRemarksError(true); return; }
    try {
      await reviewMutation.mutateAsync({ id: reviewing.id, status: 'RETURNED', remarks: remarks.trim() });
      toast.success('Submission returned with comments.');
      setReviewing(null);
    } catch {
      toast.error('Failed to return submission.');
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

  return (
    <DashboardLayout title="Form Submissions" breadcrumb="Admin / Form Submissions">
      <p className="mb-4 text-[13px] text-[#71717A]">
        Review and act on GAD form submissions from all departments.
      </p>

      {/* Table card */}
      <div className="overflow-hidden rounded-[10px] border border-[#EBEBEB] bg-white">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[#EBEBEB] px-3 pt-2">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => pickStatus(key)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                activeStatus === key
                  ? 'border-[#18181B] text-[#09090B]'
                  : 'border-transparent text-[#71717A] hover:text-[#09090B]'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                activeStatus === key ? 'bg-[#18181B] text-white' : 'bg-[#F4F4F5] text-[#71717A]'
              }`}>
                {statusCount[key]}
              </span>
            </button>
          ))}

          {/* Encoding-status tab */}
          <button
            onClick={() => pickStatus('ENCODING')}
            className={`-mb-px ml-auto flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              activeStatus === 'ENCODING'
                ? 'border-orange-500 text-[#09090B]'
                : 'border-transparent text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            Still Encoding
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
              activeStatus === 'ENCODING' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'
            }`}>
              {encodingCount}
            </span>
          </button>
        </div>

        {activeStatus === 'ENCODING' ? (
          <EncodingPanel data={deptStatus} />
        ) : (
        <>
        {/* Active department summary */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EBEBEB] px-4 py-2.5 text-[12px] text-[#71717A]">
          {activeDeptName ? (
            <>
              <span className="text-[#A1A1AA]">Department:</span>
              <span className="font-medium text-[#09090B]">{activeDeptName}</span>
              <button
                onClick={clearDept}
                className="ml-0.5 rounded px-1.5 py-0.5 text-[11px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B]"
              >
                Clear
              </button>
            </>
          ) : (
            <span className="text-[#A1A1AA]">All departments</span>
          )}
          <span className="ml-auto tabular-nums text-[#A1A1AA]">{total} total</span>
        </div>

        <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#EBEBEB] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                    <th className="px-4 py-2.5 font-semibold">Encoder</th>
                    <th className="px-4 py-2.5 font-semibold">Submission</th>
                    <th className="px-4 py-2.5 font-semibold">Submitted</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#F4F4F5]">
                        <td className="px-4 py-3" colSpan={5}><Skeleton className="h-7 rounded" /></td>
                      </tr>
                    ))
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <InboxIcon className="mb-3 size-10 text-[#D4D4D8]" />
                          <p className="text-[14px] font-medium text-[#71717A]">No submissions found</p>
                          <p className="mt-1 text-[12px] text-[#A1A1AA]">Try a different status or department filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    submissions.map((s) => (
                      <tr key={s.id} className="border-b border-[#F4F4F5] text-[13px] hover:bg-[#FAFAFA]">
                        {/* Encoder */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.submitter.name} color={s.submitter.department?.color} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[#09090B]">{s.submitter.name}</p>
                              {s.submitter.department && (
                                <p className="truncate text-[11px] text-[#A1A1AA]">{s.submitter.department.code}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Submission (title + form type) */}
                        <td className="px-4 py-3">
                          <p className="max-w-[260px] truncate font-medium text-[#09090B]" title={s.title}>{s.title}</p>
                          <p className="text-[11px] text-[#A1A1AA]">{TEMPLATE_LABELS[s.templateId] ?? s.templateId}</p>
                        </td>
                        {/* Submitted */}
                        <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#71717A]">{fmt(s.submittedAt)}</td>
                        {/* Status */}
                        <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 bg-emerald-600 px-2.5 hover:bg-emerald-700"
                                  disabled={actingId === s.id}
                                  onClick={() => quickApprove(s)}
                                >
                                  <ThumbsUpIcon className="mr-1 size-3.5" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 border-orange-200 px-2.5 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                                  onClick={() => openReturn(s)}
                                >
                                  <XIcon className="mr-1 size-3.5" /> Return
                                </Button>
                              </>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[#71717A]"
                                  disabled={downloading === s.id}
                                  title="More actions"
                                >
                                  <MoreVerticalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => navigate(`/submissions/${s.id}`)}>
                                  <EyeIcon className="mr-2 size-3.5" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(s.id, 'pdf')}>
                                  <FileTextIcon className="mr-2 size-3.5" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(s.id, 'xlsx')}>
                                  <FileSpreadsheetIcon className="mr-2 size-3.5" /> Download Excel
                                </DropdownMenuItem>
                                {s.status === 'RETURNED' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate(`/submissions/${s.id}/edit`)}>
                                      <PencilIcon className="mr-2 size-3.5" /> Edit
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

        <div className="px-4 pb-4">
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

      {/* ── Return Dialog (comment required) ── */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Submission</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="rounded-[8px] border border-[#EBEBEB] bg-[#FAFAFA] p-3 text-[13px]">
                <p className="font-semibold text-[#09090B]">{reviewing.title}</p>
                <p className="text-[#71717A]">
                  {TEMPLATE_LABELS[reviewing.templateId] ?? reviewing.templateId}
                  {' • '}
                  <span className="font-medium text-[#09090B]">{reviewing.submitter.name}</span>
                </p>
                {reviewing.submitter.department && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[#71717A]">
                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: reviewing.submitter.department.color }} />
                    {reviewing.submitter.department.name}
                    <span className="text-[#A1A1AA]">({reviewing.submitter.department.code})</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">
                  Comments
                  <span className="ml-1 text-[11px] font-normal text-[#A1A1AA]">(required — tell the encoder what to fix)</span>
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Explain what needs to be corrected before resubmitting…"
                  value={remarks}
                  onChange={(e) => { setRemarks(e.target.value); if (remarksError) setRemarksError(false); }}
                  className={`resize-none text-[13px] ${remarksError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {remarksError && <p className="text-[12px] text-red-600">Comments are required when returning a submission.</p>}
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
              <XIcon className="mr-1.5 size-4" />
              {reviewMutation.isPending ? 'Returning…' : 'Return with Comments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
