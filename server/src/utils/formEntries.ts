// A GPB / AR sent for review must carry at least one real entry. Without this an
// all-blank plan could be approved, and every AR linked to it would copy (and
// lock) nothing but empty rows.

const ROW_KEYS: Record<string, string[]> = {
  BARANGAY_GPB: ['clientFocused', 'organizationFocused', 'attributedPrograms'],
  CITY_GPB: ['clientFocused', 'organizationFocused', 'attributedPrograms'],
  CITY_AR: ['clientFocused', 'organizationFocused', 'attributedPrograms'],
  BARANGAY_AR: [
    'clientFocusedGenderIssues', 'clientFocusedGadMandate',
    'organizationGenderIssues', 'organizationGadMandate', 'attributedPrograms',
  ],
};

/** Something was typed into the row — any text or a non-zero amount. `kind`/refs don't count. */
function rowHasContent(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  return Object.entries(row as Record<string, unknown>).some(([k, v]) => {
    if (k === 'kind' || k === 'gpbRef' || k === 'evidence') return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (typeof v === 'number') return v !== 0;
    return false;
  });
}

/** User-facing error when the form has no filled-in entry at all, else null. */
export function noEntriesError(templateId: string, formData: Record<string, unknown>): string | null {
  const keys = ROW_KEYS[templateId];
  if (!keys) return null;
  const any = keys.some((k) => Array.isArray(formData[k]) && (formData[k] as unknown[]).some(rowHasContent));
  return any ? null : 'The form has no entries yet. Fill in at least one row before submitting.';
}
