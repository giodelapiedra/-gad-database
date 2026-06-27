import { useState } from 'react';
import {
  FileSpreadsheetIcon,
  FileTextIcon,
  DownloadIcon,
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  ChevronRightIcon,
  BuildingIcon,
  ClipboardListIcon,
  InfoIcon,
  SendIcon,
  AlertCircleIcon,
  BookmarkIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  useGetTemplates,
  generateTemplateExcel,
  blankBrgyGPBRow,
  blankBrgyARRow,
  blankCityGPBRow,
  blankCityARRow,
  blankAttrRow,
  type TemplateDef,
  type BrgyGPBFormData,
  type BrgyARFormData,
  type CityGPBFormData,
  type CityARFormData,
  type BrgyGPBRow,
  type BrgyARRow,
  type CityGPBRow,
  type CityARRow,
  type AttributedRow,
} from '@/hooks/useTemplates';
import { useAuth } from '@/hooks/useAuth';
import { useSubmitForApproval, useUpdateSubmission, useSaveDraft } from '@/hooks/useSubmissions';

// ─── Helpers ─────────────────────────────────────────────────────────────

function N({ value, onChange, className = '' }: {
  value: number; onChange: (v: number) => void; className?: string;
}) {
  return (
    <Input
      type="number" min={0} value={value || ''}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className={`text-right text-[12px] ${className}`}
    />
  );
}

function T({ value, onChange, placeholder = '', rows = 2, className = '' }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; className?: string;
}) {
  return (
    <Textarea
      rows={rows} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`resize-none text-[12px] ${className}`}
    />
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-[#52525B]">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full rounded-md bg-[#18181B] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white">
      {children}
    </div>
  );
}
void SectionHeader;

function SubSection({ label }: { label: string }) {
  return (
    <div className="col-span-full rounded bg-[#F4F4F5] px-3 py-1 text-[11px] font-semibold text-[#52525B]">
      {label}
    </div>
  );
}
void SubSection;

function AddRowBtn({ onClick, label = 'Add Row' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button" onClick={onClick}
      className="col-span-full flex items-center gap-1.5 rounded-md border border-dashed border-[#D4D4D8] px-3 py-1.5 text-[12px] text-[#71717A] transition-colors hover:border-[#18181B] hover:text-[#18181B]"
    >
      <PlusIcon className="size-3.5" /> {label}
    </button>
  );
}
void AddRowBtn;

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="shrink-0 rounded p-1 text-[#A1A1AA] transition-colors hover:bg-red-50 hover:text-red-500"
      title="Remove row"
    >
      <Trash2Icon className="size-3.5" />
    </button>
  );
}

// ─── Attributed Programs section (shared) ────────────────────────────────

