import {
  gpbKind,
  isBlankBrgyGPBRow,
  isBlankCityGPBRow,
  blankBrgyARRow,
  blankCityARRow,
  type BrgyARFormData,
  type BrgyARRow,
  type BrgyGPBFormData,
  type BrgyGPBRow,
  type CityARFormData,
  type CityARRow,
  type CityGPBFormData,
  type CityGPBRow,
} from '@/hooks/useTemplates';

// Copies the planned PPAs of an approved GAD Plan and Budget into its
// Accomplishment Report. The planned columns come from the GPB and are locked
// on the AR; the encoder only reports what happened (accomplishments, actual
// cost, variance/remarks + proof).
//
// Re-importing is a merge, not a reset: a row keeps its accomplishments, cost,
// remarks and uploaded proof as long as its GPB row still exists (matched by
// `gpbRef`). Rows the encoder typed in by hand are kept as they are.

const gpbSum = (r: { mooe: number; ps: number; co: number }) =>
  (Number(r.mooe) || 0) + (Number(r.ps) || 0) + (Number(r.co) || 0);

/** Rows saved by older versions can miss fields — never let `.trim()` crash. */
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const blank = (v: unknown) => !str(v).trim();

type GpbSection = 'clientFocused' | 'organizationFocused';
const GPB_SECTIONS: GpbSection[] = ['clientFocused', 'organizationFocused'];

// ─── Barangay ─────────────────────────────────────────────────────────────

type BrgyARSection =
  | 'clientFocusedGenderIssues' | 'clientFocusedGadMandate'
  | 'organizationGenderIssues'  | 'organizationGadMandate';

const BRGY_AR_SECTIONS: Record<GpbSection, [BrgyARSection, BrgyARSection]> = {
  clientFocused:       ['clientFocusedGenderIssues', 'clientFocusedGadMandate'],
  organizationFocused: ['organizationGenderIssues', 'organizationGadMandate'],
};

const isBlankBrgyAR = (r: BrgyARRow) =>
  blank(r.gadIssue) && blank(r.ppa) && blank(r.indicator) && blank(r.accomplishments)
  && !r.approvedBudget && !r.actualCost && blank(r.variance) && !(r.evidence?.length);

/** AR columns (1), (2), (3), (5) as planned in the Barangay GPB. */
function brgyPlanned(g: BrgyGPBRow): Pick<BrgyARRow, 'gadIssue' | 'ppa' | 'indicator' | 'approvedBudget'> {
  return { gadIssue: str(g.gadIssue), ppa: str(g.activity), indicator: str(g.indicator), approvedBudget: gpbSum(g) };
}

export function importBrgyGpb(ar: BrgyARFormData, gpb: BrgyGPBFormData, gpbId: string): BrgyARFormData {
  const next: BrgyARFormData = { ...ar, sourceGpbId: gpbId };
  const refs = new Set<string>();

  for (const gpbSec of GPB_SECTIONS) {
    const bands = BRGY_AR_SECTIONS[gpbSec];
    const out = new Map<BrgyARSection, BrgyARRow[]>(bands.map((s) => [s, []]));

    (gpb[gpbSec] ?? []).forEach((g, i) => {
      if (isBlankBrgyGPBRow(g)) return;
      const ref = `${gpbSec}:${i}`;
      refs.add(ref);
      // The plan decides the band: a GAD Mandate entry lands under "2. GAD Mandate".
      const home = gpbKind(g) === 'mandate' ? bands[1] : bands[0];
      const prev = bands.flatMap((s) => ar[s] ?? []).find((r) => r.gpbRef === ref);
      out.get(home)!.push({ ...(prev ?? blankBrgyARRow()), ...brgyPlanned(g), gpbRef: ref });
    });

    // Hand-typed rows stay; rows whose GPB row disappeared become hand-typed.
    for (const s of bands) {
      const rows = out.get(s)!;
      for (const r of ar[s] ?? []) {
        if (r.gpbRef && refs.has(r.gpbRef)) continue;
        if (isBlankBrgyAR(r)) continue;
        rows.push({ ...blankBrgyARRow(), ...r, gpbRef: undefined });
      }
      next[s] = rows;
    }
  }

  next.fy = gpb.cy || ar.fy;
  if (!ar.totalBrgyBudget) next.totalBrgyBudget = gpb.totalBrgyBudget;
  if (!ar.totalGadBudget)  next.totalGadBudget  = gpb.totalGadBudget;
  return next;
}

