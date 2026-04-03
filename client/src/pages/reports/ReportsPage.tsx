import DashboardLayout from '@/components/layout/DashboardLayout';
import EmptyState from '@/components/shared/EmptyState';
import { BarChart3Icon } from 'lucide-react';

export default function ReportsPage() {
  return (
    <DashboardLayout title="Reports" breadcrumb="Tools / Reports">
      <EmptyState
        icon={BarChart3Icon}
        title="Reports"
        subtitle="Generate and download GAD reports. Coming soon."
      />
    </DashboardLayout>
  );
}
