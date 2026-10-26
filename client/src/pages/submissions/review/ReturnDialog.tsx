import { useState } from 'react';
import { CornerUpLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { FormSubmission } from '@/hooks/useSubmissions';
import { TEMPLATE_LABELS } from '../shared';
import { Avatar } from './primitives';
import { RETURN_REASONS } from './utils';

/**
 * Return-for-correction dialog. Owns its own comment draft and validation; the
 * page only supplies the target submission and the confirm handler.
 */
export default function ReturnDialog({
  submission,
  isPending,
  onConfirm,
  onClose,
}: {
  submission: FormSubmission | null;
  isPending: boolean;
  onConfirm: (remarks: string) => void;
  onClose: () => void;
}) {
  const [remarks, setRemarks] = useState('');
  const [error, setError]     = useState(false);

  // Reset the draft each time a different submission opens the dialog — the
  // render-time pattern React recommends over a reset effect.
  const [lastId, setLastId] = useState<string | null>(null);
  if (submission && submission.id !== lastId) {
    setLastId(submission.id);
    setRemarks('');
    setError(false);
  }

  function addReason(reason: string) {
    setRemarks((r) => (r.trim() ? `${r.trim()}\n${reason}` : reason));
    setError(false);
  }

  function handleConfirm() {
    if (!remarks.trim()) { setError(true); return; }
    onConfirm(remarks.trim());
  }

  return (
    <Dialog open={!!submission} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Return for correction</DialogTitle>
          <DialogDescription>Tell the encoder what to fix. They’ll be notified and can resubmit.</DialogDescription>
        </DialogHeader>
        {submission && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-[#E2E4E9] bg-[#FAFAFA] p-3">
              <Avatar name={submission.submitter.name} color={submission.submitter.department?.color} />
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-semibold text-[#09090B]">{submission.title}</p>
                <p className="truncate text-[12px] text-[#71717A]">
                  {TEMPLATE_LABELS[submission.templateId] ?? submission.templateId} · {submission.submitter.name}
                  {submission.submitter.department && ` · ${submission.submitter.department.code}`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-remarks" className="text-[13px]">
                What needs to be fixed? <span className="text-red-600">*</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {RETURN_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => addReason(r)}
                    className="rounded-full border border-[#E2E4E9] bg-white px-2.5 py-1 text-[11px] text-[#3F3F46] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                  >
                    + {r}
                  </button>
                ))}
              </div>
              <Textarea
                id="return-remarks"
                rows={4}
                autoFocus
                placeholder="e.g. Row 3 under Client-Focused activities is missing the budget source."
                value={remarks}
                onChange={(e) => { setRemarks(e.target.value); if (error) setError(false); }}
                aria-invalid={error}
                className={`resize-none text-[13px] ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {error && <p className="text-[12px] text-red-600">Please add a comment so the encoder knows what to fix.</p>}
              <p className="text-[11px] text-[#A1A1AA]">
                Need to flag a specific section or row? Open the full form and comment there.
              </p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700" disabled={isPending} onClick={handleConfirm}>
            <CornerUpLeftIcon className="mr-1.5 size-4" />
            {isPending ? 'Returning…' : 'Return to encoder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
