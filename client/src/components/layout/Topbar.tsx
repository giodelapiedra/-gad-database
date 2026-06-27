import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Upload,
  Plus,
  PanelLeftIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CheckCheckIcon,
  InboxIcon,
  Loader2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useGetNotifications,
  useMarkAllRead,
  useMarkOneRead,
  type AppNotification,
} from '@/hooks/useNotifications';

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// ─── Single notification row ──────────────────────────────────────────────

function NotifItem({
  n,
  onRead,
}: {
  n: AppNotification;
  onRead: (id: string, submissionId: string | null) => void;
}) {
  const isApproved = n.type === 'APPROVED';
  return (
    <button
      onClick={() => onRead(n.id, n.submissionId)}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[#F9F9F9] ${
        !n.isRead ? 'bg-blue-50/50' : ''
      }`}
    >
      <div
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
          isApproved ? 'bg-emerald-100' : 'bg-red-100'
        }`}
      >
        {isApproved
          ? <CheckCircle2Icon className="size-4 text-emerald-600" />
          : <XCircleIcon className="size-4 text-red-500" />
        }
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-[13px] leading-snug ${!n.isRead ? 'font-semibold text-[#09090B]' : 'font-medium text-[#52525B]'}`}>
          {n.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#71717A]">
          {n.message}
        </p>
        <p className="mt-1 text-[11px] text-[#A1A1AA]">{timeAgo(n.createdAt)}</p>
      </div>

      {!n.isRead && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

// ─── Notification Bell + Dropdown ─────────────────────────────────────────

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useGetNotifications();

  const markAll = useMarkAllRead();
  const markOne = useMarkOneRead();

  // Flatten all pages into one list
  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];
  // unreadCount lives on every page (same value); use first page
  const unread = data?.pages[0]?.unreadCount ?? 0;
  const total  = data?.pages[0]?.total ?? 0;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleRead(id: string, submissionId: string | null) {
    markOne.mutate(id);
    setOpen(false);
    if (submissionId) {
      const dest =
        user?.role === 'ENCODER'
          ? `/my-submissions/${submissionId}`
          : `/submissions`;
      navigate(dest);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#71717A]"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[300] w-[360px] overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#F0F0F0] px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#09090B]">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {unread} unread
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] disabled:opacity-50"
              >
                <CheckCheckIcon className="size-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2Icon className="size-5 animate-spin text-[#A1A1AA]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <InboxIcon className="mb-2 size-9 text-[#D4D4D8]" />
                <p className="text-[13px] text-[#A1A1AA]">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F4F4F5]">
                {notifications.map((n) => (
                  <NotifItem key={n.id} n={n} onRead={handleRead} />
                ))}

                {/* Load more */}
                {hasNextPage && (
                  <div className="px-4 py-2.5">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E4E4E7] py-2 text-[12px] text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] disabled:opacity-50"
                    >
                      {isFetchingNextPage
                        ? <><Loader2Icon className="size-3.5 animate-spin" /> Loading…</>
                        : `Load more (${total - notifications.length} remaining)`
                      }
                    </button>
                  </div>
                )}

                {/* All loaded indicator */}
                {!hasNextPage && notifications.length > 0 && total > 10 && (
                  <p className="py-3 text-center text-[11px] text-[#A1A1AA]">
                    All {total} notifications loaded
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────

interface TopbarProps {
  title: string;
  breadcrumb: string;
  onUpload?: () => void;
  onAddRecord?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Topbar({
  title,
  breadcrumb,
  onUpload,
  onAddRecord,
  sidebarOpen,
  onToggleSidebar,
}: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F0] bg-white px-4">

      {/* ── Left: toggle + title ── */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#71717A]"
        >
          <PanelLeftIcon className="size-[18px]" />
        </button>

        <div className="h-5 w-px shrink-0 bg-[#E4E4E7]" />

        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold text-[#09090B]">{title}</h1>
          <p className="truncate text-[11px] text-[#A1A1AA]">{breadcrumb}</p>
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="h-8 w-[180px] rounded-md bg-[#F4F4F5] pl-3 pr-3 text-[13px] text-[#09090B] outline-none placeholder:text-[#A1A1AA] focus:ring-1 focus:ring-[#D4D4D8]"
          />
        </div>

        <NotificationBell />

        {onUpload && (
          <Button variant="ghost" size="sm" onClick={onUpload}>
            <Upload className="size-3.5" />
            Upload
          </Button>
        )}

        {onAddRecord && (
          <Button
            size="sm"
            onClick={onAddRecord}
            className="bg-[#18181B] text-white hover:bg-[#18181B]/90"
          >
            <Plus className="size-3.5" />
            Add Record
          </Button>
        )}
      </div>

    </header>
  );
}
