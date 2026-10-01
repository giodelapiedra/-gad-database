import { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CalendarDaysIcon,
  MapPinIcon,
  GlobeIcon,
  StarIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {
  useGetTrainings,
  useCreateTraining,
  useUpdateTraining,
  useSetTrainingPublished,
  useDeleteTraining,
  type TrainingRecord,
  type TrainingStatus,
  type TrainingType,
  type TrainingPayload,
} from '@/hooks/useTrainings';
import { formatDate } from '@/utils/formatters';

function getError(err: unknown, fallback: string) {
  if (err instanceof AxiosError && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return fallback;
}

const TYPE_OPTIONS: { value: TrainingType; label: string }[] = [
  { value: 'SEMINAR', label: 'Seminar' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'FORUM', label: 'Forum' },
  { value: 'CONFERENCE', label: 'Conference' },
];

const STATUS_STYLE: Record<TrainingStatus, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  ongoing: { label: 'Ongoing', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', className: 'bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]' },
};

// Dates are calendar dates (YYYY-MM-DD) — format without timezone shifting.
function formatDay(d: string) {
  return formatDate(`${d}T00:00:00`);
}

function formatSchedule(t: TrainingRecord) {
  if (t.endDate && t.endDate !== t.startDate) return `${formatDay(t.startDate)} – ${formatDay(t.endDate)}`;
  return formatDay(t.startDate);
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────

interface TrainingFormState {
  title: string;
  description: string;
  type: TrainingType;
  startDate: string;
  endDate: string;
  venue: string;
  organizer: string;
  targetParticipants: string;
  tags: string;
  featured: boolean;
  isPublished: boolean;
}

const EMPTY_FORM: TrainingFormState = {
  title: '',
  description: '',
  type: 'SEMINAR',
  startDate: '',
  endDate: '',
  venue: '',
  organizer: 'City GAD Office – Tanauan',
  targetParticipants: '',
  tags: '',
  featured: false,
  isPublished: true,
};

function toForm(t: TrainingRecord): TrainingFormState {
  return {
    title: t.title,
    description: t.description,
    type: t.type.toUpperCase() as TrainingType,
    startDate: t.startDate,
    endDate: t.endDate ?? '',
    venue: t.venue,
    organizer: t.organizer,
    targetParticipants: t.targetParticipants,
    tags: t.tags.join(', '),
    featured: t.featured,
    isPublished: t.isPublished,
  };
}

function toPayload(f: TrainingFormState): TrainingPayload {
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    type: f.type,
    startDate: f.startDate,
    endDate: f.endDate || null,
    venue: f.venue.trim(),
    organizer: f.organizer.trim(),
    targetParticipants: f.targetParticipants.trim(),
    tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean),
    featured: f.featured,
    isPublished: f.isPublished,
  };
}

