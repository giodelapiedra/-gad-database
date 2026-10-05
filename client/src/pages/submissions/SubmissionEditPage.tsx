import { useParams, useNavigate } from 'react-router-dom';
import { LockIcon, ArrowLeftIcon } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useGetSubmission } from '@/hooks/useSubmissions';
import { useAuth } from '@/hooks/useAuth';
import { ReviewFlagsProvider, CorrectionChecklist } from '@/components/review/ReviewFlags';
import { SubmissionFormEditor } from './SubmissionFormEditor';

export default function SubmissionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sub, isLoading } = useGetSubmission(id ?? null);

  const backPath = user?.role === 'ADMIN' ? '/submissions' : '/my-submissions';
  const isAdmin = user?.role === 'ADMIN';
  const openFlags = (sub?.comments ?? []).filter((c) => c.section && !c.resolvedAt).length;
  // Once submitted, an encoder may change only what the reviewer flagged. A pending
  // form with no flags is locked; a returned form with no flags stays fully editable.
  const locked = !isAdmin && sub?.status === 'PENDING' && openFlags === 0;
  const restrictEdits = !isAdmin && !!sub && sub.status !== 'DRAFT' && openFlags > 0;

  return (
    <DashboardLayout title="Edit Submission" breadcrumb="Submissions / Edit" defaultSidebarOpen={false}>
      {isLoading || !sub ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-[10px]" />
        </div>
      ) : locked ? (
        <div className="mx-auto max-w-lg rounded-[10px] border border-[#EBEBEB] bg-white p-6 text-center">
          <LockIcon className="mx-auto mb-3 size-6 text-[#A1A1AA]" />
          <p className="text-[14px] font-semibold text-[#09090B]">Waiting for review</p>
          <p className="mt-1 text-[13px] text-[#71717A]">
            This submission can be edited once the reviewer flags something for correction.
            You'll be notified when that happens.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(`/my-submissions/${sub.id}`)}>
            <ArrowLeftIcon className="mr-1.5 size-3.5" /> Back to submission
          </Button>
        </div>
      ) : (
        // The reviewer's flags stay visible (in red) while the encoder corrects the form.
        <ReviewFlagsProvider comments={sub.comments ?? []} restrictEdits={restrictEdits}>
          {restrictEdits && (
            <div className="mb-3 flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              <LockIcon className="mt-0.5 size-4 shrink-0" />
              <span>Only the parts marked <strong className="text-red-700">red</strong> can be changed. Everything else is locked until the reviewer flags it.</span>
            </div>
          )}
          <CorrectionChecklist />
          <SubmissionFormEditor
            templateId={sub.templateId}
            initialData={sub.formData}
            editId={sub.id}
            onBack={() => navigate(backPath)}
            isDraftEdit={sub.status === 'DRAFT'}
            isPendingEdit={sub.status === 'PENDING'}
          />
        </ReviewFlagsProvider>
      )}
    </DashboardLayout>
  );
}
