import { useState } from 'react';
import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

interface DashboardLayoutProps {
  title: string;
  breadcrumb: string;
  onUpload?: () => void;
  onAddRecord?: () => void;
  defaultSidebarOpen?: boolean;
  children: ReactNode;
}

export default function DashboardLayout({
  title,
  breadcrumb,
  onUpload,
  onAddRecord,
  defaultSidebarOpen = true,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);

  return (
    <div className="relative flex h-screen bg-white">

      {/* ── Sidebar – width transitions smoothly ── */}
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
          sidebarOpen ? 'w-[240px]' : 'w-0'
        }`}
      >
        <Sidebar />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={title}
          breadcrumb={breadcrumb}
          onUpload={onUpload}
          onAddRecord={onAddRecord}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6">
          {children}
        </main>
      </div>

    </div>
  );
}
