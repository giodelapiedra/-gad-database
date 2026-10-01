import { useCallback, useState } from 'react';
import {
  FileSpreadsheetIcon,
  FileTextIcon,
  DownloadIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  BuildingIcon,
  ClipboardListIcon,
  InfoIcon,
  SendIcon,
  AlertCircleIcon,
  BookmarkIcon,
  HistoryIcon,
  CheckCircle2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  type EvidenceFile,
} from '@/hooks/useTemplates';
import { useAuth } from '@/hooks/useAuth';
import { useAutosavedState, type AutosaveControls } from '@/hooks/useAutosavedState';
import { useSubmitForApproval, useUpdateSubmission, useSaveDraft, apiErrorMessage, type FormSubmission } from '@/hooks/useSubmissions';
import {
  SheetGrid,
  SheetHead,
  SheetBanner,
  SheetRow,
  SheetCell,
  SheetNumCell,
  SheetTotalRow,
  SheetAddRow,
  SheetSubBanner,
  SheetSlot,
  type SheetColumn,
} from '@/components/forms/SheetGrid';
import { GadBudgetShare } from '@/components/forms/GadBudgetShare';
import { GpbImportPanel } from '@/components/forms/GpbImportPanel';
import { EvidenceField } from '@/components/forms/EvidenceField';
import { importBrgyGpb, importCityGpb } from '@/lib/gpbToAr';
import { validateGadShare } from '@/lib/gadBudget';
import { LockedField, BarangayField } from '@/components/forms/LocationFields';
import { withFixedLocation } from '@/lib/location';
import { FlaggedSection, FlaggedRow } from '@/components/review/ReviewFlags';

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
  /** Encoder editing a submission still waiting for review — it stays PENDING. */
  isPendingEdit?: boolean;
};


