import { useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReviewSubmission, apiErrorMessage, type FormSubmission } from '@/hooks/useSubmissions';

/**
 * Approve / Return on the submission page itself, so the reviewer can flag the exact
 * parts that are wrong (via comments) while looking at the form, then send it back.
 */
export function ReviewActions({ sub }: { sub: FormSubmission }) {
  const review = useReviewSubmission();
  const [returnOpen, setReturnOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState(false);

  const openFlags = (sub.comments ?? []).filter((c) => c.section && !c.resolvedAt).length;

  async function approve() {
    if (openFlags > 0 && !window.confirm(
      `${openFlags} flagged ${openFlags === 1 ? 'part is' : 'parts are'} still unresolved. Approve anyway?`,
    )) return;
    try {
      await review.mutateAsync({ id: sub.id, status: 'APPROVED', expectedUpdatedAt: sub.updatedAt });
      toast.success(`"${sub.title}" approved.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to approve.'));
    }
  }

  async function confirmReturn() {
    if (!remarks.trim()) { setRemarksError(true); return; }
    try {
      await review.mutateAsync({ id: sub.id, status: 'RETURNED', remarks: remarks.trim(), expectedUpdatedAt: sub.updatedAt });
      toast.success('Submission returned for correction.');
      setReturnOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to return submission.'));
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={review.isPending}
        onClick={() => { setRemarks(''); setRemarksError(false); setReturnOpen(true); }}>
        <XIcon className="mr-1.5 size-4" /> Return
      </Button>
      <Button size="sm" disabled={review.isPending} onClick={approve}>
        <CheckIcon className="mr-1.5 size-4" /> Approve
      </Button>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return for Correction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className={`rounded-md border px-3 py-2 text-[12px] ${
              openFlags ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#EBEBEB] bg-[#FAFAFA] text-[#52525B]'
            }`}>
              {openFlags
                ? <><strong>{openFlags}</strong> flagged {openFlags === 1 ? 'part' : 'parts'} will show in red for the encoder.</>
                : <>No parts flagged. Use “About:” in Comments below to point at the exact part that needs fixing.</>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Overall remarks
                <span className="ml-1 text-[11px] font-normal text-[#A1A1AA]">(required)</span>
              </Label>
              <Textarea rows={3} value={remarks}
                onChange={(e) => { setRemarks(e.target.value); if (remarksError) setRemarksError(false); }}
                placeholder="e.g. Please correct the flagged parts and resubmit."
                className={`resize-none text-[13px] ${remarksError ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
              {remarksError && <p className="text-[12px] text-red-600">Remarks are required when returning a submission.</p>}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setReturnOpen(false)} disabled={review.isPending}>Cancel</Button>
            <Button onClick={confirmReturn} disabled={review.isPending}>
              {review.isPending ? 'Returning…' : 'Return for Correction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
