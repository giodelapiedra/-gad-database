import type { AttributedRow } from '@/hooks/useTemplates';
import { FlaggedRow, FlaggableField } from '@/components/review/ReviewFlags';
import { cn } from '@/lib/utils';

export function peso(n: number) {
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

/** A table cell. With `field`, a reviewer can comment on it and it turns red when flagged. */
function CellBox({ field, label, value, className, children }: {
  field?: string; label?: string; value?: string | number; className: string; children: React.ReactNode;
}) {
  if (!field) return <div className={className}>{children}</div>;
  return (
    <FlaggableField field={field} label={label} value={value} className={cn('rounded-none ring-inset', className)}>
      {children}
    </FlaggableField>
  );
}

export function Cell({ children, className = '', field, label, value }: {
  children?: React.ReactNode; className?: string;
  field?: string; label?: string; value?: string;
}) {
  return (
    <CellBox field={field} label={label} value={value} className={`border-r border-[#E4E4E7] p-2 text-[12px] text-[#09090B] ${className}`}>
      {children ?? <span className="text-[#A1A1AA]">—</span>}
    </CellBox>
  );
}

export function NumCell({ value, className = '', field, label }: {
  value: number; className?: string; field?: string; label?: string;
}) {
  return (
    <CellBox field={field} label={label} value={value ? peso(value) : ''} className={`border-r border-[#E4E4E7] p-2 text-right text-[12px] text-[#09090B] tabular-nums ${className}`}>
      {value ? peso(value) : <span className="text-[#A1A1AA]">—</span>}
    </CellBox>
  );
}

/** Label + value of one form field. With `field`, a reviewer can comment on it. */
export function ViewField({ field, label, value, children, upper, className }: {
  field?: string;
  label: string;
  value?: string | number;
  /** Custom rendering of the value; `value` is still what the reviewer sees in the comment box. */
  children?: React.ReactNode;
  /** Uppercase label style used by header and signatory blocks. */
  upper?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <p className={upper
        ? 'text-[10px] font-medium uppercase tracking-wider text-[#71717A]'
        : 'text-[10px] font-medium text-[#71717A]'}>{label}</p>
      <div className={upper
        ? 'mt-0.5 text-[13px] font-medium text-[#09090B]'
        : 'mt-0.5 whitespace-pre-wrap text-[12px] text-[#09090B]'}>{children ?? (value || '—')}</div>
    </>
  );
  if (!field) return <div className={className}>{inner}</div>;
  return (
    <FlaggableField field={field} label={label} value={value} className={cn('-m-1 p-1 pr-6', className)}>
      {inner}
    </FlaggableField>
  );
}

export function HeaderInfo({ items }: { items: { label: string; value: string | number; field?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ label, value, field }) => (
        <ViewField key={label} field={field} label={label} value={value} upper />
      ))}
    </div>
  );
}

/** Signatories block shared by every viewer. */
export function Signatories({ items }: { items: { label: string; value: string; field: string }[] }) {
  return (
    <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
      <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
      <div className={`grid grid-cols-1 gap-4 ${items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {items.map(({ label, value, field }) => (
          <div key={label} className="rounded-md border border-[#EBEBEB] px-3 py-2">
            <ViewField field={field} label={label} value={value} upper />
          </div>
        ))}
      </div>
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
    <div className="grid grid-cols-[1fr_150px_150px_260px] border-t border-[#D4D4D8] bg-[#F4F4F5]">
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
        <FlaggedRow key={i} section="attributedPrograms" row={i + 1}>
          <div className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
            <RowNumber n={i + 1} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ViewField field="projectTitle" label="Project/Program Title" value={row.projectTitle} />
              <ViewField field="hgdgScore" label="HGDG Score" value={row.hgdgScore || ''} />
              <ViewField field="totalBudget" label="Total Annual Budget" value={`₱${peso(row.totalBudget)}`} />
              <ViewField field="gadAttributedBudget" label="GAD Attributed Budget" value={`₱${peso(row.gadAttributedBudget)}`} />
              {showOffice
                ? <ViewField field="responsibleOffice" label="Lead/Responsible Office" value={row.responsibleOffice} />
                : <ViewField field="varianceRemarks" label="Variance / Remarks" value={row.varianceRemarks} />}
            </div>
          </div>
        </FlaggedRow>
      ))}
    </div>
  );
}

/** Row number badge, so a reviewer's "Row 2" matches what the encoder sees. */
export function RowNumber({ n }: { n: number }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="flex size-5 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">{n}</span>
    </div>
  );
}
