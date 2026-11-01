import { CheckCircle2Icon, AlertTriangleIcon, InfoIcon } from 'lucide-react';
import { gadShare, formatPeso } from '@/lib/gadBudget';

/**
 * Side panel showing what percent of the total (Barangay / LGU) budget the GAD
 * budget is, and whether it reaches the mandated 5% minimum.
 *
 * `required` (default true) is the Barangay rule: below 5% is an error (red).
 * When false — City forms — the 5% is shown for reference only: it never turns
 * red and never blocks, matching the rule that City forms don't require it.
 */
export function GadBudgetShare({ totalBudget, gadBudget, budgetLabel, required = true }: {
  totalBudget: number; gadBudget: number; budgetLabel: string; required?: boolean;
}) {
  const s = gadShare(totalBudget, gadBudget);

  if (s.total <= 0) {
    return (
      <div className="rounded-md border border-dashed border-[#D4D4D8] bg-[#FAFAFA] p-3 text-[11px] text-[#71717A]">
        Enter the Total {budgetLabel} Budget to compute the GAD share{required ? ' (minimum 5%)' : ' (5% reference only)'}.
      </div>
    );
  }

  // Three visual states: met (emerald), below-but-optional (neutral), below-and-required (red).
  const tone = s.met
    ? { box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' }
    : required
      ? { box: 'border-red-200 bg-red-50',       text: 'text-red-700',     bar: 'bg-red-500' }
      : { box: 'border-[#E4E4E7] bg-[#FAFAFA]',  text: 'text-[#52525B]',   bar: 'bg-[#A1A1AA]' };

  const badge = s.met
    ? { icon: <CheckCircle2Icon className="size-3.5" />, label: '5% met' }
    : required
      ? { icon: <AlertTriangleIcon className="size-3.5" />, label: 'Below 5%' }
      : { icon: <InfoIcon className="size-3.5" />,          label: 'Below 5% · not required' };

  // Bar spans 0–10%, so the 5% marker sits in the middle.
  const barWidth = Math.min(100, (s.pct / 10) * 100);

  return (
    <div className={`rounded-md border p-3 ${tone.box}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-[#52525B]">GAD Budget Share</span>
        <span className={`flex items-center gap-1 text-[11px] font-semibold ${tone.text}`}>
          {badge.icon}
          {badge.label}
        </span>
      </div>
      <p className={`mt-1 text-[22px] font-bold tabular-nums leading-none ${tone.text}`}>
        {s.pct.toFixed(2)}%
      </p>
      <p className="mt-1 text-[10px] text-[#71717A]">of Total {budgetLabel} Budget</p>

      <div className="relative mt-2 h-1.5 w-full rounded-full bg-white/80">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${barWidth}%` }} />
        <div className="absolute inset-y-[-3px] left-1/2 w-px bg-[#09090B]" title="5% minimum" />
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-[#A1A1AA]">
        <span>0%</span><span>5%</span><span>10%+</span>
      </div>

      <div className="mt-2 space-y-0.5 text-[11px] tabular-nums text-[#52525B]">
        <div className="flex justify-between">
          <span>{required ? 'Required (5%)' : 'Reference (5%)'}</span>
          <span>₱{formatPeso(s.required)}</span>
        </div>
        {s.met
          ? <div className="flex justify-between"><span>Excess</span><span>₱{formatPeso(s.gad - s.required)}</span></div>
          : <div className={`flex justify-between ${required ? `font-semibold ${tone.text}` : ''}`}>
              <span>{required ? 'Shortfall' : 'To reach 5%'}</span><span>₱{formatPeso(s.shortfall)}</span>
            </div>}
      </div>
    </div>
  );
}
