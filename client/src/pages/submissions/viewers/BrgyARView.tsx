import type { BrgyARFormData, BrgyARRow } from '@/hooks/useTemplates';
import { peso, Cell, NumCell, HeaderInfo, SectionBanner, SubLabel, SubTotalRow, ViewField, Signatories } from './ViewerShared';
import { GadBudgetShare } from '@/components/forms/GadBudgetShare';
import { FlaggedSection, FlaggedRow } from '@/components/review/ReviewFlags';
import { EvidenceList } from '@/components/forms/EvidenceField';

function BrgyARDataRows({ rows, section, offset = 0 }: { rows: BrgyARRow[]; section: string; offset?: number }) {
  const COL = 'grid-cols-[220px_240px_240px_240px_150px_150px_260px]';
  if (!rows.length) return <div className="px-4 py-3 text-[12px] text-[#A1A1AA]">No entries</div>;
  return (
    <>
      {rows.map((row, i) => (
        <FlaggedRow key={i} section={section} row={offset + i + 1}>
          <div className={`grid ${COL} border-b border-[#E4E4E7] bg-white`}>
            <Cell field="gadIssue" label="Gender Issue or GAD Mandate (1)" value={row.gadIssue} className="whitespace-pre-wrap"><span className="mr-1 font-semibold text-[#A1A1AA]">{offset + i + 1}.</span>{row.gadIssue}</Cell>
            <Cell field="ppa" label="GAD PPA (2)" value={row.ppa} className="whitespace-pre-wrap">{row.ppa}</Cell>
            <Cell field="indicator" label="Performance Target and Indicator (3)" value={row.indicator} className="whitespace-pre-wrap">{row.indicator}</Cell>
            <Cell field="accomplishments" label="Accomplishments (4)" value={row.accomplishments} className="whitespace-pre-wrap">{row.accomplishments}</Cell>
            <NumCell field="approvedBudget" label="Approved GAD Budget (5)" value={row.approvedBudget} />
            <NumCell field="actualCost" label="Actual GAD Cost (6)" value={row.actualCost} />
            <Cell field="variance" label="Variance or Remarks (7)" value={row.variance}>
              {row.variance || (row.evidence?.length ? null : <span className="text-[#A1A1AA]">—</span>)}
              {!!row.evidence?.length && (
                <div className={row.variance ? 'mt-1.5' : ''}><EvidenceList files={row.evidence} /></div>
              )}
            </Cell>
          </div>
        </FlaggedRow>
      ))}
    </>
  );
}

