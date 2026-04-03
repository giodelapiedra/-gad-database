import DashboardLayout from '@/components/layout/DashboardLayout';
import EmptyState from '@/components/shared/EmptyState';
import { UsersIcon } from 'lucide-react';

export default function AllRecordsPage() {
  return (
    <DashboardLayout title="All Records" breadcrumb="Records / All">
      <EmptyState
        icon={UsersIcon}
        title="All Beneficiaries"
        subtitle="Browse and manage all records across departments. Coming soon."
      />
    </DashboardLayout>
  );
}
