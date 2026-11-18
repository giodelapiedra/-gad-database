// Tabulation PDFs: a judge's score sheet (filled or blank) and the consolidated result.
// Layout follows the GAD Office "Tabulation Sheets.xlsx": official Tanauan letterhead,
// competition title, score grid, then signature lines for the judges.
import fs from 'fs';
import path from 'path';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { render } from './pdf';
import { resultsFor, type FullContest } from './tabulation';
import { toDateOnly } from './training';
import type { TabulationEvent } from '@prisma/client';

const INK = '#111827';
const MUTED = '#6B7280';
const RULE = '#9CA3AF';
const HEAD_FILL = '#F3F4F6';
const PLACE: Record<number, { fill: string; label: string }> = {
  1: { fill: '#FEF3C7', label: '1st Place' },
  2: { fill: '#F1F5F9', label: '2nd Place' },
  3: { fill: '#FFEDD5', label: '3rd Place' },
};

let letterheadCache: string | null | undefined;
/** Official letterhead image from the template, as a data URL (null if the asset is missing). */
function letterhead(): string | null {
  if (letterheadCache !== undefined) return letterheadCache;
  try {
    const file = path.join(__dirname, '..', 'assets', 'tanauan-letterhead.png');
    letterheadCache = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  } catch {
    letterheadCache = null;
  }
  return letterheadCache;
}

const fmt = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function formatDate(d: Date): string {
  const [y, m, day] = toDateOnly(d).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

const safe = (s: string) => s.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

const gridLayout = {
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  hLineColor: () => RULE,
  vLineColor: () => RULE,
  paddingLeft: () => 5,
  paddingRight: () => 5,
};

// ─── Shared blocks ─────────────────────────────────────────────────────────

function header(event: TabulationEvent, contest: FullContest, docType: string): Content[] {
  const img = letterhead();
  const meta = [formatDate(event.eventDate), event.venue].filter(Boolean).join('  ·  ');
  return [
    img
      ? { image: img, width: 165, alignment: 'center', margin: [0, 0, 0, 2] }
      : { text: 'CITY GOVERNMENT OF TANAUAN', bold: true, fontSize: 13, alignment: 'center' },
    { text: 'GENDER AND DEVELOPMENT OFFICE', bold: true, fontSize: 11, characterSpacing: 1.5, alignment: 'center', color: INK },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 770, y2: 0, lineWidth: 0.8, lineColor: INK }],
      margin: [0, 6, 0, 10],
    },
    { text: contest.name.toUpperCase(), bold: true, fontSize: 16, alignment: 'center', color: INK },
    { text: docType.toUpperCase(), fontSize: 9, characterSpacing: 2.5, alignment: 'center', color: MUTED, margin: [0, 3, 0, 2] },
    { text: [event.title, meta].filter(Boolean).join('  ·  '), fontSize: 8.5, alignment: 'center', color: MUTED, margin: [0, 0, 0, 12] },
  ];
}

function signature(name: string, caption: string): Content {
  return {
    stack: [
      { text: '', margin: [0, 30, 0, 0] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: INK }] },
      { text: name.toUpperCase(), bold: true, fontSize: 9.5, margin: [0, 4, 0, 0], color: INK },
      { text: caption, fontSize: 8, color: MUTED },
    ],
  };
}

function judgeCaption(j: { judgeNo: number; title: string }): string {
  return `Judge No. ${j.judgeNo}${j.title ? ` – ${j.title}` : ''}`;
}

function footer(generated: string) {
  return (page: number, pages: number): Content => ({
    columns: [
      { text: 'Gender and Development Office · City of Tanauan', fontSize: 7, color: MUTED },
      { text: `Generated ${generated}  ·  Page ${page} of ${pages}`, fontSize: 7, color: MUTED, alignment: 'right' },
    ],
    margin: [36, 10, 36, 0],
  });
}

function doc(content: Content[], generated: string): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [36, 24, 36, 32],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: INK },
    footer: footer(generated),
    content,
  };
}

