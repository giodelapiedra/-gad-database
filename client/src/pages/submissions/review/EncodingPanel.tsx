import type { DepartmentStatusResponse } from '@/hooks/useSubmissions';

// ─── Encoding Status panel (which departments haven't submitted) ─────────────

export default function EncodingPanel({ data }: { data?: DepartmentStatusResponse }) {
  const summary = data?.summary ?? { total: 0, submitted: 0, encoding: 0 };
  const departments = data?.departments ?? [];
  const encoding  = departments.filter((d) => d.status === 'encoding').sort((a, b) => a.name.localeCompare(b.name));
  const submitted = departments.filter((d) => d.status !== 'encoding').sort((a, b) => a.name.localeCompare(b.name));
  const pct = summary.total > 0 ? Math.round((summary.submitted / summary.total) * 100) : 0;

  return (
    <div className="space-y-6 p-5">
      {/* Progress */}
      <div>
        <div className="mb-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-[#09090B]">
              {summary.submitted} of {summary.total} departments have submitted
            </p>
            <p className="text-[12px] text-[#71717A]">
              {summary.encoding === 0
                ? 'Everyone is in. 🎉'
                : `${summary.encoding} still encoding${data ? ` for CY ${data.year}` : ''}.`}
            </p>
          </div>
          <span className="text-[20px] font-semibold tabular-nums text-[#09090B]">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F4F4F5]">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {departments.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[#A1A1AA]">No active departments.</p>
      ) : (
        <>
          <DeptGroup title="Not yet submitted" tone="orange" items={encoding} />
          <DeptGroup title="Submitted" tone="emerald" items={submitted} />
        </>
      )}
    </div>
  );
}

function DeptGroup({
  title, tone, items,
}: {
  title: string;
  tone: 'orange' | 'emerald';
  items: DepartmentStatusResponse['departments'];
}) {
  if (items.length === 0) return null;
  const badge = tone === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700';
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#71717A]">
        {title}
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] normal-case tracking-normal ${badge}`}>{items.length}</span>
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d) => (
          <div key={d.id} className="flex items-center gap-2.5 rounded-lg border border-[#E2E4E9] bg-white px-3 py-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#09090B]" title={d.name}>{d.name}</p>
              <p className="text-[11px] text-[#A1A1AA]">{d.code}</p>
            </div>
            {d.status === 'encoding' ? (
              <span className="shrink-0 text-[11px] font-medium text-orange-700">Encoding</span>
            ) : (
              <span className="shrink-0 text-[11px] font-medium text-emerald-700">
                {d.submissionCount} submitted
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
