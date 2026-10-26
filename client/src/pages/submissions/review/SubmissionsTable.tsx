import {
  InboxIcon,
  EyeIcon,
  PencilIcon,
  MoreHorizontalIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  CornerUpLeftIcon,
  CheckIcon,
  FlagIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { FormSubmission } from '@/hooks/useSubmissions';
import { TEMPLATE_LABELS, fmt } from '../shared';
import { Avatar, StatusPill } from './primitives';
import { daysSince, timeAgo, EMPTY_COPY, OVERDUE_DAYS, type TabKey } from './utils';

interface Props {
  submissions: FormSubmission[];
  isLoading: boolean;
  isError: boolean;
  status: TabKey;
  hasDeptFilter: boolean;
  downloadingId: string | null;
  onRetry: () => void;
  onRowOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onApprove: (s: FormSubmission) => void;
  onReturn: (s: FormSubmission) => void;
  onDownload: (id: string, format: 'xlsx' | 'pdf') => void;
}

const COLS = 5;

export default function SubmissionsTable({
  submissions, isLoading, isError, status, hasDeptFilter,
  downloadingId, onRetry, onRowOpen, onEdit, onApprove, onReturn, onDownload,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#E2E4E9] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
            <th className="px-5 py-2.5 font-semibold">Submission</th>
            <th className="px-4 py-2.5 font-semibold">Encoder</th>
            <th className="px-4 py-2.5 font-semibold">Submitted</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-[#F4F4F5]">
                <td className="px-5 py-4" colSpan={COLS}><Skeleton className="h-8 rounded" /></td>
              </tr>
            ))
          ) : isError ? (
            <tr>
              <td colSpan={COLS}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-[14px] font-medium text-[#09090B]">Couldn’t load submissions</p>
                  <p className="mt-1 text-[12px] text-[#A1A1AA]">Check your connection and try again.</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>
                </div>
              </td>
            </tr>
          ) : submissions.length === 0 ? (
            <tr>
              <td colSpan={COLS}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#F4F4F5]">
                    {status === 'PENDING'
                      ? <CheckIcon className="size-6 text-emerald-600" />
                      : <InboxIcon className="size-6 text-[#A1A1AA]" />}
                  </span>
                  <p className="text-[14px] font-medium text-[#09090B]">{EMPTY_COPY[status].title}</p>
                  <p className="mt-1 text-[12px] text-[#A1A1AA]">
                    {EMPTY_COPY[status].body}
                    {hasDeptFilter && ' Try clearing the filters.'}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            submissions.map((s) => {
              const waitDays = daysSince(s.submittedAt);
              const overdue  = s.status === 'PENDING' && waitDays >= OVERDUE_DAYS;
              const openFlags = s.openFlags ?? 0;
              return (
                <tr
                  key={s.id}
                  onClick={() => onRowOpen(s.id)}
                  className="group cursor-pointer border-b border-[#F4F4F5] text-[13px] transition-colors last:border-b-0 hover:bg-[#F8FAFC]"
                >
                  {/* Submission (title + form type) */}
                  <td className="px-5 py-3.5">
                    <p className="max-w-[300px] truncate font-medium text-[#09090B] group-hover:text-[#2563EB]" title={s.title}>
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#71717A]">{TEMPLATE_LABELS[s.templateId] ?? s.templateId}</p>
                  </td>
                  {/* Encoder */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.submitter.name} color={s.submitter.department?.color} />
                      <div className="min-w-0">
                        <p className="max-w-[180px] truncate font-medium text-[#09090B]">{s.submitter.name}</p>
                        {s.submitter.department && (
                          <p className="max-w-[180px] truncate text-[12px] text-[#71717A]" title={s.submitter.department.name}>
                            {s.submitter.department.code}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Submitted */}
                  <td className="whitespace-nowrap px-4 py-3.5" title={fmt(s.submittedAt)}>
                    <p className="text-[13px] text-[#09090B]">{timeAgo(s.submittedAt)}</p>
                    {overdue && (
                      <p className="mt-0.5 text-[11px] font-medium text-red-600">Waiting {waitDays} days</p>
                    )}
                  </td>
                  {/* Status (+ open correction flags) */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1">
                      <StatusPill status={s.status} />
                      {openFlags > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200"
                          title={`${openFlags} unresolved correction ${openFlags === 1 ? 'flag' : 'flags'}`}
                        >
                          <FlagIcon className="size-2.5" />
                          {openFlags} to fix
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Actions — clicks here must not open the row */}
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {s.status === 'PENDING' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                            onClick={() => onReturn(s)}
                          >
                            <CornerUpLeftIcon className="mr-1.5 size-3.5" /> Return
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-emerald-600 px-3 hover:bg-emerald-700"
                            onClick={() => onApprove(s)}
                          >
                            <CheckIcon className="mr-1.5 size-3.5" /> Approve
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3"
                          onClick={() => onRowOpen(s.id)}
                        >
                          <EyeIcon className="mr-1.5 size-3.5" /> View
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-[#71717A]"
                              disabled={downloadingId === s.id}
                              aria-label="More actions"
                              title="More actions"
                            />
                          }
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onRowOpen(s.id)}>
                            <EyeIcon className="mr-2 size-3.5" /> Open full form
                          </DropdownMenuItem>
                          {s.status === 'RETURNED' && (
                            <DropdownMenuItem onClick={() => onEdit(s.id)}>
                              <PencilIcon className="mr-2 size-3.5" /> Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDownload(s.id, 'pdf')}>
                            <FileTextIcon className="mr-2 size-3.5" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDownload(s.id, 'xlsx')}>
                            <FileSpreadsheetIcon className="mr-2 size-3.5" /> Download Excel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