function nowManila(): string {
  return new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ─── Judge score sheet ─────────────────────────────────────────────────────

export async function buildJudgeSheetPdf(
  event: TabulationEvent,
  contest: FullContest,
  judgeId: string,
  blank: boolean,
): Promise<{ buffer: Buffer; fileName: string }> {
  const judge = contest.judges.find((j) => j.id === judgeId);
  if (!judge) throw new Error('Judge not found');

  const results = resultsFor(contest);
  const value = (contestantId: string, criterionId: string) =>
    contest.scores.find((s) => s.judgeId === judge.id && s.contestantId === contestantId && s.criterionId === criterionId)?.value;

  // Judge's own placing (1st, 2nd…) from their totals.
  const totals = new Map(results.rows.map((r) => [r.contestantId, r.judgeTotals[judge.id]]));
  const placeOf = (id: string): number | null => {
    const t = totals.get(id);
    if (t === null || t === undefined) return null;
    return [...totals.values()].filter((o) => o !== null && o !== undefined && o > t + 1e-9).length + 1;
  };

  const cellPad = blank ? 11 : 7;
  const headRow: TableCell[] = [
    { text: 'No.', bold: true, alignment: 'center', fillColor: HEAD_FILL, margin: [0, 6, 0, 0] },
    { text: contest.contestantLabel, bold: true, fillColor: HEAD_FILL, margin: [0, 6, 0, 0] },
    ...contest.criteria.map((c): TableCell => ({
      stack: [
        { text: c.name, bold: true, fontSize: 8.5 },
        ...(c.description ? [{ text: c.description, fontSize: 6.5, color: MUTED, margin: [0, 2, 0, 2] as [number, number, number, number] }] : []),
        { text: `${c.weight}%`, bold: true, fontSize: 9, color: INK },
      ],
      alignment: 'center',
      fillColor: HEAD_FILL,
    })),
    { text: 'TOTAL', bold: true, alignment: 'center', fillColor: HEAD_FILL, margin: [0, 6, 0, 0] },
    { text: 'RANK', bold: true, alignment: 'center', fillColor: HEAD_FILL, margin: [0, 6, 0, 0] },
  ];

  const bodyRows: TableCell[][] = contest.contestants.map((ct) => {
    const place = blank ? null : placeOf(ct.id);
    const total = blank ? null : totals.get(ct.id);
    return [
      { text: String(ct.number), alignment: 'center', margin: [0, cellPad, 0, cellPad] },
      { text: ct.name, bold: true, margin: [0, cellPad, 0, cellPad] },
      ...contest.criteria.map((c): TableCell => ({
        text: blank ? '' : fmt(value(ct.id, c.id)),
        alignment: 'center',
        fontSize: 10,
        margin: [0, cellPad, 0, cellPad],
      })),
      { text: total === null || total === undefined ? '' : fmt(total), alignment: 'center', bold: true, fontSize: 10, margin: [0, cellPad, 0, cellPad] },
      { text: place === null ? '' : ordinal(place), alignment: 'center', bold: true, margin: [0, cellPad, 0, cellPad] },
    ];
  });

  const content: Content[] = [
    ...header(event, contest, blank ? 'Score Sheet' : `Score Sheet · Judge No. ${judge.judgeNo}`),
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [28, 130, ...contest.criteria.map(() => '*' as const), 52, 44],
        body: [headRow, ...bodyRows],
      },
      layout: gridLayout,
    },
    {
      unbreakable: true,
      stack: [
        { text: 'Scored by:', fontSize: 9, margin: [0, 18, 0, 0] },
        signature(judge.name, judgeCaption(judge)),
      ],
    },
  ];

  const fileName = `${safe(contest.name)}_Judge${judge.judgeNo}_${blank ? 'Blank_' : ''}ScoreSheet.pdf`;
  return { buffer: await render(doc(content, nowManila())), fileName };
}

// ─── Consolidated result ───────────────────────────────────────────────────

