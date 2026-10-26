import { CheckIcon, BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { FormSubmission } from '@/hooks/useSubmissions';

export default function ApproveDialog({
  submission,
  isPending,
  onConfirm,
  onClose,
}: {
  submission: FormSubmission | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!submission} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve this submission?</DialogTitle>
          <DialogDescription>
            {submission && (
              <>
                <span className="font-medium text-[#09090B]">{submission.title}</span> from{' '}
                <span className="font-medium text-[#09090B]">{submission.submitter.name}</span> will be marked approved.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <p className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2 text-[12px] text-[#71717A]">
          <BellIcon className="size-3.5 shrink-0" /> The encoder gets a notification right away.
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending} onClick={onConfirm}>
            <CheckIcon className="mr-1.5 size-4" />
            {isPending ? 'Approving…' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
