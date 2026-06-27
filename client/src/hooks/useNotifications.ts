import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  submissionId: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: AppNotification[];
  unreadCount: number;
  total: number;
  hasMore: boolean;
  nextPage: number | null;
  page: number;
  limit: number;
}

const NOTIF_KEY = ['notifications'];

export function useGetNotifications() {
  return useInfiniteQuery<NotificationsPage>({
    queryKey: NOTIF_KEY,
    queryFn: async ({ pageParam }) => {
      const res = await api.get('/notifications', { params: { page: pageParam, limit: 10 } });
      return res.data.data as NotificationsPage;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

// ── Optimistic helper: patch every page in the infinite cache ─────────────

type InfData = InfiniteData<NotificationsPage>;

function patchCache(
  qc: ReturnType<typeof useQueryClient>,
  updater: (pages: NotificationsPage[]) => NotificationsPage[],
) {
  qc.setQueryData<InfData>(NOTIF_KEY, (old) => {
    if (!old) return old;
    return { ...old, pages: updater(old.pages) };
  });
}

// ── Mark all read ─────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => { await api.patch('/notifications/read-all'); },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIF_KEY });
      const prev = qc.getQueryData<InfData>(NOTIF_KEY);
      patchCache(qc, (pages) =>
        pages.map((p) => ({
          ...p,
          unreadCount: 0,
          notifications: p.notifications.map((n) => ({ ...n, isRead: true })),
        })),
      );
      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIF_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });
}

// ── Mark one read ─────────────────────────────────────────────────────────

export function useMarkOneRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.patch(`/notifications/${id}/read`); },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIF_KEY });
      const prev = qc.getQueryData<InfData>(NOTIF_KEY);
      patchCache(qc, (pages) =>
        pages.map((p) => {
          const wasUnread = p.notifications.some((n) => n.id === id && !n.isRead);
          return {
            ...p,
            unreadCount: wasUnread ? Math.max(0, p.unreadCount - 1) : p.unreadCount,
            notifications: p.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n,
            ),
          };
        }),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIF_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });
}
