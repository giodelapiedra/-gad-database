import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCopyIcon, RefreshCwIcon, LockIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGetSubmissions, type FormSubmission } from '@/hooks/useSubmissions';

const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Approved', PENDING: 'Pending review', RETURNED: 'Returned', DRAFT: 'Draft',
};

/** CY of a Barangay GPB, FY of a City GPB. */
function planYear(s: FormSubmission): number | undefined {
  const fd = s.formData as { cy?: number; fy?: number } | null;
  return fd?.cy ?? fd?.fy;
}

/**
 * Lets an encoder pull the planned PPAs of their GAD Plan and Budget into the
 * Accomplishment Report they're filling in. Approved plans are listed first.
 *
 * With `autoImport` (a brand-new AR) the plan for the same year is copied in as
 * soon as it loads — approved first, otherwise the latest pending/returned one.
 */
export function GpbImportPanel({
  gpbTemplateId, sourceGpbId, year, autoImport = false, lockedCols, onImport,
}: {
  gpbTemplateId: 'BARANGAY_GPB' | 'CITY_GPB';
  sourceGpbId?: string;
  /** The AR's year; plans for this year are preferred. */
  year: number;
  autoImport?: boolean;
  /** Human list of the columns that get copied, e.g. "(1), (2), (3) and (5)". */
  lockedCols: string;
  onImport: (gpb: FormSubmission, auto: boolean) => void;
}) {
  const { data, isLoading } = useGetSubmissions({ templateId: gpbTemplateId, limit: 50 });

  const plans = useMemo(() => {
    const rank = (s: FormSubmission) =>
      (planYear(s) === year ? 0 : 10) + (s.status === 'APPROVED' ? 0 : s.status === 'DRAFT' ? 2 : 1);
    return (data?.submissions ?? [])
      .filter((s) => s.templateId === gpbTemplateId)
      .sort((a, b) => rank(a) - rank(b));   // stable: newest first within a rank
  }, [data, gpbTemplateId, year]);

  // Auto-fill once for a new AR. Drafts are never auto-copied.
  const autoDone = useRef(false);
  useEffect(() => {
    if (!autoImport || sourceGpbId || autoDone.current) return;
    const best = plans.find((p) => planYear(p) === year && p.status !== 'DRAFT');
    if (!best) return;
    autoDone.current = true;
    onImport(best, true);
  }, [autoImport, sourceGpbId, plans, year, onImport]);

  const [picked, setPicked] = useState<string>('');
  const selectedId = picked || sourceGpbId || plans[0]?.id || '';
  const selected = plans.find((p) => p.id === selectedId);
  const linked = plans.find((p) => p.id === sourceGpbId);

  return (
    <div className="rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB]">
            <ClipboardCopyIcon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1E3A8A]">
              {linked ? `Linked to ${linked.title}` : 'Start from your GAD Plan and Budget'}
            </p>
            <p className="text-[12px] text-[#1E40AF]/80">
              Copies columns {lockedCols} from the plan. The Approved GAD Budget is the plan’s MOOE + PS + CO.
              {linked && ' Sync again after the plan changes — your accomplishments, costs, remarks and proof are kept.'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <span className="flex items-center gap-1.5 text-[12px] text-[#1E40AF]">
            <Loader2Icon className="size-3.5 animate-spin" /> Loading your plans…
          </span>
        ) : plans.length === 0 ? (
          <span className="text-[12px] text-[#1E40AF]/80">
            You haven’t submitted a GAD Plan and Budget yet — fill the rows in by hand.
          </span>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={selectedId}
              onChange={(e) => setPicked(e.target.value)}
              aria-label="GAD Plan and Budget to copy from"
              className="h-8 max-w-[260px] rounded-md border border-[#BFDBFE] bg-white px-2 text-[12px] text-[#09090B] outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {STATUS_LABEL[p.status] ?? p.status}
                </option>
              ))}
            </select>
            <Button size="sm" className="h-8 bg-[#2563EB] hover:bg-[#1D4ED8]"
              disabled={!selected} onClick={() => selected && onImport(selected, false)}>
              {linked && linked.id === selectedId
                ? <><RefreshCwIcon className="mr-1.5 size-3.5" /> Sync again</>
                : <><ClipboardCopyIcon className="mr-1.5 size-3.5" /> Copy rows</>}
            </Button>
          </div>
        )}
      </div>
      {linked && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#1E40AF]/80">
          <LockIcon className="size-3" /> Copied cells are locked. To change them, edit the GAD Plan and Budget, then sync again.
        </p>
      )}
    </div>
  );
}
