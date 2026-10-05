import type { CityGPBFormData, CityGPBRow } from '@/hooks/useTemplates';
import { peso, HeaderInfo, SectionBanner, AttrRows, RowNumber, ViewField, Signatories } from './ViewerShared';
import { FlaggedSection, FlaggedRow } from '@/components/review/ReviewFlags';
import { GadBudgetShare } from '@/components/forms/GadBudgetShare';

function CityGPBDataRows({ rows, section }: { rows: CityGPBRow[]; section: string }) {
  if (!rows.length) return <div className="px-4 py-3 text-[12px] text-[#A1A1AA]">No entries</div>;
  return (
    <div className="space-y-2 p-3">
      {rows.map((row, i) => (
        <FlaggedRow key={i} section={section} row={i + 1}>
          <div className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
            <RowNumber n={i + 1} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'Gender Issue or GAD Mandate (1)',   value: row.gadIssue, field: 'gadIssue' },
                { label: 'GAD Objective (2)',                 value: row.gadObjective, field: 'gadObjective' },
                { label: 'Relevant LGU Program/Project (3)',  value: row.relevantProgram, field: 'relevantProgram' },
                { label: 'GAD Activity (4)',                  value: row.activity, field: 'activity' },
                { label: 'Performance Indicator (5)',         value: row.indicator, field: 'indicator' },
                { label: 'Lead/Responsible Office (9)',       value: row.responsibleOffice, field: 'responsibleOffice' },
              ].map(({ label, value, field }) => (
                <ViewField key={label} field={field} label={label} value={value} />
              ))}
              <ViewField field="mooe" label="MOOE (6)" value={`₱${peso(row.mooe)}`} />
              <ViewField field="ps" label="PS (7)" value={`₱${peso(row.ps)}`} />
              <ViewField field="co" label="CO (8)" value={`₱${peso(row.co)}`} />
              <ViewField label="Budget Total" value={`₱${peso(row.mooe + row.ps + row.co)}`} />
            </div>
          </div>
        </FlaggedRow>
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
      <FlaggedSection section="header">
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <p className="mb-4 text-center text-[15px] font-bold uppercase tracking-wide text-[#09090B]">
            Annual GAD Plan and Budget (City) — Annex D
          </p>
          <HeaderInfo items={[
            { label: 'City', value: d.cityMunicipality, field: 'cityMunicipality' },
            { label: 'Office/Department', value: d.officeName, field: 'officeName' },
            { label: 'Province',          value: d.province, field: 'province' },
            { label: 'Region',            value: d.region, field: 'region' },
            { label: 'Fiscal Year (FY)',  value: d.fy, field: 'fy' },
            { label: 'Total LGU Budget',  value: d.totalLguBudget ? `₱${peso(d.totalLguBudget)}` : '', field: 'totalLguBudget' },
            { label: 'Total GAD Budget',  value: d.totalGadBudget ? `₱${peso(d.totalGadBudget)}` : '', field: 'totalGadBudget' },
          ]} />
          <div className="mt-4 sm:max-w-xs">
            <GadBudgetShare totalBudget={d.totalLguBudget} gadBudget={d.totalGadBudget} budgetLabel="LGU" />
          </div>
        </div>
      </FlaggedSection>

      {/* CLIENT-FOCUSED */}
      <FlaggedSection section="clientFocused">
        <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
          <SectionBanner>CLIENT-FOCUSED</SectionBanner>
          <CityGPBDataRows rows={d.clientFocused} section="clientFocused" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
            <span className="text-[12px] font-bold text-[#09090B]">Sub Total A</span>
            <div className="flex gap-5 text-[12px] font-bold tabular-nums text-[#09090B]">
              <span>MOOE: ₱{peso(cfMooe)}</span>
              <span>PS: ₱{peso(cfPs)}</span>
              <span>CO: ₱{peso(cfCo)}</span>
            </div>
          </div>
        </div>
      </FlaggedSection>

      {/* ORGANIZATION FOCUSED — no sub-total here per template structure */}
      <FlaggedSection section="organizationFocused">
        <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
          <SectionBanner>ORGANIZATION FOCUSED</SectionBanner>
          <CityGPBDataRows rows={d.organizationFocused} section="organizationFocused" />
        </div>
      </FlaggedSection>

      {/* ATTRIBUTED PROGRAMS */}
      <FlaggedSection section="attributedPrograms">
        <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
          <SectionBanner>ATTRIBUTED PROGRAMS</SectionBanner>
          <AttrRows rows={d.attributedPrograms} showOffice={true} />
        </div>
      </FlaggedSection>

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

      <FlaggedSection section="signatories">
        <Signatories items={[
          { label: 'Prepared by (GAD Focal / TWG Member)', value: d.preparedBy, field: 'preparedBy' },
          { label: 'Approved by (Department Head)', value: d.approvedBy, field: 'approvedBy' },
          { label: 'Date', value: d.date, field: 'date' },
        ]} />
      </FlaggedSection>
    </div>
  );
}
