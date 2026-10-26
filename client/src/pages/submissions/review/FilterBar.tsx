import { Building2Icon, FileSpreadsheetIcon, XIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Department } from '@/types';
import { TEMPLATE_LABELS } from '../shared';
import type { TemplateFilter } from './utils';

/**
 * In-page filters for the review list: department and form type.
 * The department value is mirrored in the `?dept=` URL param so the sidebar
 * shortcut keeps working; this bar just makes the same filter visible and
 * changeable without leaving the page.
 */
export default function FilterBar({
  departments,
  activeDept,
  onDeptChange,
  templateFilter,
  onTemplateChange,
}: {
  departments: Department[];
  activeDept: string; // 'ALL' or a department id
  onDeptChange: (value: string) => void;
  templateFilter: TemplateFilter;
  onTemplateChange: (value: TemplateFilter) => void;
}) {
  const active = departments.filter((d) => d.isActive).sort((a, b) => a.name.localeCompare(b.name));
  const hasFilter = activeDept !== 'ALL' || templateFilter !== 'ALL';

  function clearAll() {
    onDeptChange('ALL');
    onTemplateChange('ALL');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Department */}
      <Select value={activeDept} onValueChange={(v) => onDeptChange(v ?? 'ALL')}>
        <SelectTrigger className="h-8 w-[200px] text-[12px]" aria-label="Filter by department">
          <Building2Icon className="size-3.5 shrink-0 text-[#71717A]" />
          <SelectValue placeholder="All departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All departments</SelectItem>
          {active.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Form type */}
      <Select value={templateFilter} onValueChange={(v) => onTemplateChange((v ?? 'ALL') as TemplateFilter)}>
        <SelectTrigger className="h-8 w-[170px] text-[12px]" aria-label="Filter by form type">
          <FileSpreadsheetIcon className="size-3.5 shrink-0 text-[#71717A]" />
          <SelectValue placeholder="All form types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All form types</SelectItem>
          {Object.entries(TEMPLATE_LABELS).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B]"
        >
          <XIcon className="size-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}