/**
 * Whether a GAD Plan and Budget has anything to copy. A plan whose rows are all
 * blank is never offered — linking to it would only lock empty cells.
 */
export function gpbHasEntries(templateId: string, formData: unknown): boolean {
  const d = (formData ?? {}) as Partial<BrgyGPBFormData & CityGPBFormData>;
  const rows = [...(d.clientFocused ?? []), ...(d.organizationFocused ?? [])];
  return templateId === 'BARANGAY_GPB'
    ? rows.some((r) => !isBlankBrgyGPBRow(r as BrgyGPBRow))
    : rows.some((r) => !isBlankCityGPBRow(r as CityGPBRow));
}

/**
 * Planned cells stay locked only when the plan actually filled them. ARs that
 * were linked to an empty plan earlier keep their gpbRef on blank rows; those
 * must stay editable.
 */
export const plannedLocked = (r: { gpbRef?: string; gadIssue: string; indicator: string; approvedBudget: number } & ({ ppa: string } | { activity: string })) =>
  !!r.gpbRef && !!(str(r.gadIssue).trim() || str('ppa' in r ? r.ppa : r.activity).trim() || str(r.indicator).trim() || r.approvedBudget);

// ─── City ───────────────────────────────────────────────────────────────

const isBlankCityAR = (r: CityARRow) =>
  blank(r.gadIssue) && blank(r.gadObjective) && blank(r.relevantProgram) && blank(r.activity)
  && blank(r.indicator) && blank(r.actualResults) && !r.approvedBudget && !r.actualCost
  && blank(r.variance) && blank(r.responsibleOffice) && !(r.evidence?.length);

/** AR columns (1)–(5), (7) and (10) as planned in the City GPB. */
function cityPlanned(g: CityGPBRow): Pick<CityARRow,
  'gadIssue' | 'gadObjective' | 'relevantProgram' | 'activity' | 'indicator' | 'approvedBudget' | 'responsibleOffice'> {
  return {
    gadIssue: str(g.gadIssue), gadObjective: str(g.gadObjective), relevantProgram: str(g.relevantProgram),
    activity: str(g.activity), indicator: str(g.indicator), approvedBudget: gpbSum(g),
    responsibleOffice: str(g.responsibleOffice),
  };
}

export function importCityGpb(ar: CityARFormData, gpb: CityGPBFormData, gpbId: string): CityARFormData {
  const next: CityARFormData = { ...ar, sourceGpbId: gpbId };

  for (const sec of GPB_SECTIONS) {
    const refs = new Set<string>();
    const rows: CityARRow[] = [];
    (gpb[sec] ?? []).forEach((g, i) => {
      if (isBlankCityGPBRow(g)) return;
      const ref = `${sec}:${i}`;
      refs.add(ref);
      const prev = (ar[sec] ?? []).find((r) => r.gpbRef === ref);
      rows.push({ ...(prev ?? blankCityARRow()), ...cityPlanned(g), gpbRef: ref });
    });
    for (const r of ar[sec] ?? []) {
      if (r.gpbRef && refs.has(r.gpbRef)) continue;
      if (isBlankCityAR(r)) continue;
      rows.push({ ...blankCityARRow(), ...r, gpbRef: undefined });
    }
    next[sec] = rows;
  }

  next.fy = gpb.fy || ar.fy;
  if (blank(ar.officeName)) next.officeName = str(gpb.officeName);
  if (!ar.totalLguBudget) next.totalLguBudget = gpb.totalLguBudget;
  if (!ar.totalGadBudget) next.totalGadBudget = gpb.totalGadBudget;
  return next;
}
