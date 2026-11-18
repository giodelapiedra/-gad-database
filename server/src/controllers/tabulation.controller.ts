import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/db';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { fromDateOnly } from '../utils/training';
import {
  createEventSchema,
  updateEventSchema,
  publishSchema,
  createContestSchema,
  contestSetupSchema,
  contestStatusSchema,
  contestPublishSchema,
  saveScoresSchema,
  addJudgeSchema,
} from '../schemas/tabulation.schemas';
import {
  FULL_CONTEST_INCLUDE,
  FULL_EVENT_INCLUDE,
  resultsFor,
  serializeEventDetail,
  serializeEventSummary,
  serializePublicEvent,
} from '../utils/tabulation';
import { buildJudgeSheetPdf, buildResultsPdf } from '../utils/tabulation.pdf';

/** Thrown inside handlers/transactions to return a specific HTTP error. */
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function handleError(res: Response, err: unknown, where: string, notFound = 'Not found.'): void {
  if (err instanceof HttpError) { sendError(res, err.message, err.status); return; }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    sendError(res, notFound, 404);
    return;
  }
  console.error(`${where} error:`, err);
  sendError(res, 'Something went wrong.', 500);
}

function firstIssue(err: { issues: { message: string }[] }): string {
  return err.issues[0]?.message ?? 'Invalid request body.';
}

async function loadEventDetail(id: string) {
  const event = await prisma.tabulationEvent.findUnique({ where: { id }, include: FULL_EVENT_INCLUDE });
  if (!event) throw new HttpError(404, 'Event not found.');
  return serializeEventDetail(event);
}

async function loadContest(id: string) {
  const contest = await prisma.tabulationContest.findUnique({ where: { id }, include: FULL_CONTEST_INCLUDE });
  if (!contest) throw new HttpError(404, 'Competition not found.');
  return contest;
}

// ═══ Events ════════════════════════════════════════════════════════════════

// GET /api/tabulation/events
export async function listEvents(_req: Request, res: Response): Promise<void> {
  try {
    const events = await prisma.tabulationEvent.findMany({
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
      include: { contests: { select: { status: true, resultsPublished: true } } },
    });
    sendSuccess(res, events.map(serializeEventSummary), 'Events retrieved');
  } catch (err) {
    handleError(res, err, 'listEvents');
  }
}

// GET /api/tabulation/events/:id — full detail with live results (polled by the admin UI)
export async function getEvent(req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await loadEventDetail(req.params.id as string), 'Event retrieved');
  } catch (err) {
    handleError(res, err, 'getEvent', 'Event not found.');
  }
}

// POST /api/tabulation/events
export async function createEvent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, firstIssue(parsed.error), 400); return; }
    const { eventDate, description, venue, title } = parsed.data;
    const event = await prisma.tabulationEvent.create({
      data: {
        title,
        description: description ?? '',
        venue: venue ?? '',
        eventDate: fromDateOnly(eventDate),
        createdById: req.user!.id,
      },
    });
    sendSuccess(res, await loadEventDetail(event.id), 'Event created', 201);
  } catch (err) {
    handleError(res, err, 'createEvent');
  }
}

// PUT /api/tabulation/events/:id
export async function updateEvent(req: Request, res: Response): Promise<void> {
  try {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, firstIssue(parsed.error), 400); return; }
    const { eventDate, ...rest } = parsed.data;
    const id = req.params.id as string;
    await prisma.tabulationEvent.update({
      where: { id },
      data: { ...rest, ...(eventDate ? { eventDate: fromDateOnly(eventDate) } : {}) },
    });
    sendSuccess(res, await loadEventDetail(id), 'Event updated');
  } catch (err) {
    handleError(res, err, 'updateEvent', 'Event not found.');
  }
}

// PATCH /api/tabulation/events/:id/publish
// Unpublishing the event hides it entirely; per-contest result flags are kept so re-publishing restores them.
export async function setEventPublished(req: Request, res: Response): Promise<void> {
  try {
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, 'isPublished must be true or false.', 400); return; }
    const id = req.params.id as string;
    await prisma.tabulationEvent.update({ where: { id }, data: { isPublished: parsed.data.isPublished } });
    sendSuccess(
      res,
      await loadEventDetail(id),
      parsed.data.isPublished ? 'Event published to the website' : 'Event removed from the website',
    );
  } catch (err) {
    handleError(res, err, 'setEventPublished', 'Event not found.');
  }
}

