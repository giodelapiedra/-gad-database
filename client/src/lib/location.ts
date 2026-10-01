// The system serves a single LGU, so the location header on every form is fixed.
// Keep in sync with server/src/utils/location.ts.

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

/**
 * Stamp the fixed LGU location (City of Tanauan, Batangas) onto form data; barangay
 * forms also get the encoder's assigned barangay. The server applies the same rule.
 */
export function withFixedLocation<D extends { region: string; province: string; cityMunicipality: string }>(
  data: D, assignedBarangay?: string | null,
): D {
  const out = { ...data, region: LGU_REGION, province: LGU_PROVINCE, cityMunicipality: LGU_CITY };
  return assignedBarangay && 'barangay' in out ? { ...out, barangay: assignedBarangay } : out;
}
