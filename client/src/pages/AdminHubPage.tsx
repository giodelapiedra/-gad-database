import { Link } from 'react-router-dom';
import {
  LayoutDashboardIcon,
  FileSpreadsheetIcon,
  ArrowRightIcon,
  LogOutIcon,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useGetPendingCount } from '@/hooks/useSubmissions';

const CARDS = [
  {
    to: '/dashboard',
    title: 'Dashboard',
    description: 'Beneficiary records, file uploads, reports, and analytics across all departments.',
    icon: LayoutDashboardIcon,
    accent: 'bg-blue-50 text-blue-600',
  },
  {
    to: '/submissions',
    title: 'Form Submissions',
    description: 'Review, approve, and return GAD form submissions from encoders.',
    icon: FileSpreadsheetIcon,
    accent: 'bg-emerald-50 text-emerald-600',
    showPending: true,
  },
] as const;

export default function AdminHubPage() {
  const { user, logout } = useAuth();
  const { data: pendingData } = useGetPendingCount();
  const pending = pendingData?.count ?? 0;

  const firstName = user?.name?.trim().split(' ')[0] ?? 'Admin';

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      {/* Top bar */}
      <header className="flex h-16 items-center justify-between border-b border-[#EBEBEB] bg-white px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#18181B]">
            <span className="text-xs font-semibold text-white">G</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#09090B]">GAD Database</p>
            <p className="text-[11px] text-[#71717A]">City Government of Tanauan, Batangas</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B]"
        >
          <LogOutIcon className="size-4" />
          Sign out
        </button>
      </header>

      {/* Chooser */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-[22px] font-bold text-[#09090B]">Welcome, {firstName}</h1>
            <p className="mt-1 text-[14px] text-[#71717A]">Where would you like to go?</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CARDS.map(({ to, title, description, icon: Icon, accent, showPending }) => (
              <Link
                key={to}
                to={to}
                className="group relative flex flex-col rounded-[14px] border border-[#EBEBEB] bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4D4D8] hover:shadow-md"
              >
                <div className={`mb-4 flex size-12 items-center justify-center rounded-xl ${accent}`}>
                  <Icon className="size-6" />
                </div>

                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-[16px] font-semibold text-[#09090B]">{title}</h2>
                  {showPending && pending > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {pending} pending
                    </span>
                  )}
                </div>
                <p className="flex-1 text-[13px] leading-relaxed text-[#71717A]">{description}</p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#18181B]">
                  Open
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
