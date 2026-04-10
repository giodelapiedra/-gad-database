import { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Plus,
  BarChart3,
  Clock,
  FolderDownIcon,
  LogOut,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
  BuildingIcon,
} from 'lucide-react';
import { SidebarItemSkeleton } from '@/components/shared/LoadingSkeleton';
import AddDepartmentModal from '@/components/modals/AddDepartmentModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useGetDepartments } from '@/hooks/useDepartments';
import { getInitials } from '@/utils/formatters';
import { cn } from '@/lib/utils';

const VISIBLE_DEPT_COUNT = 5;

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
          isActive
            ? 'border-l-2 border-[#18181B] bg-[#F4F4F5] font-medium text-[#09090B]'
            : 'text-[#71717A] hover:bg-[#F9F9F9]'
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { data: departments, isLoading } = useGetDepartments();
  const navigate = useNavigate();
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [allDeptsOpen, setAllDeptsOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');

  const visibleDepts = departments?.slice(0, VISIBLE_DEPT_COUNT) ?? [];
  const hasMore = (departments?.length ?? 0) > VISIBLE_DEPT_COUNT;

  const filteredDepts = useMemo(() => {
    if (!departments) return [];
    if (!deptSearch) return departments;
    const q = deptSearch.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
    );
  }, [departments, deptSearch]);

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-[#F0F0F0] bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[#F0F0F0] px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-[#18181B]">
          <span className="text-xs font-semibold text-white">G</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#09090B]">GAD Database</p>
          <p className="truncate text-[11px] text-[#71717A]">Gender &amp; Development</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Overview */}
        <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
          Overview
        </p>
        <div className="space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/records" icon={Users} label="All Beneficiaries" />
        </div>

        {/* Departments */}
        <p className="mb-1.5 mt-5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
          Departments
        </p>
        <div className="space-y-0.5">
          {isLoading && (
            <>
              <SidebarItemSkeleton />
              <SidebarItemSkeleton />
              <SidebarItemSkeleton />
            </>
          )}

          {!isLoading && (!departments || departments.length === 0) && (
            <div className="px-2.5 py-3">
              <p className="text-[12px] text-[#A1A1AA]">No departments yet</p>
            </div>
          )}

          {/* Show first 5 departments */}
          {!isLoading &&
            visibleDepts.map((dept) => (
              <NavLink
                key={dept.id}
                to={`/departments/${dept.code}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                    isActive
                      ? 'border-l-2 border-[#18181B] bg-[#F4F4F5] font-medium text-[#09090B]'
                      : 'text-[#71717A] hover:bg-[#F9F9F9]'
                  )
                }
              >
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: dept.color }}
                />
                <span className="flex-1 truncate">{dept.name}</span>
              </NavLink>
            ))}

          {/* Show All Departments button */}
          {!isLoading && hasMore && (
            <button
              onClick={() => { setAllDeptsOpen(true); setDeptSearch(''); }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-[#A1A1AA] transition-colors hover:bg-[#F9F9F9] hover:text-[#09090B]"
            >
              <BuildingIcon className="size-4 shrink-0" />
              <span className="flex-1 text-left">All departments</span>
              <span className="rounded-full bg-[#F4F4F5] px-1.5 py-0.5 text-[11px]">
                {departments?.length}
              </span>
              <ChevronRightIcon className="size-3.5" />
            </button>
          )}

          {/* Add Department */}
          {!isLoading && (
            <button
              onClick={() => setAddDeptOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-[#A1A1AA] transition-colors hover:bg-[#F9F9F9] hover:text-[#09090B]"
            >
              <Plus className="size-4 shrink-0" />
              <span>Add Department</span>
            </button>
          )}
        </div>

        {/* Tools */}
        <p className="mb-1.5 mt-5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
          Tools
        </p>
        <div className="space-y-0.5">
          <NavItem to="/reports" icon={BarChart3} label="Reports" />
          <NavItem to="/upload-history" icon={Clock} label="Upload History" />
          <NavItem to="/resources" icon={FolderDownIcon} label="GAD Resources" />
        </div>
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2.5 border-t border-[#F0F0F0] px-4 py-3">
        <div className="flex size-[30px] items-center justify-center rounded-full bg-[#F4F4F5]">
          <span className="text-[11px] font-medium text-[#71717A]">
            {user ? getInitials(user.name) : '??'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[#09090B]">
            {user?.name ?? 'User'}
          </p>
          <p className="truncate text-[11px] text-[#A1A1AA]">
            {user?.role ?? 'Unknown'}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-md p-1.5 text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#71717A]"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      {/* All Departments Dialog */}
      <Dialog open={allDeptsOpen} onOpenChange={(o) => !o && setAllDeptsOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>All Departments</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" />
            <Input
              placeholder="Search departments..."
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              className="pl-8"
            />
            {deptSearch && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#09090B]"
                onClick={() => setDeptSearch('')}
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Department list */}
          <div className="max-h-[400px] space-y-0.5 overflow-y-auto">
            {filteredDepts.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#A1A1AA]">
                No departments found
              </p>
            ) : (
              filteredDepts.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => {
                    setAllDeptsOpen(false);
                    navigate(`/departments/${dept.code}`);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B]"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: dept.color }}
                  />
                  <span className="flex-1 truncate">{dept.name}</span>
                  <span className="text-[11px] text-[#A1A1AA]">{dept.code}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddDepartmentModal
        open={addDeptOpen}
        onClose={() => setAddDeptOpen(false)}
        onSuccess={() => setAddDeptOpen(false)}
      />
    </aside>
  );
}
