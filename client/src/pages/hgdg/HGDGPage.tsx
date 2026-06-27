import { useState, useRef } from 'react';
import {
  FileTextIcon, PlusIcon, Settings2Icon, EyeIcon,
  UploadIcon, CheckCircle2Icon, Trash2Icon, PencilIcon,
  DownloadIcon, ArrowLeftIcon, SaveIcon, SendIcon,
  BookmarkIcon, AlertCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useHGDGTemplates, useHGDGPdfUrl, useHGDGTemplate,
  useCreateHGDGTemplate, useUpdateFieldMap, useSetHGDGPublished,
  useDeleteHGDGTemplate, downloadFilledPdf,
  type HGDGTemplate, type FieldDef,
} from '@/hooks/useHGDG';
import { useSubmitForApproval, useSaveDraft } from '@/hooks/useSubmissions';
import { useAuth } from '@/hooks/useAuth';
import { PDFOverlayViewer } from '@/components/hgdg/PDFOverlayViewer';

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isAdmin,
  onFill,
  onMap,
  onTogglePublish,
  onDelete,
}: {
  template: HGDGTemplate;
  isAdmin: boolean;
  onFill: () => void;
  onMap: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const fieldCount = template.fieldMap.length;

  return (
    <div className="flex flex-col rounded-[12px] border border-[#EBEBEB] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
          <FileTextIcon className="size-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1">
            {template.pullout && (
              <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-700 bg-violet-50">
                {template.pullout}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] ${template.isPublished ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}
            >
              {template.isPublished ? 'Published' : 'Draft'}
            </Badge>
            {fieldCount > 0 && (
              <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">
                {fieldCount} fields mapped
              </Badge>
            )}
          </div>
          <h3 className="text-[14px] font-semibold text-[#09090B] leading-tight">{template.name}</h3>
          <p className="text-[11px] text-[#71717A] mt-0.5">{template.sector}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {template.isPublished && fieldCount > 0 && (
          <Button size="sm" className="w-full" onClick={onFill}>
            <PencilIcon className="mr-1.5 size-3.5" />
            Fill Form
          </Button>
        )}
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={onMap}>
              <Settings2Icon className="mr-1.5 size-3.5" />
              Map Fields
            </Button>
            <Button size="sm" variant="outline" className="px-2" onClick={onTogglePublish} title={template.isPublished ? 'Unpublish' : 'Publish'}>
              {template.isPublished ? <EyeIcon className="size-3.5 text-amber-500" /> : <CheckCircle2Icon className="size-3.5 text-emerald-500" />}
            </Button>
            <Button size="sm" variant="outline" className="px-2" onClick={onDelete} title="Delete">
              <Trash2Icon className="size-3.5 text-red-500" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fill view ────────────────────────────────────────────────────────────────

function FillView({ templateId, onBack }: { templateId: string; onBack: () => void }) {
  const { data: template, isLoading: tLoading } = useHGDGTemplate(templateId);
  const { data: pdfUrl, isLoading: urlLoading } = useHGDGPdfUrl(templateId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { user } = useAuth();
  const isEncoder = user?.role === 'ENCODER';
  const submitMutation = useSubmitForApproval();
  const draftMutation = useSaveDraft();

  function onChange(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSaveDraft() {
    if (!template) return;
    try {
      setBusy(true);
      await draftMutation.mutateAsync({ templateId, formData: values });
      toast.success('Draft saved!');
      onBack();
    } catch { toast.error('Failed to save draft.'); }
    finally { setBusy(false); }
  }

  async function handleSubmit() {
    if (!template) return;
    try {
      setBusy(true);
      await submitMutation.mutateAsync({ templateId, formData: values });
      toast.success('Submitted for approval!');
      onBack();
    } catch { toast.error('Failed to submit.'); }
    finally { setBusy(false); setConfirmOpen(false); }
  }

  async function handleDownload() {
    if (!template) return;
    try {
      setBusy(true);
      await downloadFilledPdf(templateId, values, `HGDG-${template.sector}-filled.pdf`);
    } catch { toast.error('Failed to generate PDF.'); }
    finally { setBusy(false); }
  }

  if (tLoading || urlLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  if (!template || !pdfUrl) return <div className="text-[13px] text-red-500">Failed to load template.</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="mr-1.5 size-4" /> Back
        </Button>
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090B]">{template.name}</h2>
          <p className="text-[12px] text-[#71717A]">
            {isEncoder ? 'Fill the form then submit for admin approval.' : 'Fill and download the completed PDF.'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isEncoder && (
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={busy}>
              <BookmarkIcon className="mr-1.5 size-4" />
              Save Draft
            </Button>
          )}
          {isEncoder ? (
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={busy}>
              <SendIcon className="mr-1.5 size-4" />
              Submit for Approval
            </Button>
          ) : (
            <Button size="sm" onClick={handleDownload} disabled={busy}>
              <DownloadIcon className="mr-1.5 size-4" />
              {busy ? 'Generating…' : 'Download Filled PDF'}
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-[12px] text-blue-700">
        Click on any highlighted field to fill it in. Use Tab to move between fields.
      </div>

      {/* PDF Viewer */}
      <PDFOverlayViewer
        pdfUrl={pdfUrl}
        fields={template.fieldMap}
        values={values}
        onChange={onChange}
        mode="fill"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        {isEncoder ? (
          <Button onClick={() => setConfirmOpen(true)} disabled={busy}>
            <SendIcon className="mr-2 size-4" />
            Submit for Approval
          </Button>
        ) : (
          <Button onClick={handleDownload} disabled={busy}>
            <DownloadIcon className="mr-2 size-4" />
            Download Filled PDF
          </Button>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-50">
              <AlertCircleIcon className="size-6 text-amber-500" />
            </div>
            <DialogTitle className="text-center text-[15px]">Submit for Approval?</DialogTitle>
            <DialogDescription className="text-center text-[13px]">
              Your completed HGDG checklist will be sent to the admin for review.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setConfirmOpen(false)}>Go Back</Button>
            <Button className="w-full sm:w-auto bg-[#18181B] hover:bg-[#18181B]/90" onClick={handleSubmit} disabled={busy}>
              <SendIcon className="mr-2 size-4" />
              {busy ? 'Submitting…' : 'Yes, Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Map view (admin) ─────────────────────────────────────────────────────────

function MapView({ templateId, onBack }: { templateId: string; onBack: () => void }) {
  const { data: template, isLoading: tLoading } = useHGDGTemplate(templateId);
  const { data: pdfUrl, isLoading: urlLoading } = useHGDGPdfUrl(templateId);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const updateFieldMap = useUpdateFieldMap();

  // initialize fields from loaded template once
  if (template && !initialized) {
    setFields(template.fieldMap);
    setInitialized(true);
  }

  async function handleSave() {
    if (!template) return;
    try {
      setBusy(true);
      await updateFieldMap.mutateAsync({ id: templateId, fieldMap: fields });
      toast.success('Field map saved!');
    } catch { toast.error('Failed to save field map.'); }
    finally { setBusy(false); }
  }

  if (tLoading || urlLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  if (!template || !pdfUrl) return <div className="text-[13px] text-red-500">Failed to load template.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="mr-1.5 size-4" /> Back
        </Button>
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090B]">Map Fields — {template.name}</h2>
          <p className="text-[12px] text-[#71717A]">Click and drag on the PDF to define fillable fields. Click a field to edit its label and type.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">{fields.length} fields</Badge>
          <Button size="sm" onClick={handleSave} disabled={busy}>
            <SaveIcon className="mr-1.5 size-4" />
            {busy ? 'Saving…' : 'Save Field Map'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-2.5 text-[12px] text-orange-700">
        <strong>How to use:</strong> Click and drag on the PDF to create a field. Click an existing field (orange box) to select and edit it. Navigate pages using Prev/Next.
      </div>

      <PDFOverlayViewer
        pdfUrl={pdfUrl}
        fields={fields}
        mode="map"
        onFieldsChange={setFields}
      />
    </div>
  );
}

// ─── Upload template dialog (admin) ──────────────────────────────────────────

function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [pullout, setPullout] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateHGDGTemplate();

  async function handleSubmit() {
    if (!name || !sector || !file) { toast.error('Name, sector, and PDF file are required.'); return; }
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('sector', sector);
      if (pullout) fd.append('pullout', pullout);
      fd.append('pdf', file);
      await createMutation.mutateAsync(fd);
      toast.success('Template uploaded!');
      onClose();
      setName(''); setSector(''); setPullout(''); setFile(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Upload failed.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Upload HGDG Template</DialogTitle>
          <DialogDescription className="text-[13px]">Upload a PDF and define its sector.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Template Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HGDG Agriculture Checklist" className="text-[12px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Sector (unique key) *</Label>
            <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. agriculture" className="text-[12px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Pullout # (optional)</Label>
            <Input value={pullout} onChange={(e) => setPullout(e.target.value)} placeholder="e.g. Pullout 1" className="text-[12px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">PDF File *</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#D4D4D8] py-5 text-[12px] text-[#71717A] transition-colors hover:border-[#18181B] hover:text-[#18181B]"
            >
              <UploadIcon className="size-5" />
              {file ? <span className="font-medium text-[#09090B]">{file.name}</span> : <span>Click to select PDF</span>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Uploading…' : 'Upload Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewState =
  | { mode: 'list' }
  | { mode: 'fill'; templateId: string }
  | { mode: 'map'; templateId: string };

export default function HGDGPage() {
  const { data: templates, isLoading } = useHGDGTemplates();
  const [view, setView] = useState<ViewState>({ mode: 'list' });
  const [uploadOpen, setUploadOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const setPublished = useSetHGDGPublished();
  const deleteTemplate = useDeleteHGDGTemplate();
  const [deleteConfirm, setDeleteConfirm] = useState<HGDGTemplate | null>(null);

  if (view.mode === 'fill') return (
    <DashboardLayout>
      <div className="mx-auto max-w-[900px] px-4 py-6">
        <FillView templateId={view.templateId} onBack={() => setView({ mode: 'list' })} />
      </div>
    </DashboardLayout>
  );

  if (view.mode === 'map') return (
    <DashboardLayout>
      <div className="mx-auto max-w-[900px] px-4 py-6">
        <MapView templateId={view.templateId} onBack={() => setView({ mode: 'list' })} />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[#09090B]">HGDG Checklists</h1>
            <p className="text-[13px] text-[#71717A]">Harmonized Gender and Development Guidelines — sector checklists</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <PlusIcon className="mr-1.5 size-4" />
              Upload Template
            </Button>
          )}
        </div>

        {/* Templates grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : !templates?.length ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FileTextIcon className="size-10 text-[#D4D4D8]" />
            <p className="text-[14px] font-medium text-[#52525B]">No HGDG templates yet</p>
            {isAdmin && <p className="text-[12px] text-[#71717A]">Upload the sector PDF templates to get started.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                isAdmin={isAdmin}
                onFill={() => setView({ mode: 'fill', templateId: t.id })}
                onMap={() => setView({ mode: 'map', templateId: t.id })}
                onTogglePublish={async () => {
                  try {
                    await setPublished.mutateAsync({ id: t.id, isPublished: !t.isPublished });
                    toast.success(t.isPublished ? 'Template unpublished.' : 'Template published!');
                  } catch { toast.error('Failed.'); }
                }}
                onDelete={() => setDeleteConfirm(t)}
              />
            ))}
          </div>
        )}
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Delete Template?</DialogTitle>
            <DialogDescription className="text-[13px]">
              This will permanently delete <strong>{deleteConfirm?.name}</strong> and its PDF from storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteConfirm) return;
                try {
                  await deleteTemplate.mutateAsync(deleteConfirm.id);
                  toast.success('Template deleted.');
                  setDeleteConfirm(null);
                } catch { toast.error('Failed to delete.'); }
              }}
            >
              <Trash2Icon className="mr-2 size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
