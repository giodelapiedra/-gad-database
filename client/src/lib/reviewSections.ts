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
