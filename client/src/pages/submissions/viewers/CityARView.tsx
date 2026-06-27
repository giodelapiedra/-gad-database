import type { CityARFormData, CityARRow } from '@/hooks/useTemplates';
import { peso, HeaderInfo, SectionBanner, AttrRows } from './ViewerShared';

function CityARDataRows({ rows }: { rows: CityARRow[] }) {
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
              { label: 'Actual Results (6)',                value: row.actualResults },
              { label: 'Lead/Responsible Office (10)',      value: row.responsibleOffice },
              { label: 'Variance / Remarks (9)',            value: row.variance },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-medium text-[#71717A]">{label}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[#09090B]">{value || '—'}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-medium text-[#71717A]">Approved Budget / Actual Cost</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-[#09090B]">
                ₱{peso(row.approvedBudget)} / ₱{peso(row.actualCost)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CityARView({ d }: { d: CityARFormData }) {
  const cfTot = d.clientFocused.reduce((a, r) => ({ app: a.app + r.approvedBudget, act: a.act + r.actualCost }), { app: 0, act: 0 });
  const ofTot = d.organizationFocused.reduce((a, r) => ({ app: a.app + r.approvedBudget, act: a.act + r.actualCost }), { app: 0, act: 0 });
  const attrTotal = d.attributedPrograms.reduce((a, r) => a + r.gadAttributedBudget, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-4 text-center text-[15px] font-bold uppercase tracking-wide text-[#09090B]">
          GAD Accomplishment Report (City/Municipality) — Annex E
        </p>
        <HeaderInfo items={[
          { label: 'City/Municipality', value: d.cityMunicipality },
          { label: 'Office/Department', value: d.officeName },
          { label: 'Quarter',           value: d.quarter },
          { label: 'Province',          value: d.province },
          { label: 'Region',            value: d.region },
          { label: 'Fiscal Year (FY)',  value: d.fy },
          { label: 'Total LGU Budget',  value: d.totalLguBudget ? `₱${peso(d.totalLguBudget)}` : '' },
          { label: 'Total GAD Budget',  value: d.totalGadBudget ? `₱${peso(d.totalGadBudget)}` : '' },
        ]} />
      </div>

      {[
        { label: 'CLIENT-FOCUSED',       rows: d.clientFocused,       tot: cfTot },
        { label: 'ORGANIZATION FOCUSED', rows: d.organizationFocused, tot: ofTot },
      ].map(({ label, rows, tot }) => (
        <div key={label} className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
          <SectionBanner>{label}</SectionBanner>
          <CityARDataRows rows={rows} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
            <span className="text-[12px] font-bold text-[#09090B]">Sub-total</span>
            <div className="flex gap-6 text-[12px] font-bold tabular-nums text-[#09090B]">
              <span>Approved: ₱{peso(tot.app)}</span>
              <span>Actual: ₱{peso(tot.act)}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <SectionBanner>ATTRIBUTED PROGRAMS</SectionBanner>
        <AttrRows rows={d.attributedPrograms} showOffice={true} />
        <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2">
          <span className="text-[12px] font-bold text-[#09090B]">Sub-total C (GAD Attributed)</span>
          <span className="text-[12px] font-bold tabular-nums text-[#09090B]">₱{peso(attrTotal)}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#09090B] px-4 py-3 text-white">
          <span className="text-[13px] font-bold">Grand Total (A+B+C)</span>
          <div className="flex flex-wrap gap-6 text-[13px] font-bold">
            <span>Approved: ₱{peso(cfTot.app + ofTot.app)}</span>
            <span>Actual + Attributed: ₱{peso(cfTot.act + ofTot.act + attrTotal)}</span>
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
