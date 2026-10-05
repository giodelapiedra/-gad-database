// Parts of a GAD form a reviewer can flag for correction. Every template (Barangay /
// City GPB and AR) shares these parts. Keep in sync with server/src/utils/reviewSections.ts.

export const REVIEW_SECTIONS = [
  { key: 'header',              label: 'Header Information',   hasRows: false },
  { key: 'clientFocused',       label: 'CLIENT-FOCUSED',       hasRows: true },
  { key: 'organizationFocused', label: 'ORGANIZATION-FOCUSED', hasRows: true },
  { key: 'attributedPrograms',  label: 'ATTRIBUTED PROGRAMS',  hasRows: true },
  { key: 'signatories',         label: 'Signatories',          hasRows: false },
] as const;

export type ReviewSection = (typeof REVIEW_SECTIONS)[number]['key'];

export function sectionLabel(key: string | null | undefined): string {
  return REVIEW_SECTIONS.find((s) => s.key === key)?.label ?? 'General';
}

export function sectionHasRows(key: string | null | undefined): boolean {
  return REVIEW_SECTIONS.find((s) => s.key === key)?.hasRows ?? false;
}

/** DOM id of a flagged section, so the correction checklist can scroll to it. */
export const sectionAnchor = (key: string) => `review-${key}`;

/** Readable names for the columns a reviewer can point a comment at (form-data keys). */
const FIELD_LABELS: Record<string, string> = {
  // Header
  region: 'Region', province: 'Province', cityMunicipality: 'City', barangay: 'Barangay',
  officeName: 'Office', quarter: 'Quarter', cy: 'Calendar Year', fy: 'Fiscal Year',
  totalBrgyBudget: 'Total Barangay Budget', totalLguBudget: 'Total LGU Budget', totalGadBudget: 'Total GAD Budget',
  // Plan / report rows
  gadIssue: 'Gender Issue / GAD Mandate', gadObjective: 'GAD Objective', relevantProgram: 'Relevant LGU Program/Project',
  activity: 'GAD Activity', ppa: 'GAD PPA', indicator: 'Performance Indicator',
  accomplishments: 'Accomplishments', actualResults: 'Actual Results',
  mooe: 'MOOE', ps: 'PS', co: 'CO',
  approvedBudget: 'Approved GAD Budget', actualCost: 'Actual GAD Cost', variance: 'Variance / Remarks',
  responsibleOffice: 'Responsible Office',
  // Attributed programs
  projectTitle: 'Program/Project Title', hgdgScore: 'HGDG Score', totalBudget: 'Total Annual Budget',
  gadAttributedBudget: 'GAD Attributed Budget', varianceRemarks: 'Variance / Remarks',
  // Signatories
  preparedBy: 'Prepared by', approvedBy: 'Approved by', date: 'Date',
};

export function fieldLabel(key: string | null | undefined): string {
  return key ? FIELD_LABELS[key] ?? key : '';
}

/** "CLIENT-FOCUSED · Row 2 · MOOE" — where a flag points. */
export function flagWhere(c: { section: string | null; rowNumber: number | null; field?: string | null }): string {
  return [
    sectionLabel(c.section),
    c.rowNumber != null ? `Row ${c.rowNumber}` : null,
    c.field ? fieldLabel(c.field) : null,
  ].filter(Boolean).join(' · ');
}

/** DOM id of one flagged cell, so the checklist can scroll straight to it. */
export const fieldAnchor = (section: string, row: number | null | undefined, field: string) =>
  `review-${section}-${row ?? 0}-${field}`;
