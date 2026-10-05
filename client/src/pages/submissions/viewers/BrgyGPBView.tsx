import { gpbKind, type BrgyGPBFormData, type BrgyGPBRow } from '@/hooks/useTemplates';
import { peso, HeaderInfo, SectionBanner, AttrRows, RowNumber, ViewField, Signatories } from './ViewerShared';
import { GadBudgetShare } from '@/components/forms/GadBudgetShare';
import { FlaggedSection, FlaggedRow } from '@/components/review/ReviewFlags';

/** One section, split into its "1. Gender Issues" and "2. GAD Mandate" bands. */
function BrgyGPBBands({ rows, section }: { rows: BrgyGPBRow[]; section: string }) {
  const indexed = rows.map((row, i) => ({ row, i }));
  return (
    <>
      {([['issue', '1. Gender Issues'], ['mandate', '2. GAD Mandate']] as const).map(([kind, label]) => (
        <div key={kind}>
          <div className={`border-y px-4 py-1.5 text-[11px] font-semibold ${kind === 'issue' ? 'border-[#E4E4E7] bg-[#FAFAFA] text-[#52525B]' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
            {label}
          </div>
          <BrgyGPBDataRows rows={indexed.filter(({ row }) => gpbKind(row) === kind)} section={section} />
        </div>
      ))}
    </>
  );
}

function BrgyGPBDataRows({ rows, section }: { rows: { row: BrgyGPBRow; i: number }[]; section: string }) {
  if (!rows.length) return <div className="px-4 py-3 text-[12px] text-[#A1A1AA]">No entries</div>;
  return (
    <div className="space-y-2 p-3">
      {rows.map(({ row, i }) => (
        <FlaggedRow key={i} section={section} row={i + 1}>
          <div className="rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
            <RowNumber n={i + 1} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ViewField field="gadIssue" label="Gender Issue or GAD Mandate (1)" value={row.gadIssue} />
              <ViewField field="activity" label="GAD Activity / PPA (4)" value={row.activity} />
              <ViewField field="indicator" label="Performance Indicator (5)" value={row.indicator} />
              <ViewField field="mooe" label="MOOE (6)" value={`₱${peso(row.mooe)}`} />
              <ViewField field="ps" label="PS (7)" value={`₱${peso(row.ps)}`} />
              <ViewField field="co" label="CO (8)" value={`₱${peso(row.co)}`} />
              <ViewField field="responsibleOffice" label="Responsible Office (9)" value={row.responsibleOffice} />
              <ViewField label="Budget Total" value={`₱${peso(row.mooe + row.ps + row.co)}`} />
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
            { label: 'Barangay',          value: d.barangay, field: 'barangay' },
            { label: 'City', value: d.cityMunicipality, field: 'cityMunicipality' },
            { label: 'Province',          value: d.province, field: 'province' },
            { label: 'Region',            value: d.region, field: 'region' },
            { label: 'Calendar Year (CY)',value: d.cy, field: 'cy' },
            { label: 'Total Brgy Budget', value: d.totalBrgyBudget ? `₱${peso(d.totalBrgyBudget)}` : '', field: 'totalBrgyBudget' },
            { label: 'Total GAD Budget',  value: d.totalGadBudget  ? `₱${peso(d.totalGadBudget)}`  : '', field: 'totalGadBudget' },
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
            <BrgyGPBBands rows={rows} section={section} />
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
        <Signatories items={[
          { label: 'Prepared by (Barangay GAD Focal)', value: d.preparedBy, field: 'preparedBy' },
          { label: 'Approved by (Punong Barangay)',    value: d.approvedBy, field: 'approvedBy' },
        ]} />
      </FlaggedSection>
    </div>
  );
}
