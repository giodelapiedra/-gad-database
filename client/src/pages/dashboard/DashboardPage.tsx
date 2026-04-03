import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Grid3X3,
  Calendar,
  HardDrive,
  FileSpreadsheetIcon,
  BuildingIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatCardSkeleton,
  ChartSkeleton,
  ListItemSkeleton,
} from '@/components/shared/LoadingSkeleton';
import { useGetSummary, useGetAvailableYears, useGetRecent } from '@/hooks/useDashboard';
import { formatNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [showAllDepts, setShowAllDepts] = useState(false);

  const { data: years, isLoading: yearsLoading } = useGetAvailableYears();
  const { data: summary, isLoading: summaryLoading } = useGetSummary(selectedYear);
  const { data: recent, isLoading: recentLoading } = useGetRecent(8);

  // Top 10 departments by file count for chart
  const topDepts = useMemo(() => {
    if (!summary?.departments) return [];
    return [...summary.departments]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [summary]);

  // All departments sorted for grid
  const allDepts = useMemo(() => {
    if (!summary?.departments) return [];
    return [...summary.departments].sort((a, b) => a.name.localeCompare(b.name));
  }, [summary]);

  const chartDepts = showAllDepts ? allDepts : topDepts;
  const chartHeight = Math.max(180, chartDepts.length * 32);

  return (
    <DashboardLayout title="Dashboard" breadcrumb="Overview / Dashboard">
      {/* Year Filter */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <span className="mr-1 text-[13px] text-[#A1A1AA]">Year</span>
        <YearChip
          label="All"
          active={selectedYear === undefined}
          onClick={() => setSelectedYear(undefined)}
        />
        {yearsLoading && (
          <>
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </>
        )}
        {years?.map((y) => (
          <YearChip
            key={y}
            label={String(y)}
            active={selectedYear === y}
            onClick={() => setSelectedYear(y)}
          />
        ))}
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={<FileText className="size-4 text-[#09090B]" />}
              value={formatNumber(summary?.totalFiles ?? 0)}
              label="Total files"
            />
            <StatCard
              icon={<HardDrive className="size-4 text-[#09090B]" />}
              value={formatSize(summary?.totalSize ?? 0)}
              label="Storage used"
            />
            <StatCard
              icon={<Grid3X3 className="size-4 text-[#09090B]" />}
              value={String(summary?.totalDepartments ?? 0)}
              label="Departments"
            />
            <StatCard
              icon={<Calendar className="size-4 text-[#09090B]" />}
              value={years && years.length > 0 ? String(years[years.length - 1]) : '—'}
              label="Most recent year"
            />
          </>
        )}
      </div>

      {/* Two Column: Chart + Recent */}
      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        {/* Left — Top 10 Bar Chart */}
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#09090B]">
              {showAllDepts ? 'All Departments' : 'Top Departments by Files'}
            </h2>
            {(summary?.departments?.length ?? 0) > 10 && (
              <button
                onClick={() => setShowAllDepts(!showAllDepts)}
                className="text-[12px] text-[#71717A] hover:text-[#09090B]"
              >
                {showAllDepts ? 'Show top 10' : `View all ${summary?.departments?.length}`}
              </button>
            )}
          </div>
          {summaryLoading ? (
            <ChartSkeleton />
          ) : chartDepts.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-[13px] text-[#A1A1AA]">No files uploaded yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartDepts.map((d) => ({
                  name: d.code,
                  total: d.total,
                  fill: d.color,
                }))}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEB' }}
                  cursor={{ fill: '#F4F4F5' }}
                  formatter={(value: number) => [`${value} files`, 'Files']}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
                  {chartDepts.map((d) => (
                    <Cell key={d.code} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right — Recent Files */}
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-[14px] font-semibold text-[#09090B]">Recent Uploads</h2>
          {recentLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          ) : !recent?.length ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-[13px] text-[#A1A1AA]">No files yet</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recent.map((file: any, i: number) => (
                <Link
                  key={file.id}
                  to={`/departments/${file.department.code}`}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-[#F9F9F9]',
                    i !== 0 && 'border-t border-[#F4F4F5]'
                  )}
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[#F4F4F5]">
                    <FileSpreadsheetIcon className="size-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#09090B]">
                      {file.originalName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: file.department.color }}
                      >
                        {file.department.code}
                      </span>
                      <span className="text-[11px] text-[#A1A1AA]">{file.year}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Department Grid */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <h2 className="mb-4 text-[14px] font-semibold text-[#09090B]">
          All Departments
          {allDepts.length > 0 && (
            <span className="ml-2 text-[12px] font-normal text-[#A1A1AA]">
              {allDepts.length} departments
            </span>
          )}
        </h2>
        {summaryLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : allDepts.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center">
            <p className="text-[13px] text-[#A1A1AA]">No departments yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {allDepts.map((dept) => (
              <Link
                key={dept.id}
                to={`/departments/${dept.code}`}
                className="group flex items-start gap-3 rounded-lg border border-[#EBEBEB] p-3 transition-all hover:border-[#D4D4D8] hover:shadow-sm"
              >
                <span
                  className="mt-0.5 size-3 shrink-0 rounded"
                  style={{ backgroundColor: dept.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-[#09090B] group-hover:text-[#18181B]">
                    {dept.code}
                  </p>
                  <p className="truncate text-[11px] text-[#A1A1AA]">{dept.name}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#71717A]">
                    {dept.total} {dept.total === 1 ? 'file' : 'files'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ---- Sub-components ---- */

function YearChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1 text-[13px] transition-colors',
        active
          ? 'bg-[#18181B] font-medium text-white'
          : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#EBEBEB]'
      )}
    >
      {label}
    </button>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-4">
      <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-[#F4F4F5]">
        {icon}
      </div>
      <p className="text-2xl font-semibold text-[#09090B]">{value}</p>
      <p className="mt-0.5 text-[12px] text-[#A1A1AA]">{label}</p>
    </div>
  );
}
