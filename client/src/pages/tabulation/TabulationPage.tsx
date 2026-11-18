import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, TrophyIcon, GlobeIcon, LockIcon, Trash2Icon, MapPinIcon, ChevronRightIcon } from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useTabulationEvents, useDeleteEvent, type TabulationEventSummary } from '@/hooks/useTabulation';
import EventFormDialog from './components/EventFormDialog';
import { apiError, formatEventDate } from './tabulationUtils';

const GRID = 'grid grid-cols-[1fr_140px_150px_120px_60px] gap-4';

export default function TabulationPage() {
  const navigate = useNavigate();
  const { data: events, isLoading, isError, refetch } = useTabulationEvents();
  const deleteEvent = useDeleteEvent();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TabulationEventSummary | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteEvent.mutateAsync(deleteTarget.id);
      toast.success('Event deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(apiError(err, 'Failed to delete event'));
    }
  }

  const totalContests = events?.reduce((s, e) => s + e.contestCount, 0) ?? 0;
  const publishedEvents = events?.filter((e) => e.isPublished).length ?? 0;

  return (
    <DashboardLayout title="Tabulation" breadcrumb="Admin / Tabulation">
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Events', value: events?.length ?? 0, icon: TrophyIcon, color: 'text-blue-600' },
          { label: 'Competitions', value: totalContests, icon: LockIcon, color: 'text-violet-600' },
          { label: 'On the website', value: publishedEvents, icon: GlobeIcon, color: 'text-emerald-600' },
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

      <div className="mb-4 flex items-center gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090B]">Competition Tabulation</h2>
          <p className="text-[12px] text-[#71717A]">
            Encode judges’ score sheets and rank contestants automatically. Results stay private until you publish them.
          </p>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-1.5 size-4" />
          New Event
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-[#EBEBEB] bg-white">
        <div className="min-w-[720px]">
          <div className={`${GRID} border-b border-[#F4F4F5] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]`}>
            <span>Event</span>
            <span>Date</span>
            <span>Competitions</span>
            <span>Website</span>
            <span className="text-right">Actions</span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-[#F4F4F5]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`${GRID} px-4 py-3`}>
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="ml-auto h-4 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <p className="text-[13px] text-[#71717A]">Couldn’t load events.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : !events || events.length === 0 ? (
            <div className="py-12 text-center">
              <TrophyIcon className="mx-auto mb-2 size-8 text-[#D4D4D8]" />
              <p className="text-[13px] text-[#71717A]">No events yet</p>
              <p className="mt-0.5 text-[12px] text-[#A1A1AA]">Create an event, then add its competitions, criteria and judges.</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="mr-1.5 size-4" />
                Create the first event
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F4F5]">
              {events.map((e) => (
                <div
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/tabulation/${e.id}`)}
                  onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/tabulation/${e.id}`)}
                  className={`${GRID} cursor-pointer items-center px-4 py-3 transition-colors hover:bg-[#FAFAFA]`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-[13px] font-medium text-[#09090B]">
                      <span className="truncate">{e.title}</span>
                      <ChevronRightIcon className="size-3.5 shrink-0 text-[#A1A1AA]" />
                    </p>
                    {e.venue && (
                      <p className="flex items-center gap-1 truncate text-[11px] text-[#A1A1AA]">
                        <MapPinIcon className="size-3 shrink-0" />
                        <span className="truncate">{e.venue}</span>
                      </p>
                    )}
                  </div>
                  <p className="text-[12px] text-[#52525B]">{formatEventDate(e.eventDate)}</p>
                  <p className="text-[12px] text-[#52525B]">
                    {e.contestCount} total
                    <span className="text-[#A1A1AA]"> · {e.finalizedCount} final</span>
                  </p>
                  <div>
                    {e.isPublished ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Published{e.publishedResultsCount > 0 ? ` · ${e.publishedResultsCount} result${e.publishedResultsCount > 1 ? 's' : ''}` : ''}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-[#E4E4E7] bg-[#F4F4F5] text-[#71717A]">Private</Badge>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Delete event"
                      onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e); }}
                    >
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EventFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/tabulation/${id}`)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{deleteTarget?.title}</strong> with all its competitions, judges and scores?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteEvent.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
