import type { BrgyGPBFormData, BrgyGPBRow } from '@/hooks/useTemplates';
import { peso, HeaderInfo, SectionBanner, AttrRows } from './ViewerShared';

function BrgyGPBDataRows({ rows }: { rows: BrgyGPBRow[] }) {
  if (!rows.length) return <div className="px-4 py-3 text-[12px] text-[#A1A1AA]">No entries</div>;
  return (
    <div className="space-y-2 p-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">{i + 1}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Gender Issue or GAD Mandate (1)', value: row.gadIssue },
              { label: 'GAD Activity / PPA (4)',          value: row.activity },
              { label: 'Performance Indicator (5)',       value: row.indicator },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-medium text-[#71717A]">{label}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[#09090B]">{value || '—'}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">Budget (MOOE / PS / CO)</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-[#09090B]">
                ₱{peso(row.mooe)} / ₱{peso(row.ps)} / ₱{peso(row.co)}
              </p>
              <p className="text-[11px] text-[#71717A]">Total: ₱{peso(row.mooe + row.ps + row.co)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">Responsible Office (9)</p>
              <p className="mt-0.5 text-[12px] text-[#09090B]">{row.responsibleOffice || '—'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrgyGPBView({ d }: { d: BrgyGPBFormData }) {
  const cfTotal = d.clientFocused.reduce((a, r) => a + r.mooe + r.ps + r.co, 0);
  const ofTotal = d.organizationFocused.reduce((a, r) => a + r.mooe + r.ps + r.co, 0);
  const attrTotal = d.attributedPrograms.reduce((a, r) => a + r.gadAttributedBudget, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-4 text-center text-[15px] font-bold uppercase tracking-wide text-[#09090B]">
          Barangay Annual GAD Plan and Budget (GPB)
        </p>
        <HeaderInfo items={[
          { label: 'Barangay',          value: d.barangay },
          { label: 'City/Municipality', value: d.cityMunicipality },
          { label: 'Province',          value: d.province },
          { label: 'Region',            value: d.region },
          { label: 'Calendar Year (CY)',value: d.cy },
          { label: 'Total Brgy Budget', value: d.totalBrgyBudget ? `₱${peso(d.totalBrgyBudget)}` : '' },
          { label: 'Total GAD Budget',  value: d.totalGadBudget  ? `₱${peso(d.totalGadBudget)}`  : '' },
        ]} />
      </div>

      {[
        { label: 'CLIENT-FOCUSED',       rows: d.clientFocused,       total: cfTotal },
        { label: 'ORGANIZATION FOCUSED', rows: d.organizationFocused, total: ofTotal },
      ].map(({ label, rows, total }) => (
        <div key={label} className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
          <SectionBanner>{label}</SectionBanner>
          <BrgyGPBDataRows rows={rows} />
          <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
            <span className="text-[12px] font-bold text-[#09090B]">Sub-total</span>
            <span className="text-[12px] font-bold tabular-nums text-[#09090B]">₱{peso(total)}</span>
          </div>
        </div>
      ))}

      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <SectionBanner>ATTRIBUTED PROGRAMS</SectionBanner>
        <AttrRows rows={d.attributedPrograms} showOffice={false} />
        <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
          <span className="text-[12px] font-bold text-[#09090B]">Sub-total C (GAD Attributed)</span>
          <span className="text-[12px] font-bold tabular-nums text-[#09090B]">₱{peso(attrTotal)}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex items-center justify-between bg-[#09090B] px-4 py-3 text-white">
          <span className="text-[13px] font-bold">Grand Total (A+B+C)</span>
          <span className="text-[13px] font-bold tabular-nums">₱{peso(cfTotal + ofTotal + attrTotal)}</span>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: 'Prepared by (Barangay GAD Focal)', value: d.preparedBy },
            { label: 'Approved by (Punong Barangay)',    value: d.approvedBy },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md border border-[#EBEBEB] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">{label}</p>
              <p className="mt-0.5 text-[13px] text-[#09090B]">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
