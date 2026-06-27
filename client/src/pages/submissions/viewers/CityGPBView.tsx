import type { CityGPBFormData, CityGPBRow } from '@/hooks/useTemplates';
import { peso, HeaderInfo, SectionBanner, AttrRows } from './ViewerShared';

function CityGPBDataRows({ rows }: { rows: CityGPBRow[] }) {
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
              { label: 'Gender Issue or GAD Mandate (1)',   value: row.gadIssue },
              { label: 'GAD Objective (2)',                 value: row.gadObjective },
              { label: 'Relevant LGU Program/Project (3)',  value: row.relevantProgram },
              { label: 'GAD Activity (4)',                  value: row.activity },
              { label: 'Performance Indicator (5)',         value: row.indicator },
              { label: 'Lead/Responsible Office (9)',       value: row.responsibleOffice },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-medium text-[#71717A]">{label}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[#09090B]">{value || '—'}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">Budget MOOE/PS/CO</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-[#09090B]">
                ₱{peso(row.mooe)} / ₱{peso(row.ps)} / ₱{peso(row.co)}
              </p>
              <p className="text-[11px] text-[#71717A]">Total: ₱{peso(row.mooe + row.ps + row.co)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CityGPBView({ d }: { d: CityGPBFormData }) {
  const cfMooe = d.clientFocused.reduce((a, r) => a + r.mooe, 0);
  const cfPs   = d.clientFocused.reduce((a, r) => a + r.ps,   0);
  const cfCo   = d.clientFocused.reduce((a, r) => a + r.co,   0);
  const ofMooe = d.organizationFocused.reduce((a, r) => a + r.mooe, 0);
  const ofPs   = d.organizationFocused.reduce((a, r) => a + r.ps,   0);
  const ofCo   = d.organizationFocused.reduce((a, r) => a + r.co,   0);
  const grandMooe = cfMooe + ofMooe;
  const grandPs   = cfPs   + ofPs;
  const grandCo   = cfCo   + ofCo;

  return (
    <div className="space-y-5">
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-4 text-center text-[15px] font-bold uppercase tracking-wide text-[#09090B]">
          Annual GAD Plan and Budget (City/Municipality) — Annex D
        </p>
        <HeaderInfo items={[
          { label: 'City/Municipality', value: d.cityMunicipality },
          { label: 'Office/Department', value: d.officeName },
          { label: 'Province',          value: d.province },
          { label: 'Region',            value: d.region },
          { label: 'Fiscal Year (FY)',  value: d.fy },
          { label: 'Total LGU Budget',  value: d.totalLguBudget ? `₱${peso(d.totalLguBudget)}` : '' },
          { label: 'Total GAD Budget',  value: d.totalGadBudget ? `₱${peso(d.totalGadBudget)}` : '' },
        ]} />
      </div>

      {/* CLIENT-FOCUSED */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <SectionBanner>CLIENT-FOCUSED</SectionBanner>
        <CityGPBDataRows rows={d.clientFocused} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
          <span className="text-[12px] font-bold text-[#09090B]">Sub Total A</span>
          <div className="flex gap-5 text-[12px] font-bold tabular-nums text-[#09090B]">
            <span>MOOE: ₱{peso(cfMooe)}</span>
            <span>PS: ₱{peso(cfPs)}</span>
            <span>CO: ₱{peso(cfCo)}</span>
          </div>
        </div>
      </div>

      {/* ORGANIZATION FOCUSED — no sub-total here per template structure */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <SectionBanner>ORGANIZATION FOCUSED</SectionBanner>
        <CityGPBDataRows rows={d.organizationFocused} />
      </div>

      {/* ATTRIBUTED PROGRAMS */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <SectionBanner>ATTRIBUTED PROGRAMS</SectionBanner>
        <AttrRows rows={d.attributedPrograms} showOffice={true} />
      </div>

      {/* Sub Total B — Organization-Focused totals (placed after Attributed per DILG Annex D) */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#27272A] px-4 py-2 text-white">
          <span className="text-[12px] font-bold uppercase tracking-widest">Sub Total B</span>
          <div className="flex gap-5 text-[12px] font-bold tabular-nums">
            <span>MOOE: ₱{peso(ofMooe)}</span>
            <span>PS: ₱{peso(ofPs)}</span>
            <span>CO: ₱{peso(ofCo)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#09090B] px-4 py-3 text-white">
          <span className="text-[13px] font-bold">Grand Total (A+B)</span>
          <div className="flex flex-wrap gap-5 text-[13px] font-bold tabular-nums">
            <span>MOOE: ₱{peso(grandMooe)}</span>
            <span>PS: ₱{peso(grandPs)}</span>
            <span>CO: ₱{peso(grandCo)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Prepared by (GAD Focal / TWG Member)', value: d.preparedBy },
            { label: 'Approved by (Department Head)',         value: d.approvedBy },
            { label: 'Date',                                  value: d.date },
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
