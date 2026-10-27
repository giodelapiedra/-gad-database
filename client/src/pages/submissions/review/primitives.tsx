import {
  PencilIcon,
  ClockIcon,
  CheckCircle2Icon,
  CornerUpLeftIcon,
  type LucideIcon,
} from 'lucide-react';
import type { SubmissionStatus } from '@/hooks/useSubmissions';

// ─── Status metadata (admin-facing labels) ──────────────────────────────────
// The encoder-facing badge lives in ../shared (StatusBadge). This pill is the
// reviewer's view, so PENDING reads as "To review" rather than "Pending".

const STATUS_META: Record<SubmissionStatus, { label: string; icon: LucideIcon; cls: string }> = {
  DRAFT:    { label: 'Draft',     icon: PencilIcon,       cls: 'bg-zinc-100 text-zinc-700 ring-zinc-200' },
  PENDING:  { label: 'To review', icon: ClockIcon,        cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  APPROVED: { label: 'Approved',  icon: CheckCircle2Icon, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RETURNED: { label: 'Returned',  icon: CornerUpLeftIcon, cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

export function StatusPill({ status }: { status: SubmissionStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.cls}`}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

export function Avatar({ name, color }: { name: string; color?: string }) {
  const initials =
    name?.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color || '#71717A' }}
    >
      {initials}
    </span>
  );
}

// ─── StatCard (summary tile that doubles as the list filter) ─────────────────

type Tone = 'amber' | 'emerald' | 'orange' | 'zinc' | 'sky';

/** Idle = soft tint; active = solid fill + tinted card. Full class names so
 *  Tailwind's JIT keeps them. */
const TONES: Record<Tone, { icon: string; iconOn: string; on: string }> = {
  amber:   { icon: 'bg-amber-50 text-amber-600',     iconOn: 'bg-amber-500 text-white',   on: 'border-amber-300 ring-amber-200/70 bg-amber-50/40' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', iconOn: 'bg-emerald-500 text-white', on: 'border-emerald-300 ring-emerald-200/70 bg-emerald-50/40' },
  orange:  { icon: 'bg-orange-50 text-orange-600',   iconOn: 'bg-orange-500 text-white',  on: 'border-orange-300 ring-orange-200/70 bg-orange-50/40' },
  zinc:    { icon: 'bg-zinc-100 text-zinc-600',      iconOn: 'bg-zinc-800 text-white',    on: 'border-zinc-300 ring-zinc-200/70 bg-zinc-50' },
  sky:     { icon: 'bg-sky-50 text-sky-600',         iconOn: 'bg-sky-500 text-white',     on: 'border-sky-300 ring-sky-200/70 bg-sky-50/40' },
};

export function StatCard({
  label, hint, count, icon: Icon, active, tone, onClick,
}: {
  label: string;
  hint: string;
  count: number;
  icon: LucideIcon;
  active: boolean;
  tone: Tone;
  onClick: () => void;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-[112px] flex-col rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
        active
          ? `${t.on} shadow-[0_1px_2px_rgba(9,9,11,0.05)] ring-1`
          : 'border-[#E8E8EB] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] hover:border-[#D4D4D8] hover:shadow-[0_2px_10px_rgba(9,9,11,0.06)]'
      }`}
    >
      <span className={`mb-3 flex size-8 items-center justify-center rounded-lg transition-colors ${active ? t.iconOn : t.icon}`}>
        <Icon className="size-4" />
      </span>
      <span className="text-[26px] font-semibold leading-none tabular-nums text-[#09090B]">{count}</span>
      <span className="mt-2 block truncate text-[13px] font-medium text-[#18181B]">{label}</span>
      <span className="mt-0.5 block truncate text-[11px] text-[#A1A1AA]">{hint}</span>
    </button>
  );
}
