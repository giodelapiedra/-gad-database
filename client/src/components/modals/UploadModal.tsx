import { useState, useRef, useCallback } from 'react';
import { AxiosError } from 'axios';
import {
  UploadIcon,
  FileSpreadsheetIcon,
  XIcon,
  DownloadIcon,
  LoaderIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useGetDepartments } from '@/hooks/useDepartments';
import { useUploadFile } from '@/hooks/useUpload';
import { toastSuccess, toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];
const ACCEPTED_EXTS = '.xlsx,.xls,.csv';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'configure' | 'upload';

interface UploadResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

export default function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const queryClient = useQueryClient();
  const { data: departments } = useGetDepartments();
  const uploadMutation = useUploadFile();

  // Step state
  const [step, setStep] = useState<Step>('configure');

  // Step 1 state
  const [departmentId, setDepartmentId] = useState('');
  const [year, setYear] = useState('');

  // Step 2 state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = useCallback(() => {
    setStep('configure');
    setDepartmentId('');
    setYear('');
    setFile(null);
    setIsDragging(false);
    setProgress(0);
    setResult(null);
    setError('');
  }, []);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const isValidFile = (f: File) => {
    const ext = f.name.toLowerCase().match(/\.(xlsx|xls|csv)$/);
    return ext || ACCEPTED_TYPES.includes(f.type);
  };

  const handleFileSelect = (f: File) => {
    if (!isValidFile(f)) {
      toastError('Only .xlsx, .xls, and .csv files are allowed.');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
    // Reset input so re-selecting the same file triggers change
    e.target.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ---------------------------------------------------------------------------
  // Template download
  // ---------------------------------------------------------------------------

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/upload/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gad_upload_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastError('Failed to download template.');
    }
  };

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  const handleUpload = async () => {
    if (!file) return;

    setError('');
    setProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('departmentId', departmentId);
    if (year) formData.append('year', year);

    try {
      const data = await uploadMutation.mutateAsync({
        formData,
        onProgress: setProgress,
      });

      setResult(data);
      toastSuccess(`Upload complete — ${data.inserted} inserted, ${data.skipped} skipped`);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['upload-logs'] });

      // Auto-close after 2s
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err) {
      setProgress(0);
      if (err instanceof AxiosError && err.response?.data?.message) {
        const msg = err.response.data.message;
        setError(msg);
        toastError(`Upload failed: ${msg}`);
      } else {
        setError('Upload failed. Please try again.');
        toastError('Upload failed. Please try again.');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const selectedDept = departments?.find((d) => d.id === departmentId);
  const currentYear = new Date().getFullYear();
  const isUploading = uploadMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isUploading && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Records</DialogTitle>
          <DialogDescription>
            {step === 'configure'
              ? 'Select a department and year, then proceed to upload.'
              : `Uploading to ${selectedDept?.name ?? 'department'}`}
          </DialogDescription>
        </DialogHeader>

        {/* ================================================================= */}
        {/* STEP 1 — Configure                                                */}
        {/* ================================================================= */}
        {step === 'configure' && (
          <div className="space-y-4">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Department</label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <span
                        className="mr-1.5 inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-1.5">
              <label htmlFor="upload-year" className="text-sm font-medium">
                Year
              </label>
              <Input
                id="upload-year"
                type="number"
                min={1900}
                max={2100}
                placeholder={String(currentYear)}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Overrides the Year column for all rows. Leave blank to use per-row values.
              </p>
            </div>

            {/* Download template */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <DownloadIcon className="size-3.5" />
              Download template
            </button>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button disabled={!departmentId} onClick={() => setStep('upload')}>
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2 — Upload File                                              */}
        {/* ================================================================= */}
        {step === 'upload' && !result && (
          <div className="space-y-4">
            {/* Back button */}
            {!isUploading && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setError('');
                  setStep('configure');
                }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="size-3.5" />
                Back
              </button>
            )}

            {/* Drop zone */}
            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                  isDragging ? 'border-foreground bg-muted/50' : 'border-[#EBEBEB]'
                )}
              >
                <UploadIcon className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drag & drop your file here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse — .xlsx, .xls, .csv (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTS}
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* File selected card */
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <FileSpreadsheetIcon className="size-8 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setFile(null)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Progress bar */}
            {isUploading && (
              <Progress value={progress}>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </Progress>
            )}

            {/* Error alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload button */}
            <DialogFooter>
              <Button
                className="w-full"
                disabled={!file || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <UploadIcon className="size-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ================================================================= */}
        {/* RESULT — Success summary                                          */}
        {/* ================================================================= */}
        {result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4 text-center">
              <CheckCircle2Icon className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">
                {result.inserted} inserted, {result.skipped} skipped
              </p>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Errors ({result.errors.length})
                </p>
                <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/20 p-2">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Closing automatically...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