export async function buildResultsPdf(
  event: TabulationEvent,
  contest: FullContest,
): Promise<{ buffer: Buffer; fileName: string }> {
  const results = resultsFor(contest);
  const isRankSum = contest.rankingMethod === 'RANK_SUM';
  const isFinal = contest.status === 'FINALIZED';
  const judges = contest.judges;

  const content: Content[] = [...header(event, contest, 'Official Result of Tabulation')];

  if (!isFinal) {
    content.push({
      table: {
        widths: ['*'],
        body: [[{
          text: 'PRELIMINARY — scoring is still open. These results are not final.',
          bold: true, fontSize: 9, color: '#B91C1C', alignment: 'center', fillColor: '#FEF2F2', margin: [0, 4, 0, 4],
        }]],
      },
      layout: { hLineColor: () => '#FCA5A5', vLineColor: () => '#FCA5A5', hLineWidth: () => 0.6, vLineWidth: () => 0.6 },
      margin: [0, 0, 0, 12],
    });
  }

  // Podium summary
  const podium = results.rows.filter((r) => r.finalRank !== null && r.finalRank <= 3);
  if (podium.length > 0) {
    content.push({
      columns: podium.slice(0, 3).map((r) => ({
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: (PLACE[r.finalRank as number]?.label ?? ordinal(r.finalRank as number)).toUpperCase(), fontSize: 7.5, characterSpacing: 1.5, color: MUTED, bold: true },
              { text: r.name, fontSize: 12, bold: true, margin: [0, 3, 0, 1] },
              { text: `${fmt(r.average)} average${r.tied ? '  ·  tie' : ''}`, fontSize: 8, color: MUTED },
            ],
            alignment: 'center',
            fillColor: PLACE[r.finalRank as number]?.fill,
            margin: [0, 4, 0, 4],
          }]],
        },
        layout: { hLineColor: () => RULE, vLineColor: () => RULE, hLineWidth: () => 0.6, vLineWidth: () => 0.6 },
      })),
      columnGap: 12,
      margin: [0, 0, 0, 10],
    });
  }

  const headRow: TableCell[] = [
    { text: 'RANK', bold: true, alignment: 'center', fillColor: HEAD_FILL },
    { text: 'No.', bold: true, alignment: 'center', fillColor: HEAD_FILL },
    { text: contest.contestantLabel, bold: true, fillColor: HEAD_FILL },
    ...judges.map((j): TableCell => ({ text: `Judge ${j.judgeNo}`, bold: true, alignment: 'center', fillColor: HEAD_FILL })),
    { text: 'AVERAGE', bold: true, alignment: 'center', fillColor: HEAD_FILL },
    ...(isRankSum ? [{ text: 'RANK SUM', bold: true, alignment: 'center', fillColor: HEAD_FILL } as TableCell] : []),
  ];

  const bodyRows: TableCell[][] = results.rows.map((r) => {
    const fill = r.finalRank !== null ? PLACE[r.finalRank]?.fill : undefined;
    const top = r.finalRank !== null && r.finalRank <= 3;
    const cell = (text: string, extra: Partial<Record<string, unknown>> = {}): TableCell =>
      ({ text, fillColor: fill, margin: [0, 3, 0, 3], ...extra }) as TableCell;
    return [
      cell(r.finalRank === null ? '—' : `${ordinal(r.finalRank)}${r.tied ? ' (tie)' : ''}`, { alignment: 'center', bold: true }),
      cell(String(r.number), { alignment: 'center' }),
      cell(r.name, { bold: top }),
      ...judges.map((j) => cell(
        isRankSum && r.judgeRanks[j.id] !== null
          ? `${fmt(r.judgeTotals[j.id])}  (${fmt(r.judgeRanks[j.id])})`
          : fmt(r.judgeTotals[j.id]),
        { alignment: 'center' },
      )),
      cell(fmt(r.average), { alignment: 'center', bold: true, fontSize: 10 }),
      ...(isRankSum ? [cell(fmt(r.rankSum), { alignment: 'center', bold: true })] : []),
    ];
  });

  content.push(
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [56, 28, '*', ...judges.map(() => 58), 62, ...(isRankSum ? [58] : [])],
        body: [headRow, ...bodyRows],
      },
      layout: gridLayout,
    },
    {
      text: isRankSum
        ? 'Ranked by the lowest sum of judges’ ranks (judge’s rank in parentheses); ties broken by the higher average, then the highest-weighted criterion.'
        : 'Ranked by the highest average of the judges’ totals (out of 100); ties broken by the highest-weighted criterion.',
      fontSize: 7.5, color: MUTED, margin: [0, 6, 0, 0],
    },
    {
      unbreakable: true,
      stack: [
        { text: 'Certified correct by the Board of Judges:', fontSize: 9, margin: [0, 14, 0, 0] },
        {
          // Three signatures per row
          stack: Array.from({ length: Math.ceil(judges.length / 3) }, (_, i) => ({
            // Pad short rows so every signature lines up in the same three columns.
            columns: [0, 1, 2].map((k): Content => {
              const j = judges[i * 3 + k];
              return j ? signature(j.name, judgeCaption(j)) : { text: '' };
            }),
            columnGap: 50,
          })),
        },
      ],
    },
  );

  const fileName = `${safe(contest.name)}_${isFinal ? 'Final' : 'Preliminary'}_Results.pdf`;
  return { buffer: await render(doc(content, nowManila())), fileName };
}
