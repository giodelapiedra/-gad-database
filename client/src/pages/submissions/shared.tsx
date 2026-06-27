import { ClockIcon, CheckCircle2Icon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon, FileEditIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SubmissionStatus } from '@/hooks/useSubmissions';

export const TEMPLATE_LABELS: Record<string, string> = {
  BARANGAY_GPB: 'Barangay GPB',
  BARANGAY_AR:  'Barangay AR',
  CITY_GPB:     'City/Mun GPB',
  CITY_AR:      'City/Mun AR',
};

export function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function StatusBadge({ status }: { status: SubmissionStatus | string }) {
  if (status === 'DRAFT')
    return (
      <Badge variant="outline" className="gap-1 border-zinc-300 bg-zinc-50 text-zinc-600">
        <FileEditIcon className="size-3" />Draft
      </Badge>
    );
  if (status === 'PENDING')
    return (
      <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
        <ClockIcon className="size-3" />Pending
      </Badge>
    );
  if (status === 'APPROVED')
    return (
      <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
        <CheckCircle2Icon className="size-3" />Approved
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 border-orange-300 bg-orange-50 text-orange-700">
      <XCircleIcon className="size-3" />Returned
    </Badge>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
  isLoading,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  isLoading: boolean;
}) {
  if (totalPages <= 1 && total === 0) return null;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
  return (
    <div className="mt-4 flex items-center justify-between border-t border-[#EBEBEB] pt-4 text-[12px] text-[#71717A]">
      <span>
        {isLoading ? 'Loading…' : total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="sm" className="h-7 px-2"
          disabled={page <= 1 || isLoading}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeftIcon className="size-3.5" />
        </Button>
        <span className="px-2 text-[12px] font-medium text-[#09090B]">{page} / {totalPages || 1}</span>
        <Button
          variant="outline" size="sm" className="h-7 px-2"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
