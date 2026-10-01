import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TANAUAN_BARANGAYS } from '@/lib/location';

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-[11px] font-medium text-[#52525B]">
      {label}{required && <span className="ml-0.5 text-red-500">*</span>}
    </Label>
  );
}

/** Read-only header field for values the encoder cannot change. */
export function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <FieldLabel label={label} />
      <Input value={value} readOnly tabIndex={-1} className="cursor-not-allowed bg-[#F4F4F5] text-[12px] text-[#52525B]" />
    </div>
  );
}

/** Locked to the encoder's assigned barangay; otherwise a pick-list of Tanauan's barangays. */
export function BarangayField({ value, onChange, locked }: {
  value: string; onChange: (v: string) => void; locked: boolean;
}) {
  if (locked) return <LockedField label="Barangay" value={value} />;
  return (
    <div className="space-y-1">
      <FieldLabel label="Barangay" required />
      <Select value={value || undefined} onValueChange={(v) => onChange((v as string | null) ?? '')}>
        <SelectTrigger className="w-full text-[12px]">
          <SelectValue>
            {value ? <span>{value}</span> : <span className="text-muted-foreground">Select barangay</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {TANAUAN_BARANGAYS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
