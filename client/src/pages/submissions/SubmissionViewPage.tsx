import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  MessageSquareIcon,
  PaperclipIcon,
  SendIcon,
  PencilIcon,
  PrinterIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useGetSubmission, generateFromSubmission, useAddComment, type SubmissionComment } from '@/hooks/useSubmissions';
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

// ─── Template label map ───────────────────────────────────────────────────────

const TEMPLATE_LABELS: Record<string, string> = {
  BARANGAY_GPB: 'Barangay Annual GAD Plan and Budget',
  BARANGAY_AR:  'Barangay Annual GAD Accomplishment Report',
  CITY_GPB:     'City/Municipality Annual GAD Plan and Budget (Annex D)',
  CITY_AR:      'City/Municipality GAD Accomplishment Report (Annex E)',
};

// ─── Comments & Attachments thread ─────────────────────────────────────────

function CommentsThread({ submissionId, comments }: { submissionId: string; comments: SubmissionComment[] }) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const addComment = useAddComment();

  async function submit() {
    if (!body.trim() && !file) { toast.error('Write a comment or attach a file.'); return; }
    try {
      await addComment.mutateAsync({ id: submissionId, body: body.trim(), file });
      setBody(''); setFile(null);
      toast.success('Comment added.');
    } catch {
      toast.error('Failed to add comment.');
    }
  }

  return (
    <div className="mb-5 rounded-[10px] border border-[#EBEBEB] bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquareIcon className="size-4 text-[#71717A]" />
        <h3 className="text-[13px] font-semibold text-[#09090B]">Comments &amp; Attachments</h3>
        <span className="rounded-full bg-[#F4F4F5] px-1.5 py-0.5 text-[11px] text-[#71717A]">{comments.length}</span>
      </div>

      {comments.length === 0 ? (
        <p className="mb-4 text-[12px] text-[#A1A1AA]">No comments yet.</p>
      ) : (
        <div className="mb-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
              <div className="mb-1 flex items-center gap-2 text-[12px]">
                <span className="font-semibold text-[#09090B]">{c.author.name}</span>
                <Badge variant="outline" className="text-[10px]">{c.author.role === 'ADMIN' ? 'Admin' : 'Encoder'}</Badge>
                <span className="text-[#A1A1AA]">{fmt(c.createdAt)}</span>
              </div>
              {c.body && <p className="whitespace-pre-wrap text-[13px] text-[#3F3F46]">{c.body}</p>}
              {c.attachmentUrl && (
                <a href={c.attachmentUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#E4E4E7] bg-white px-2.5 py-1.5 text-[12px] text-[#18181B] hover:bg-[#F4F4F5]">
                  <PaperclipIcon className="size-3.5" />
                  {c.attachmentName ?? 'Attachment'}
                  <DownloadIcon className="size-3.5 text-[#71717A]" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="space-y-2 border-t border-[#EBEBEB] pt-3">
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment…" className="resize-none text-[13px]" />
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#71717A] hover:text-[#18181B]">
            <PaperclipIcon className="size-3.5" />
            <span className="max-w-[200px] truncate">{file ? file.name : 'Attach file'}</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button size="sm" disabled={addComment.isPending} onClick={submit}>
            <SendIcon className="mr-1.5 size-3.5" />
            {addComment.isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubmissionViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { data: sub, isLoading, isError } = useGetSubmission(id ?? null);

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

        {(user?.role === 'ADMIN' || sub.status === 'APPROVED') && (
          <Button variant="outline" size="sm" disabled={downloadingPdf} onClick={handleDownloadPdf}>
            <PrinterIcon className="mr-1.5 size-4" />
            {downloadingPdf ? 'Downloading…' : 'Download PDF'}
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

        {/* Form data view — dispatch to the correct viewer */}
        {sub.templateId === 'BARANGAY_AR'  && <BrgyARView  d={formData as unknown as BrgyARFormData}  />}
        {sub.templateId === 'BARANGAY_GPB' && <BrgyGPBView d={formData as unknown as BrgyGPBFormData} />}
        {sub.templateId === 'CITY_GPB'     && <CityGPBView d={formData as unknown as CityGPBFormData} />}
        {sub.templateId === 'CITY_AR'      && <CityARView  d={formData as unknown as CityARFormData}  />}
      </div>

      {/* Comments & attachments (not part of the PDF) */}
      <div className="no-print mt-5">
        <CommentsThread submissionId={sub.id} comments={sub.comments ?? []} />
      </div>
    </DashboardLayout>
  );
}
