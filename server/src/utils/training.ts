import { Training } from '@prisma/client';

export type TrainingStatus = 'upcoming' | 'ongoing' | 'completed';

/** DATE columns come back as UTC-midnight Dates — keep them as plain calendar dates. */
export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** Today's calendar date in the Philippines (YYYY-MM-DD), independent of server timezone. */
export function todayInManila(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

/** Status is derived from the schedule so it never goes stale. */
export function deriveTrainingStatus(start: string, end: string | null, today = todayInManila()): TrainingStatus {
  if (today < start) return 'upcoming';
  if (today <= (end ?? start)) return 'ongoing';
  return 'completed';
}

/** Shape shared by the admin API and the public website. */
export function serializeTraining(t: Training, today = todayInManila()) {
  const startDate = toDateOnly(t.startDate);
  const endDate = t.endDate ? toDateOnly(t.endDate) : null;
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type.toLowerCase() as Lowercase<Training['type']>,
    status: deriveTrainingStatus(startDate, endDate, today),
    startDate,
    endDate,
    venue: t.venue,
    organizer: t.organizer,
    targetParticipants: t.targetParticipants,
    tags: t.tags,
    featured: t.featured,
    isPublished: t.isPublished,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