// DELETE /api/tabulation/events/:id
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  try {
    await prisma.tabulationEvent.delete({ where: { id: req.params.id as string } });
    sendSuccess(res, null, 'Event deleted');
  } catch (err) {
    handleError(res, err, 'deleteEvent', 'Event not found.');
  }
}

// ═══ Contests ══════════════════════════════════════════════════════════════

// POST /api/tabulation/events/:id/contests
export async function createContest(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createContestSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, firstIssue(parsed.error), 400); return; }
    const eventId = req.params.id as string;
    const event = await prisma.tabulationEvent.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) { sendError(res, 'Event not found.', 404); return; }

    const last = await prisma.tabulationContest.aggregate({ where: { eventId }, _max: { sortOrder: true } });
    await prisma.tabulationContest.create({
      data: {
        eventId,
        name: parsed.data.name,
        contestantLabel: parsed.data.contestantLabel ?? 'Contestant',
        rankingMethod: parsed.data.rankingMethod ?? 'AVERAGE',
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    sendSuccess(res, await loadEventDetail(eventId), 'Competition added', 201);
  } catch (err) {
    handleError(res, err, 'createContest');
  }
}

/** Splits desired items into update/create and finds removed rows; rejects ids from other contests. */
function diffById<T extends { id?: string }>(desired: T[], existingIds: string[], what: string) {
  const existing = new Set(existingIds);
  for (const item of desired) {
    if (item.id && !existing.has(item.id)) throw new HttpError(400, `Unknown ${what} in this competition.`);
  }
  const kept = new Set(desired.map((d) => d.id).filter(Boolean));
  return { removeIds: existingIds.filter((id) => !kept.has(id)) };
}

// PUT /api/tabulation/contests/:id — save the whole setup (criteria, contestants, judges)
export async function saveContestSetup(req: Request, res: Response): Promise<void> {
  try {
    const parsed = contestSetupSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, firstIssue(parsed.error), 400); return; }
    const data = parsed.data;
    const id = req.params.id as string;

    const contest = await loadContest(id);
    if (contest.status === 'FINALIZED') {
      throw new HttpError(409, 'This competition is finalized. Reopen scoring before changing the setup.');
    }

    const crit = diffById(data.criteria, contest.criteria.map((c) => c.id), 'criterion');
    const cont = diffById(data.contestants, contest.contestants.map((c) => c.id), 'contestant');
    const judg = diffById(data.judges, contest.judges.map((j) => j.id), 'judge');

    // A lowered weight must not invalidate scores already given for that criterion.
    for (const c of data.criteria) {
      if (!c.id) continue;
      const over = contest.scores.find((s) => s.criterionId === c.id && s.value > c.weight + 1e-9);
      if (over) {
        throw new HttpError(
          409,
          `"${c.name}" already has a score of ${over.value}, above its new maximum of ${c.weight}. Fix that score first.`,
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.tabulationContest.update({
        where: { id },
        data: { name: data.name, contestantLabel: data.contestantLabel, rankingMethod: data.rankingMethod },
      });

      // Removals cascade to their scores.
      if (crit.removeIds.length) await tx.tabulationCriterion.deleteMany({ where: { id: { in: crit.removeIds } } });
      if (cont.removeIds.length) await tx.tabulationContestant.deleteMany({ where: { id: { in: cont.removeIds } } });
      if (judg.removeIds.length) await tx.tabulationJudge.deleteMany({ where: { id: { in: judg.removeIds } } });

      for (const [i, c] of data.criteria.entries()) {
        const fields = { name: c.name, description: c.description ?? '', weight: c.weight, sortOrder: i };
        if (c.id) await tx.tabulationCriterion.update({ where: { id: c.id }, data: fields });
        else await tx.tabulationCriterion.create({ data: { ...fields, contestId: id } });
      }
      for (const [i, c] of data.contestants.entries()) {
        const fields = { name: c.name, number: i + 1 };
        if (c.id) await tx.tabulationContestant.update({ where: { id: c.id }, data: fields });
        else await tx.tabulationContestant.create({ data: { ...fields, contestId: id } });
      }
      for (const j of data.judges) {
        const fields = { name: j.name, title: j.title ?? '', judgeNo: j.judgeNo };
        if (j.id) await tx.tabulationJudge.update({ where: { id: j.id }, data: fields });
        else await tx.tabulationJudge.create({ data: { ...fields, contestId: id } });
      }
    });

    sendSuccess(res, await loadEventDetail(contest.eventId), 'Competition setup saved');
  } catch (err) {
    handleError(res, err, 'saveContestSetup', 'Competition not found.');
  }
}

