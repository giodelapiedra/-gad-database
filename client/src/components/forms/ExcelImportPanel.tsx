import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheetIcon, UploadIcon, Loader2Icon, AlertTriangleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiErrorMessage } from '@/hooks/useSubmissions';
import { importTemplateExcel, importSummary, takePendingImport, type ExcelImportResult } from '@/lib/excelImport';

const TEMPLATE_LABEL: Record<string, string> = {
  BARANGAY_GPB: 'Barangay GPB', BARANGAY_AR: 'Barangay AR', CITY_GPB: 'City GPB', CITY_AR: 'City AR',
};

/**
 * "Already have it in Excel?" — upload the filled-in template and the form is
 * filled from it. The sheet is read first and shown for confirmation, since
 * applying it replaces the rows already on the form.
 *
 * Also applies a workbook picked on the template list (see setPendingImport).
 */
export function ExcelImportPanel({
  templateId, onApply,
}: {
  templateId: string;
  onApply: (r: ExcelImportResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  // A workbook uploaded from the template list lands here once.
  useEffect(() => {
    const r = takePendingImport(templateId);
    if (!r) return;
    onApply(r);
    toast.success(`Filled from ${r.fileName}: ${importSummary(r)}.`);
    r.warnings.forEach((w) => toast.warning(w));
  }, [templateId, onApply]);

  async function read(f: File, sheet?: string) {
    try {
      setBusy(true);
      setResult(await importTemplateExcel(f, { templateId, sheet }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not read that file.'));
    } finally {
      setBusy(false);
    }
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';           // picking the same file again still fires
    if (!f) return;
    setFile(f);
    read(f);
  }

  function apply() {
    if (!result) return;
    onApply(result);
    toast.success(`Form filled from ${result.fileName}. Check it over, then save or submit.`);
    setResult(null);
  }

  return (
    <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
            <FileSpreadsheetIcon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-emerald-900">Already filled this in Excel?</p>
            <p className="text-[12px] text-emerald-800/80">
              Upload your {TEMPLATE_LABEL[templateId] ?? ''} template (.xlsx or .xls) and the form below is filled from it.
            </p>
          </div>
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={pick} />
        <Button size="sm" className="h-8 shrink-0 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy
            ? <><Loader2Icon className="mr-1.5 size-3.5 animate-spin" /> Reading…</>
            : <><UploadIcon className="mr-1.5 size-3.5" /> Upload Excel</>}
        </Button>
      </div>

      <Dialog open={!!result} onOpenChange={(o) => { if (!o) setResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Fill the form from this file?</DialogTitle>
            <DialogDescription className="text-[13px]">
              The rows on the form are replaced by the rows in the sheet.
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-3 text-[12px]">
              <div className="flex items-center gap-2 rounded-md bg-[#F4F4F5] px-3 py-2">
                <FileSpreadsheetIcon className="size-3.5 shrink-0 text-[#71717A]" />
                <span className="truncate text-[#09090B]">{result.fileName}</span>
              </div>

              {result.sheets.length > 1 && (
                <label className="flex items-center gap-2">
                  <span className="shrink-0 text-[#52525B]">Sheet</span>
                  <select
                    value={result.sheet}
                    disabled={busy}
                    onChange={(e) => file && read(file, e.target.value)}
                    className="h-8 flex-1 rounded-md border border-[#E4E4E7] bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {result.sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              )}

              <ul className="space-y-1 rounded-md border border-[#EBEBEB] p-3 text-[#09090B]">
                <li className="flex justify-between"><span>Client-focused rows</span><b>{result.counts.clientFocused}</b></li>
                <li className="flex justify-between"><span>Organization-focused rows</span><b>{result.counts.organizationFocused}</b></li>
                <li className="flex justify-between"><span>Attributed programs</span><b>{result.counts.attributedPrograms}</b></li>
                {('cy' in result.formData || 'fy' in result.formData) && (
                  <li className="flex justify-between">
                    <span>{'cy' in result.formData ? 'Calendar year' : 'Fiscal year'}</span>
                    <b>{String(result.formData.cy ?? result.formData.fy)}</b>
                  </li>
                )}
              </ul>

              {result.warnings.length > 0 && (
                <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  {result.warnings.map((w) => (
                    <p key={w} className="flex gap-1.5">
                      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setResult(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={apply}>
              <UploadIcon className="mr-2 size-4" /> Fill the form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
