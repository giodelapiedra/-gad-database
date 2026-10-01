import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be in YYYY-MM-DD format.');

const trainingFields = {
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: z.string().trim().min(1, 'Description is required.').max(5000),
  type: z.enum(['SEMINAR', 'WORKSHOP', 'WEBINAR', 'FORUM', 'CONFERENCE']),
  startDate: isoDate,
  endDate: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
  venue: z.string().trim().min(1, 'Venue is required.').max(300),
  organizer: z.string().trim().min(1, 'Organizer is required.').max(200),
  targetParticipants: z.string().trim().min(1, 'Target participants is required.').max(300),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  featured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
};

const endNotBeforeStart = (d: { startDate?: string; endDate?: string | null }) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;
const endDateIssue = { message: 'End date cannot be before the start date.', path: ['endDate'] };

export const createTrainingSchema = z.object(trainingFields).refine(endNotBeforeStart, endDateIssue);

export const updateTrainingSchema = z.object(trainingFields).partial().refine(endNotBeforeStart, endDateIssue);

export const publishTrainingSchema = z.object({ isPublished: z.boolean() });

