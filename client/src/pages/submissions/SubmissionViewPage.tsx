import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  PencilIcon,
  PrinterIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useState } from 'react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSubmission, generateFromSubmission, useResolveComment, useAddComment, type SubmissionComment } from '@/hooks/useSubmissions';
import type { FlagTarget } from '@/hooks/useReviewFlags';
import { ReviewFlagsProvider, CorrectionChecklist } from '@/components/review/ReviewFlags';
import { useAuth } from '@/hooks/useAuth';
import type {
  BrgyARFormData,
  BrgyGPBFormData,
  CityGPBFormData,
  CityARFormData,
} from '@/hooks/useTemplates';

import { fmt, StatusBadge } from './shared';
import { BrgyARView } from './viewers/BrgyARView';
import { BrgyGPBView } from './viewers/BrgyGPBView';
import { CityGPBView } from './viewers/CityGPBView';
import { CityARView } from './viewers/CityARView';
import { CommentsThread } from './CommentsThread';
import { ReviewActions } from './ReviewActions';

// ─── Template label map ───────────────────────────────────────────────────────

const TEMPLATE_LABELS: Record<string, string> = {
  BARANGAY_GPB: 'Barangay Annual GAD Plan and Budget',
  BARANGAY_AR:  'Barangay Annual GAD Accomplishment Report',
  CITY_GPB:     'City Annual GAD Plan and Budget (Annex D)',
  CITY_AR:      'City GAD Accomplishment Report (Annex E)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubmissionViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { data: sub, isLoading, isError } = useGetSubmission(id ?? null);
  const isAdmin = user?.role === 'ADMIN';
  const resolveComment = useResolveComment();
  const addComment = useAddComment();

  // Reviewers comment straight on a cell; the cell turns red for the encoder.
  const addFlag = useCallback(async (t: FlagTarget, body: string) => {
    try {
      await addComment.mutateAsync({ id: id!, body, section: t.section, rowNumber: t.rowNumber, field: t.field });
      toast.success('Cell flagged for correction.');
    } catch (err) {
      toast.error('Failed to flag the cell.');
      throw err;
    }
  }, [addComment, id]);

  // Reviewers resolve a flag straight from the red note on the form.
  const resolveFlag = useCallback(async (c: SubmissionComment) => {
    try {
      await resolveComment.mutateAsync({ id: id!, commentId: c.id, resolved: true });
      toast.success('Marked as resolved.');
    } catch {
      toast.error('Failed to update the flag.');
    }
  }, [resolveComment, id]);

  async function handleDownload() {
    if (!sub) return;
    setDownloading(true);
    try {
      await generateFromSubmission(sub.id);
      toast.success('Excel downloaded!');
    } catch {
      toast.error('Failed to download Excel.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!sub) return;
    setDownloadingPdf(true);
    try {
      await generateFromSubmission(sub.id, 'pdf');
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  const breadcrumb = `GAD Templates / My Submissions / View`;

  if (isLoading) {
    return (
      <DashboardLayout title="View Submission" breadcrumb={breadcrumb}>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[10px]" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !sub) {
    return (
      <DashboardLayout title="View Submission" breadcrumb={breadcrumb}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileSpreadsheetIcon className="mb-3 size-10 text-[#D4D4D8]" />
          <p className="text-[14px] font-medium text-[#71717A]">Submission not found</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/my-submissions')}>
            Back to My Submissions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const formData = sub.formData as Record<string, unknown>;

  return (
    <DashboardLayout
      title={TEMPLATE_LABELS[sub.templateId] ?? sub.templateId}
      breadcrumb={breadcrumb}
    >
      {/* Top bar */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="mr-1.5 size-4" />Back
        </Button>

        <div className="flex-1 min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#09090B]">{sub.title}</p>
          <p className="text-[12px] text-[#71717A]">
            Submitted {fmt(sub.submittedAt)} by <strong>{sub.submitter?.name ?? 'Encoder'}</strong>
          </p>
        </div>

        <StatusBadge status={sub.status} />

        {isAdmin && sub.status === 'PENDING' && <ReviewActions sub={sub} />}

        {(isAdmin || sub.status === 'APPROVED') && (
          <Button variant="outline" size="sm" disabled={downloadingPdf} onClick={handleDownloadPdf}>
            <PrinterIcon className="mr-1.5 size-4" />
            {downloadingPdf ? 'Downloading…' : 'Download PDF'}
          </Button>
        )}

        {sub.status === 'PENDING' && !isAdmin && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/my-submissions/${sub.id}/edit`)}>
            <PencilIcon className="mr-1.5 size-4" />
            Edit
          </Button>
        )}

        {sub.status === 'RETURNED' && (
          <Button
            size="sm"
            onClick={() =>
              navigate(user?.role === 'ADMIN' ? `/submissions/${sub.id}/edit` : `/my-submissions/${sub.id}/edit`)
            }
          >
            <PencilIcon className="mr-1.5 size-4" />
            {user?.role === 'ADMIN' ? 'Edit' : 'Edit & Resubmit'}
          </Button>
        )}

        {sub.status === 'APPROVED' && (
          <Button size="sm" disabled={downloading} onClick={handleDownload}>
            <DownloadIcon className="mr-1.5 size-4" />
            {downloading ? 'Downloading…' : 'Download Excel'}
          </Button>
        )}
      </div>

      {/* Printable area (this is what becomes the PDF) */}
      <div className="print-root">
        {/* Print-only header */}
        <div className="mb-4 hidden text-center print:block">
          <p className="text-[16px] font-bold text-[#09090B]">{sub.title}</p>
          <p className="text-[12px] text-[#52525B]">
            {TEMPLATE_LABELS[sub.templateId] ?? sub.templateId} · Submitted {fmt(sub.submittedAt)} by {sub.submitter?.name ?? 'Encoder'}
          </p>
        </div>

        {/* Review feedback banner */}
        {sub.status !== 'PENDING' && sub.reviewedAt && (
          <div className={`mb-5 rounded-[10px] border px-4 py-3 text-[13px] ${
            sub.status === 'APPROVED'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-orange-200 bg-orange-50 text-orange-800'
          }`}>
            {sub.status === 'APPROVED' ? (
              <>✓ Approved by <strong>{sub.reviewer?.name ?? 'Admin'}</strong> on {fmt(sub.reviewedAt)}</>
            ) : (
              <>↩ Returned by <strong>{sub.reviewer?.name ?? 'Admin'}</strong> on {fmt(sub.reviewedAt)}
                {sub.remarks ? <> — <em>"{sub.remarks}"</em></> : ''}</>
            )}
          </div>
        )}

        {/* Form data view — dispatch to the correct viewer; flagged parts show in red */}
        <ReviewFlagsProvider comments={sub.comments ?? []} onResolve={isAdmin ? resolveFlag : undefined} onAddFlag={isAdmin ? addFlag : undefined}>
          <CorrectionChecklist />
          {sub.templateId === 'BARANGAY_AR'  && <BrgyARView  d={formData as unknown as BrgyARFormData}  />}
          {sub.templateId === 'BARANGAY_GPB' && <BrgyGPBView d={formData as unknown as BrgyGPBFormData} />}
          {sub.templateId === 'CITY_GPB'     && <CityGPBView d={formData as unknown as CityGPBFormData} />}
          {sub.templateId === 'CITY_AR'      && <CityARView  d={formData as unknown as CityARFormData}  />}
        </ReviewFlagsProvider>
      </div>

      {/* Comments & attachments (not part of the PDF) */}
      <div className="no-print mt-5">
        <CommentsThread submissionId={sub.id} comments={sub.comments ?? []} canFlag={isAdmin} />
      </div>
    </DashboardLayout>
  );
}
