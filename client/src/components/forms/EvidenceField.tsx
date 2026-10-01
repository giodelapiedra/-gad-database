import { useRef, useState } from 'react';
import { PaperclipIcon, FileIcon, ImageIcon, XIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { uploadEvidence } from '@/hooks/useSubmissions';
import type { EvidenceFile } from '@/hooks/useTemplates';

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPT = 'image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Only link to http(s) URLs — the descriptor lives in user-editable formData. */
const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : undefined);

/** Read-only list of proof files, shared by the form and the submission viewer. */
export function EvidenceList({
  files, onRemove,
}: {
  files: EvidenceFile[];
  onRemove?: (index: number) => void;
}) {
  if (!files.length) return null;
  return (
    <ul className="space-y-1">
      {files.map((f, i) => {
        const Icon = f.mimeType.startsWith('image/') ? ImageIcon : FileIcon;
        return (
          <li key={`${f.url}-${i}`}
            className="flex items-center gap-1.5 rounded-md border border-[#E4E4E7] bg-white px-2 py-1 text-[11px]">
            <Icon className="size-3.5 shrink-0 text-[#71717A]" />
            <a href={safeHref(f.url)} target="_blank" rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate font-medium text-[#2563EB] hover:underline" title={f.name}>
              {f.name}
            </a>
            <span className="shrink-0 text-[#A1A1AA]">{sizeLabel(f.size)}</span>
            {onRemove && (
              <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${f.name}`}
                className="shrink-0 rounded p-0.5 text-[#A1A1AA] hover:bg-red-50 hover:text-red-600">
                <XIcon className="size-3" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "Variance or Remarks" cell of an Accomplishment Report: the remark itself
 * plus the files that prove the GAD activity was done (photos, attendance,
 * reports). Files upload immediately; the row only stores their descriptors.
 */
export function EvidenceField({
  value, onChange, files, onFilesChange, placeholder = 'Variance or remarks',
}: {
  value: string;
  onChange: (v: string) => void;
  files: EvidenceFile[];
  onFilesChange: (files: EvidenceFile[]) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  async function handlePick(list: FileList | null) {
    if (!list?.length) return;
    const picked = Array.from(list);
    const tooBig = picked.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(', ')} — too large (max 15MB).`);

    const ok = picked.filter((f) => f.size <= MAX_BYTES);
    if (!ok.length) return;
    setUploading((n) => n + ok.length);

    const uploaded: EvidenceFile[] = [];
    for (const f of ok) {
      try {
        uploaded.push(await uploadEvidence(f));
      } catch {
        toast.error(`Failed to upload ${f.name}.`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (uploaded.length) {
      onFilesChange([...files, ...uploaded]);
      toast.success(uploaded.length === 1 ? 'Proof attached.' : `${uploaded.length} files attached.`);
    }
  }

  return (
    <div className="space-y-1.5">
      {/* Borderless, like the other sheet cells — the cell border is the box. */}
      <Textarea
        rows={2} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] resize-none rounded-md border-0 bg-transparent px-1.5 py-1 text-[12px] leading-snug shadow-none placeholder:text-[#C4C4CC] focus-visible:bg-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-[#18181B]"
      />
      {/* Removing mid-upload would be undone when the upload lands (it appends to
          the list as it was), so removal waits until uploads finish. */}
      <EvidenceList
        files={files}
        onRemove={uploading > 0 ? undefined : (i) => onFilesChange(files.filter((_, idx) => idx !== i))}
      />
      <input
        ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
        onChange={(e) => { void handlePick(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading > 0}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#D4D4D8] px-2 py-1.5 text-[11px] font-medium text-[#52525B] transition-colors hover:border-[#2563EB] hover:text-[#2563EB] disabled:cursor-wait disabled:opacity-60"
      >
        {uploading > 0
          ? <><Loader2Icon className="size-3.5 animate-spin" /> Uploading…</>
          : <><PaperclipIcon className="size-3.5" /> {files.length ? 'Add more proof' : 'Upload proof'}</>}
      </button>
    </div>
  );
}
