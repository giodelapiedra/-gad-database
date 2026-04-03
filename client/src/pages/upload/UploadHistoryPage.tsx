import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheetIcon,
  SearchIcon,
  XIcon,
  DownloadIcon,
  ClockIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';

import { useGetFiles, useGetFileYears, type FileRecord } from '@/hooks/useFiles';
import { useGetDepartments } from '@/hooks/useDepartments';
import { formatDate } from '@/utils/formatters';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PAGE_SIZE = 20;

export default function UploadHistoryPage() {
  const { data: departments } = useGetDepartments();
  const { data: years } = useGetFileYears();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetFiles({
    dept: deptFilter || undefined,
    year: yearFilter || undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const files = data?.files ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const handleView = (file: FileRecord) => {
    const ext = file.originalName.toLowerCase();
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.doc') || ext.endsWith('.docx') || ext.endsWith('.ppt') || ext.endsWith('.pptx')) {
      window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`, '_blank');
    } else {
      window.open(file.url, '_blank');
    }
  };

  const handleDownload = (file: FileRecord) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.originalName;
    a.target = '_blank';
    a.click();
  };

  const clearFilters = () => {
    setSearch('');
    setDeptFilter('');
    setYearFilter('');
    setPage(1);
  };

  const hasFilters = !!(search || deptFilter || yearFilter);

  return (
    <DashboardLayout title="Upload History" breadcrumb="Tools / Upload History">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearch(''); setPage(1); }}
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All departments</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={d.code}>
                {d.code} — {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); }}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All years</SelectItem>
            {years?.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Summary */}
      {!isLoading && total > 0 && (
        <p className="mb-3 text-xs text-[#A1A1AA]">
          {total} file{total !== 1 ? 's' : ''}{hasFilters ? ' matching filters' : ' total'}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={ClockIcon}
          title="No upload history"
          subtitle={hasFilters
            ? 'No files match your filters.'
            : 'Upload files to departments to see them here.'}
        />
      ) : (
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheetIcon className="size-4 shrink-0 text-emerald-600" />
                      <span
                        className="max-w-[200px] truncate text-[13px] font-medium cursor-pointer hover:underline"
                        onClick={() => handleView(file)}
                        title={file.originalName}
                      >
                        {file.originalName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/departments/${file.department.code}`}
                      className="inline-flex items-center gap-1.5 text-[13px] hover:underline"
                    >
                      <span
                        className="size-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: file.department.color }}
                      />
                      {file.department.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{file.year}</TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{formatSize(file.size)}</TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{file.uploadedBy.name}</TableCell>
                  <TableCell className="text-[13px] text-[#71717A]">{formatDate(file.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => handleView(file)} title="View">
                        <EyeIcon className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDownload(file)} title="Download">
                        <DownloadIcon className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[#A1A1AA]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
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
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