// POST /api/tabulation/contests/:id/judges — add one judge without resubmitting the whole setup
export async function addJudge(req: Request, res: Response): Promise<void> {
  try {
    const parsed = addJudgeSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, firstIssue(parsed.error), 400); return; }
    const contest = await loadContest(req.params.id as string);
    if (contest.status === 'FINALIZED') {
      throw new HttpError(409, 'This competition is finalized. Reopen scoring before adding judges.');
    }

    const used = new Set(contest.judges.map((j) => j.judgeNo));
    let judgeNo = parsed.data.judgeNo;
    if (judgeNo !== undefined && used.has(judgeNo)) {
      throw new HttpError(409, `Judge No. ${judgeNo} already exists in this competition.`);
    }
    if (judgeNo === undefined) {
      judgeNo = 1;
      while (used.has(judgeNo)) judgeNo++;
    }

    await prisma.tabulationJudge.create({
      data: { contestId: contest.id, judgeNo, name: parsed.data.name, title: parsed.data.title ?? '' },
    });
    sendSuccess(res, await loadEventDetail(contest.eventId), `Judge No. ${judgeNo} added`, 201);
  } catch (err) {
    handleError(res, err, 'addJudge', 'Competition not found.');
  }
}

// PATCH /api/tabulation/contests/:id/status — finalize (lock) or reopen scoring
export async function setContestStatus(req: Request, res: Response): Promise<void> {
  try {
    const parsed = contestStatusSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, 'Invalid status.', 400); return; }
    const contest = await loadContest(req.params.id as string);

    if (parsed.data.status === 'FINALIZED') {
      if (contest.contestants.length === 0 || contest.judges.length === 0) {
        throw new HttpError(409, 'Add contestants and judges before finalizing.');
      }
      const results = resultsFor(contest);
      if (!results.allJudgesComplete) {
        const pending = results.judges.filter((j) => !j.complete).length;
        throw new HttpError(409, `${pending} judge score sheet(s) are still incomplete.`);
      }
      await prisma.tabulationContest.update({
        where: { id: contest.id },
        data: { status: 'FINALIZED', finalizedAt: new Date() },
      });
    } else {
      // Reopening pulls any published results off the website — they may change.
      await prisma.tabulationContest.update({
        where: { id: contest.id },
        data: { status: 'SCORING', finalizedAt: null, resultsPublished: false },
      });
    }

    sendSuccess(
      res,
      await loadEventDetail(contest.eventId),
      parsed.data.status === 'FINALIZED' ? 'Results finalized' : 'Scoring reopened',
    );
  } catch (err) {
    handleError(res, err, 'setContestStatus', 'Competition not found.');
  }
}

// PATCH /api/tabulation/contests/:id/publish — show/hide final results on the website
export async function setContestResultsPublished(req: Request, res: Response): Promise<void> {
  try {
    const parsed = contestPublishSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, 'resultsPublished must be true or false.', 400); return; }
    const contest = await prisma.tabulationContest.findUnique({ where: { id: req.params.id as string } });
    if (!contest) { sendError(res, 'Competition not found.', 404); return; }

    if (parsed.data.resultsPublished && contest.status !== 'FINALIZED') {
      throw new HttpError(409, 'Finalize the results before publishing them.');
    }

    await prisma.$transaction([
      prisma.tabulationContest.update({
        where: { id: contest.id },
        data: { resultsPublished: parsed.data.resultsPublished },
      }),
      // Publishing results implies the event itself should be visible.
      ...(parsed.data.resultsPublished
        ? [prisma.tabulationEvent.update({ where: { id: contest.eventId }, data: { isPublished: true } })]
        : []),
    ]);

    sendSuccess(
      res,
      await loadEventDetail(contest.eventId),
      parsed.data.resultsPublished ? 'Results published to the website' : 'Results hidden from the website',
    );
  } catch (err) {
    handleError(res, err, 'setContestResultsPublished', 'Competition not found.');
  }
}

// DELETE /api/tabulation/contests/:id
export async function deleteContest(req: Request, res: Response): Promise<void> {
  try {
    const contest = await prisma.tabulationContest.delete({ where: { id: req.params.id as string } });
    sendSuccess(res, await loadEventDetail(contest.eventId), 'Competition deleted');
  } catch (err) {
    handleError(res, err, 'deleteContest', 'Competition not found.');
  }
}

// ═══ Scores ════════════════════════════════════════════════════════════════

