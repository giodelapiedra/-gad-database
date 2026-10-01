// RA 9710 (Magna Carta of Women) Sec. 36 / PCW-DILG-DBM-NEDA JMC 2013-01.
// Mirrors server/src/utils/gadBudget.ts, which enforces the same rule on submit.

export const formatPeso = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** GAD budget must be at least 5% of the total barangay / LGU budget. */
export const GAD_MIN_SHARE = 0.05;

export function gadShare(totalBudget: number, gadBudget: number) {
  const total = Number(totalBudget) || 0;
  const gad = Number(gadBudget) || 0;
  const pct = total > 0 ? (gad / total) * 100 : 0;
  const required = total * GAD_MIN_SHARE;
  return { total, gad, pct, required, shortfall: Math.max(0, required - gad), met: total > 0 && gad >= required };
}

/** Form validation: both budgets filled in and GAD budget at least 5% of the total. */
export function validateGadShare(totalBudget: number, gadBudget: number, budgetLabel: string): string | null {
  const s = gadShare(totalBudget, gadBudget);
  if (s.total <= 0) return `Total ${budgetLabel} Budget is required.`;
  if (s.gad <= 0) return 'Total GAD Budget is required.';
  if (!s.met) {
    return `GAD Budget is only ${s.pct.toFixed(2)}% of the Total ${budgetLabel} Budget. It must be at least 5% (₱${formatPeso(s.required)}) — short by ₱${formatPeso(s.shortfall)}.`;
  }
  return null;
}
