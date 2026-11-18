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
import { useAddJudge, type TabContest } from '@/hooks/useTabulation';
import { apiError } from '../tabulationUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  contest: TabContest;
  /** Called with the new judge's id so the sheet can switch to it. */
  onAdded: (judgeId: string) => void;
}

function nextFreeNo(contest: TabContest): number {
  const used = new Set(contest.judges.map((j) => j.judgeNo));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

export default function AddJudgeDialog({ open, onClose, eventId, contest, onAdded }: Props) {
  const addJudge = useAddJudge(eventId);
  const [judgeNo, setJudgeNo] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setJudgeNo(String(nextFreeNo(contest)));
      setName('');
      setTitle('');
    }
  }

  const taken = contest.judges.some((j) => String(j.judgeNo) === judgeNo.trim());

  async function handleSubmit() {
    const no = Number(judgeNo);
    if (!Number.isInteger(no) || no < 1) { toast.error('Judge number must be a whole number starting at 1.'); return; }
    if (taken) { toast.error(`Judge No. ${no} already exists.`); return; }
    if (!name.trim()) { toast.error('Judge name is required.'); return; }
    try {
      const before = new Set(contest.judges.map((j) => j.id));
      const detail = await addJudge.mutateAsync({ contestId: contest.id, judgeNo: no, name: name.trim(), title: title.trim() });
      const added = detail.contests.find((c) => c.id === contest.id)?.judges.find((j) => !before.has(j.id));
      toast.success(`Judge No. ${no} added`);
      onClose();
      if (added) onAdded(added.id);
    } catch (err) {
      toast.error(apiError(err, 'Failed to add judge'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Judge</DialogTitle>
          <DialogDescription>
            {contest.name}. The name and title appear on the score sheet’s signature line.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[90px_1fr] gap-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="aj-no">Judge No.</Label>
            <Input
              id="aj-no"
              type="number"
              min={1}
              value={judgeNo}
              onChange={(e) => setJudgeNo(e.target.value)}
              aria-invalid={taken}
              className={taken ? 'border-red-400' : ''}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aj-name">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="aj-name"
              autoFocus
              placeholder="e.g. HON. JUAN DELA CRUZ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="aj-title">Title / Office</Label>
            <Input
              id="aj-title"
              placeholder="e.g. SK Federation President, DILG"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {taken && <p className="col-span-2 text-[12px] text-red-600">Judge No. {judgeNo} is already used.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={addJudge.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={addJudge.isPending || taken}>
            {addJudge.isPending ? 'Adding...' : 'Add Judge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
