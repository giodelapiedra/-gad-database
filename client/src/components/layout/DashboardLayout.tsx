import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

interface DashboardLayoutProps {
  title: string;
  breadcrumb: string;
  onUpload?: () => void;
  onAddRecord?: () => void;
  children: ReactNode;
}

export default function DashboardLayout({
  title,
  breadcrumb,
  onUpload,
  onAddRecord,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="relative flex h-screen bg-white">
      <Sidebar />
      <div className="relative z-0 flex flex-1 flex-col overflow-hidden">
        <Topbar
          title={title}
          breadcrumb={breadcrumb}
          onUpload={onUpload}
          onAddRecord={onAddRecord}
        />
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
