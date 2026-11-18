/**
 * Seeds the 18-Day Campaign to End VAW competitions from "Tabulation Sheets.xlsx".
 * Idempotent: skips if an event with the same title already exists.
 *
 *   npx ts-node prisma/tabulation_seed.ts
 *
 * Only judges named on the sample sheets are seeded; add the rest in Tools → Tabulation.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_TITLE = '18-Day Campaign to End Violence Against Women (VAW) 2026';

interface SeedContest {
  name: string;
  contestantLabel: string;
  criteria: { name: string; description: string; weight: number }[];
  contestants: string[];
  judges: { judgeNo: number; name: string; title: string }[];
}

const CONTESTS: SeedContest[] = [
  {
    name: 'Sabayang Pagbigkas Competition',
    contestantLabel: 'School',
    criteria: [
      { name: 'Message and Advocacy Content', weight: 30,
        description: 'Clarity, relevance, accuracy, and strength of the VAWG advocacy message' },
      { name: 'Delivery and Voice Quality', weight: 25,
        description: 'Voice projection, diction, expression, emotion, and emphasis' },
      { name: 'Synchronization and Coordination', weight: 20,
        description: 'Timing, unity, formation, teamwork, and coordination' },
      { name: 'Creativity and Stage Presentation', weight: 15,
        description: 'Originality, use of movements, props, music, and overall presentation' },
      { name: 'Audience Impact', weight: 10,
        description: 'Ability to inspire reflection, awareness, and action' },
    ],
    contestants: [
      'Lily Rose', 'Tanauan Institute', 'La Consolacion', 'FAITH Fidelis',
      'Tanauan City Academy', 'Daughter of Mary Immaculate',
    ],
    judges: [{ judgeNo: 3, name: 'HON. EPHRAIGME F. BILOG', title: 'SK Federation President' }],
  },
  {
    name: 'Advocacy Video Competition',
    contestantLabel: 'School',
    criteria: [
      { name: 'Advocacy Message & Relevance', weight: 35,
        description: 'The video clearly communicates the importance of preventing and eliminating VAWC and is aligned with the objectives of the 18-Day Campaign. The message is accurate, relevant, and appropriate to the target audience' },
      // The sample sheet repeats the criterion above as this description (copy-paste slip) — left blank to fill in.
      { name: 'Creativity & Originality', weight: 25, description: '' },
      { name: 'Impact & Emotional Resonance', weight: 20,
        description: 'The video effectively captures the audience’s attention, creates awareness, encourages reflection, and inspires viewers to take action against VAW' },
      { name: 'Production Quality & Presentation', weight: 20,
        description: 'The video demonstrates effective use of cinematography, acting, audio, lighting, editing, visuals, captions/subtitles, and overall presentation. Technical quality should support, rather than overshadow, the advocacy message.' },
    ],
    contestants: [
      'Tanauan City High', 'Tanauan City Academy', 'La Consolacion', 'DMMC',
      'Lily Rose', 'Tanauan Institute', 'FAITH Fidelis', 'Assumption College',
    ],
    judges: [{ judgeNo: 1, name: 'ANGELO PEREZ', title: 'Chairperson of the Board - CAO' }],
  },
  {
    name: 'Barangay VAW Art Exhibit',
    contestantLabel: 'Barangay',
    criteria: [
      { name: 'Advocacy Message and Relevance', weight: 30,
        description: 'Clarity, strength, and relevance of the message on ending violence against women and children' },
      { name: 'Creativity and Originality', weight: 25,
        description: 'Uniqueness of concept, innovative presentation, and artistic interpretation' },
      { name: 'Use of Recyclable Materials', weight: 25,
        description: 'Effective, creative, and substantial use of recycled or repurposed materials' },
      { name: 'Craftsmanship and Presentation', weight: 20,
        description: 'Quality of construction, neatness, stability, and overall visual presentation' },
    ],
    contestants: [
      'Bagumbayan', 'Poblacion 5', 'Banjo East', 'Banjo West', 'Poblacion 3',
      'Poblacion 2', 'Poblacion 4', 'Pantay Bata', 'Luyos', 'Talaga',
    ],
    judges: [{ judgeNo: 1, name: 'CHARLOTTE FLOR S. QUIZA', title: 'DILG' }],
  },
];

async function main() {
  const existing = await prisma.tabulationEvent.findFirst({ where: { title: EVENT_TITLE } });
  if (existing) {
    console.log(`Skipped: "${EVENT_TITLE}" already exists (${existing.id}).`);
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });

  const event = await prisma.tabulationEvent.create({
    data: {
      title: EVENT_TITLE,
      description: 'Competitions organized by the Gender and Development Office in observance of the 18-Day Campaign to End Violence Against Women.',
      // Campaign opens Nov 25 — adjust in the admin if the competitions fall on another day.
      eventDate: new Date('2026-11-25T00:00:00.000Z'),
      venue: 'Tanauan City, Batangas',
      isPublished: false,
      createdById: admin?.id ?? null,
      contests: {
        create: CONTESTS.map((c, i) => ({
          name: c.name,
          contestantLabel: c.contestantLabel,
          rankingMethod: 'AVERAGE' as const,
          sortOrder: i,
          criteria: { create: c.criteria.map((cr, k) => ({ ...cr, sortOrder: k })) },
          contestants: { create: c.contestants.map((name, k) => ({ name, number: k + 1 })) },
          judges: { create: c.judges },
        })),
      },
    },
  });

  console.log(`Created "${event.title}" (${event.id}) with ${CONTESTS.length} competitions.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
