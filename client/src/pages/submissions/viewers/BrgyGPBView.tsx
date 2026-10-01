import type { BrgyGPBFormData, BrgyGPBRow } from '@/hooks/useTemplates';
import { peso, HeaderInfo, SectionBanner, AttrRows, RowNumber } from './ViewerShared';
import { GadBudgetShare } from '@/components/forms/GadBudgetShare';
import { FlaggedSection, FlaggedRow } from '@/components/review/ReviewFlags';

function BrgyGPBDataRows({ rows, section }: { rows: BrgyGPBRow[]; section: string }) {
  if (!rows.length) return <div className="px-4 py-3 text-[12px] text-[#A1A1AA]">No entries</div>;
  return (
    <div className="space-y-2 p-3">
      {rows.map((row, i) => (
        <FlaggedRow key={i} section={section} row={i + 1}>
          <div className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
            <RowNumber n={i + 1} />
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
        </FlaggedRow>
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
      <FlaggedSection section="header">
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
          <div className="mt-4 sm:max-w-xs">
            <GadBudgetShare totalBudget={d.totalBrgyBudget} gadBudget={d.totalGadBudget} budgetLabel="Barangay" />
          </div>
        </div>
      </FlaggedSection>

      {[
        { label: 'CLIENT-FOCUSED',       rows: d.clientFocused,       total: cfTotal, section: 'clientFocused' },
        { label: 'ORGANIZATION FOCUSED', rows: d.organizationFocused, total: ofTotal, section: 'organizationFocused' },
      ].map(({ label, rows, total, section }) => (
        <FlaggedSection key={label} section={section}>
          <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
            <SectionBanner>{label}</SectionBanner>
            <BrgyGPBDataRows rows={rows} section={section} />
            <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
              <span className="text-[12px] font-bold text-[#09090B]">Sub-total</span>
              <span className="text-[12px] font-bold tabular-nums text-[#09090B]">₱{peso(total)}</span>
            </div>
          </div>
        </FlaggedSection>
      ))}

      <FlaggedSection section="attributedPrograms">
        <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
          <SectionBanner>ATTRIBUTED PROGRAMS</SectionBanner>
          <AttrRows rows={d.attributedPrograms} showOffice={false} />
          <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
            <span className="text-[12px] font-bold text-[#09090B]">Sub-total C (GAD Attributed)</span>
            <span className="text-[12px] font-bold tabular-nums text-[#09090B]">₱{peso(attrTotal)}</span>
          </div>
        </div>
      </FlaggedSection>

      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex items-center justify-between bg-[#09090B] px-4 py-3 text-white">
          <span className="text-[13px] font-bold">Grand Total (A+B+C)</span>
          <span className="text-[13px] font-bold tabular-nums">₱{peso(cfTotal + ofTotal + attrTotal)}</span>
        </div>
      </div>

      <FlaggedSection section="signatories">
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
      </FlaggedSection>
    </div>
  );
}
