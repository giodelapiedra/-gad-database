import type { AttributedRow } from '@/hooks/useTemplates';

export function peso(n: number) {
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export function Cell({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`border-r border-[#E4E4E7] p-2 text-[12px] text-[#09090B] ${className}`}>
      {children ?? <span className="text-[#A1A1AA]">—</span>}
    </div>
  );
}

export function NumCell({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`border-r border-[#E4E4E7] p-2 text-right text-[12px] text-[#09090B] tabular-nums ${className}`}>
      {value ? peso(value) : <span className="text-[#A1A1AA]">—</span>}
    </div>
  );
}

export function HeaderInfo({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">{label}</p>
          <p className="mt-0.5 text-[13px] font-medium text-[#09090B]">{value || '—'}</p>
        </div>
      ))}
    </div>
  );
}

export function SectionBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#27272A] px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white">
      {children}
    </div>
  );
}

export function SubLabel({ color, children }: { color: 'blue' | 'amber'; children: React.ReactNode }) {
  const cls = color === 'blue' ? 'bg-[#EEF2FF] text-[#3730A3]' : 'bg-[#FFF7ED] text-[#92400E]';
  return <div className={`px-4 py-2 text-[12px] font-bold ${cls}`}>{children}</div>;
}

export function SubTotalRow({ label, app, act }: { label: string; app: number; act: number }) {
  return (
    <div className="grid grid-cols-[1fr_150px_150px_196px] border-t border-[#D4D4D8] bg-[#F4F4F5]">
      <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#09090B]">{label}</div>
      <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold tabular-nums">{peso(app)}</div>
      <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold tabular-nums">{peso(act)}</div>
      <div />
    </div>
  );
}

export function AttrRows({ rows, showOffice }: { rows: AttributedRow[]; showOffice: boolean }) {
  if (!rows.length) return <div className="px-4 py-3 text-[12px] text-[#A1A1AA]">No entries</div>;
  return (
    <div className="space-y-2 p-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">Project/Program Title</p>
              <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[#09090B]">{row.projectTitle || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">HGDG Score</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-[#09090B]">{row.hgdgScore || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">Total Annual Budget</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-[#09090B]">₱{peso(row.totalBudget)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">GAD Attributed Budget</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-[#09090B]">₱{peso(row.gadAttributedBudget)}</p>
            </div>
            {showOffice ? (
              <div>
                <p className="text-[10px] font-medium text-[#71717A]">Lead/Responsible Office</p>
                <p className="mt-0.5 text-[12px] text-[#09090B]">{row.responsibleOffice || '—'}</p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-medium text-[#71717A]">Variance / Remarks</p>
                <p className="mt-0.5 text-[12px] text-[#09090B]">{row.varianceRemarks || '—'}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