// PUT /api/tabulation/contests/:id/judges/:judgeId/scores — save (part of) one judge's sheet
export async function saveJudgeScores(req: Request, res: Response): Promise<void> {
  try {
    const parsed = saveScoresSchema.safeParse(req.body);
    if (!parsed.success) { sendError(res, firstIssue(parsed.error), 400); return; }
    const contest = await loadContest(req.params.id as string);
    const judgeId = req.params.judgeId as string;

    if (contest.status === 'FINALIZED') {
      throw new HttpError(409, 'This competition is finalized. Reopen scoring to change scores.');
    }
    if (!contest.judges.some((j) => j.id === judgeId)) throw new HttpError(404, 'Judge not found in this competition.');

    const contestantIds = new Set(contest.contestants.map((c) => c.id));
    const criteria = new Map(contest.criteria.map((c) => [c.id, c]));
    for (const s of parsed.data.scores) {
      if (!contestantIds.has(s.contestantId)) throw new HttpError(400, 'Unknown contestant in this competition.');
      const cr = criteria.get(s.criterionId);
      if (!cr) throw new HttpError(400, 'Unknown criterion in this competition.');
      if (s.value !== null && s.value > cr.weight + 1e-9) {
        throw new HttpError(400, `"${cr.name}" has a maximum of ${cr.weight} points.`);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const s of parsed.data.scores) {
        const key = { judgeId, contestantId: s.contestantId, criterionId: s.criterionId };
        if (s.value === null) {
          await tx.tabulationScore.deleteMany({ where: key });
        } else {
          const value = Math.round(s.value * 100) / 100;
          await tx.tabulationScore.upsert({
            where: { judgeId_contestantId_criterionId: key },
            create: { ...key, contestId: contest.id, value },
            update: { value },
          });
        }
      }
      if (contest.status === 'SETUP') {
        await tx.tabulationContest.update({ where: { id: contest.id }, data: { status: 'SCORING' } });
      }
    });

    sendSuccess(res, await loadEventDetail(contest.eventId), 'Scores saved');
  } catch (err) {
    handleError(res, err, 'saveJudgeScores', 'Competition not found.');
  }
}

// GET /api/tabulation/contests/:id/pdf?type=results
// GET /api/tabulation/contests/:id/pdf?type=judge&judgeId=…&blank=1
export async function downloadContestPdf(req: Request, res: Response): Promise<void> {
  try {
    const contest = await loadContest(req.params.id as string);
    const event = await prisma.tabulationEvent.findUnique({ where: { id: contest.eventId } });
    if (!event) throw new HttpError(404, 'Event not found.');

    const type = req.query.type === 'judge' ? 'judge' : 'results';
    let pdf: { buffer: Buffer; fileName: string };
    if (type === 'judge') {
      const judgeId = typeof req.query.judgeId === 'string' ? req.query.judgeId : '';
      if (!contest.judges.some((j) => j.id === judgeId)) throw new HttpError(404, 'Judge not found in this competition.');
      pdf = await buildJudgeSheetPdf(event, contest, judgeId, req.query.blank === '1');
    } else {
      if (contest.judges.length === 0 || contest.contestants.length === 0) {
        throw new HttpError(409, 'Add contestants and judges first.');
      }
      pdf = await buildResultsPdf(event, contest);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdf.fileName)}"`);
    res.setHeader('Content-Length', pdf.buffer.length);
    res.send(pdf.buffer);
  } catch (err) {
    handleError(res, err, 'downloadContestPdf', 'Competition not found.');
  }
}

// ═══ Public website ════════════════════════════════════════════════════════

// GET /api/public/tabulation — published events, newest first
export async function getPublicTabulationEvents(_req: Request, res: Response): Promise<void> {
  try {
    const events = await prisma.tabulationEvent.findMany({
      where: { isPublished: true },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
      include: FULL_EVENT_INCLUDE,
      take: 20,
    });
    res.setHeader('Cache-Control', 'public, max-age=30');
    sendSuccess(res, events.map(serializePublicEvent), 'Competition results retrieved');
  } catch (err) {
    handleError(res, err, 'getPublicTabulationEvents');
  }
}

// GET /api/public/tabulation/:id — unpublished events look exactly like missing ones
export async function getPublicTabulationEvent(req: Request, res: Response): Promise<void> {
  try {
    const event = await prisma.tabulationEvent.findFirst({
      where: { id: req.params.id as string, isPublished: true },
      include: FULL_EVENT_INCLUDE,
    });
    if (!event) { sendError(res, 'Event not found.', 404); return; }
    res.setHeader('Cache-Control', 'public, max-age=30');
    sendSuccess(res, serializePublicEvent(event), 'Competition results retrieved');
  } catch (err) {
    handleError(res, err, 'getPublicTabulationEvent');
  }
}
