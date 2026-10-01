import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/db';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { createTrainingSchema, updateTrainingSchema, publishTrainingSchema } from '../schemas/training.schemas';
import { fromDateOnly, serializeTraining, todayInManila } from '../utils/training';

const ORDER: Prisma.TrainingOrderByWithRelationInput[] = [{ startDate: 'desc' }, { createdAt: 'desc' }];

function isNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

// ─── GET /api/trainings (admin) ──────────────────────────────────────────

export async function listTrainings(_req: Request, res: Response): Promise<void> {
  try {
    const trainings = await prisma.training.findMany({ orderBy: ORDER });
    const today = todayInManila();
    sendSuccess(res, trainings.map((t) => serializeTraining(t, today)), 'Trainings retrieved');
  } catch (err) {
    console.error('listTrainings error:', err);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ─── POST /api/trainings (admin) ─────────────────────────────────────────

export async function createTraining(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createTrainingSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0]?.message ?? 'Invalid request body.', 400);
      return;
    }
    const { startDate, endDate, ...rest } = parsed.data;

    const training = await prisma.training.create({
      data: {
        ...rest,
        startDate: fromDateOnly(startDate),
        endDate: endDate ? fromDateOnly(endDate) : null,
        createdById: req.user!.id,
      },
    });
    sendSuccess(res, serializeTraining(training), 'Training created', 201);
  } catch (err) {
    console.error('createTraining error:', err);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ─── PUT /api/trainings/:id (admin) ──────────────────────────────────────

export async function updateTraining(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = updateTrainingSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0]?.message ?? 'Invalid request body.', 400);
      return;
    }
    const { startDate, endDate, ...rest } = parsed.data;

    // A partial update may change only one side of the range — validate against the stored row.
    if (startDate !== undefined || endDate !== undefined) {
      const current = await prisma.training.findUnique({ where: { id }, select: { startDate: true, endDate: true } });
      if (!current) { sendError(res, 'Training not found.', 404); return; }
      const nextStart = startDate ? fromDateOnly(startDate) : current.startDate;
      const nextEnd = endDate === undefined ? current.endDate : endDate ? fromDateOnly(endDate) : null;
      if (nextEnd && nextEnd < nextStart) {
        sendError(res, 'End date cannot be before the start date.', 400);
        return;
      }
    }

    const training = await prisma.training.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: fromDateOnly(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? fromDateOnly(endDate) : null } : {}),
      },
    });
    sendSuccess(res, serializeTraining(training), 'Training updated');
  } catch (err) {
    if (isNotFound(err)) { sendError(res, 'Training not found.', 404); return; }
    console.error('updateTraining error:', err);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ─── PATCH /api/trainings/:id/publish (admin) ────────────────────────────

export async function setTrainingPublished(req: Request, res: Response): Promise<void> {
  try {
    const parsed = publishTrainingSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'isPublished must be true or false.', 400);
      return;
    }
    const training = await prisma.training.update({
      where: { id: req.params.id as string },
      data: { isPublished: parsed.data.isPublished },
    });
    sendSuccess(res, serializeTraining(training), parsed.data.isPublished ? 'Training published' : 'Training unpublished');
  } catch (err) {
    if (isNotFound(err)) { sendError(res, 'Training not found.', 404); return; }
    console.error('setTrainingPublished error:', err);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ─── DELETE /api/trainings/:id (admin) ───────────────────────────────────

export async function deleteTraining(req: Request, res: Response): Promise<void> {
  try {
    await prisma.training.delete({ where: { id: req.params.id as string } });
    sendSuccess(res, null, 'Training deleted');
  } catch (err) {
    if (isNotFound(err)) { sendError(res, 'Training not found.', 404); return; }
    console.error('deleteTraining error:', err);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ─── GET /api/public/trainings (public website) ──────────────────────────
// Only published trainings. Upcoming/ongoing first (soonest first), then past (most recent first).

export async function getPublicTrainings(_req: Request, res: Response): Promise<void> {
  try {
    const trainings = await prisma.training.findMany({
      where: { isPublished: true },
      orderBy: { startDate: 'asc' },
    });
    const today = todayInManila();
    const items = trainings.map((t) => {
      // Admin-only fields stay off the public API.
      const { isPublished: _p, createdAt: _c, updatedAt: _u, ...pub } = serializeTraining(t, today);
      return pub;
    });
    const active = items.filter((t) => t.status !== 'completed');
    const past = items.filter((t) => t.status === 'completed').reverse();

    res.setHeader('Cache-Control', 'public, max-age=60');
    sendSuccess(res, [...active, ...past], 'Trainings retrieved');
  } catch (err) {
    console.error('getPublicTrainings error:', err);
    sendError(res, 'Something went wrong.', 500);
  }
}
