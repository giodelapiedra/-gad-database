import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateContest } from '@/hooks/useTabulation';
import { apiError, CONTESTANT_LABELS } from '../tabulationUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  onCreated: (contestId: string) => void;
}

export default function AddContestDialog({ open, onClose, eventId, onCreated }: Props) {
  const createContest = useCreateContest(eventId);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('School');

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setName(''); setLabel('School'); }
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error('Competition name is required.'); return; }
    try {
      const detail = await createContest.mutateAsync({
        name: name.trim(),
        contestantLabel: label,
        rankingMethod: 'AVERAGE',
      });
      const created = detail.contests[detail.contests.length - 1];
      toast.success('Competition added — set up its criteria next');
      onClose();
      if (created) onCreated(created.id);
    } catch (err) {
      toast.error(apiError(err, 'Failed to add competition'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Competition</DialogTitle>
          <DialogDescription>You’ll set the criteria, contestants and judges next.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ct-name">Competition Name <span className="text-red-500">*</span></Label>
            <Input
              id="ct-name"
              placeholder="e.g. Sabayang Pagbigkas Competition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contestants are</Label>
            <div className="flex flex-wrap gap-1.5">
              {CONTESTANT_LABELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                    label === l ? 'border-[#09090B] bg-[#09090B] text-white' : 'border-[#E4E4E7] text-[#52525B] hover:bg-[#F4F4F5]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createContest.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createContest.isPending}>
            {createContest.isPending ? 'Adding...' : 'Add Competition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
