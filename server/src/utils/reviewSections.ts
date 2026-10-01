// Parts of a GAD form a reviewer can flag for correction. Every template (Barangay /
// City GPB and AR) shares these parts. Keep in sync with client/src/lib/reviewSections.ts.

export const REVIEW_SECTIONS = [
  'header',
  'clientFocused',
  'organizationFocused',
  'attributedPrograms',
  'signatories',
] as const;

export type ReviewSection = (typeof REVIEW_SECTIONS)[number];

/** Sections made of rows, where a comment may point at a specific row number. */
const ROW_SECTIONS: readonly ReviewSection[] = ['clientFocused', 'organizationFocused', 'attributedPrograms'];

export function isReviewSection(v: string): v is ReviewSection {
  return (REVIEW_SECTIONS as readonly string[]).includes(v);
}

export function hasRows(section: ReviewSection): boolean {
  return ROW_SECTIONS.includes(section);
}
