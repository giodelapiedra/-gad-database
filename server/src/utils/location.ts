// The system serves a single LGU, so the location header on every form is fixed.
// Keep in sync with client/src/lib/location.ts.

export const LGU_REGION = 'Region IV-A — CALABARZON';
export const LGU_PROVINCE = 'Batangas';
export const LGU_CITY = 'City of Tanauan';

/** The 48 barangays of Tanauan City, Batangas (PSGC 041031000). */
export const TANAUAN_BARANGAYS = [
  'Altura Bata', 'Altura Matanda', 'Altura-South', 'Ambulong', 'Bagbag', 'Bagumbayan',
  'Balele', 'Bañadero', 'Banjo East', 'Banjo Laurel', 'Bilog-bilog', 'Boot', 'Cale',
  'Darasa', 'Gonzales', 'Hidalgo', 'Janopol', 'Janopol Oriental', 'Laurel', 'Luyos',
  'Mabini', 'Malaking Pulo', 'Maria Paz', 'Maugat', 'Montaña', 'Natatas', 'Pagaspas',
  'Pantay Bata', 'Pantay Matanda', 'Poblacion Barangay 1', 'Poblacion Barangay 2',
  'Poblacion Barangay 3', 'Poblacion Barangay 4', 'Poblacion Barangay 5',
  'Poblacion Barangay 6', 'Poblacion Barangay 7', 'Sala', 'Sambat', 'San Jose', 'Santol',
  'Santor', 'Sulpoc', 'Suplang', 'Talaga', 'Tinurik', 'Trapiche', 'Ulango', 'Wawa',
] as const;

export function isTanauanBarangay(name: string): boolean {
  return (TANAUAN_BARANGAYS as readonly string[]).includes(name);
}

/**
 * Stamp the fixed LGU location onto submitted form data, and — for an encoder
 * assigned to a barangay — force the barangay field to their assignment, so the
 * header can't be spoofed through the API.
 */
export function applyFixedLocation(
  templateId: string,
  formData: Record<string, unknown>,
  assignedBarangay: string | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...formData, region: LGU_REGION, province: LGU_PROVINCE, cityMunicipality: LGU_CITY };
  if ((templateId === 'BARANGAY_GPB' || templateId === 'BARANGAY_AR') && assignedBarangay) {
    out.barangay = assignedBarangay;
  }
  return out;
}
