import { useParams, useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSubmission } from '@/hooks/useSubmissions';
import { useAuth } from '@/hooks/useAuth';
import { SubmissionFormEditor } from './SubmissionFormEditor';

export default function SubmissionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sub, isLoading } = useGetSubmission(id ?? null);

  const backPath = user?.role === 'ADMIN' ? '/submissions' : '/my-submissions';

  return (
    <DashboardLayout title="Edit Submission" breadcrumb="Submissions / Edit" defaultSidebarOpen={false}>
      {isLoading || !sub ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-[10px]" />
        </div>
      ) : (
        <SubmissionFormEditor
          templateId={sub.templateId}
          initialData={sub.formData}
          editId={sub.id}
          onBack={() => navigate(backPath)}
          isDraftEdit={sub.status === 'DRAFT'}
        />
      )}
    </DashboardLayout>
  );
}
