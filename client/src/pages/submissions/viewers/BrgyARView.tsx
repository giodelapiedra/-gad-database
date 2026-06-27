import type { BrgyARFormData, BrgyARRow } from '@/hooks/useTemplates';
import { peso, Cell, NumCell, HeaderInfo, SectionBanner, SubLabel, SubTotalRow, AttrRows } from './ViewerShared';

function BrgyARDataRows({ rows }: { rows: BrgyARRow[] }) {
  const COL = 'grid-cols-[220px_240px_240px_240px_150px_150px_196px]';
  if (!rows.length) return <div className="px-4 py-3 text-[12px] text-[#A1A1AA]">No entries</div>;
  return (
    <>
      {rows.map((row, i) => (
        <div key={i} className={`grid ${COL} border-b border-[#E4E4E7] bg-white`}>
          <Cell className="whitespace-pre-wrap">{row.gadIssue}</Cell>
          <Cell className="whitespace-pre-wrap">{row.ppa}</Cell>
          <Cell className="whitespace-pre-wrap">{row.indicator}</Cell>
          <Cell className="whitespace-pre-wrap">{row.accomplishments}</Cell>
          <NumCell value={row.approvedBudget} />
          <NumCell value={row.actualCost} />
          <Cell>{row.variance}</Cell>
        </div>
      ))}
    </>
  );
}

export function BrgyARView({ d }: { d: BrgyARFormData }) {
  const COL = 'grid-cols-[220px_240px_240px_240px_150px_150px_196px]';
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
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <div className="mb-4 text-center">
          <p className="text-[15px] font-bold uppercase tracking-wide text-[#09090B]">
            Barangay Annual Gender and Development (GAD) Accomplishment Report
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[#09090B]">FY {d.fy}</p>
        </div>
        <HeaderInfo items={[
          { label: 'Barangay',          value: d.barangay },
          { label: 'City/Municipality', value: d.cityMunicipality },
          { label: 'Province',          value: d.province },
          { label: 'Region',            value: d.region },
          { label: 'Total Brgy Budget', value: d.totalBrgyBudget ? `₱${peso(d.totalBrgyBudget)}` : '' },
          { label: 'Total GAD Budget',  value: d.totalGadBudget  ? `₱${peso(d.totalGadBudget)}`  : '' },
        ]} />
      </div>

      {/* Main table */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1396px]">
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
            <SectionBanner>CLIENT-FOCUSED</SectionBanner>
            <SubLabel color="blue">1.&nbsp; Gender Issues</SubLabel>
            <BrgyARDataRows rows={d.clientFocusedGenderIssues} />
            <SubLabel color="amber">2.&nbsp; GAD Mandate</SubLabel>
            <BrgyARDataRows rows={d.clientFocusedGadMandate} />
            <SubTotalRow label="Sub-total A" app={subA.app} act={subA.act} />

            {/* ORGANIZATION-FOCUSED */}
            <SectionBanner>ORGANIZATION-FOCUSED</SectionBanner>
            <SubLabel color="blue">1.&nbsp; Gender Issues</SubLabel>
            <BrgyARDataRows rows={d.organizationGenderIssues} />
            <SubLabel color="amber">2.&nbsp; GAD Mandate</SubLabel>
            <BrgyARDataRows rows={d.organizationGadMandate} />
            <SubTotalRow label="Sub-total B" app={subB.app} act={subB.act} />
          </div>
        </div>
      </div>

      {/* Attributed Programs */}
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
              <div key={i} className={`grid ${ATTR_COL} border-b border-[#E4E4E7] bg-white`}>
                <Cell className="whitespace-pre-wrap">{row.projectTitle}</Cell>
                <NumCell value={row.hgdgScore} />
                <NumCell value={row.totalBudget} />
                <NumCell value={row.gadAttributedBudget} />
                <Cell>{row.varianceRemarks}</Cell>
              </div>
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
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Prepared by (Barangay GAD Focal)', value: d.preparedBy },
            { label: 'Approved by (Punong Barangay)',    value: d.approvedBy },
            { label: 'Date',                             value: d.date },
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