function FormShell({
  title, onBack, onGenerate, onSubmitApproval, isEncoder, submitting, children,
  editId, onSaveEdit, onSaveDraft, isDraftEdit, isPendingEdit, onValidate, autosave,
}: {
  title: string; template: TemplateDef; onBack: () => void;
  onGenerate: () => void; onSubmitApproval?: () => void;
  isEncoder?: boolean; submitting: boolean; children: React.ReactNode;
  editId?: string; onSaveEdit?: () => void;
  onSaveDraft?: () => void; isDraftEdit?: boolean; isPendingEdit?: boolean;
  onValidate?: () => string | null;
  autosave?: AutosaveControls;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isEdit = !!editId;

  // Primary action label/handler by mode.
  const subtitle = isDraftEdit
    ? 'Continue editing your draft, then save or submit for admin approval.'
    : isPendingEdit && isEncoder
      ? 'Still waiting for review — fix anything you need and save. It stays in the review queue.'
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
          {submitting ? 'Saving...' : isEncoder && !isPendingEdit ? 'Save & Resubmit' : 'Save Changes'}
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
          <p className="text-[12px] text-[#71717A]">
            {subtitle}
            {autosave && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-emerald-700" title="Your typing is kept in this browser until you save or submit.">
                <CheckCircle2Icon className="size-3" /> Auto-saved on this device
              </span>
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {saveDraftBtn(true)}
          {primary(true)}
        </div>
      </div>

      {autosave?.restoredAt && (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3">
          <HistoryIcon className="size-4 shrink-0 text-amber-700" />
          <p className="min-w-0 flex-1 text-[12px] text-amber-900">
            <span className="font-semibold">Restored your unsaved work</span> from{' '}
            {new Date(autosave.restoredAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}.
            It stays here until you save or submit.
          </p>
          <Button size="sm" variant="outline" className="h-7 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
            onClick={() => setConfirmDiscard(true)}>
            Discard and start over
          </Button>
        </div>
      )}

      {children}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        {saveDraftBtn(false)}
        {primary(false)}
      </div>

      {/* ── Discard restored work ── */}
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Discard your unsaved work?</DialogTitle>
            <DialogDescription className="text-[13px]">
              {editId
                ? 'The form goes back to the last version saved on the server.'
                : 'The form will be cleared. This can’t be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setConfirmDiscard(false)}>Keep it</Button>
            <Button className="bg-red-600 hover:bg-red-700"
              onClick={() => { autosave?.discard(); setConfirmDiscard(false); }}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog (encoder submit / resubmit) ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-50">
              <AlertCircleIcon className="size-6 text-amber-500" />
            </div>
            <DialogTitle className="text-center text-[15px]">
              {isDraftEdit || !isEdit ? 'Submit for Approval?' : isPendingEdit ? 'Save your changes?' : 'Save and Resubmit?'}
            </DialogTitle>
            <DialogDescription className="text-center text-[13px]">
              {isDraftEdit
                ? 'Your draft will be submitted to the admin for review. Make sure all fields are filled in correctly before proceeding.'
                : isPendingEdit
                  ? 'Your changes replace the version waiting for review. It keeps its place in the review queue.'
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
              {isDraftEdit || !isEdit ? 'Yes, Submit' : isPendingEdit ? 'Yes, Save' : 'Yes, Resubmit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shared sheet pieces ──────────────────────────────────────────────────

const money = (n: number) =>
  `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One-line hint above every form sheet. */
function SheetHint({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[#71717A]">
      <InfoIcon className="size-3.5 shrink-0" />
      <span>
        {children ?? 'Matches the Excel template column for column. Scroll sideways — or use “More columns” — to see every column. Totals are computed for you.'}
      </span>
    </div>
  );
}

/** ATTRIBUTED PROGRAMS band, shared by all four forms. */
function AttributedSheet({
  rows, onChange, cols, lastKey, subLabel = 'Sub Total C', after,
}: {
  rows: AttributedRow[];
  onChange: (rows: AttributedRow[]) => void;
  /** Five columns: title, score, total budget, GAD-attributed budget, last. */
  cols: SheetColumn[];
  lastKey: 'varianceRemarks' | 'responsibleOffice';
  subLabel?: string;
  /** Extra rows under the sub-total, e.g. the grand total. */
  after?: React.ReactNode;
}) {
  function upd<K extends keyof AttributedRow>(i: number, k: K, v: AttributedRow[K]) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  const tot = rows.reduce(
    (a, r) => ({ total: a.total + r.totalBudget, gad: a.gad + r.gadAttributedBudget }),
    { total: 0, gad: 0 },
  );
  return (
    <FlaggedSection section="attributedPrograms">
      <SheetGrid>
        <SheetBanner cols={cols} accent>Attributed Programs</SheetBanner>
        <SheetHead cols={cols} />
        {rows.map((row, i) => (
          <FlaggedRow key={i} section="attributedPrograms" row={i + 1}>
            <SheetRow index={i} cols={cols}
              onRemove={rows.length > 1 ? () => onChange(rows.filter((_, idx) => idx !== i)) : undefined}>
              <SheetCell col={cols[0]} cols={cols} index={0} value={row.projectTitle}
                placeholder="Program / project title" onChange={(v) => upd(i, 'projectTitle', v)} />
              <SheetNumCell col={cols[1]} cols={cols} index={1} value={row.hgdgScore} onChange={(v) => upd(i, 'hgdgScore', v)} />
              <SheetNumCell col={cols[2]} cols={cols} index={2} value={row.totalBudget} onChange={(v) => upd(i, 'totalBudget', v)} />
              <SheetNumCell col={cols[3]} cols={cols} index={3} value={row.gadAttributedBudget} onChange={(v) => upd(i, 'gadAttributedBudget', v)} />
              <SheetCell col={cols[4]} cols={cols} index={4} value={row[lastKey] ?? ''}
                placeholder={lastKey === 'responsibleOffice' ? 'Office name' : 'Variance or remarks'}
                onChange={(v) => upd(i, lastKey, v)} />
            </SheetRow>
          </FlaggedRow>
        ))}
        <SheetAddRow cols={cols} label="Add Attributed Program" onClick={() => onChange([...rows, blankAttrRow()])} />
        <SheetTotalRow label={subLabel} cols={cols} values={{ 2: money(tot.total), 3: money(tot.gad) }} />
        {after}
      </SheetGrid>
    </FlaggedSection>
  );
}

// ─── Column layouts (order and numbering as printed on each template) ─────

// Barangay GPB prints (1), (4), (5)… — it has no objective / program columns.
const BRGY_GPB_COLS: SheetColumn[] = [
  { label: 'Gender Issue or GAD Mandate', num: 1, width: 280, required: true, sticky: true },
  { label: 'GAD Activity / PPA',          num: 4, width: 250, required: true },
  { label: 'Performance Indicator & Target', num: 5, width: 230 },
  { label: 'MOOE', num: 6, width: 130, align: 'right', group: 'GAD Budget' },
  { label: 'PS',   num: 7, width: 130, align: 'right', group: 'GAD Budget' },
  { label: 'CO',   num: 8, width: 130, align: 'right', group: 'GAD Budget' },
  { label: 'Responsible Office', num: 9, width: 200 },
];
const BRGY_GPB_ATTR_COLS: SheetColumn[] = [
  { label: 'Title of Project / Program', width: 300, sticky: true },
  { label: 'HGDG Score', width: 130, align: 'right' },
  { label: 'Total Annual Budget', width: 180, align: 'right' },
  { label: 'GAD Attributed Budget', width: 180, align: 'right' },
  { label: 'Variance or Remarks', width: 240 },
];

const BRGY_AR_COLS: SheetColumn[] = [
  { label: 'Gender Issue or GAD Mandate', num: 1, width: 250, required: true, sticky: true },
  { label: 'GAD Program / Project / Activity (PPA)', num: 2, width: 230 },
  { label: 'Performance Target and Indicator', num: 3, width: 220 },
  { label: 'Accomplishments', num: 4, width: 240 },
  { label: 'Approved GAD Budget', num: 5, width: 150, align: 'right' },
  { label: 'Actual GAD Cost or Expenditure', num: 6, width: 150, align: 'right' },
  { label: 'Variance or Remarks · with proof', num: 7, width: 260 },
];
const BRGY_AR_ATTR_COLS: SheetColumn[] = [
  { label: 'Title of Barangay Project', num: 8, width: 300, sticky: true },
  { label: 'HGDG PIMME / FIMME Score', num: 9, width: 150, align: 'right' },
  { label: 'Total Annual Program / Project Cost or Expenditure', num: 10, width: 200, align: 'right' },
  { label: 'GAD Attributed Project / Program Cost or Expenditure', num: 11, width: 200, align: 'right' },
  { label: 'Variance or Remarks', num: 12, width: 240 },
];

const CITY_GPB_COLS: SheetColumn[] = [
  { label: 'Gender Issue or GAD Mandate', num: 1, width: 250, required: true, sticky: true },
  { label: 'GAD Objective', num: 2, width: 180 },
  { label: 'Relevant LGU Program / Project', num: 3, width: 180 },
  { label: 'GAD Activity', num: 4, width: 190, required: true },
  { label: 'Performance Indicator & Target', num: 5, width: 200 },
  { label: 'MOOE', num: 6, width: 130, align: 'right', group: 'GAD Budget' },
  { label: 'PS',   num: 7, width: 130, align: 'right', group: 'GAD Budget' },
  { label: 'CO',   num: 8, width: 130, align: 'right', group: 'GAD Budget' },
  { label: 'Lead or Responsible Office', num: 9, width: 180 },
];
const CITY_GPB_ATTR_COLS: SheetColumn[] = [
  { label: 'Title of LGU Program or Project', num: 10, width: 300, sticky: true },
  { label: 'Funding Facility / Generic Checklist Score', num: 11, width: 180, align: 'right' },
  { label: 'Total Annual Program / Project Budget', num: 12, width: 200, align: 'right' },
  { label: 'GAD Attributed Program / Project Budget', num: 13, width: 200, align: 'right' },
  { label: 'Lead or Responsible Office', num: 14, width: 190 },
];

// ─── Barangay GPB Form ────────────────────────────────────────────────────

export function BrgyGPBForm({ template, onBack, initialData, editId, isDraftEdit, isPendingEdit }: FormProps<BrgyGPBFormData>) {
  const cy = new Date().getFullYear();
  const { user } = useAuth();
  const [d, setD, autosave] = useAutosavedState<BrgyGPBFormData>(
    { templateId: template.id, userId: user?.id, editId, base: initialData },
    () => withFixedLocation(initialData ?? {
    region: '', province: '', cityMunicipality: '', barangay: '',
    cy, totalBrgyBudget: 0, totalGadBudget: 0,
    clientFocused: [blankBrgyGPBRow()],
    organizationFocused: [blankBrgyGPBRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '',
  }, user?.barangay),
  );
  const [busy, setBusy] = useState(false);
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
      autosave.clear();
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
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isPendingEdit ? 'Changes saved — still waiting for review.' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      autosave.clear();
      onBack();
    } catch (err) { toast.error(apiErrorMessage(err, 'Failed to save. Try again.')); }
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
    return validateGadShare(d.totalBrgyBudget, d.totalGadBudget, 'Barangay');
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
      autosave.clear();
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

  const gpbSum = (rows: BrgyGPBRow[]) => rows.reduce(
    (a, r) => ({ mooe: a.mooe + r.mooe, ps: a.ps + r.ps, co: a.co + r.co }),
    { mooe: 0, ps: 0, co: 0 },
  );
  const gpbA = gpbSum(d.clientFocused);
  const gpbB = gpbSum(d.organizationFocused);

  // Called as {GPBSection(...)} — NOT <GPBSection/>: a component declared inside
  // the form is a new type every render, so React would remount the rows on
  // each keystroke and the input would lose focus after one character.
  function GPBSection(sec: 'clientFocused' | 'organizationFocused', banner: string, subLabel: string) {
    const rows = d[sec];
    const cols = BRGY_GPB_COLS;
    const t = sec === 'clientFocused' ? gpbA : gpbB;
    return (
      <FlaggedSection section={sec}>
        <SheetBanner cols={cols}>{banner}</SheetBanner>
        {rows.map((row, i) => (
          <FlaggedRow key={i} section={sec} row={i + 1}>
            <SheetRow index={i} cols={cols} onRemove={rows.length > 1 ? () => remRow(sec, i) : undefined}>
              <SheetCell col={cols[0]} cols={cols} index={0} value={row.gadIssue}
                placeholder="e.g. RA 9710 Magna Carta of Women…" onChange={(v) => updRow(sec, i, 'gadIssue', v)} />
              <SheetCell col={cols[1]} cols={cols} index={1} value={row.activity}
                placeholder="e.g. Conduct Women’s Leadership Training" onChange={(v) => updRow(sec, i, 'activity', v)} />
              <SheetCell col={cols[2]} cols={cols} index={2} value={row.indicator}
                placeholder="e.g. 100% of target women trained" onChange={(v) => updRow(sec, i, 'indicator', v)} />
              <SheetNumCell col={cols[3]} cols={cols} index={3} value={row.mooe} onChange={(v) => updRow(sec, i, 'mooe', v)} />
              <SheetNumCell col={cols[4]} cols={cols} index={4} value={row.ps} onChange={(v) => updRow(sec, i, 'ps', v)} />
              <SheetNumCell col={cols[5]} cols={cols} index={5} value={row.co} onChange={(v) => updRow(sec, i, 'co', v)} />
              <SheetCell col={cols[6]} cols={cols} index={6} value={row.responsibleOffice}
                placeholder="e.g. GAD Focal Point System" onChange={(v) => updRow(sec, i, 'responsibleOffice', v)} />
            </SheetRow>
          </FlaggedRow>
        ))}
        <SheetAddRow cols={cols} onClick={() => addRow(sec)} />
        <SheetTotalRow label={subLabel} cols={cols} values={{ 3: money(t.mooe), 4: money(t.ps), 5: money(t.co) }} />
      </FlaggedSection>
    );
  }

  return (
    <FormShell title="Barangay Annual GAD Plan and Budget (GPB)" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} isPendingEdit={isPendingEdit} onValidate={isEncoder ? validate : undefined} autosave={autosave}>
      {/* Header */}
      <FlaggedSection section="header">
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Header Information</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <BarangayField value={d.barangay} onChange={(v) => upd('barangay', v)} locked={!!user?.barangay} />
              <LockedField label="City / Municipality" value={d.cityMunicipality} />
              <LockedField label="Province" value={d.province} />
              <LockedField label="Region" value={d.region} />
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
            <div className="lg:w-64 lg:shrink-0">
              <GadBudgetShare totalBudget={d.totalBrgyBudget} gadBudget={d.totalGadBudget} budgetLabel="Barangay" />
            </div>
          </div>
        </div>
      </FlaggedSection>

      <div>
        <SheetHint />
        <SheetGrid>
          <SheetHead cols={BRGY_GPB_COLS} />
          {GPBSection('clientFocused', 'Client-Focused', 'Sub Total A')}
          {GPBSection('organizationFocused', 'Organization Focused', 'Sub Total B')}
          <SheetTotalRow label="Grand Total (A+B)" cols={BRGY_GPB_COLS} accent
            values={{ 3: money(gpbA.mooe + gpbB.mooe), 4: money(gpbA.ps + gpbB.ps), 5: money(gpbA.co + gpbB.co) }} />
        </SheetGrid>
      </div>

      <AttributedSheet
        rows={d.attributedPrograms}
        onChange={(v) => upd('attributedPrograms', v)}
        cols={BRGY_GPB_ATTR_COLS}
        lastKey="varianceRemarks"
      />

      {/* Signatories */}
      <FlaggedSection section="signatories">
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
      </FlaggedSection>
    </FormShell>
  );
}

// ─── Barangay AR Form ─────────────────────────────────────────────────────

export function BrgyARForm({ template, onBack, initialData, editId, isDraftEdit, isPendingEdit }: FormProps<BrgyARFormData>) {
  const fy = new Date().getFullYear();
  const { user } = useAuth();
  const [d, setD, autosave] = useAutosavedState<BrgyARFormData>(
    { templateId: template.id, userId: user?.id, editId, base: initialData },
    () => withFixedLocation(initialData ?? {
    region: '', province: '', cityMunicipality: '', barangay: '',
    fy, totalBrgyBudget: 0, totalGadBudget: 0,
    clientFocusedGenderIssues: [blankBrgyARRow()],
    clientFocusedGadMandate: [blankBrgyARRow()],
    organizationGenderIssues: [blankBrgyARRow()],
    organizationGadMandate: [blankBrgyARRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '', date: '',
  }, user?.barangay),
  );
  const [busy, setBusy] = useState(false);
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
      autosave.clear();
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
    return validateGadShare(d.totalBrgyBudget, d.totalGadBudget, 'Barangay');
  }

  async function saveEdit() {
    if (isEncoder) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    try {
      setBusy(true);
      await updateMutation.mutateAsync({ id: editId!, formData: d, resubmit: isEncoder });
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isPendingEdit ? 'Changes saved — still waiting for review.' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      autosave.clear();
      onBack();
    } catch (err) { toast.error(apiErrorMessage(err, 'Failed to save. Try again.')); }
    finally { setBusy(false); }
  }

  type ARSection = 'clientFocusedGenderIssues' | 'clientFocusedGadMandate' | 'organizationGenderIssues' | 'organizationGadMandate';
  function upd<K extends keyof BrgyARFormData>(k: K, v: BrgyARFormData[K]) { setD((p) => ({ ...p, [k]: v })); }
  function updRow<K extends keyof BrgyARRow>(sec: ARSection, i: number, k: K, v: BrgyARRow[K]) {
    setD((p) => ({ ...p, [sec]: p[sec].map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  }
  function addRow(sec: ARSection) { setD((p) => ({ ...p, [sec]: [...p[sec], blankBrgyARRow()] })); }
  function remRow(sec: ARSection, i: number) { setD((p) => ({ ...p, [sec]: p[sec].filter((_, idx) => idx !== i) })); }

  const importFromGpb = useCallback((gpb: FormSubmission, auto: boolean) => {
    setD((p) => importBrgyGpb(p, gpb.formData as BrgyGPBFormData, gpb.id));
    toast.success(auto
      ? `Auto-filled from your plan "${gpb.title}".`
      : `Copied the planned activities from "${gpb.title}".`);
  }, [setD]);

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
      autosave.clear();
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

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

  const AR_SECTION: Record<ARSection, string> = {
    clientFocusedGenderIssues: 'clientFocused',
    clientFocusedGadMandate:   'clientFocused',
    organizationGenderIssues:  'organizationFocused',
    organizationGadMandate:    'organizationFocused',
  };
  const arRowOffset = (sec: ARSection) =>
    sec === 'clientFocusedGadMandate' ? d.clientFocusedGenderIssues.length
      : sec === 'organizationGadMandate' ? d.organizationGenderIssues.length
        : 0;

  // One band of rows (e.g. CLIENT-FOCUSED › 1. Gender Issues). Called as a
  // function, not <Component/>, so rows aren't remounted on every keystroke.
  function ARBand(sec: ARSection) {
    const rows = d[sec];
    const cols = BRGY_AR_COLS;
    const off = arRowOffset(sec);
    return (
      <>
        {rows.map((row, i) => {
          const locked = !!row.gpbRef;
          return (
            <FlaggedRow key={i} section={AR_SECTION[sec]} row={off + i + 1}>
              {/* Any row may go: a band with nothing to report can be left empty. */}
              <SheetRow index={off + i} cols={cols} onRemove={() => remRow(sec, i)}>
                <SheetCell col={cols[0]} cols={cols} index={0} value={row.gadIssue} locked={locked}
                  placeholder="Gender issue or GAD mandate" onChange={(v) => updRow(sec, i, 'gadIssue', v)} />
                <SheetCell col={cols[1]} cols={cols} index={1} value={row.ppa} locked={locked}
                  placeholder="Program / project / activity" onChange={(v) => updRow(sec, i, 'ppa', v)} />
                <SheetCell col={cols[2]} cols={cols} index={2} value={row.indicator} locked={locked}
                  placeholder="Performance target and indicator" onChange={(v) => updRow(sec, i, 'indicator', v)} />
                <SheetCell col={cols[3]} cols={cols} index={3} value={row.accomplishments}
                  placeholder="What was accomplished" onChange={(v) => updRow(sec, i, 'accomplishments', v)} />
                {locked ? (
                  <SheetCell col={cols[4]} cols={cols} index={4} numeric locked
                    value={row.approvedBudget ? money(row.approvedBudget) : ''} />
                ) : (
                  <SheetNumCell col={cols[4]} cols={cols} index={4}
                    value={row.approvedBudget} onChange={(v) => updRow(sec, i, 'approvedBudget', v)} />
                )}
                <SheetNumCell col={cols[5]} cols={cols} index={5}
                  value={row.actualCost} onChange={(v) => updRow(sec, i, 'actualCost', v)} />
                <SheetSlot col={cols[6]}>
                  <EvidenceField
                    value={row.variance}
                    onChange={(v) => updRow(sec, i, 'variance', v)}
                    files={row.evidence ?? []}
                    onFilesChange={(files: EvidenceFile[]) => updRow(sec, i, 'evidence', files)}
                  />
                </SheetSlot>
              </SheetRow>
            </FlaggedRow>
          );
        })}
        <SheetAddRow cols={cols} onClick={() => addRow(sec)} />
      </>
    );
  }

  return (
    <FormShell title="Barangay Annual GAD Accomplishment Report (AR)" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} isPendingEdit={isPendingEdit} onValidate={isEncoder ? validate : undefined} autosave={autosave}>

      {/* ── Header Info ── */}
      <FlaggedSection section="header">
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
              <LockedField label="Region" value={d.region} />
              <LockedField label="Province" value={d.province} />
              <LockedField label="City / Municipality" value={d.cityMunicipality} />
              <BarangayField value={d.barangay} onChange={(v) => upd('barangay', v)} locked={!!user?.barangay} />
            </div>
            <div className="space-y-2.5">
              <F label="Total Barangay Budget (₱)">
                <N value={d.totalBrgyBudget} onChange={(v) => upd('totalBrgyBudget', v)} />
              </F>
              <F label="Total GAD Budget (₱)">
                <N value={d.totalGadBudget} onChange={(v) => upd('totalGadBudget', v)} />
              </F>
              <GadBudgetShare totalBudget={d.totalBrgyBudget} gadBudget={d.totalGadBudget} budgetLabel="Barangay" />
            </div>
          </div>
        </div>
      </FlaggedSection>

      {isEncoder && (
        <GpbImportPanel
          gpbTemplateId="BARANGAY_GPB"
          sourceGpbId={d.sourceGpbId}
          year={d.fy}
          autoImport={!editId && !initialData}
          lockedCols="(1), (2), (3) and (5)"
          onImport={importFromGpb}
        />
      )}

      <div>
        <SheetHint />
        <SheetGrid>
          <SheetHead cols={BRGY_AR_COLS} />
          <FlaggedSection section="clientFocused">
            <SheetBanner cols={BRGY_AR_COLS}>Client-Focused</SheetBanner>
            <SheetSubBanner cols={BRGY_AR_COLS}>1. Gender Issues</SheetSubBanner>
            {ARBand('clientFocusedGenderIssues')}
            <SheetSubBanner cols={BRGY_AR_COLS} tone="amber">2. GAD Mandate</SheetSubBanner>
            {ARBand('clientFocusedGadMandate')}
            <SheetTotalRow label="Sub-total A" cols={BRGY_AR_COLS} values={{ 4: money(subA.app), 5: money(subA.act) }} />
          </FlaggedSection>
          <FlaggedSection section="organizationFocused">
            <SheetBanner cols={BRGY_AR_COLS}>Organization-Focused</SheetBanner>
            <SheetSubBanner cols={BRGY_AR_COLS}>1. Gender Issues</SheetSubBanner>
            {ARBand('organizationGenderIssues')}
            <SheetSubBanner cols={BRGY_AR_COLS} tone="amber">2. GAD Mandate</SheetSubBanner>
            {ARBand('organizationGadMandate')}
            <SheetTotalRow label="Sub-total B" cols={BRGY_AR_COLS} values={{ 4: money(subB.app), 5: money(subB.act) }} />
          </FlaggedSection>
          <SheetTotalRow label="Total (A+B)" cols={BRGY_AR_COLS} accent
            values={{ 4: money(subA.app + subB.app), 5: money(subA.act + subB.act) }} />
        </SheetGrid>
      </div>

      <div>
        <AttributedSheet
          rows={d.attributedPrograms}
          onChange={(v) => upd('attributedPrograms', v)}
          cols={BRGY_AR_ATTR_COLS}
          lastKey="varianceRemarks"
          after={
            <SheetTotalRow label="Grand Total (A+B+C)" cols={BRGY_AR_ATTR_COLS} accent
              values={{ 3: money(subA.act + subB.act + subC.attr) }} />
          }
        />
        <p className="mt-2 text-[11px] text-[#71717A]">
          Grand total = actual cost A ({money(subA.act)}) + actual cost B ({money(subB.act)}) + GAD-attributed cost C ({money(subC.attr)}).
          Approved GAD budget (A+B): {money(subA.app + subB.app)}.
        </p>
      </div>

      {/* ── Signatories ── */}
      <FlaggedSection section="signatories">
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
      </FlaggedSection>

    </FormShell>
  );
}

// ─── City GPB Form ────────────────────────────────────────────────────────

export function CityGPBForm({ template, onBack, initialData, editId, isDraftEdit, isPendingEdit }: FormProps<CityGPBFormData>) {
  const fy = new Date().getFullYear();
  const { user } = useAuth();
  const [d, setD, autosave] = useAutosavedState<CityGPBFormData>(
    { templateId: template.id, userId: user?.id, editId, base: initialData },
    () => withFixedLocation(initialData ?? {
    region: 'IV-A', province: 'Batangas', cityMunicipality: 'Tanauan City',
    officeName: '', fy, totalLguBudget: 0, totalGadBudget: 0,
    clientFocused: [blankCityGPBRow()],
    organizationFocused: [blankCityGPBRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '', date: '',
  }),
  );
  const [busy, setBusy] = useState(false);
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
      autosave.clear();
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
    return validateGadShare(d.totalLguBudget, d.totalGadBudget, 'LGU');
  }

  async function saveEdit() {
    if (isEncoder) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    try {
      setBusy(true);
      await updateMutation.mutateAsync({ id: editId!, formData: d, resubmit: isEncoder });
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isPendingEdit ? 'Changes saved — still waiting for review.' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      autosave.clear();
      onBack();
    } catch (err) { toast.error(apiErrorMessage(err, 'Failed to save. Try again.')); }
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
      autosave.clear();
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

  // ── Live totals ──
  const sumSec = (rows: CityGPBRow[]) => rows.reduce(
    (a, r) => ({ mooe: a.mooe + r.mooe, ps: a.ps + r.ps, co: a.co + r.co }),
    { mooe: 0, ps: 0, co: 0 },
  );
  const cfSum  = sumSec(d.clientFocused);
  const ofSum  = sumSec(d.organizationFocused);
  const grandMooe = cfSum.mooe + ofSum.mooe;
  const grandPs   = cfSum.ps   + ofSum.ps;
  const grandCo   = cfSum.co   + ofSum.co;

  // Called as a function, not <Component/> — see GPBSection for why.
  function CityGPBSection(sec: 'clientFocused' | 'organizationFocused', banner: string, subLabel: string) {
    const rows = d[sec];
    const cols = CITY_GPB_COLS;
    const t = sec === 'clientFocused' ? cfSum : ofSum;
    const text = (i: number, ci: number, key: 'gadIssue' | 'gadObjective' | 'relevantProgram' | 'activity' | 'indicator' | 'responsibleOffice', placeholder: string) => (
      <SheetCell key={key} col={cols[ci]} cols={cols} index={ci} value={rows[i][key]}
        placeholder={placeholder} onChange={(v) => updRow(sec, i, key, v)} />
    );
    return (
      <FlaggedSection section={sec}>
        <SheetBanner cols={cols}>{banner}</SheetBanner>
        {rows.map((row, i) => (
          <FlaggedRow key={i} section={sec} row={i + 1}>
            <SheetRow index={i} cols={cols} onRemove={rows.length > 1 ? () => remRow(sec, i) : undefined}>
              {text(i, 0, 'gadIssue', 'Gender issue or GAD mandate')}
              {text(i, 1, 'gadObjective', 'GAD objective')}
              {text(i, 2, 'relevantProgram', 'Relevant LGU program / project')}
              {text(i, 3, 'activity', 'GAD activity')}
              {text(i, 4, 'indicator', 'Performance indicator & target')}
              <SheetNumCell col={cols[5]} cols={cols} index={5} value={row.mooe} onChange={(v) => updRow(sec, i, 'mooe', v)} />
              <SheetNumCell col={cols[6]} cols={cols} index={6} value={row.ps} onChange={(v) => updRow(sec, i, 'ps', v)} />
              <SheetNumCell col={cols[7]} cols={cols} index={7} value={row.co} onChange={(v) => updRow(sec, i, 'co', v)} />
              {text(i, 8, 'responsibleOffice', 'Office name')}
            </SheetRow>
          </FlaggedRow>
        ))}
        <SheetAddRow cols={cols} onClick={() => addRow(sec)} />
        <SheetTotalRow label={subLabel} cols={cols} values={{ 5: money(t.mooe), 6: money(t.ps), 7: money(t.co) }} />
      </FlaggedSection>
    );
  }

  return (
    <FormShell title="Annual GAD Plan and Budget (City/Municipality) — Annex D" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} isPendingEdit={isPendingEdit} onValidate={isEncoder ? validate : undefined} autosave={autosave}>

      {/* ── Header Info ── */}
      <FlaggedSection section="header">
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Header Information</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <LockedField label="City / Municipality" value={d.cityMunicipality} />
              <F label="Office / Department">
                <Input value={d.officeName} onChange={(e) => upd('officeName', e.target.value)} placeholder="e.g. CDRRMO" className="text-[12px]" />
              </F>
              <LockedField label="Province" value={d.province} />
              <LockedField label="Region" value={d.region} />
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
            <div className="lg:w-64 lg:shrink-0">
              <GadBudgetShare totalBudget={d.totalLguBudget} gadBudget={d.totalGadBudget} budgetLabel="LGU" />
            </div>
          </div>
        </div>
      </FlaggedSection>

      <div>
        <SheetHint />
        <SheetGrid>
          <SheetHead cols={CITY_GPB_COLS} />
          {CityGPBSection('clientFocused', 'Client-Focused', 'Sub Total A')}
          {CityGPBSection('organizationFocused', 'Organization Focused', 'Sub Total B')}
          <SheetTotalRow label="Grand Total (A+B)" cols={CITY_GPB_COLS} accent
            values={{ 5: money(grandMooe), 6: money(grandPs), 7: money(grandCo) }} />
        </SheetGrid>
      </div>

      <AttributedSheet
        rows={d.attributedPrograms}
        onChange={(v) => upd('attributedPrograms', v)}
        cols={CITY_GPB_ATTR_COLS}
        lastKey="responsibleOffice"
        subLabel="Sub-total Attributed"
      />

      {/* ── Signatories ── */}
      <FlaggedSection section="signatories">
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
      </FlaggedSection>
    </FormShell>
  );
}

// ─── City AR Form ─────────────────────────────────────────────────────────

// Column geometry mirrors `CITY AR TEMPLATE.xlsx` — same order, same numbering,
// widths proportional to the sheet's own column widths. Field (1) spans the
// template's A:B, which is why it's the widest.
const CITY_AR_COLS: SheetColumn[] = [
  { label: 'Gender Issue or GAD Mandate',      num: 1,  width: 260, required: true, sticky: true },
  { label: 'GAD Objective',                    num: 2,  width: 172 },
  { label: 'Relevant LGU Program or Project',  num: 3,  width: 170 },
  { label: 'GAD Activity',                     num: 4,  width: 184, required: true },
  { label: 'Performance Indicator and Target', num: 5,  width: 200 },
  { label: 'Actual Results',                   num: 6,  width: 200 },
  { label: 'Approved GAD Budget',              num: 7,  width: 150, align: 'right' },
  { label: 'Actual GAD Cost or Expenditure',   num: 8,  width: 150, align: 'right' },
  { label: 'Variance or Remarks · with proof', num: 9,  width: 260 },
  { label: 'Lead or Responsible Office',       num: 10, width: 180 },
];

// The attributed band restarts at (8) in the official form — kept as printed.
const CITY_AR_ATTR_COLS: SheetColumn[] = [
  { label: 'Title of LGU Program or Project',   num: 8,  width: 300, sticky: true },
  { label: 'HGDG Design / Funding Facility / Generic Checklist Score', num: 9, width: 190, align: 'center' },
  { label: 'Total Annual Program / Project Budget',  num: 10, width: 200, align: 'right' },
  { label: 'GAD Attributed Program / Project Budget', num: 11, width: 200, align: 'right' },
  { label: 'Lead or Responsible Office',        num: 12, width: 190 },
];

export function CityARForm({ template, onBack, initialData, editId, isDraftEdit, isPendingEdit }: FormProps<CityARFormData>) {
  const fy = new Date().getFullYear();
  const { user } = useAuth();
  const [d, setD, autosave] = useAutosavedState<CityARFormData>(
    { templateId: template.id, userId: user?.id, editId, base: initialData },
    () => withFixedLocation(initialData ?? {
    region: 'IV-A', province: 'Batangas', cityMunicipality: 'Tanauan City',
    officeName: '', quarter: 'Annual', fy, totalLguBudget: 0, totalGadBudget: 0,
    clientFocused: [blankCityARRow()],
    organizationFocused: [blankCityARRow()],
    attributedPrograms: [blankAttrRow()],
    preparedBy: '', approvedBy: '', date: '',
  }),
  );
  const [busy, setBusy] = useState(false);
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
      autosave.clear();
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
    return validateGadShare(d.totalLguBudget, d.totalGadBudget, 'LGU');
  }

  async function saveEdit() {
    if (isEncoder) {
      const err = validate();
      if (err) { toast.error(err); return; }
    }
    try {
      setBusy(true);
      await updateMutation.mutateAsync({ id: editId!, formData: d, resubmit: isEncoder });
      toast.success(isDraftEdit ? 'Form submitted for approval!' : isPendingEdit ? 'Changes saved — still waiting for review.' : isEncoder ? 'Form resubmitted for review!' : 'Changes saved.');
      autosave.clear();
      onBack();
    } catch (err) { toast.error(apiErrorMessage(err, 'Failed to save. Try again.')); }
    finally { setBusy(false); }
  }

  function upd<K extends keyof CityARFormData>(k: K, v: CityARFormData[K]) { setD((p) => ({ ...p, [k]: v })); }
  function updRow<K extends keyof CityARRow>(sec: 'clientFocused' | 'organizationFocused', i: number, k: K, v: CityARRow[K]) {
    setD((p) => ({ ...p, [sec]: p[sec].map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  }
  function addRow(sec: 'clientFocused' | 'organizationFocused') { setD((p) => ({ ...p, [sec]: [...p[sec], blankCityARRow()] })); }
  function remRow(sec: 'clientFocused' | 'organizationFocused', i: number) { setD((p) => ({ ...p, [sec]: p[sec].filter((_, idx) => idx !== i) })); }


  const importFromGpb = useCallback((gpb: FormSubmission, auto: boolean) => {
    setD((p) => importCityGpb(p, gpb.formData as CityGPBFormData, gpb.id));
    toast.success(auto
      ? `Auto-filled from your plan "${gpb.title}".`
      : `Copied the planned activities from "${gpb.title}".`);
  }, [setD]);

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
      autosave.clear();
      onBack();
    } catch { toast.error('Failed to submit. Try again.'); }
    finally { setBusy(false); }
  }

  // ── Live totals, matching the sub-total formulas written into the Excel ──
  const totals = (rows: CityARRow[]) => rows.reduce(
    (a, r) => ({ approved: a.approved + r.approvedBudget, actual: a.actual + r.actualCost }),
    { approved: 0, actual: 0 }
  );
  const subA = totals(d.clientFocused);
  const subB = totals(d.organizationFocused);
  const subC = d.attributedPrograms.reduce(
    (a, r) => ({ total: a.total + r.totalBudget, gad: a.gad + r.gadAttributedBudget }),
    { total: 0, gad: 0 }
  );
  const grandGad = subA.approved + subB.approved + subC.gad;

  /** One CLIENT-FOCUSED / ORGANIZATION FOCUSED band. Called as {DataSection(...)},
   *  not <DataSection/> — see GPBRows for why. */
  function DataSection({
    sec, banner, subTotalLabel, sub,
  }: {
    sec: 'clientFocused' | 'organizationFocused';
    banner: string;
    subTotalLabel: string;
    sub: { approved: number; actual: number };
  }) {
    const rows = d[sec];
    const cols = CITY_AR_COLS;
    return (
      <>
        <FlaggedSection section={sec}>
          <SheetBanner cols={cols}>{banner}</SheetBanner>
          {rows.map((row, i) => {
            // Planned columns copied from the GPB stay read-only on the AR.
            const locked = !!row.gpbRef;
            const text = (ci: number, key: keyof CityARRow, placeholder: string, planned = false) => (
              <SheetCell
                key={key} col={cols[ci]} cols={cols} index={ci}
                value={row[key] as string} placeholder={placeholder}
                locked={planned && locked}
                onChange={(v) => updRow(sec, i, key, v as CityARRow[typeof key])}
              />
            );
            return (
              <FlaggedRow key={i} section={sec} row={i + 1}>
                <SheetRow index={i} cols={cols} onRemove={rows.length > 1 ? () => remRow(sec, i) : undefined}>
                  {text(0, 'gadIssue', 'RA / gender issue…', true)}
                  {text(1, 'gadObjective', 'Objective…', true)}
                  {text(2, 'relevantProgram', 'Program name', true)}
                  {text(3, 'activity', 'Activity description', true)}
                  {text(4, 'indicator', 'Indicator and target', true)}
                  {text(5, 'actualResults', 'Actual accomplishments')}
                  {locked ? (
                    <SheetCell col={cols[6]} cols={cols} index={6} numeric locked
                      value={row.approvedBudget ? money(row.approvedBudget) : ''} />
                  ) : (
                    <SheetNumCell col={cols[6]} cols={cols} index={6}
                      value={row.approvedBudget} onChange={(v) => updRow(sec, i, 'approvedBudget', v)} />
                  )}
                  <SheetNumCell col={cols[7]} cols={cols} index={7}
                    value={row.actualCost} onChange={(v) => updRow(sec, i, 'actualCost', v)} />
                  <SheetSlot col={cols[8]}>
                    <EvidenceField
                      value={row.variance}
                      onChange={(v) => updRow(sec, i, 'variance', v)}
                      files={row.evidence ?? []}
                      onFilesChange={(files: EvidenceFile[]) => updRow(sec, i, 'evidence', files)}
                    />
                  </SheetSlot>
                  {text(9, 'responsibleOffice', 'Office name', true)}
                </SheetRow>
              </FlaggedRow>
            );
          })}
          <SheetAddRow cols={cols} onClick={() => addRow(sec)} />
          <SheetTotalRow label={subTotalLabel} cols={cols}
            values={{ 6: money(sub.approved), 7: money(sub.actual) }} />
        </FlaggedSection>
      </>
    );
  }

  return (
    <FormShell title="GAD Accomplishment Report (City/Municipality) — Annex E" template={template} onBack={onBack} onGenerate={generate} onSubmitApproval={submitForApproval} isEncoder={isEncoder} submitting={busy} editId={editId} onSaveEdit={saveEdit} onSaveDraft={isEncoder && (!editId || isDraftEdit) ? saveDraft : undefined} isDraftEdit={isDraftEdit} isPendingEdit={isPendingEdit} onValidate={isEncoder ? validate : undefined} autosave={autosave}>
      {/* ── Sheet heading, as printed above the table ── */}
      <FlaggedSection section="header">
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <p className="mb-4 text-center text-[13px] font-bold uppercase tracking-wide text-[#09090B]">
            {(d.quarter || '').trim()
              ? `${d.quarter.toUpperCase()} GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT`
              : 'GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT'}
            <span className="ml-2 text-[11px] font-semibold text-[#71717A]">FY {d.fy || '—'} · ANNEX E</span>
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <LockedField label="Region" value={d.region} />
              <LockedField label="Province" value={d.province} />
              <LockedField label="City / Municipality" value={d.cityMunicipality} />
              <F label="Name of Office">
                <Input value={d.officeName} onChange={(e) => upd('officeName', e.target.value)} placeholder="e.g. CDRRMO" className="text-[12px]" />
              </F>
              <F label="Quarter">
                <Input value={d.quarter} onChange={(e) => upd('quarter', e.target.value)} placeholder="e.g. 4th / Annual" className="text-[12px]" />
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
            <div className="lg:w-64 lg:shrink-0">
              <GadBudgetShare totalBudget={d.totalLguBudget} gadBudget={d.totalGadBudget} budgetLabel="LGU" />
            </div>
          </div>
        </div>
      </FlaggedSection>

      {isEncoder && (
        <GpbImportPanel
          gpbTemplateId="CITY_GPB"
          sourceGpbId={d.sourceGpbId}
          year={d.fy}
          autoImport={!editId && !initialData}
          lockedCols="(1)–(5) and (10)"
          onImport={importFromGpb}
        />
      )}

      {/* ── The table itself, one horizontally-scrolling sheet ── */}
      <div>
        <SheetHint />

        <SheetGrid>
          <SheetHead cols={CITY_AR_COLS} />
          {DataSection({ sec: 'clientFocused', banner: 'Client- Focused', subTotalLabel: 'Sub Total A', sub: subA })}
          {DataSection({ sec: 'organizationFocused', banner: 'Organization Focused', subTotalLabel: 'Sub Total B', sub: subB })}
        </SheetGrid>

        <div className="mt-4">
          <AttributedSheet
            rows={d.attributedPrograms}
            onChange={(v) => upd('attributedPrograms', v)}
            cols={CITY_AR_ATTR_COLS}
            lastKey="responsibleOffice"
            after={
              <SheetTotalRow label="Grand Total (A+B+C)" cols={CITY_AR_ATTR_COLS} accent
                values={{ 2: money(subC.total), 3: money(grandGad) }} />
            }
          />
        </div>

        <p className="mt-2 text-[11px] text-[#71717A]">
          Grand total GAD budget = Sub Total A ({money(subA.approved)}) + Sub Total B
          ({money(subB.approved)}) + attributed share from C ({money(subC.gad)}).
        </p>
      </div>

      {/* ── Signatories ── */}
      <FlaggedSection section="signatories">
        <div className="rounded-[10px] border border-[#EBEBEB] bg-white p-5">
          <p className="mb-3 text-[12px] font-semibold text-[#09090B]">Signatories</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <F label="Prepared by (Office — GAD TWG)">
              <Input value={d.preparedBy} onChange={(e) => upd('preparedBy', e.target.value)} placeholder="Full name" className="text-[12px]" />
            </F>
            <F label="Approved by (Department Manager)">
              <Input value={d.approvedBy} onChange={(e) => upd('approvedBy', e.target.value)} placeholder="Full name" className="text-[12px]" />
            </F>
            <F label="Date">
              <Input type="date" value={d.date} onChange={(e) => upd('date', e.target.value)} className="text-[12px]" />
            </F>
          </div>
        </div>
      </FlaggedSection>
    </FormShell>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { data: templates, isLoading } = useGetTemplates();
  // The open form lives in the URL (?form=BARANGAY_AR) so a refresh — or the
  // browser's Back button — lands on the same form instead of the template list.
  const [searchParams, setSearchParams] = useSearchParams();
  const formId = searchParams.get('form');
  const selected = formId ? (templates ?? []).find((t) => t.id === formId) ?? null : null;
  const setSelected = (t: TemplateDef | null) => setSearchParams(t ? { form: t.id } : {});

  if (formId && isLoading) {
    return (
      <DashboardLayout title="GAD Templates" breadcrumb="Tools / GAD Templates" defaultSidebarOpen={false}>
        <div className="space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 rounded-[10px]" />
        </div>
      </DashboardLayout>
    );
  }

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
