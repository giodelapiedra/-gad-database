import { Response } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import prisma from '../utils/db';

const DEFAULT_LIMIT = 10;

// ─── GET /api/notifications ───────────────────────────────────────────────

export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page  = Math.max(1, parseInt((req.query['page']  as string) || '1',  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt((req.query['limit'] as string) || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const skip  = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.user!.id } }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    const hasMore  = skip + notifications.length < total;
    const nextPage = hasMore ? page + 1 : null;

    sendSuccess(res, { notifications, unreadCount, total, hasMore, nextPage, page, limit }, 'Notifications retrieved.');
  } catch (err) {
    console.error('List notifications error:', err);
    sendError(res, 'Failed to retrieve notifications.', 500);
  }
}

// ─── PATCH /api/notifications/read-all ───────────────────────────────────

export async function readAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data:  { isRead: true },
    });
    sendSuccess(res, null, 'All notifications marked as read.');
  } catch (err) {
    sendError(res, 'Failed to mark notifications as read.', 500);
  }
}

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────

export async function readOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data:  { isRead: true },
    });
    sendSuccess(res, null, 'Notification marked as read.');
  } catch (err) {
    sendError(res, 'Failed to mark notification as read.', 500);
  }
}
