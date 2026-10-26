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

const TONES: Record<Tone, { icon: string; ring: string }> = {
  amber:   { icon: 'bg-amber-100 text-amber-700',     ring: 'ring-amber-400' },
  emerald: { icon: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-400' },
  orange:  { icon: 'bg-orange-100 text-orange-700',   ring: 'ring-orange-400' },
  zinc:    { icon: 'bg-zinc-100 text-zinc-700',       ring: 'ring-zinc-400' },
  sky:     { icon: 'bg-sky-100 text-sky-700',         ring: 'ring-sky-400' },
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
  const tones = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:border-[#D4D4D8] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
        active ? `border-transparent ring-2 ${tones.ring} shadow-sm` : 'border-[#E2E4E9]'
      }`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tones.icon}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[22px] font-semibold leading-none tabular-nums text-[#09090B]">{count}</span>
        <span className="mt-1 block truncate text-[12px] font-medium text-[#09090B]">{label}</span>
        <span className="block truncate text-[11px] text-[#A1A1AA]">{hint}</span>
      </span>
    </button>
  );
}
