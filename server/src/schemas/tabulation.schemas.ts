import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be in YYYY-MM-DD format.');
const optionalId = z.string().min(1).max(50).optional();

const eventFields = {
  title: z.string().trim().min(1, 'Event title is required.').max(200),
  description: z.string().trim().max(5000).optional(),
  eventDate: isoDate,
  venue: z.string().trim().max(300).optional(),
};

export const createEventSchema = z.object(eventFields);
export const updateEventSchema = z.object(eventFields).partial();
export const publishSchema = z.object({ isPublished: z.boolean() });

export const createContestSchema = z.object({
  name: z.string().trim().min(1, 'Competition name is required.').max(200),
  contestantLabel: z.string().trim().min(1).max(40).optional(),
  rankingMethod: z.enum(['AVERAGE', 'RANK_SUM']).optional(),
});

/** Full setup save: arrays are the desired final state, in display order. Items with an id are updated. */
export const contestSetupSchema = z
  .object({
    name: z.string().trim().min(1, 'Competition name is required.').max(200),
    contestantLabel: z.string().trim().min(1, 'Contestant label is required.').max(40),
    rankingMethod: z.enum(['AVERAGE', 'RANK_SUM']),
    criteria: z
      .array(
        z.object({
          id: optionalId,
          name: z.string().trim().min(1, 'Every criterion needs a name.').max(200),
          description: z.string().trim().max(1000).optional(),
          weight: z.number().positive('Criterion weights must be greater than 0.').max(100),
        }),
      )
      .min(1, 'Add at least one criterion.')
      .max(20),
    contestants: z
      .array(z.object({ id: optionalId, name: z.string().trim().min(1, 'Every contestant needs a name.').max(200) }))
      .max(200),
    judges: z
      .array(
        z.object({
          id: optionalId,
          judgeNo: z.number().int().min(1, 'Judge numbers start at 1.').max(99),
          name: z.string().trim().min(1, 'Every judge needs a name.').max(200),
          title: z.string().trim().max(200).optional(),
        }),
      )
      .max(30),
  })
  .refine((d) => Math.abs(d.criteria.reduce((s, c) => s + c.weight, 0) - 100) < 0.001, {
    message: 'Criteria weights must add up to exactly 100%.',
    path: ['criteria'],
  })
  .refine((d) => new Set(d.judges.map((j) => j.judgeNo)).size === d.judges.length, {
    message: 'Two judges cannot share the same judge number.',
    path: ['judges'],
  });

export const contestStatusSchema = z.object({ status: z.enum(['SCORING', 'FINALIZED']) });
export const contestPublishSchema = z.object({ resultsPublished: z.boolean() });

export const saveScoresSchema = z.object({
  scores: z
    .array(
      z.object({
        contestantId: z.string().min(1),
        criterionId: z.string().min(1),
        /** null clears the cell. */
        value: z.number().min(0, 'Scores cannot be negative.').nullable(),
      }),
    )
    .max(5000),
});

/** Quick add from the score-sheet screen; judgeNo defaults to the next free number. */
export const addJudgeSchema = z.object({
  judgeNo: z.number().int().min(1, 'Judge numbers start at 1.').max(99).optional(),
  name: z.string().trim().min(1, 'Judge name is required.').max(200),
  title: z.string().trim().max(200).optional(),
});
