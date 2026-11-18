import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  GlobeIcon,
  ExternalLinkIcon,
  SettingsIcon,
  ClipboardPenIcon,
  TrophyIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  useTabulationEvent,
  useSetEventPublished,
  useDeleteContest,
  type TabContest,
} from '@/hooks/useTabulation';
import EventFormDialog from './components/EventFormDialog';
import AddContestDialog from './components/AddContestDialog';
import ContestSetupPanel from './components/ContestSetupPanel';
import ScoreSheetPanel from './components/ScoreSheetPanel';
import ResultsPanel from './components/ResultsPanel';
import { apiError, formatEventDate, STATUS_STYLE } from './tabulationUtils';

/** Public site page for a published event. */
const PUBLIC_SITE = 'https://gad.tanauancity.gov.ph';

type PanelTab = 'setup' | 'scores' | 'results';

function defaultTab(c: TabContest): PanelTab {
  if (c.status === 'FINALIZED') return 'results';
  if (c.criteria.length === 0 || c.contestants.length === 0 || c.judges.length === 0) return 'setup';
  return 'scores';
}

export default function TabulationEventPage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const { data: event, isLoading, isError, refetch } = useTabulationEvent(id);
  const setPublished = useSetEventPublished(id ?? '');
  const deleteContest = useDeleteContest(id ?? '');

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TabContest | null>(null);

  const contests = event?.contests ?? [];
  const selected = contests.find((c) => c.id === params.get('c')) ?? contests[0];
  const tabParam = params.get('tab') as PanelTab | null;
  const tab: PanelTab = tabParam && ['setup', 'scores', 'results'].includes(tabParam)
    ? tabParam
    : selected ? defaultTab(selected) : 'setup';

  function select(contestId: string, nextTab?: PanelTab) {
    const next = new URLSearchParams(params);
    next.set('c', contestId);
    if (nextTab) next.set('tab', nextTab); else next.delete('tab');
    setParams(next, { replace: true });
  }

  async function togglePublished() {
    if (!event) return;
    try {
      await setPublished.mutateAsync(!event.isPublished);
      toast.success(event.isPublished ? 'Event removed from the website' : 'Event is now on the website');
    } catch (err) {
      toast.error(apiError(err, 'Failed to update the website'));
    }
  }

  async function handleDeleteContest() {
    if (!deleteTarget) return;
    try {
      await deleteContest.mutateAsync(deleteTarget.id);
      toast.success('Competition deleted');
      setDeleteTarget(null);
      const next = new URLSearchParams(params);
      next.delete('c');
      next.delete('tab');
      setParams(next, { replace: true });
    } catch (err) {
      toast.error(apiError(err, 'Failed to delete competition'));
    }
  }

  return (
    <DashboardLayout
      title="Tabulation"
      breadcrumb={`Admin / Tabulation${event ? ` / ${event.title}` : ''}`}
      defaultSidebarOpen={false}
    >
      <Link to="/tabulation" className="mb-3 inline-flex items-center gap-1 text-[12px] text-[#71717A] hover:text-[#09090B]">
        <ArrowLeftIcon className="size-3.5" /> All events
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-[10px]" />
          <Skeleton className="h-10 w-2/3 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-[10px]" />
        </div>
      ) : isError || !event ? (
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white py-12 text-center">
          <p className="text-[13px] text-[#71717A]">This event could not be loaded. It may have been deleted.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          {/* Event header */}
          <div className="mb-4 flex flex-col gap-4 rounded-[10px] border border-[#EBEBEB] bg-white p-4 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[16px] font-semibold text-[#09090B]">{event.title}</h2>
                <Button variant="ghost" size="icon-xs" onClick={() => setEditOpen(true)} title="Edit event">
                  <PencilIcon className="size-3.5" />
                </Button>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#71717A]">
                <span className="inline-flex items-center gap-1"><CalendarDaysIcon className="size-3.5" />{formatEventDate(event.eventDate)}</span>
                {event.venue && <span className="inline-flex items-center gap-1"><MapPinIcon className="size-3.5" />{event.venue}</span>}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#EBEBEB] px-3 py-2.5">
              <GlobeIcon className={`size-4 ${event.isPublished ? 'text-emerald-600' : 'text-[#A1A1AA]'}`} />
              <div>
                <p className="text-[13px] font-medium text-[#09090B]">Show on website</p>
                <p className="text-[11px] text-[#A1A1AA]">
                  {event.isPublished
                    ? `${event.publishedResultsCount} of ${event.contestCount} results published`
                    : 'Private — only admins can see it'}
                </p>
              </div>
              <Switch checked={event.isPublished} onCheckedChange={togglePublished} disabled={setPublished.isPending} />
              {event.isPublished && (
                <a
                  href={`${PUBLIC_SITE}/competitions/${event.id}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open on the website"
                  className="text-[#71717A] hover:text-[#09090B]"
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              )}
            </div>
          </div>

          {/* Competition picker */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {contests.map((c) => {
              const active = c.id === selected?.id;
              const st = STATUS_STYLE[c.status];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                    active
                      ? 'border-[#09090B] bg-[#09090B] text-white'
                      : 'border-[#E4E4E7] bg-white text-[#3F3F46] hover:bg-[#F4F4F5]'
                  }`}
                >
                  <span className="max-w-[220px] truncate">{c.name}</span>
                  <span className={`rounded-full border px-1.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                  {c.resultsPublished && <GlobeIcon className={`size-3 ${active ? 'text-emerald-300' : 'text-emerald-600'}`} />}
                </button>
              );
            })}
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <PlusIcon className="mr-1 size-3.5" /> Add competition
            </Button>
          </div>

          {!selected ? (
            <div className="rounded-[10px] border border-dashed border-[#E4E4E7] bg-white py-12 text-center">
              <TrophyIcon className="mx-auto mb-2 size-8 text-[#D4D4D8]" />
              <p className="text-[13px] text-[#71717A]">No competitions yet</p>
              <p className="mt-0.5 text-[12px] text-[#A1A1AA]">e.g. Sabayang Pagbigkas, Advocacy Video, Art Exhibit</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setAddOpen(true)}>
                <PlusIcon className="mr-1.5 size-4" /> Add the first competition
              </Button>
            </div>
          ) : (
            <div className="rounded-[10px] border border-[#EBEBEB] bg-white">
              <Tabs value={tab} onValueChange={(v) => select(selected.id, v as PanelTab)} className="flex-col gap-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-[#F4F4F5] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#09090B]">{selected.name}</p>
                    <p className="text-[11px] text-[#A1A1AA]">
                      {selected.contestants.length} {selected.contestantLabel.toLowerCase()}{selected.contestants.length === 1 ? '' : 's'} ·{' '}
                      {selected.judges.length} judge{selected.judges.length === 1 ? '' : 's'} · {selected.criteria.length} criteria
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLE[selected.status].className}>
                    {STATUS_STYLE[selected.status].label}
                  </Badge>
                  <div className="flex-1" />
                  <TabsList>
                    <TabsTrigger value="setup"><SettingsIcon /> Setup</TabsTrigger>
                    <TabsTrigger value="scores"><ClipboardPenIcon /> Score Sheets</TabsTrigger>
                    <TabsTrigger value="results"><TrophyIcon /> Results</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="icon-xs" title="Delete competition" onClick={() => setDeleteTarget(selected)}>
                    <Trash2Icon className="size-3.5 text-red-500" />
                  </Button>
                </div>

                <div className="p-4">
                  <TabsContent value="setup">
                    <ContestSetupPanel eventId={event.id} contest={selected} onSaved={() => select(selected.id, 'scores')} />
                  </TabsContent>
                  <TabsContent value="scores">
                    <ScoreSheetPanel event={event} contest={selected} onGoToSetup={() => select(selected.id, 'setup')} />
                  </TabsContent>
                  <TabsContent value="results">
                    <ResultsPanel event={event} contest={selected} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}

          <EventFormDialog open={editOpen} onClose={() => setEditOpen(false)} event={event} />
          <AddContestDialog
            open={addOpen}
            onClose={() => setAddOpen(false)}
            eventId={event.id}
            onCreated={(contestId) => select(contestId, 'setup')}
          />

          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Competition</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete <strong>{deleteTarget?.name}</strong> with its criteria, contestants, judges and all scores?
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteContest}
                  disabled={deleteContest.isPending}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {deleteContest.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </DashboardLayout>
  );
}