function AttributedSection({
  rows, onChange, showOffice = false,
}: {
  rows: AttributedRow[];
  onChange: (rows: AttributedRow[]) => void;
  showOffice?: boolean;
}) {
  function add() { onChange([...rows, blankAttrRow()]); }
  function remove(i: number) {
    if (rows.length <= 1) { toast.error('At least one row is required'); return; }
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function upd<K extends keyof AttributedRow>(i: number, k: K, v: AttributedRow[K]) {
    onChange(rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2 rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <F label="Title of Project/Program">
              <T value={row.projectTitle} onChange={(v) => upd(i, 'projectTitle', v)} placeholder="Project/Program title" rows={2} />
            </F>
            <F label="HGDG Score">
              <N value={row.hgdgScore} onChange={(v) => upd(i, 'hgdgScore', v)} />
            </F>
            <F label="Total Annual Budget (₱)">
              <N value={row.totalBudget} onChange={(v) => upd(i, 'totalBudget', v)} />
            </F>
            <F label="GAD Attributed Budget (₱)">
              <N value={row.gadAttributedBudget} onChange={(v) => upd(i, 'gadAttributedBudget', v)} />
            </F>
            {showOffice && (
              <F label="Lead/Responsible Office">
                <Input value={row.responsibleOffice} onChange={(e) => upd(i, 'responsibleOffice', e.target.value)}
                  placeholder="Office name" className="text-[12px]" />
              </F>
            )}
            {!showOffice && (
              <F label="Variance or Remarks">
                <Input value={row.varianceRemarks} onChange={(e) => upd(i, 'varianceRemarks', e.target.value)}
                  placeholder="Variance or remarks" className="text-[12px]" />
              </F>
            )}
          </div>
          {rows.length > 1 && <DelBtn onClick={() => remove(i)} />}
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-[#D4D4D8] px-3 py-2 text-[12px] text-[#71717A] transition-colors hover:border-[#18181B] hover:text-[#18181B]"
      >
        <PlusIcon className="size-3.5" /> Add Attributed Program
      </button>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────

function TemplateCard({ template, onSelect }: { template: TemplateDef; onSelect: (t: TemplateDef) => void }) {
  const isGPB = template.type === 'GPB';
  const isBarangay = template.level === 'Barangay';

  return (
    <div className="flex flex-col rounded-[12px] border border-[#EBEBEB] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isGPB ? 'bg-emerald-50' : 'bg-blue-50'}`}>
          {isGPB
            ? <ClipboardListIcon className="size-5 text-emerald-600" />
            : <FileTextIcon className="size-5 text-blue-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1">
            <Badge variant="outline" className={`text-[10px] ${isGPB ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
              {template.type === 'GPB' ? 'Plan & Budget' : 'Accomplishment Report'}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${isBarangay ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-violet-200 text-violet-700 bg-violet-50'}`}>
              <BuildingIcon className="mr-1 size-2.5" />
              {template.level}
            </Badge>
            {template.annex && (
              <Badge variant="outline" className="text-[10px] border-[#E4E4E7] text-[#71717A]">
                {template.annex}
              </Badge>
            )}
          </div>
          <h3 className="text-[14px] font-semibold text-[#09090B] leading-tight">{template.name}</h3>
        </div>
      </div>

      <p className="mb-4 flex-1 text-[12px] leading-relaxed text-[#71717A]">{template.description}</p>

      <div className="mb-4 flex items-center gap-1.5 rounded-md bg-[#F4F4F5] px-3 py-2">
        <FileSpreadsheetIcon className="size-3.5 shrink-0 text-[#71717A]" />
        <span className="truncate text-[11px] text-[#71717A]">{template.fileName}</span>
      </div>

      <Button size="sm" className="w-full" onClick={() => onSelect(template)}>
        <ClipboardListIcon className="mr-1.5 size-4" />
        Fill Form Online
        <ChevronRightIcon className="ml-auto size-3.5" />
      </Button>
    </div>
  );
}

// ─── Shared Form Wrapper ─────────────────────────────────────────────────

// Common props for every template form. When editId/initialData are set the
// form opens in edit mode (admin: save changes; encoder: save & resubmit).
type FormProps<T> = {
  template: TemplateDef;
  onBack: () => void;
  initialData?: T;
  editId?: string;
  isDraftEdit?: boolean;
};


function FormShell({
  title, onBack, onGenerate, onSubmitApproval, isEncoder, submitting, children,
  editId, onSaveEdit, onSaveDraft, isDraftEdit, onValidate,
}: {
  title: string; template: TemplateDef; onBack: () => void;
  onGenerate: () => void; onSubmitApproval?: () => void;
  isEncoder?: boolean; submitting: boolean; children: React.ReactNode;
  editId?: string; onSaveEdit?: () => void;
  onSaveDraft?: () => void; isDraftEdit?: boolean;
  onValidate?: () => string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isEdit = !!editId;

  // Primary action label/handler by mode.
  const subtitle = isDraftEdit
    ? 'Continue editing your draft, then save or submit for admin approval.'
    : isEdit
      ? (isEncoder ? 'Correct the returned form, then save and resubmit for review.' : 'Edit the submitted form, then save your changes.')
      : (isEncoder ? 'Fill all required fields then submit for admin approval.' : 'Fill all required fields then generate your Excel file.');

  // Encoder create & encoder edit go through a confirmation dialog; admin edit saves directly.
  const needsConfirm = isEncoder ?? false;

  function primary(top: boolean) {
    const onClick = () => {
      if (isDraftEdit) {
        const err = onValidate?.();
        if (err) { toast.error(err); return; }
        setConfirmOpen(true); return;
      }
      if (isEdit && !isEncoder) { onSaveEdit?.(); return; }   // admin edit — direct save
      if (needsConfirm) {
        const err = onValidate?.();
        if (err) { toast.error(err); return; }
        setConfirmOpen(true); return;
      }
      onGenerate();                                            // admin create — generate excel
    };
    const sz = top ? { size: 'sm' as const } : {};
    if (isDraftEdit) {
      return (
        <Button onClick={onClick} disabled={submitting} {...sz}>
          <SendIcon className={top ? 'mr-1.5 size-4' : 'mr-2 size-4'} />
          {submitting ? 'Submitting...' : 'Submit for Approval'}
        </Button>
      );
    }
    if (isEdit) {
      return (
        <Button onClick={onClick} disabled={submitting} {...sz}>
          <SendIcon className={top ? 'mr-1.5 size-4' : 'mr-2 size-4'} />
          {submitting ? 'Saving...' : isEncoder ? 'Save & Resubmit' : 'Save Changes'}
        </Button>
      );
    }
    if (isEncoder) {
      return (
        <Button onClick={onClick} disabled={submitting} {...sz}>
          <SendIcon className={top ? 'mr-1.5 size-4' : 'mr-2 size-4'} />
          {submitting ? 'Submitting...' : 'Submit for Approval'}
        </Button>
      );
    }
    return (
      <Button onClick={onClick} disabled={submitting} {...sz}>
        <DownloadIcon className={top ? 'mr-1.5 size-4' : 'mr-2 size-4'} />
        {submitting ? 'Generating...' : top ? 'Generate Excel' : 'Generate & Download Excel'}
      </Button>
    );
  }

  function saveDraftBtn(top: boolean) {
    if (!onSaveDraft) return null;
    const sz = top ? { size: 'sm' as const } : {};
    return (
      <Button variant="outline" onClick={onSaveDraft} disabled={submitting} {...sz}>
        <BookmarkIcon className={top ? 'mr-1.5 size-4' : 'mr-2 size-4'} />
        {submitting ? 'Saving...' : 'Save Draft'}
      </Button>
    );
  }

  function handleConfirm() {
    setConfirmOpen(false);
    if (isEdit) onSaveEdit?.(); else onSubmitApproval?.();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="mr-1.5 size-4" />Back
        </Button>
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090B]">{title}</h2>
          <p className="text-[12px] text-[#71717A]">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {saveDraftBtn(true)}
          {primary(true)}
        </div>
      </div>

      {children}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        {saveDraftBtn(false)}
        {primary(false)}
      </div>

      {/* ── Confirmation Dialog (encoder submit / resubmit) ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-50">
              <AlertCircleIcon className="size-6 text-amber-500" />
            </div>
            <DialogTitle className="text-center text-[15px]">
              {isDraftEdit || !isEdit ? 'Submit for Approval?' : 'Save and Resubmit?'}
            </DialogTitle>
            <DialogDescription className="text-center text-[13px]">
              {isDraftEdit
                ? 'Your draft will be submitted to the admin for review. Make sure all fields are filled in correctly before proceeding.'
                : isEdit
                  ? 'Your corrected form will be sent back to the admin for review. Make sure all fields are correct before proceeding.'
                  : 'Once submitted, your form will be sent to the admin for review. Make sure all fields are filled in correctly before proceeding.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setConfirmOpen(false)}
            >
              Go Back and Check
            </Button>
            <Button
              className="w-full bg-[#18181B] hover:bg-[#18181B]/90 sm:w-auto"
              onClick={handleConfirm}
              disabled={submitting}
            >
              <SendIcon className="mr-2 size-4" />
              {isDraftEdit || !isEdit ? 'Yes, Submit' : 'Yes, Resubmit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Barangay GPB Form ────────────────────────────────────────────────────

export function BrgyGPBForm({ template, onBack, initialData, editId, isDraftEdit }: FormProps<BrgyGPBFormData>) {
  const cy = new Date().getFullYear();
  const [d, setD] = useState<BrgyGPBFormData>(initialData ?? {
    region: '', province: '', cityMunicipality: '', barangay: '',
    cy, totalBrgyBudget: 0, totalGadBudget: 0,
    clientFocused: [blankBrgyGPBRow()],
    organizationFocused: [blankBrgyGPBRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '',
  });
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const submitMutation = useSubmitForApproval();
  const updateMutation = useUpdateSubmission();
  const draftMutation = useSaveDraft();
  const isEncoder = user?.role === 'ENCODER';

  async function saveDraft() {
    try {
      setBusy(true);
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, formData: d });
        toast.success('Draft updated!');
      } else {
        await draftMutation.mutateAsync({ templateId: template.id, formData: d });
        toast.success('Draft saved! You can find it in My Submissions.');
      }
      onBack();
    } catch { toast.error('Failed to save draft. Try again.'); }
    finally { setBusy(false); }
  }

  async function saveEdit() {
    if (isEncoder) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    try {
      setBusy(true);
      await updateMutation.mutateAsync({ id: editId!, formData: d, resubmit: isEncoder });
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      onBack();
    } catch { toast.error('Failed to save. Try again.'); }
    finally { setBusy(false); }
  }

  function upd<K extends keyof BrgyGPBFormData>(k: K, v: BrgyGPBFormData[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
  }

  function updRow<K extends keyof BrgyGPBRow>(
    section: 'clientFocused' | 'organizationFocused',
    i: number, k: K, v: BrgyGPBRow[K]
  ) {
    setD((prev) => ({
      ...prev,
      [section]: prev[section].map((r, idx) => idx === i ? { ...r, [k]: v } : r),
    }));
  }

  function addRow(section: 'clientFocused' | 'organizationFocused') {
    setD((prev) => ({ ...prev, [section]: [...prev[section], blankBrgyGPBRow()] }));
  }

  function remRow(section: 'clientFocused' | 'organizationFocused', i: number) {
    setD((prev) => ({ ...prev, [section]: prev[section].filter((_, idx) => idx !== i) }));
  }

  function validate(): string | null {
    if (!d.barangay.trim()) return 'Barangay name is required.';
    if (!d.cy) return 'Calendar Year is required.';
    const allRows = [...d.clientFocused, ...d.organizationFocused];
    const hasBlankIssue = allRows.some((r) => !r.gadIssue.trim());
    if (hasBlankIssue) return 'All rows must have a Gender Issue or GAD Mandate filled in.';
    const hasBlankActivity = allRows.some((r) => !r.activity.trim());
    if (hasBlankActivity) return 'All rows must have a GAD Activity/PPA filled in.';
    return null;
  }

  async function generate() {
    const err = validate();
    if (err) { toast.error(err); return; }
    try {
      setBusy(true);
      await generateTemplateExcel(template.id, d);
      toast.success('Barangay GPB Excel downloaded!');
    } catch { toast.error('Failed to generate. Try again.'); }
    finally { setBusy(false); }
  }

  async function submitForApproval() {
    try {
      setBusy(true);
      await submitMutation.mutateAsync({ templateId: template.id, formData: d });
      toast.success('Form submitted for approval! You can track it in My Submissions.');
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

  function GPBRows({ section }: { section: 'clientFocused' | 'organizationFocused' }) {
    const rows = d[section];
    return (
      <>
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
            <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">
              {i + 1}
            </span>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
              <F label="Gender Issue or GAD Mandate (1)" required>
                <T value={row.gadIssue} onChange={(v) => updRow(section, i, 'gadIssue', v)}
                  placeholder="e.g. RA 9710 Magna Carta of Women..." />
              </F>
              <F label="GAD Activity / PPA (4)" required>
                <T value={row.activity} onChange={(v) => updRow(section, i, 'activity', v)}
                  placeholder="e.g. Conduct Women's Leadership Training" />
              </F>
              <F label="Performance Indicator & Target (5)">
                <T value={row.indicator} onChange={(v) => updRow(section, i, 'indicator', v)}
                  placeholder="e.g. 100% of target women trained" />
              </F>
              <F label="MOOE (₱) (6)">
                <N value={row.mooe} onChange={(v) => updRow(section, i, 'mooe', v)} />
              </F>
              <F label="PS (₱) (7)">
                <N value={row.ps} onChange={(v) => updRow(section, i, 'ps', v)} />
              </F>
              <F label="CO (₱) (8)">
                <N value={row.co} onChange={(v) => updRow(section, i, 'co', v)} />
              </F>
              <F label="Responsible Office (9)">
                <Input value={row.responsibleOffice}
                  onChange={(e) => updRow(section, i, 'responsibleOffice', e.target.value)}
                  placeholder="e.g. GAD Focal Point System"
                  className="text-[12px]" />
              </F>
              <div className="col-span-full text-[11px] text-[#A1A1AA]">
                Total: ₱{(row.mooe + row.ps + row.co).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>
            {rows.length > 1 && <DelBtn onClick={() => remRow(section, i)} />}
          </div>
        ))}
        <button type="button" onClick={() => addRow(section)}
          className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-[#D4D4D8] px-3 py-2 text-[12px] text-[#71717A] transition-colors hover:border-[#18181B] hover:text-[#18181B]"
        >
          <PlusIcon className="size-3.5" /> Add Row
        </button>
      </>
    );
  }

  return (
    <FormShell title="Barangay Annual GAD Plan and Budget (GPB)" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} onValidate={isEncoder ? validate : undefined}>
      {/* Header */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Header Information</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <F label="Barangay" required>
            <Input value={d.barangay} onChange={(e) => upd('barangay', e.target.value)}
              placeholder="e.g. Barangay Poblacion" className="text-[12px]" />
          </F>
          <F label="City / Municipality">
            <Input value={d.cityMunicipality} onChange={(e) => upd('cityMunicipality', e.target.value)}
              placeholder="e.g. Tanauan City" className="text-[12px]" />
          </F>
          <F label="Province">
            <Input value={d.province} onChange={(e) => upd('province', e.target.value)}
              placeholder="e.g. Batangas" className="text-[12px]" />
          </F>
          <F label="Region">
            <Input value={d.region} onChange={(e) => upd('region', e.target.value)}
              placeholder="e.g. IV-A (CALABARZON)" className="text-[12px]" />
          </F>
          <F label="Calendar Year (CY)" required>
            <Input type="number" value={d.cy} onChange={(e) => upd('cy', Number(e.target.value))}
              className="text-[12px]" />
          </F>
          <F label="Total Barangay Budget (₱)">
            <N value={d.totalBrgyBudget} onChange={(v) => upd('totalBrgyBudget', v)} />
          </F>
          <F label="Total GAD Budget (₱)">
            <N value={d.totalGadBudget} onChange={(v) => upd('totalGadBudget', v)} />
          </F>
        </div>
      </div>

      {/* CLIENT-FOCUSED */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-white bg-[#18181B] rounded px-2 py-1 inline-block">CLIENT-FOCUSED</p>
        <p className="mb-3 text-[11px] text-[#71717A]">PPAs directly benefiting women/men clients</p>
        <div className="space-y-2"><GPBRows section="clientFocused" /></div>
      </div>

      {/* ORGANIZATION FOCUSED */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-white bg-[#18181B] rounded px-2 py-1 inline-block">ORGANIZATION FOCUSED</p>
        <p className="mb-3 text-[11px] text-[#71717A]">PPAs strengthening GAD mandate within the organization</p>
        <div className="space-y-2"><GPBRows section="organizationFocused" /></div>
      </div>

      {/* ATTRIBUTED PROGRAMS */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-white bg-[#18181B] rounded px-2 py-1 inline-block">ATTRIBUTED PROGRAMS</p>
        <p className="mb-3 text-[11px] text-[#71717A]">Programs with GAD components scored via HGDG</p>
        <AttributedSection rows={d.attributedPrograms} onChange={(v) => upd('attributedPrograms', v)} showOffice={false} />
      </div>

      {/* Signatories */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
        <div className="grid grid-cols-2 gap-3">
          <F label="Prepared by (Barangay GAD Focal)">
            <Input value={d.preparedBy} onChange={(e) => upd('preparedBy', e.target.value)}
              placeholder="Full name and position" className="text-[12px]" />
          </F>
          <F label="Approved by (Punong Barangay)">
            <Input value={d.approvedBy} onChange={(e) => upd('approvedBy', e.target.value)}
              placeholder="Full name" className="text-[12px]" />
          </F>
        </div>
      </div>
    </FormShell>
  );
}

// ─── Barangay AR Form ─────────────────────────────────────────────────────

export function BrgyARForm({ template, onBack, initialData, editId, isDraftEdit }: FormProps<BrgyARFormData>) {
  const fy = new Date().getFullYear();
  const [d, setD] = useState<BrgyARFormData>(initialData ?? {
    region: '', province: '', cityMunicipality: '', barangay: '',
    fy, totalBrgyBudget: 0, totalGadBudget: 0,
    clientFocusedGenderIssues: [blankBrgyARRow()],
    clientFocusedGadMandate: [blankBrgyARRow()],
    organizationGenderIssues: [blankBrgyARRow()],
    organizationGadMandate: [blankBrgyARRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '', date: '',
  });
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const submitMutation = useSubmitForApproval();
  const updateMutation = useUpdateSubmission();
  const draftMutation = useSaveDraft();
  const isEncoder = user?.role === 'ENCODER';

  async function saveDraft() {
    try {
      setBusy(true);
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, formData: d });
        toast.success('Draft updated!');
      } else {
        await draftMutation.mutateAsync({ templateId: template.id, formData: d });
        toast.success('Draft saved! You can find it in My Submissions.');
      }
      onBack();
    } catch { toast.error('Failed to save draft. Try again.'); }
    finally { setBusy(false); }
  }

  function validate(): string | null {
    if (!d.barangay.trim()) return 'Barangay name is required.';
    if (!d.fy) return 'Fiscal Year is required.';
    const allRows = [...d.clientFocusedGenderIssues, ...d.clientFocusedGadMandate, ...d.organizationGenderIssues, ...d.organizationGadMandate];
    if (allRows.some((r) => !r.gadIssue.trim()))
      return 'All rows must have a Gender Issue or GAD Mandate filled in.';
    return null;
  }

  async function saveEdit() {
    if (isEncoder) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    try {
      setBusy(true);
      await updateMutation.mutateAsync({ id: editId!, formData: d, resubmit: isEncoder });
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      onBack();
    } catch { toast.error('Failed to save. Try again.'); }
    finally { setBusy(false); }
  }

  type ARSection = 'clientFocusedGenderIssues' | 'clientFocusedGadMandate' | 'organizationGenderIssues' | 'organizationGadMandate';
  function upd<K extends keyof BrgyARFormData>(k: K, v: BrgyARFormData[K]) { setD((p) => ({ ...p, [k]: v })); }
  function updRow<K extends keyof BrgyARRow>(sec: ARSection, i: number, k: K, v: BrgyARRow[K]) {
    setD((p) => ({ ...p, [sec]: p[sec].map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  }
  function addRow(sec: ARSection) { setD((p) => ({ ...p, [sec]: [...p[sec], blankBrgyARRow()] })); }
  function remRow(sec: ARSection, i: number) { setD((p) => ({ ...p, [sec]: p[sec].filter((_, idx) => idx !== i) })); }

  async function generate() {
    const err = validate();
    if (err) { toast.error(err); return; }
    try { setBusy(true); await generateTemplateExcel(template.id, d); toast.success('Barangay AR Excel downloaded!'); }
    catch { toast.error('Failed to generate. Try again.'); }
    finally { setBusy(false); }
  }

  async function submitForApproval() {
    try {
      setBusy(true);
      await submitMutation.mutateAsync({ templateId: template.id, formData: d });
      toast.success('Form submitted for approval! You can track it in My Submissions.');
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

  // ── Column layout constants ──
  const COL = 'grid-cols-[220px_240px_240px_240px_150px_150px_196px_48px]';
  // Sub-total spans cols 1-4 merged, then cols 5, 6, 7+action
  const SUBTOTAL_COL = 'grid-cols-[940px_150px_150px_244px]';
  // Attributed Programs: cols 8-12 + action
  const ATTR_COL = 'grid-cols-[280px_140px_200px_200px_188px_48px]';
  const ATTR_SUBTOTAL_COL = 'grid-cols-[280px_140px_200px_200px_236px]';

  // ── Live totals ──
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
  const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

  // ── Data rows for a given section ──
  function DataRows({ sec }: { sec: ARSection }) {
    const rows = d[sec];
    return (
      <>
        {rows.map((row, i) => (
          <div key={i} className={`grid ${COL} border-b border-[#E4E4E7] bg-white`}>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.gadIssue} onChange={(v) => updRow(sec, i, 'gadIssue', v)} placeholder="Gender issue or GAD mandate" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.ppa} onChange={(v) => updRow(sec, i, 'ppa', v)} placeholder="Program / project / activity" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.indicator} onChange={(v) => updRow(sec, i, 'indicator', v)} placeholder="Performance target and indicator" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.accomplishments} onChange={(v) => updRow(sec, i, 'accomplishments', v)} placeholder="Accomplishments" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <N value={row.approvedBudget} onChange={(v) => updRow(sec, i, 'approvedBudget', v)} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <N value={row.actualCost} onChange={(v) => updRow(sec, i, 'actualCost', v)} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <Input value={row.variance} onChange={(e) => updRow(sec, i, 'variance', e.target.value)} placeholder="Remarks" className="text-[12px]" />
            </div>
            <div className="flex items-start justify-center p-2">
              {rows.length > 1 && <DelBtn onClick={() => remRow(sec, i)} />}
            </div>
          </div>
        ))}
        <div className="border-b border-dashed border-[#D4D4D8] bg-[#FAFAFA] p-2">
          <button type="button" onClick={() => addRow(sec)}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#D4D4D8] px-3 py-1.5 text-[11px] text-[#71717A] hover:border-[#18181B] hover:text-[#18181B]"
          >
            <PlusIcon className="size-3" /> Add Row
          </button>
        </div>
      </>
    );
  }

  return (
    <FormShell title="Barangay Annual GAD Accomplishment Report (AR)" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} onValidate={isEncoder ? validate : undefined}>

      {/* ── Header Info ── */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        {/* Title */}
        <div className="mb-5 text-center">
          <p className="text-[15px] font-bold uppercase tracking-wide text-[#09090B]">
            Barangay Annual Gender and Development (GAD) Accomplishment Report
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#09090B]">
            <span>FY</span>
            <Input type="number" value={d.fy} onChange={(e) => upd('fy', Number(e.target.value))}
              className="h-7 w-24 text-center text-[12px]" />
          </div>
        </div>

        {/* Region / Province / City / Barangay  |  Budgets */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-2.5">
          <div className="space-y-2.5">
            <F label="Region">
              <Input value={d.region} onChange={(e) => upd('region', e.target.value)}
                placeholder="e.g. IV-A (CALABARZON)" className="text-[12px]" />
            </F>
            <F label="Province">
              <Input value={d.province} onChange={(e) => upd('province', e.target.value)}
                placeholder="e.g. Batangas" className="text-[12px]" />
            </F>
            <F label="City / Municipality">
              <Input value={d.cityMunicipality} onChange={(e) => upd('cityMunicipality', e.target.value)}
                placeholder="e.g. Tanauan City" className="text-[12px]" />
            </F>
            <F label="Barangay" required>
              <Input value={d.barangay} onChange={(e) => upd('barangay', e.target.value)}
                placeholder="Barangay name" className="text-[12px]" />
            </F>
          </div>
          <div className="space-y-2.5">
            <F label="Total Barangay Budget (₱)">
              <N value={d.totalBrgyBudget} onChange={(v) => upd('totalBrgyBudget', v)} />
            </F>
            <F label="Total GAD Budget (₱)">
              <N value={d.totalGadBudget} onChange={(v) => upd('totalGadBudget', v)} />
            </F>
          </div>
        </div>
      </div>

      {/* ── Unified 7-column Table: CLIENT-FOCUSED + ORGANIZATION-FOCUSED ── */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1444px]">

            {/* Table Column Headers */}
            <div className={`grid ${COL} border-b border-[#D4D4D8] bg-[#18181B] text-[11px] font-semibold text-white`}>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Gender Issue or<br />GAD Mandate<br /><span className="text-[10px] font-normal text-zinc-400">(1)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                GAD Program/Project/<br />Activity (PPA)<br /><span className="text-[10px] font-normal text-zinc-400">(2)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Performance Target<br />and Indicator<br /><span className="text-[10px] font-normal text-zinc-400">(3)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Accomplishments<br /><span className="text-[10px] font-normal text-zinc-400">(4)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Approved GAD<br />Budget<br /><span className="text-[10px] font-normal text-zinc-400">(5)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Actual GAD Cost<br />or Expenditure<br /><span className="text-[10px] font-normal text-zinc-400">(6)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Variance or Remarks<br /><span className="text-[10px] font-normal text-zinc-400">(7)</span>
              </div>
              <div className="px-2 py-3 text-center text-[10px]">Act.</div>
            </div>

            {/* ═══ CLIENT-FOCUSED ═══ */}
            <div className="border-b border-[#D4D4D8] bg-[#27272A] px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white">
              CLIENT-FOCUSED
            </div>

            {/* 1. Gender Issues — label sits in col (1), other cols empty */}
            <div className={`grid ${COL} border-b-2 border-[#D4D4D8] bg-[#EEF2FF]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#3730A3]">
                1.&nbsp; Gender Issues
              </div>
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div />
            </div>
            {DataRows({ sec: 'clientFocusedGenderIssues' })}

            {/* 2. GAD Mandate — label sits in col (1), other cols empty */}
            <div className={`grid ${COL} border-b-2 border-[#D4D4D8] bg-[#FFF7ED]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#92400E]">
                2.&nbsp; GAD Mandate
              </div>
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div />
            </div>
            {DataRows({ sec: 'clientFocusedGadMandate' })}

            {/* Sub-total A */}
            <div className={`grid ${SUBTOTAL_COL} border-b-2 border-[#27272A] bg-[#F4F4F5]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#09090B]">Sub-total A</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(subA.app)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(subA.act)}</div>
              <div className="px-3 py-2" />
            </div>

            {/* ═══ ORGANIZATION-FOCUSED ═══ */}
            <div className="border-b border-[#D4D4D8] bg-[#27272A] px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white">
              ORGANIZATION-FOCUSED
            </div>

            {/* 1. Gender Issues — label sits in col (1), other cols empty */}
            <div className={`grid ${COL} border-b-2 border-[#D4D4D8] bg-[#EEF2FF]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#3730A3]">
                1.&nbsp; Gender Issues
              </div>
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div />
            </div>
            {DataRows({ sec: 'organizationGenderIssues' })}

            {/* 2. GAD Mandate — label sits in col (1), other cols empty */}
            <div className={`grid ${COL} border-b-2 border-[#D4D4D8] bg-[#FFF7ED]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#92400E]">
                2.&nbsp; GAD Mandate
              </div>
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div className="border-r border-[#D4D4D8]" />
              <div />
            </div>
            {DataRows({ sec: 'organizationGadMandate' })}

            {/* Sub-total B */}
            <div className={`grid ${SUBTOTAL_COL} bg-[#F4F4F5]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#09090B]">Sub-total B</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(subB.app)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(subB.act)}</div>
              <div className="px-3 py-2" />
            </div>

          </div>
        </div>
      </div>

      {/* ── ATTRIBUTED PROGRAMS (cols 8–12) ── */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1056px]">

            {/* Section Banner */}
            <div className="border-b border-[#D4D4D8] bg-[#27272A] px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white">
              ATTRIBUTED PROGRAMS
            </div>

            {/* Column Headers */}
            <div className={`grid ${ATTR_COL} border-b border-[#D4D4D8] bg-[#18181B] text-[11px] font-semibold text-white`}>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Title of Barangay Project<br /><span className="text-[10px] font-normal text-zinc-400">(8)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                HGDG PIMME/<br />FIMME Score<br /><span className="text-[10px] font-normal text-zinc-400">(9)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Total Annual Program/<br />Project Cost or<br />Expenditure<br /><span className="text-[10px] font-normal text-zinc-400">(10)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                GAD Attributed Project/<br />Program Cost or<br />Expenditure<br /><span className="text-[10px] font-normal text-zinc-400">(11)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Variance or Remarks<br /><span className="text-[10px] font-normal text-zinc-400">(12)</span>
              </div>
              <div className="px-2 py-3 text-center text-[10px]">Act.</div>
            </div>

            {/* Attributed Rows */}
            {d.attributedPrograms.map((row, i) => (
              <div key={i} className={`grid ${ATTR_COL} border-b border-[#E4E4E7] bg-white`}>
                <div className="border-r border-[#E4E4E7] p-2">
                  <T value={row.projectTitle} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, projectTitle: v } : r));
                  }} placeholder="Project/Program title" rows={3} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <N value={row.hgdgScore} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, hgdgScore: v } : r));
                  }} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <N value={row.totalBudget} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, totalBudget: v } : r));
                  }} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <N value={row.gadAttributedBudget} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, gadAttributedBudget: v } : r));
                  }} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <Input value={row.varianceRemarks} onChange={(e) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, varianceRemarks: e.target.value } : r));
                  }} placeholder="Remarks" className="text-[12px]" />
                </div>
                <div className="flex items-start justify-center p-2">
                  {d.attributedPrograms.length > 1 && (
                    <DelBtn onClick={() => upd('attributedPrograms', d.attributedPrograms.filter((_, idx) => idx !== i))} />
                  )}
                </div>
              </div>
            ))}

            {/* Sub-total C */}
            <div className={`grid ${ATTR_SUBTOTAL_COL} border-b border-[#D4D4D8] bg-[#FAFAFA]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#09090B]">Sub-total C</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2" />
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(subC.tot)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(subC.attr)}</div>
              <div className="px-3 py-2" />
            </div>

            {/* Add Row */}
            <div className="bg-[#FAFAFA] p-2">
              <button type="button"
                onClick={() => upd('attributedPrograms', [...d.attributedPrograms, blankAttrRow()])}
                className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#D4D4D8] px-3 py-2 text-[12px] text-[#71717A] hover:border-[#18181B] hover:text-[#18181B]"
              >
                <PlusIcon className="size-3.5" /> Add Attributed Program
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Grand Total (A+B+C) ── */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex items-center justify-between bg-[#09090B] px-4 py-3 text-white">
          <span className="text-[13px] font-bold">Grand Total (A+B+C)</span>
          <div className="flex items-center gap-8 text-[13px] font-bold">
            <div className="text-right">
              <span className="mr-2 text-[11px] font-normal text-zinc-400">Approved GAD Budget:</span>
              {fmt(subA.app + subB.app)}
            </div>
            <div className="text-right">
              <span className="mr-2 text-[11px] font-normal text-zinc-400">Actual Cost + Attributed:</span>
              {fmt(subA.act + subB.act + subC.attr)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Signatories ── */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
        <div className="grid grid-cols-3 gap-3">
          <F label="Prepared by (Barangay GAD Focal)">
            <Input value={d.preparedBy} onChange={(e) => upd('preparedBy', e.target.value)}
              placeholder="Full name" className="text-[12px]" />
          </F>
          <F label="Approved by (Punong Barangay)">
            <Input value={d.approvedBy} onChange={(e) => upd('approvedBy', e.target.value)}
              placeholder="Full name" className="text-[12px]" />
          </F>
          <F label="Date (DD/MM/YYYY)">
            <Input type="date" value={d.date} onChange={(e) => upd('date', e.target.value)}
              className="text-[12px]" />
          </F>
        </div>
      </div>

    </FormShell>
  );
}

// ─── City GPB Form ────────────────────────────────────────────────────────

export function CityGPBForm({ template, onBack, initialData, editId, isDraftEdit }: FormProps<CityGPBFormData>) {
  const fy = new Date().getFullYear();
  const [d, setD] = useState<CityGPBFormData>(initialData ?? {
    region: 'IV-A', province: 'Batangas', cityMunicipality: 'Tanauan City',
    officeName: '', fy, totalLguBudget: 0, totalGadBudget: 0,
    clientFocused: [blankCityGPBRow()],
    organizationFocused: [blankCityGPBRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '', date: '',
  });
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const submitMutation = useSubmitForApproval();
  const updateMutation = useUpdateSubmission();
  const draftMutation = useSaveDraft();
  const isEncoder = user?.role === 'ENCODER';

  async function saveDraft() {
    try {
      setBusy(true);
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, formData: d });
        toast.success('Draft updated!');
      } else {
        await draftMutation.mutateAsync({ templateId: template.id, formData: d });
        toast.success('Draft saved! You can find it in My Submissions.');
      }
      onBack();
    } catch { toast.error('Failed to save draft. Try again.'); }
    finally { setBusy(false); }
  }

  function validate(): string | null {
    if (!d.cityMunicipality.trim()) return 'City/Municipality name is required.';
    if (!d.fy) return 'Fiscal Year is required.';
    const allRows = [...d.clientFocused, ...d.organizationFocused];
    if (allRows.some((r) => !r.gadIssue.trim()))
      return 'All rows must have a Gender Issue or GAD Mandate filled in.';
    if (allRows.some((r) => !r.activity.trim()))
      return 'All rows must have a GAD Activity filled in.';
    return null;
  }

  async function saveEdit() {
    if (isEncoder) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    try {
      setBusy(true);
      await updateMutation.mutateAsync({ id: editId!, formData: d, resubmit: isEncoder });
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      onBack();
    } catch { toast.error('Failed to save. Try again.'); }
    finally { setBusy(false); }
  }

  function upd<K extends keyof CityGPBFormData>(k: K, v: CityGPBFormData[K]) { setD((p) => ({ ...p, [k]: v })); }
  function updRow<K extends keyof CityGPBRow>(sec: 'clientFocused' | 'organizationFocused', i: number, k: K, v: CityGPBRow[K]) {
    setD((p) => ({ ...p, [sec]: p[sec].map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  }
  function addRow(sec: 'clientFocused' | 'organizationFocused') { setD((p) => ({ ...p, [sec]: [...p[sec], blankCityGPBRow()] })); }
  function remRow(sec: 'clientFocused' | 'organizationFocused', i: number) { setD((p) => ({ ...p, [sec]: p[sec].filter((_, idx) => idx !== i) })); }

  async function generate() {
    const err = validate();
    if (err) { toast.error(err); return; }
    try { setBusy(true); await generateTemplateExcel(template.id, d); toast.success('City GPB Excel downloaded!'); }
    catch { toast.error('Failed to generate. Try again.'); }
    finally { setBusy(false); }
  }

  async function submitForApproval() {
    try {
      setBusy(true);
      await submitMutation.mutateAsync({ templateId: template.id, formData: d });
      toast.success('Form submitted for approval! You can track it in My Submissions.');
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

  // ── Column layout constants ──
  const COL = 'grid-cols-[220px_180px_180px_180px_180px_110px_110px_110px_170px_48px]';
  const SUBTOTAL_COL = 'grid-cols-[940px_110px_110px_110px_218px]';
  const ATTR_COL = 'grid-cols-[260px_130px_170px_170px_200px_48px]';
  const ATTR_SUBTOTAL_COL = 'grid-cols-[260px_130px_170px_170px_248px]';

  // ── Live totals ──
  const sumSec = (rows: CityGPBRow[]) => rows.reduce(
    (a, r) => ({ mooe: a.mooe + r.mooe, ps: a.ps + r.ps, co: a.co + r.co }),
    { mooe: 0, ps: 0, co: 0 },
  );
  const cfSum  = sumSec(d.clientFocused);
  const ofSum  = sumSec(d.organizationFocused);
  const attrSum = d.attributedPrograms.reduce(
    (a, r) => ({ tot: a.tot + r.totalBudget, attr: a.attr + r.gadAttributedBudget }),
    { tot: 0, attr: 0 },
  );
  const grandMooe = cfSum.mooe + ofSum.mooe;
  const grandPs   = cfSum.ps   + ofSum.ps;
  const grandCo   = cfSum.co   + ofSum.co;
  const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

  function DataRows({ sec }: { sec: 'clientFocused' | 'organizationFocused' }) {
    const rows = d[sec];
    return (
      <>
        {rows.map((row, i) => (
          <div key={i} className={`grid ${COL} border-b border-[#E4E4E7] bg-white`}>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.gadIssue} onChange={(v) => updRow(sec, i, 'gadIssue', v)} placeholder="Gender issue or GAD mandate" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.gadObjective} onChange={(v) => updRow(sec, i, 'gadObjective', v)} placeholder="GAD objective" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.relevantProgram} onChange={(v) => updRow(sec, i, 'relevantProgram', v)} placeholder="Relevant LGU program/project" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.activity} onChange={(v) => updRow(sec, i, 'activity', v)} placeholder="GAD activity" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <T value={row.indicator} onChange={(v) => updRow(sec, i, 'indicator', v)} placeholder="Performance indicator & target" rows={4} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <N value={row.mooe} onChange={(v) => updRow(sec, i, 'mooe', v)} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <N value={row.ps} onChange={(v) => updRow(sec, i, 'ps', v)} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <N value={row.co} onChange={(v) => updRow(sec, i, 'co', v)} />
            </div>
            <div className="border-r border-[#E4E4E7] p-2">
              <Input value={row.responsibleOffice} onChange={(e) => updRow(sec, i, 'responsibleOffice', e.target.value)} placeholder="Office name" className="text-[12px]" />
            </div>
            <div className="flex items-start justify-center p-2">
              {rows.length > 1 && <DelBtn onClick={() => remRow(sec, i)} />}
            </div>
          </div>
        ))}
        <div className="border-b border-dashed border-[#D4D4D8] bg-[#FAFAFA] p-2">
          <button type="button" onClick={() => addRow(sec)}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#D4D4D8] px-3 py-1.5 text-[11px] text-[#71717A] hover:border-[#18181B] hover:text-[#18181B]"
          >
            <PlusIcon className="size-3" /> Add Row
          </button>
        </div>
      </>
    );
  }

  return (
    <FormShell title="Annual GAD Plan and Budget (City/Municipality) — Annex D" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} onValidate={isEncoder ? validate : undefined}>

      {/* ── Header Info ── */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Header Information</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <F label="City / Municipality" required>
            <Input value={d.cityMunicipality} onChange={(e) => upd('cityMunicipality', e.target.value)} placeholder="e.g. Tanauan City" className="text-[12px]" />
          </F>
          <F label="Office / Department">
            <Input value={d.officeName} onChange={(e) => upd('officeName', e.target.value)} placeholder="e.g. CDRRMO" className="text-[12px]" />
          </F>
          <F label="Province">
            <Input value={d.province} onChange={(e) => upd('province', e.target.value)} placeholder="e.g. Batangas" className="text-[12px]" />
          </F>
          <F label="Region">
            <Input value={d.region} onChange={(e) => upd('region', e.target.value)} placeholder="e.g. IV-A" className="text-[12px]" />
          </F>
          <F label="Fiscal Year (FY)" required>
            <Input type="number" value={d.fy} onChange={(e) => upd('fy', Number(e.target.value))} className="text-[12px]" />
          </F>
          <F label="Total LGU Budget (₱)">
            <N value={d.totalLguBudget} onChange={(v) => upd('totalLguBudget', v)} />
          </F>
          <F label="Total GAD Budget (₱)">
            <N value={d.totalGadBudget} onChange={(v) => upd('totalGadBudget', v)} />
          </F>
        </div>
      </div>

      {/* ── Unified Table: CLIENT-FOCUSED + ORGANIZATION-FOCUSED ── */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1488px]">

            {/* Two-row column headers */}
            <div
              className={`grid ${COL} border-b border-[#D4D4D8] bg-[#18181B] text-[11px] font-semibold text-white`}
              style={{ gridTemplateRows: 'auto auto' }}
            >
              <div className="row-span-2 border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Gender Issue or<br />GAD Mandate<br /><span className="text-[10px] font-normal text-zinc-400">(1)</span>
              </div>
              <div className="row-span-2 border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                GAD Objective<br /><span className="text-[10px] font-normal text-zinc-400">(2)</span>
              </div>
              <div className="row-span-2 border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Relevant LGU<br />Program/Project<br /><span className="text-[10px] font-normal text-zinc-400">(3)</span>
              </div>
              <div className="row-span-2 border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                GAD Activity<br /><span className="text-[10px] font-normal text-zinc-400">(4)</span>
              </div>
              <div className="row-span-2 border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Performance Indicator<br />&amp; Target<br /><span className="text-[10px] font-normal text-zinc-400">(5)</span>
              </div>
              {/* GAD Budget spanning MOOE / PS / CO — row 1 only */}
              <div className="col-span-3 border-b border-r border-[#3F3F46] px-3 py-2 text-center font-bold">
                GAD Budget
              </div>
              <div className="row-span-2 border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Lead or Responsible<br />Office<br /><span className="text-[10px] font-normal text-zinc-400">(9)</span>
              </div>
              <div className="row-span-2 px-2 py-3 text-center text-[10px]">Act.</div>
              {/* Row 2: budget sub-columns */}
              <div className="border-r border-[#3F3F46] px-3 py-2 text-center leading-tight">
                MOOE<br /><span className="text-[10px] font-normal text-zinc-400">(6)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-2 text-center leading-tight">
                PS<br /><span className="text-[10px] font-normal text-zinc-400">(7)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-2 text-center leading-tight">
                CO<br /><span className="text-[10px] font-normal text-zinc-400">(8)</span>
              </div>
            </div>

            {/* ═══ CLIENT-FOCUSED ═══ */}
            <div className="border-b border-[#D4D4D8] bg-[#27272A] px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white">
              CLIENT-FOCUSED
            </div>
            {DataRows({ sec: 'clientFocused' })}

            {/* Sub Total A */}
            <div className={`grid ${SUBTOTAL_COL} border-b-2 border-[#27272A] bg-[#F4F4F5]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#09090B]">Sub Total A</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(cfSum.mooe)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(cfSum.ps)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(cfSum.co)}</div>
              <div className="px-3 py-2" />
            </div>

            {/* ═══ ORGANIZATION FOCUSED ═══ */}
            <div className="border-b border-[#D4D4D8] bg-[#27272A] px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white">
              ORGANIZATION FOCUSED
            </div>
            {DataRows({ sec: 'organizationFocused' })}

            {/* Sub Total B */}
            <div className={`grid ${SUBTOTAL_COL} bg-[#F4F4F5]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#09090B]">Sub Total B</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(ofSum.mooe)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(ofSum.ps)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(ofSum.co)}</div>
              <div className="px-3 py-2" />
            </div>

          </div>
        </div>
      </div>

      {/* ── ATTRIBUTED PROGRAMS ── */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[978px]">

            <div className="border-b border-[#D4D4D8] bg-[#27272A] px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white">
              ATTRIBUTED PROGRAMS
            </div>

            <div className={`grid ${ATTR_COL} border-b border-[#D4D4D8] bg-[#18181B] text-[11px] font-semibold text-white`}>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Title of LGU Program<br />or Project<br /><span className="text-[10px] font-normal text-zinc-400">(10)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Funding Facility/<br />Generic Checklist<br />Score<br /><span className="text-[10px] font-normal text-zinc-400">(11)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Total Annual Program/<br />Project Budget<br /><span className="text-[10px] font-normal text-zinc-400">(12)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                GAD Attributed<br />Program/Project Budget<br /><span className="text-[10px] font-normal text-zinc-400">(13)</span>
              </div>
              <div className="border-r border-[#3F3F46] px-3 py-3 text-center leading-tight">
                Lead or Responsible<br />Office<br /><span className="text-[10px] font-normal text-zinc-400">(14)</span>
              </div>
              <div className="px-2 py-3 text-center text-[10px]">Act.</div>
            </div>

            {d.attributedPrograms.map((row, i) => (
              <div key={i} className={`grid ${ATTR_COL} border-b border-[#E4E4E7] bg-white`}>
                <div className="border-r border-[#E4E4E7] p-2">
                  <T value={row.projectTitle} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, projectTitle: v } : r));
                  }} placeholder="Project/Program title" rows={3} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <N value={row.hgdgScore} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, hgdgScore: v } : r));
                  }} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <N value={row.totalBudget} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, totalBudget: v } : r));
                  }} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <N value={row.gadAttributedBudget} onChange={(v) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, gadAttributedBudget: v } : r));
                  }} />
                </div>
                <div className="border-r border-[#E4E4E7] p-2">
                  <Input value={row.responsibleOffice} onChange={(e) => {
                    upd('attributedPrograms', d.attributedPrograms.map((r, idx) => idx === i ? { ...r, responsibleOffice: e.target.value } : r));
                  }} placeholder="Office name" className="text-[12px]" />
                </div>
                <div className="flex items-start justify-center p-2">
                  {d.attributedPrograms.length > 1 && (
                    <DelBtn onClick={() => upd('attributedPrograms', d.attributedPrograms.filter((_, idx) => idx !== i))} />
                  )}
                </div>
              </div>
            ))}

            <div className={`grid ${ATTR_SUBTOTAL_COL} border-b border-[#D4D4D8] bg-[#FAFAFA]`}>
              <div className="border-r border-[#D4D4D8] px-4 py-2 text-[12px] font-bold text-[#09090B]">Sub-total Attributed</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2" />
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(attrSum.tot)}</div>
              <div className="border-r border-[#D4D4D8] px-3 py-2 text-right text-[12px] font-bold text-[#09090B]">{fmt(attrSum.attr)}</div>
              <div className="px-3 py-2" />
            </div>

            <div className="bg-[#FAFAFA] p-2">
              <button type="button"
                onClick={() => upd('attributedPrograms', [...d.attributedPrograms, blankAttrRow()])}
                className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#D4D4D8] px-3 py-2 text-[12px] text-[#71717A] hover:border-[#18181B] hover:text-[#18181B]"
              >
                <PlusIcon className="size-3.5" /> Add Attributed Program
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Grand Total (A+B) ── */}
      <div className="overflow-hidden rounded-[10px] border border-[#D4D4D8]">
        <div className="flex items-center justify-between bg-[#09090B] px-4 py-3 text-white">
          <span className="text-[13px] font-bold">Grand Total (A+B)</span>
          <div className="flex items-center gap-8 text-[13px] font-bold">
            <div className="text-right">
              <span className="mr-2 text-[11px] font-normal text-zinc-400">MOOE:</span>
              {fmt(grandMooe)}
            </div>
            <div className="text-right">
              <span className="mr-2 text-[11px] font-normal text-zinc-400">PS:</span>
              {fmt(grandPs)}
            </div>
            <div className="text-right">
              <span className="mr-2 text-[11px] font-normal text-zinc-400">CO:</span>
              {fmt(grandCo)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Signatories ── */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
        <div className="grid grid-cols-3 gap-3">
          <F label="Prepared by (GAD Focal / TWG Member)">
            <Input value={d.preparedBy} onChange={(e) => upd('preparedBy', e.target.value)} placeholder="Full name" className="text-[12px]" />
          </F>
          <F label="Approved by (Department Head)">
            <Input value={d.approvedBy} onChange={(e) => upd('approvedBy', e.target.value)} placeholder="Full name" className="text-[12px]" />
          </F>
          <F label="Date">
            <Input type="date" value={d.date} onChange={(e) => upd('date', e.target.value)} className="text-[12px]" />
          </F>
        </div>
      </div>
    </FormShell>
  );
}

