import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3Icon,
  DownloadIcon,
  UsersIcon,
  FileTextIcon,
  TrendingUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/shared/EmptyState';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types';
import { formatDate } from '@/utils/formatters';

interface DownloadStats {
  totalDownloads: number;
  byFileType: { type: string; count: number }[];
  bySex: { sex: string; count: number }[];
  topFiles: { fileId: string; fileName: string; fileType: string; count: number }[];
  recentDownloads: {
    id: string;
    fileType: string;
    fileName: string;
    name: string;
    location: string;
    contactNo: string;
    organization: string;
    sex: string;
    age: number;
    createdAt: string;
  }[];
  dailyCounts: { date: string; count: number }[];
  page: number;
  totalPages: number;
}

const SEX_COLORS = { MALE: '#3B82F6', FEMALE: '#EC4899' };
const TYPE_COLORS = { resource: '#8B5CF6', department: '#10B981' };

const PAGE_SIZE = 20;

function useDownloadStats(page: number) {
  return useQuery({
    queryKey: ['download-stats', page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DownloadStats>>(`/dashboard/download-stats?page=${page}&limit=${PAGE_SIZE}`);
      return res.data.data;
    },
    refetchInterval: 30000,
  });
}

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDownloadStats(page);

  if (isLoading) {
    return (
      <DashboardLayout title="Reports" breadcrumb="Tools / Reports">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data || data.totalDownloads === 0) {
    return (
      <DashboardLayout title="Reports" breadcrumb="Tools / Reports">
        <EmptyState
          icon={BarChart3Icon}
          title="No download data yet"
          subtitle="Download statistics will appear here once users start downloading files from the public site."
        />
      </DashboardLayout>
    );
  }

  const resourceCount = data.byFileType.find((r) => r.type === 'resource')?.count ?? 0;
  const deptCount = data.byFileType.find((r) => r.type === 'department')?.count ?? 0;

  const sexData = data.bySex.map((r) => ({
    name: r.sex === 'MALE' ? 'Male' : 'Female',
    value: r.count,
    color: SEX_COLORS[r.sex as keyof typeof SEX_COLORS] || '#999',
  }));

  const typeData = [
    { name: 'Resources', value: resourceCount, color: TYPE_COLORS.resource },
    { name: 'Department', value: deptCount, color: TYPE_COLORS.department },
  ].filter((d) => d.value > 0);

  return (
    <DashboardLayout title="Reports" breadcrumb="Tools / Reports">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DownloadIcon}
          label="Total Downloads"
          value={data.totalDownloads}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={FileTextIcon}
          label="Resource Downloads"
          value={resourceCount}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={FileTextIcon}
          label="Department Downloads"
          value={deptCount}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersIcon}
          label="Unique Files Downloaded"
          value={data.topFiles.length}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Downloads Chart */}
        {data.dailyCounts.length > 0 && (
          <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-[#71717A]" />
              <h3 className="text-sm font-medium text-[#09090B]">Downloads (Last 30 Days)</h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.dailyCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                  tick={{ fontSize: 11, fill: '#A1A1AA' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sex Distribution */}
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <UsersIcon className="size-4 text-[#71717A]" />
            <h3 className="text-sm font-medium text-[#09090B]">Downloads by Sex</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={sexData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
              >
                {sexData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const n = value == null ? 0 : typeof value === 'number' ? value : Number(value) || 0;
                  const nm = name == null ? '' : String(name);
                  return [`${n} download${n !== 1 ? 's' : ''}`, nm];
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => {
                  const item = sexData.find((d) => d.name === value);
                  const total = sexData.reduce((s, d) => s + d.value, 0);
                  const pct = item && total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return `${value} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Files + File Type split */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Downloaded Files */}
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <h3 className="mb-3 text-sm font-medium text-[#09090B]">Top Downloaded Files</h3>
          <div className="space-y-2">
            {data.topFiles.map((f, idx) => (
              <div key={f.fileId} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-[#FAFAFA]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] text-[11px] font-medium text-[#71717A]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#09090B]">{f.fileName}</p>
                  <p className="text-[11px] text-[#A1A1AA]">{f.fileType === 'resource' ? 'Resource' : 'Department'}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {f.count} download{f.count !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* By File Type */}
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileTextIcon className="size-4 text-[#71717A]" />
            <h3 className="text-sm font-medium text-[#09090B]">Downloads by Source</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
              >
                {typeData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const n = value == null ? 0 : typeof value === 'number' ? value : Number(value) || 0;
                  const nm = name == null ? '' : String(name);
                  return [`${n} download${n !== 1 ? 's' : ''}`, nm];
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => {
                  const item = typeData.find((d) => d.name === value);
                  const total = typeData.reduce((s, d) => s + d.value, 0);
                  const pct = item && total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return `${value} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Downloads Table */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#09090B]">Recent Downloads</h3>
          <p className="text-xs text-[#A1A1AA]">
            {data.totalDownloads} total download{data.totalDownloads !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentDownloads.map((dl) => (
                <TableRow key={dl.id}>
                  <TableCell className="text-[13px] font-medium">{dl.name}</TableCell>
                  <TableCell>
                    <Badge variant={dl.sex === 'MALE' ? 'default' : 'secondary'} className="text-[11px]">
                      {dl.sex}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{dl.age}</TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{dl.organization}</TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{dl.location}</TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{dl.contactNo}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-[13px] text-[#71717A]" title={dl.fileName}>
                    {dl.fileName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {dl.fileType === 'resource' ? 'Resources' : 'Department'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{formatDate(dl.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[#A1A1AA]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.totalDownloads)} of {data.totalDownloads}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="px-2 text-xs text-[#71717A]">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[10px] border border-[#EBEBEB] bg-white p-4">
      <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-[#09090B]">{value.toLocaleString()}</p>
        <p className="text-[12px] text-[#A1A1AA]">{label}</p>
      </div>
    </div>
  );
}