export function BrgyARView({ d }: { d: BrgyARFormData }) {
  const COL = 'grid-cols-[220px_240px_240px_240px_150px_150px_260px]';
  const ATTR_COL = 'grid-cols-[280px_140px_200px_200px_188px]';

  const st = (rows: BrgyARRow[]) => rows.reduce(
    (a, r) => ({ app: a.app + r.approvedBudget, act: a.act + r.actualCost }),
    { app: 0, act: 0 }
  );
  const cfgi = st(d.clientFocusedGenderIssues);
  const cfgm = st(d.clientFocusedGadMandate);
  const subA = { app: cfgi.app + cfgm.app, act: cfgi.act + cfgm.act };
  const ofgi = st(d.organizationGenderIssues);
  const ofgm = st(d.organizationGadMandate);
  const subB = { app: ofgi.app + ofgm.app, act: ofgi.act + ofgm.act };
  const subC = d.attributedPrograms.reduce(
    (a, r) => ({ tot: a.tot + r.totalBudget, attr: a.attr + r.gadAttributedBudget }),
    { tot: 0, attr: 0 }
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <FlaggedSection section="header">
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <div className="mb-4 text-center">
            <p className="text-[15px] font-bold uppercase tracking-wide text-[#09090B]">
              Barangay Annual Gender and Development (GAD) Accomplishment Report
            </p>
            <div className="mt-1 flex justify-center">
              <ViewField field="fy" label="Fiscal Year" value={d.fy} className="text-center">
                <span className="text-[14px] font-semibold">FY {d.fy}</span>
              </ViewField>
            </div>
          </div>
          <HeaderInfo items={[
            { label: 'Barangay',          value: d.barangay, field: 'barangay' },
            { label: 'City', value: d.cityMunicipality, field: 'cityMunicipality' },
            { label: 'Province',          value: d.province, field: 'province' },
            { label: 'Region',            value: d.region, field: 'region' },
            { label: 'Total Brgy Budget', value: d.totalBrgyBudget ? `₱${peso(d.totalBrgyBudget)}` : '', field: 'totalBrgyBudget' },
            { label: 'Total GAD Budget',  value: d.totalGadBudget  ? `₱${peso(d.totalGadBudget)}`  : '', field: 'totalGadBudget' },
          ]} />
          <div className="mt-4 sm:max-w-xs">
            <GadBudgetShare totalBudget={d.totalBrgyBudget} gadBudget={d.totalGadBudget} budgetLabel="Barangay" />
          </div>
        </div>
      </FlaggedSection>

      {/* Main table */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1460px]">
            {/* Column Headers */}
            <div className={`grid ${COL} border-b border-[#D4D4D8] bg-[#18181B] text-[11px] font-semibold text-white`}>
              {[
                ['Gender Issue or\nGAD Mandate', '(1)'],
                ['GAD Program/Project/\nActivity (PPA)', '(2)'],
                ['Performance Target\nand Indicator', '(3)'],
                ['Accomplishments', '(4)'],
                ['Approved GAD\nBudget', '(5)'],
                ['Actual GAD Cost\nor Expenditure', '(6)'],
                ['Variance or Remarks', '(7)'],
              ].map(([title, col]) => (
                <div key={col} className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight whitespace-pre-line">
                  {title}<br /><span className="text-[10px] font-normal text-zinc-400">{col}</span>
                </div>
              ))}
            </div>

            {/* CLIENT-FOCUSED */}
            <FlaggedSection section="clientFocused">
              <SectionBanner>CLIENT-FOCUSED</SectionBanner>
              <SubLabel color="blue">1.&nbsp; Gender Issues</SubLabel>
              <BrgyARDataRows rows={d.clientFocusedGenderIssues} section="clientFocused" />
              <SubLabel color="amber">2.&nbsp; GAD Mandate</SubLabel>
              <BrgyARDataRows rows={d.clientFocusedGadMandate} section="clientFocused" offset={d.clientFocusedGenderIssues.length} />
              <SubTotalRow label="Sub-total A" app={subA.app} act={subA.act} />
            </FlaggedSection>

            {/* ORGANIZATION-FOCUSED */}
            <FlaggedSection section="organizationFocused">
              <SectionBanner>ORGANIZATION-FOCUSED</SectionBanner>
              <SubLabel color="blue">1.&nbsp; Gender Issues</SubLabel>
              <BrgyARDataRows rows={d.organizationGenderIssues} section="organizationFocused" />
              <SubLabel color="amber">2.&nbsp; GAD Mandate</SubLabel>
              <BrgyARDataRows rows={d.organizationGadMandate} section="organizationFocused" offset={d.organizationGenderIssues.length} />
              <SubTotalRow label="Sub-total B" app={subB.app} act={subB.act} />
            </FlaggedSection>
          </div>
        </div>
      </div>

      {/* Attributed Programs */}
      <FlaggedSection section="attributedPrograms">
        <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[1008px]">
              <SectionBanner>ATTRIBUTED PROGRAMS</SectionBanner>
              <div className={`grid ${ATTR_COL} border-b border-[#D4D4D8] bg-[#18181B] text-[11px] font-semibold text-white`}>
                {[
                  ['Title of Barangay Project', '(8)'],
                  ['HGDG PIMME/\nFIMME Score', '(9)'],
                  ['Total Annual Program/\nProject Cost', '(10)'],
                  ['GAD Attributed Project/\nProgram Cost', '(11)'],
                  ['Variance or Remarks', '(12)'],
                ].map(([title, col]) => (
                  <div key={col} className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight whitespace-pre-line">
                    {title}<br /><span className="text-[10px] font-normal text-zinc-400">{col}</span>
                  </div>
                ))}
              </div>
              {d.attributedPrograms.map((row, i) => (
                <FlaggedRow key={i} section="attributedPrograms" row={i + 1}>
                  <div className={`grid ${ATTR_COL} border-b border-[#E4E4E7] bg-white`}>
                    <Cell field="projectTitle" label="Title of Barangay Project (8)" value={row.projectTitle} className="whitespace-pre-wrap"><span className="mr-1 font-semibold text-[#A1A1AA]">{i + 1}.</span>{row.projectTitle}</Cell>
                    <NumCell field="hgdgScore" label="HGDG Score (9)" value={row.hgdgScore} />
                    <NumCell field="totalBudget" label="Total Annual Program/Project Cost (10)" value={row.totalBudget} />
                    <NumCell field="gadAttributedBudget" label="GAD Attributed Cost (11)" value={row.gadAttributedBudget} />
                    <Cell field="varianceRemarks" label="Variance or Remarks (12)" value={row.varianceRemarks}>{row.varianceRemarks}</Cell>
                  </div>
                </FlaggedRow>
              ))}
              <div className={`grid ${ATTR_COL} bg-[#FAFAFA]`}>
                <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold">Sub-total C</div>
                <div className="border-r border-[#D4D4D8] px-3 py-2" />
                <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold tabular-nums">{peso(subC.tot)}</div>
                <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold tabular-nums">{peso(subC.attr)}</div>
                <div className="px-3 py-2" />
              </div>
            </div>
          </div>
        </div>
      </FlaggedSection>

      {/* Grand Total */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#09090B] px-4 py-3 text-white">
          <span className="text-[13px] font-bold">Grand Total (A+B+C)</span>
          <div className="flex flex-wrap items-center gap-8 text-[13px] font-bold">
            <div className="text-right">
              <span className="mr-2 text-[11px] font-normal text-zinc-400">Approved GAD Budget:</span>
              {peso(subA.app + subB.app)}
            </div>
            <div className="text-right">
              <span className="mr-2 text-[11px] font-normal text-zinc-400">Actual Cost + Attributed:</span>
              {peso(subA.act + subB.act + subC.attr)}
            </div>
          </div>
        </div>
      </div>

      {/* Signatories */}
      <FlaggedSection section="signatories">
        <Signatories items={[
          { label: 'Prepared by (Barangay GAD Focal)', value: d.preparedBy, field: 'preparedBy' },
          { label: 'Approved by (Punong Barangay)', value: d.approvedBy, field: 'approvedBy' },
          { label: 'Date', value: d.date, field: 'date' },
        ]} />
      </FlaggedSection>
    </div>
  );
}
