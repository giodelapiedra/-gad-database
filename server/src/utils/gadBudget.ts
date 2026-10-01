// RA 9710 (Magna Carta of Women) Sec. 36 / PCW-DILG-DBM-NEDA JMC 2013-01:
// the GAD budget must be at least 5% of the total barangay / LGU budget.
// Mirrors client/src/components/forms/GadBudgetShare.tsx (validateGadShare).

export const GAD_MIN_SHARE = 0.05;

const money = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Returns a user-facing error when the form's GAD budget is below 5% of its total budget, else null. */
export function gadShareError(templateId: string, formData: Record<string, unknown>): string | null {
  const isBarangay = templateId === 'BARANGAY_GPB' || templateId === 'BARANGAY_AR';
  const isCity = templateId === 'CITY_GPB' || templateId === 'CITY_AR';
  if (!isBarangay && !isCity) return null;

  const label = isBarangay ? 'Barangay' : 'LGU';
  const total = Number(isBarangay ? formData.totalBrgyBudget : formData.totalLguBudget) || 0;
  const gad = Number(formData.totalGadBudget) || 0;

  if (total <= 0) return `Total ${label} Budget is required.`;
  if (gad <= 0) return 'Total GAD Budget is required.';

  const required = total * GAD_MIN_SHARE;
  if (gad < required) {
    const pct = ((gad / total) * 100).toFixed(2);
    return `GAD Budget is only ${pct}% of the Total ${label} Budget. It must be at least 5% (₱${money(required)}) — short by ₱${money(required - gad)}.`;
  }
  return null;
}
