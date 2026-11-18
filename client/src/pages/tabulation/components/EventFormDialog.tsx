import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCreateEvent, useUpdateEvent, type EventPayload, type TabulationEventSummary } from '@/hooks/useTabulation';
import { apiError } from '../tabulationUtils';

const EMPTY: EventPayload = { title: '', description: '', eventDate: '', venue: '' };

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the dialog edits this event instead of creating one. */
  event?: TabulationEventSummary;
  onCreated?: (id: string) => void;
}

export default function EventFormDialog({ open, onClose, event, onCreated }: Props) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent(event?.id ?? '');
  const isEdit = !!event;

  const [form, setForm] = useState<EventPayload>(EMPTY);
  const formKey = open ? (event?.id ?? 'new') : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (formKey !== lastKey) {
    setLastKey(formKey);
    if (formKey) {
      setForm(event
        ? { title: event.title, description: event.description, eventDate: event.eventDate, venue: event.venue }
        : EMPTY);
    }
  }

  const set = <K extends keyof EventPayload>(k: K, v: EventPayload[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isPending = createEvent.isPending || updateEvent.isPending;

  async function handleSubmit() {
    if (!form.title.trim() || !form.eventDate) {
      toast.error('Event title and date are required.');
      return;
    }
    const payload = { ...form, title: form.title.trim(), description: form.description.trim(), venue: form.venue.trim() };
    try {
      if (isEdit) {
        await updateEvent.mutateAsync(payload);
        toast.success('Event updated');
      } else {
        const created = await createEvent.mutateAsync(payload);
        toast.success('Event created — add its competitions next');
        onCreated?.(created.id);
      }
      onClose();
    } catch (err) {
      toast.error(apiError(err, isEdit ? 'Failed to update event' : 'Failed to create event'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Event' : 'New Tabulation Event'}</DialogTitle>
          <DialogDescription>
            An event groups one or more competitions, e.g. the 18-Day Campaign to End VAW.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-1 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ev-title">Event Title <span className="text-red-500">*</span></Label>
            <Input
              id="ev-title"
              placeholder="e.g. 18-Day Campaign to End VAW 2026"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-date">Date <span className="text-red-500">*</span></Label>
            <Input id="ev-date" type="date" value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-venue">Venue</Label>
            <Input
              id="ev-venue"
              placeholder="e.g. Tanauan City Gymnasium"
              value={form.venue}
              onChange={(e) => set('venue', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ev-desc">Description <span className="text-[11px] font-normal text-[#A1A1AA]">(shown on the website)</span></Label>
            <Textarea
              id="ev-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