function TrainingModal({
  open,
  onClose,
  editTraining,
}: {
  open: boolean;
  onClose: () => void;
  editTraining: TrainingRecord | null;
}) {
  const isEdit = !!editTraining;
  const createTraining = useCreateTraining();
  const updateTraining = useUpdateTraining();

  const [form, setForm] = useState<TrainingFormState>(EMPTY_FORM);

  // Reset the form whenever the dialog opens for a different record
  const formKey = open ? (editTraining?.id ?? 'new') : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (formKey !== lastKey) {
    setLastKey(formKey);
    if (formKey) setForm(editTraining ? toForm(editTraining) : EMPTY_FORM);
  }

  const set = <K extends keyof TrainingFormState>(key: K, value: TrainingFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isPending = createTraining.isPending || updateTraining.isPending;

  async function handleSubmit() {
    if (!form.title.trim() || !form.description.trim() || !form.startDate || !form.venue.trim()
      || !form.organizer.trim() || !form.targetParticipants.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error('End date cannot be before the start date.');
      return;
    }
    try {
      const payload = toPayload(form);
      if (isEdit) {
        await updateTraining.mutateAsync({ id: editTraining!.id, ...payload });
        toast.success('Training updated');
      } else {
        await createTraining.mutateAsync(payload);
        toast.success(payload.isPublished ? 'Training posted to the public website' : 'Training saved as draft');
      }
      onClose();
    } catch (err) {
      toast.error(getError(err, isEdit ? 'Failed to update training' : 'Failed to create training'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Training / Seminar' : 'New Training / Seminar'}</DialogTitle>
          <DialogDescription>
            Event information shown on the public website under Trainings &amp; Seminars (no online registration).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-1 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="t-title"
              placeholder="e.g. Gender Sensitivity Training for Barangay Officials"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-desc">Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="t-desc"
              rows={4}
              placeholder="What the training covers and who should attend."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Type <span className="text-red-500">*</span></Label>
            <Select value={form.type} onValueChange={(v) => v && set('type', v as TrainingType)}>
              <SelectTrigger>
                <SelectValue>{TYPE_OPTIONS.find((o) => o.value === form.type)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="space-y-1.5">
            <Label htmlFor="t-start">Start Date <span className="text-red-500">*</span></Label>
            <Input
              id="t-start"
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-end">
              End Date <span className="text-[11px] font-normal text-[#A1A1AA]">(for multi-day events)</span>
            </Label>
            <Input
              id="t-end"
              type="date"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-venue">Venue <span className="text-red-500">*</span></Label>
            <Input
              id="t-venue"
              placeholder="e.g. Tanauan City Hall Function Room / Zoom"
              value={form.venue}
              onChange={(e) => set('venue', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-org">Organizer <span className="text-red-500">*</span></Label>
            <Input
              id="t-org"
              value={form.organizer}
              onChange={(e) => set('organizer', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-target">Target Participants <span className="text-red-500">*</span></Label>
            <Input
              id="t-target"
              placeholder="e.g. Barangay GAD Focal Persons"
              value={form.targetParticipants}
              onChange={(e) => set('targetParticipants', e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-tags">
              Tags <span className="text-[11px] font-normal text-[#A1A1AA]">(optional, comma-separated)</span>
            </Label>
            <Input
              id="t-tags"
              placeholder="e.g. GST, VAWC, barangay"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#EBEBEB] px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium text-[#09090B]">Publish on website</p>
              <p className="text-[11px] text-[#A1A1AA]">Off = saved as draft</p>
            </div>
            <Switch checked={form.isPublished} onCheckedChange={(v) => set('isPublished', v)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#EBEBEB] px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium text-[#09090B]">Featured</p>
              <p className="text-[11px] text-[#A1A1AA]">Highlighted card on the website</p>
            </div>
            <Switch checked={form.featured} onCheckedChange={(v) => set('featured', v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : form.isPublished ? 'Post Training' : 'Save Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

const GRID = 'grid grid-cols-[1fr_200px_110px_130px_90px] gap-4';

export default function TrainingsPage() {
  const { data: trainings, isLoading } = useGetTrainings();
  const setPublished = useSetTrainingPublished();
  const deleteTraining = useDeleteTraining();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTraining, setEditTraining] = useState<TrainingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingRecord | null>(null);

  function openCreate() {
    setEditTraining(null);
    setModalOpen(true);
  }

  function openEdit(t: TrainingRecord) {
    setEditTraining(t);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTraining(null);
  }

  async function handleTogglePublished(t: TrainingRecord) {
    try {
      await setPublished.mutateAsync({ id: t.id, isPublished: !t.isPublished });
      toast.success(t.isPublished ? 'Removed from the public website' : 'Published to the public website');
    } catch (err) {
      toast.error(getError(err, 'Failed to update training'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTraining.mutateAsync(deleteTarget.id);
      toast.success('Training deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getError(err, 'Failed to delete training'));
    }
  }

  const upcomingCount = trainings?.filter((t) => t.status !== 'completed').length ?? 0;
  const publishedCount = trainings?.filter((t) => t.isPublished).length ?? 0;

  return (
    <DashboardLayout title="Trainings & Seminars" breadcrumb="Tools / Trainings & Seminars">
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Total Trainings', value: trainings?.length ?? '—', icon: CalendarDaysIcon, color: 'text-blue-600' },
          { label: 'Upcoming / Ongoing', value: upcomingCount, icon: CalendarClockIcon, color: 'text-violet-600' },
          { label: 'Published', value: publishedCount, icon: GlobeIcon, color: 'text-emerald-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-[10px] border border-[#EBEBEB] bg-white px-4 py-3">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F4F5] ${color}`}>
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#09090B]">{isLoading ? '—' : value}</p>
              <p className="text-[11px] text-[#71717A]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="mb-4 flex items-center gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090B]">Trainings &amp; Seminars</h2>
          <p className="text-[12px] text-[#71717A]">
            Post capacity-building activities to the public website. Status follows the schedule automatically.
          </p>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={openCreate}>
          <PlusIcon className="mr-1.5 size-4" />
          New Training
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white">
        <div className={`${GRID} border-b border-[#F4F4F5] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]`}>
          <span>Training</span>
          <span>Schedule</span>
          <span>Status</span>
          <span>Website</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-[#F4F4F5]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${GRID} px-4 py-3`}>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="ml-auto h-4 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : !trainings || trainings.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarCheckIcon className="mx-auto mb-2 size-8 text-[#D4D4D8]" />
            <p className="text-[13px] text-[#71717A]">No trainings yet</p>
            <p className="mt-0.5 text-[12px] text-[#A1A1AA]">
              The public Trainings page shows “Coming Soon” until one is published.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
              <PlusIcon className="mr-1.5 size-4" />
              Post the first training
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#F4F4F5]">
            {trainings.map((t) => {
              const status = STATUS_STYLE[t.status];
              return (
                <div key={t.id} className={`${GRID} items-center px-4 py-3 transition-colors hover:bg-[#FAFAFA]`}>
                  {/* Training */}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-[#09090B]">
                      {t.featured && <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                      <span className="truncate">{t.title}</span>
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-[11px] text-[#A1A1AA]">
                      <span className="capitalize">{t.type}</span>
                      <span>·</span>
                      <MapPinIcon className="size-3 shrink-0" />
                      <span className="truncate">{t.venue}</span>
                    </p>
                  </div>

                  {/* Schedule */}
                  <p className="text-[12px] text-[#52525B]">{formatSchedule(t)}</p>

                  {/* Status */}
                  <div>
                    <Badge variant="outline" className={status.className}>{status.label}</Badge>
                  </div>

                  {/* Website publish toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={t.isPublished}
                      onCheckedChange={() => handleTogglePublished(t)}
                      disabled={setPublished.isPending}
                      title={t.isPublished ? 'Unpublish from website' : 'Publish to website'}
                    />
                    <span className={`text-[11px] ${t.isPublished ? 'text-emerald-600' : 'text-[#A1A1AA]'}`}>
                      {t.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(t)} title="Edit training">
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(t)} title="Delete training">
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TrainingModal open={modalOpen} onClose={closeModal} editTraining={editTraining} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{deleteTarget?.title}</strong>? It will be removed from the public
              website. To hide it temporarily, unpublish it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTraining.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteTraining.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
