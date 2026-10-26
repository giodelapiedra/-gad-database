import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClockIcon,
  CheckCircle2Icon,
  CornerUpLeftIcon,
  LayersIcon,
  Building2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  useGetSubmissions,
  useReviewSubmission,
  useDepartmentStatus,
  generateFromSubmission,
  apiErrorMessage,
  type FormSubmission,
} from '@/hooks/useSubmissions';
import { useGetDepartments } from '@/hooks/useDepartments';
import { Pagination } from './shared';
import { StatCard } from './review/primitives';
import FilterBar from './review/FilterBar';
import SubmissionsTable from './review/SubmissionsTable';
import EncodingPanel from './review/EncodingPanel';
import ApproveDialog from './review/ApproveDialog';
import ReturnDialog from './review/ReturnDialog';
import {
  PAGE_SIZE,
  LIST_TITLE,
  type ViewTab,
  type TabKey,
  type TemplateFilter,
} from './review/utils';

export default function SubmissionsReviewPage() {
  const [activeStatus, setActiveStatus]   = useState<ViewTab>('PENDING');
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('ALL');
  const [page, setPage]                   = useState(1);
  const [reviewing, setReviewing]         = useState<FormSubmission | null>(null);
  const [approving, setApproving]         = useState<FormSubmission | null>(null);
  const [downloading, setDownloading]     = useState<string | null>(null);
  const navigate = useNavigate();

  // Department filter lives in the URL (?dept=) so the sidebar shortcut and the
  // in-page dropdown stay in sync and the filter survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDept = searchParams.get('dept') ?? 'ALL';

  const { data, isLoading, isError, refetch } = useGetSubmissions({
    status: activeStatus === 'ENCODING' ? 'ALL' : activeStatus,
    department: activeDept,
    templateId: templateFilter === 'ALL' ? undefined : templateFilter,
    page,
    limit: PAGE_SIZE,
  });
  const { data: departments } = useGetDepartments();
  const { data: deptStatus }  = useDepartmentStatus();
  const reviewMutation = useReviewSubmission();

  const encodingCount = deptStatus?.summary.encoding ?? 0;
  const submissions   = data?.submissions ?? [];
  const counts        = data?.counts ?? { all: 0, draft: 0, pending: 0, approved: 0, returned: 0 };
  const total         = data?.total ?? 0;
  const totalPages    = data?.totalPages ?? 1;

  // Reset to page 1 whenever any filter changes.
  useEffect(() => { setPage(1); }, [activeStatus, activeDept, templateFilter]);

  function changeDept(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'ALL') next.delete('dept');
    else next.set('dept', value);
    setSearchParams(next);
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

  async function confirmReturn(remarks: string) {
    if (!reviewing) return;
    try {
      await reviewMutation.mutateAsync({
        id: reviewing.id, status: 'RETURNED', remarks, expectedUpdatedAt: reviewing.updatedAt,
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

  const listTab = activeStatus as TabKey; // never 'ENCODING' in this branch
  const hasFilter = activeDept !== 'ALL' || templateFilter !== 'ALL';

  return (
    <DashboardLayout title="Form Submissions" breadcrumb="Admin / Form Submissions">
      <p className="mb-5 text-[13px] text-[#71717A]">
        Review GAD form submissions from all departments. Approve them, or return them with comments for correction.
      </p>

      {/* ── Summary cards (also the status filter) ── */}
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
            {/* List header: title + count on the left, filters on the right */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-[#E2E4E9] px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-[#09090B]">{LIST_TITLE[listTab]}</h2>
              <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#71717A]">
                {total}
              </span>
              <div className="ml-auto">
                <FilterBar
                  departments={departments ?? []}
                  activeDept={activeDept}
                  onDeptChange={changeDept}
                  templateFilter={templateFilter}
                  onTemplateChange={setTemplateFilter}
                />
              </div>
            </div>

            <SubmissionsTable
              submissions={submissions}
              isLoading={isLoading}
              isError={isError}
              status={listTab}
              hasDeptFilter={hasFilter}
              downloadingId={downloading}
              onRetry={refetch}
              onRowOpen={(id) => navigate(`/submissions/${id}`)}
              onEdit={(id) => navigate(`/submissions/${id}/edit`)}
              onApprove={setApproving}
              onReturn={setReviewing}
              onDownload={handleDownload}
            />

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

      <ApproveDialog
        submission={approving}
        isPending={reviewMutation.isPending}
        onConfirm={confirmApprove}
        onClose={() => setApproving(null)}
      />
      <ReturnDialog
        submission={reviewing}
        isPending={reviewMutation.isPending}
        onConfirm={confirmReturn}
        onClose={() => setReviewing(null)}
      />
    </DashboardLayout>
  );
}
