import { MedalIcon } from 'lucide-react';
import { ordinal } from '../tabulationUtils';

/** Gold / silver / bronze medal styling for the top three places. */
const MEDALS: Record<number, { label: string; chip: string; icon: string }> = {
  1: { label: 'Gold', chip: 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-800', icon: 'fill-amber-400 text-amber-600' },
  2: { label: 'Silver', chip: 'border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700', icon: 'fill-slate-300 text-slate-500' },
  3: { label: 'Bronze', chip: 'border-orange-300 bg-gradient-to-b from-orange-50 to-orange-100 text-orange-800', icon: 'fill-orange-400 text-orange-700' },
};

interface Props {
  place: number | null;
  tied?: boolean;
  size?: 'md' | 'lg';
}

export default function RankBadge({ place, tied = false, size = 'md' }: Props) {
  if (place === null) return <span className="text-[#A1A1AA]">—</span>;

  const medal = MEDALS[place];
  const big = size === 'lg';
  const text = `${ordinal(place)}${tied ? ' tie' : ''}`;

  if (!medal) {
    return (
      <span className={`inline-flex items-center justify-center rounded-full border border-[#E4E4E7] bg-white font-semibold text-[#52525B] tabular-nums ${big ? 'px-3 py-1 text-[15px]' : 'px-2.5 py-0.5 text-[13px]'}`}>
        {text}
      </span>
    );
  }

  return (
    <span
      title={`${medal.label}${tied ? ' (tied)' : ''}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold shadow-sm tabular-nums ${medal.chip} ${big ? 'px-3 py-1 text-[15px]' : 'px-2.5 py-0.5 text-[13px]'}`}
    >
      <MedalIcon className={`${big ? 'size-5' : 'size-4'} ${medal.icon}`} />
      {text}
    </span>
  );
}
