import { Search, Bell, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  title: string;
  breadcrumb: string;
  onUpload?: () => void;
  onAddRecord?: () => void;
}

export default function Topbar({ title, breadcrumb, onUpload, onAddRecord }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F0] bg-white px-6">
      {/* Left */}
      <div>
        <h1 className="text-[15px] font-semibold text-[#09090B]">{title}</h1>
        <p className="text-[11px] text-[#A1A1AA]">{breadcrumb}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search..."
            className="h-8 w-[180px] rounded-md bg-[#F4F4F5] pl-8 pr-3 text-[13px] text-[#09090B] outline-none placeholder:text-[#A1A1AA] focus:ring-1 focus:ring-[#D4D4D8]"
          />
        </div>

        <button className="rounded-md p-1.5 text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#71717A]">
          <Bell className="size-4" />
        </button>

        {onUpload && (
          <Button variant="ghost" size="sm" onClick={onUpload}>
            <Upload className="size-3.5" />
            Upload
          </Button>
        )}

        {onAddRecord && (
          <Button
            size="sm"
            onClick={onAddRecord}
            className="bg-[#18181B] text-white hover:bg-[#18181B]/90"
          >
            <Plus className="size-3.5" />
            Add Record
          </Button>
        )}
      </div>
    </header>
  );
}