// ─── City AR Form ─────────────────────────────────────────────────────────

export function CityARForm({ template, onBack, initialData, editId, isDraftEdit }: FormProps<CityARFormData>) {
  const fy = new Date().getFullYear();
  const [d, setD] = useState<CityARFormData>(initialData ?? {
    region: 'IV-A', province: 'Batangas', cityMunicipality: 'Tanauan City',
    officeName: '', quarter: 'Annual', fy, totalLguBudget: 0, totalGadBudget: 0,
    clientFocused: [blankCityARRow()],
    organizationFocused: [blankCityARRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '', date: '',
  });
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const submitMutation = useSubmitForApproval();
  const updateMutation = useUpdateSubmission();
  const draftMutation = useSaveDraft();
  const isEncoder = user?.role === 'ENCODER';

  async function saveDraft() {
    try {
      setBusy(true);
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, formData: d });
        toast.success('Draft updated!');
      } else {
        await draftMutation.mutateAsync({ templateId: template.id, formData: d });
        toast.success('Draft saved! You can find it in My Submissions.');
      }
      onBack();
    } catch { toast.error('Failed to save draft. Try again.'); }
    finally { setBusy(false); }
  }

  function validate(): string | null {
    if (!d.cityMunicipality.trim()) return 'City/Municipality name is required.';
    if (!d.fy) return 'Fiscal Year is required.';
    const allRows = [...d.clientFocused, ...d.organizationFocused];
    if (allRows.some((r) => !r.gadIssue.trim()))
      return 'All rows must have a Gender Issue or GAD Mandate filled in.';
    if (allRows.some((r) => !r.activity.trim()))
      return 'All rows must have a GAD Activity filled in.';
    return null;
  }

  async function saveEdit() {
    if (isEncoder) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    try {
      setBusy(true);
      await updateMutation.mutateAsync({ id: editId!, formData: d, resubmit: isEncoder });
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      onBack();
    } catch { toast.error('Failed to save. Try again.'); }
    finally { setBusy(false); }
  }

  function upd<K extends keyof CityARFormData>(k: K, v: CityARFormData[K]) { setD((p) => ({ ...p, [k]: v })); }
  function updRow<K extends keyof CityARRow>(sec: 'clientFocused' | 'organizationFocused', i: number, k: K, v: CityARRow[K]) {
    setD((p) => ({ ...p, [sec]: p[sec].map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  }
  function addRow(sec: 'clientFocused' | 'organizationFocused') { setD((p) => ({ ...p, [sec]: [...p[sec], blankCityARRow()] })); }
  function remRow(sec: 'clientFocused' | 'organizationFocused', i: number) { setD((p) => ({ ...p, [sec]: p[sec].filter((_, idx) => idx !== i) })); }

  async function generate() {
    const err = validate();
    if (err) { toast.error(err); return; }
    try { setBusy(true); await generateTemplateExcel(template.id, d); toast.success('City AR Excel downloaded!'); }
    catch { toast.error('Failed to generate. Try again.'); }
    finally { setBusy(false); }
  }

  async function submitForApproval() {
    try {
      setBusy(true);
      await submitMutation.mutateAsync({ templateId: template.id, formData: d });
      toast.success('Form submitted for approval! You can track it in My Submissions.');
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

  function ARRows({ sec }: { sec: 'clientFocused' | 'organizationFocused' }) {
    const rows = d[sec];
    return (
      <>
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border border-[#EBEBEB] bg-[#FAFAFA] p-3">
            <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">{i + 1}</span>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
              <F label="Gender Issue or GAD Mandate (1)" required>
                <T value={row.gadIssue} onChange={(v) => updRow(sec, i, 'gadIssue', v)} placeholder="RA / Issue..." />
              </F>
              <F label="GAD Objective (2)">
                <T value={row.gadObjective} onChange={(v) => updRow(sec, i, 'gadObjective', v)} placeholder="Objective..." />
              </F>
              <F label="Relevant LGU Program/Project (3)">
                <Input value={row.relevantProgram} onChange={(e) => updRow(sec, i, 'relevantProgram', e.target.value)}
                  placeholder="Program name" className="text-[12px]" />
              </F>
              <F label="GAD Activity (4)" required>
                <T value={row.activity} onChange={(v) => updRow(sec, i, 'activity', v)} placeholder="Activity description" />
              </F>
              <F label="Performance Indicator & Target (5)">
                <T value={row.indicator} onChange={(v) => updRow(sec, i, 'indicator', v)} placeholder="Indicator and target" />
              </F>
              <F label="Actual Results (6)">
                <T value={row.actualResults} onChange={(v) => updRow(sec, i, 'actualResults', v)} placeholder="Actual accomplishments" />
              </F>
              <F label="Approved GAD Budget (₱) (7)">
                <N value={row.approvedBudget} onChange={(v) => updRow(sec, i, 'approvedBudget', v)} />
              </F>
              <F label="Actual GAD Cost/Expenditure (₱) (8)">
                <N value={row.actualCost} onChange={(v) => updRow(sec, i, 'actualCost', v)} />
              </F>
              <F label="Variance or Remarks (9)">
                <Input value={row.variance} onChange={(e) => updRow(sec, i, 'variance', e.target.value)}
                  placeholder="Variance" className="text-[12px]" />
              </F>
              <F label="Lead/Responsible Office (10)">
                <Input value={row.responsibleOffice} onChange={(e) => updRow(sec, i, 'responsibleOffice', e.target.value)}
                  placeholder="Office name" className="text-[12px]" />
              </F>
            </div>
            {rows.length > 1 && <DelBtn onClick={() => remRow(sec, i)} />}
          </div>
        ))}
        <button type="button" onClick={() => addRow(sec)}
          className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-[#D4D4D8] px-3 py-2 text-[12px] text-[#71717A] transition-colors hover:border-[#18181B] hover:text-[#18181B]"
        ><PlusIcon className="size-3.5" /> Add Row</button>
      </>
    );
  }

  return (
    <FormShell title="GAD Accomplishment Report (City/Municipality) — Annex E" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} onValidate={isEncoder ? validate : undefined}>
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Header Information</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <F label="City / Municipality" required>
            <Input value={d.cityMunicipality} onChange={(e) => upd('cityMunicipality', e.target.value)} placeholder="e.g. Tanauan City" className="text-[12px]" />
          </F>
          <F label="Office / Department (Name of Office)">
            <Input value={d.officeName} onChange={(e) => upd('officeName', e.target.value)} placeholder="e.g. CDRRMO" className="text-[12px]" />
          </F>
          <F label="Quarter">
            <Input value={d.quarter} onChange={(e) => upd('quarter', e.target.value)} placeholder="e.g. Annual / 4th Quarter" className="text-[12px]" />
          </F>
          <F label="Province">
            <Input value={d.province} onChange={(e) => upd('province', e.target.value)} placeholder="e.g. Batangas" className="text-[12px]" />
          </F>
          <F label="Region">
            <Input value={d.region} onChange={(e) => upd('region', e.target.value)} placeholder="e.g. IV-A" className="text-[12px]" />
          </F>
          <F label="Fiscal Year (FY)" required>
            <Input type="number" value={d.fy} onChange={(e) => upd('fy', Number(e.target.value))} className="text-[12px]" />
          </F>
          <F label="Total LGU Budget (₱)">
            <N value={d.totalLguBudget} onChange={(v) => upd('totalLguBudget', v)} />
          </F>
          <F label="Total GAD Budget (₱)">
            <N value={d.totalGadBudget} onChange={(v) => upd('totalGadBudget', v)} />
          </F>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 inline-block rounded bg-[#18181B] px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-white">CLIENT-FOCUSED</p>
        <div className="space-y-2"><ARRows sec="clientFocused" /></div>
      </div>

      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 inline-block rounded bg-[#18181B] px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-white">ORGANIZATION FOCUSED</p>
        <div className="space-y-2"><ARRows sec="organizationFocused" /></div>
      </div>

      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 inline-block rounded bg-[#18181B] px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-white">ATTRIBUTED PROGRAMS</p>
        <AttributedSection rows={d.attributedPrograms} onChange={(v) => upd('attributedPrograms', v)} showOffice={true} />
      </div>

      <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
        <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
        <div className="grid grid-cols-3 gap-3">
          <F label="Prepared by (GAD Focal / TWG Member)">
            <Input value={d.preparedBy} onChange={(e) => upd('preparedBy', e.target.value)} placeholder="Full name" className="text-[12px]" />
          </F>
          <F label="Approved by (Department Head)">
            <Input value={d.approvedBy} onChange={(e) => upd('approvedBy', e.target.value)} placeholder="Full name" className="text-[12px]" />
          </F>
          <F label="Date">
            <Input type="date" value={d.date} onChange={(e) => upd('date', e.target.value)} className="text-[12px]" />
          </F>
        </div>
      </div>
    </FormShell>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { data: templates, isLoading } = useGetTemplates();
  const [selected, setSelected] = useState<TemplateDef | null>(null);

  if (selected) {
    const formProps = { template: selected, onBack: () => setSelected(null) };
    const breadcrumb = `Tools / GAD Templates / ${selected.shortName}`;

    if (selected.id === 'BARANGAY_GPB') return <DashboardLayout key={selected.id} title={selected.name} breadcrumb={breadcrumb} defaultSidebarOpen={false}><BrgyGPBForm {...formProps} /></DashboardLayout>;
    if (selected.id === 'BARANGAY_AR') return <DashboardLayout key={selected.id} title={selected.name} breadcrumb={breadcrumb} defaultSidebarOpen={false}><BrgyARForm {...formProps} /></DashboardLayout>;
    if (selected.id === 'CITY_GPB') return <DashboardLayout key={selected.id} title={selected.name} breadcrumb={breadcrumb} defaultSidebarOpen={false}><CityGPBForm {...formProps} /></DashboardLayout>;
    if (selected.id === 'CITY_AR') return <DashboardLayout key={selected.id} title={selected.name} breadcrumb={breadcrumb} defaultSidebarOpen={false}><CityARForm {...formProps} /></DashboardLayout>;
  }

  return (
    <DashboardLayout title="GAD Templates" breadcrumb="Tools / GAD Templates">
      <div className="mb-6">
        <p className="text-[13px] text-[#71717A] max-w-2xl">
          Select a template below to fill out the official DILG GAD form online.
          The system will generate a formatted Excel file following the official DILG/PCW column structure.
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-[10px] border border-blue-200 bg-blue-50 px-4 py-3.5">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue-600" />
        <div className="text-[12px] text-blue-800">
          <p className="font-semibold">Column Numbers Match the Official DILG Format</p>
          <p className="mt-0.5">
            Each form field is labeled with its official column number (1), (2), (3)… matching the printed templates.
            CLIENT-FOCUSED → ORGANIZATION FOCUSED → ATTRIBUTED PROGRAMS sections are all included with auto-computed sub-totals.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-[12px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(templates ?? []).map((t) => (
            <TemplateCard key={t.id} template={t} onSelect={setSelected} />
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-[11px] text-[#A1A1AA]">
        Need the blank template file? Download it from{' '}
        <a href="/resources" className="underline hover:text-[#71717A]">GAD Resources</a>.
      </div>
    </DashboardLayout>
  );
}
