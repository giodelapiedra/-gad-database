import { useState } from 'react';
import { toast } from 'sonner';
import {
  DownloadIcon,
  MessageSquareIcon,
  PaperclipIcon,
  SendIcon,
  FlagIcon,
  CheckCircle2Icon,
  RotateCcwIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddComment, useResolveComment, type SubmissionComment } from '@/hooks/useSubmissions';
import { REVIEW_SECTIONS, sectionHasRows, sectionLabel } from '@/lib/reviewSections';
import { fmt } from './shared';

const GENERAL = '__general__';

/** Tag showing which part of the form a comment flags, and whether it is still open. */
function FlagTag({ c }: { c: SubmissionComment }) {
  if (!c.section) return null;
  const where = `${sectionLabel(c.section)}${c.rowNumber != null ? ` · Row ${c.rowNumber}` : ''}`;
  return c.resolvedAt ? (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
      <CheckCircle2Icon className="size-3" /> {where} · resolved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
      <FlagIcon className="size-3" /> {where} · for correction
    </span>
  );
}

export function CommentsThread({ submissionId, comments, canFlag }: {
  submissionId: string;
  comments: SubmissionComment[];
  /** Reviewers can point a comment at a part of the form and resolve flags. */
  canFlag: boolean;
}) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [section, setSection] = useState<string>(GENERAL);
  const [row, setRow] = useState('');
  const addComment = useAddComment();
  const resolveComment = useResolveComment();

  const flagged = section !== GENERAL;
  const rowAllowed = flagged && sectionHasRows(section);

  async function submit() {
    if (!body.trim() && !file) { toast.error('Write a comment or attach a file.'); return; }
    const rowNumber = rowAllowed && row ? Number(row) : null;
    if (rowNumber != null && (!Number.isInteger(rowNumber) || rowNumber < 1)) {
      toast.error('Row number must be 1 or higher.'); return;
    }
    try {
      await addComment.mutateAsync({
        id: submissionId, body: body.trim(), file,
        section: flagged ? section : null, rowNumber,
      });
      setBody(''); setFile(null); setSection(GENERAL); setRow('');
      toast.success(flagged ? 'Part flagged for correction.' : 'Comment added.');
    } catch {
      toast.error('Failed to add comment.');
    }
  }

  async function toggleResolved(c: SubmissionComment) {
    try {
      await resolveComment.mutateAsync({ id: submissionId, commentId: c.id, resolved: !c.resolvedAt });
      toast.success(c.resolvedAt ? 'Flag reopened.' : 'Marked as resolved.');
    } catch {
      toast.error('Failed to update the flag.');
    }
  }

  return (
    <div className="mb-5 rounded-[10px] border border-[#EBEBEB] bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquareIcon className="size-4 text-[#71717A]" />
        <h3 className="text-[13px] font-semibold text-[#09090B]">Comments &amp; Attachments</h3>
        <span className="rounded-full bg-[#F4F4F5] px-1.5 py-0.5 text-[11px] text-[#71717A]">{comments.length}</span>
      </div>

      {comments.length === 0 ? (
        <p className="mb-4 text-[12px] text-[#A1A1AA]">No comments yet.</p>
      ) : (
        <div className="mb-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className={`rounded-md border p-3 ${
              c.section && !c.resolvedAt ? 'border-red-200 bg-red-50/40' : 'border-[#EBEBEB] bg-[#FAFAFA]'
            }`}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-semibold text-[#09090B]">{c.author.name}</span>
                <Badge variant="outline" className="text-[10px]">{c.author.role === 'ADMIN' ? 'Admin' : 'Encoder'}</Badge>
                <span className="text-[#A1A1AA]">{fmt(c.createdAt)}</span>
                <FlagTag c={c} />
                {canFlag && c.section && (
                  <button type="button" onClick={() => toggleResolved(c)} disabled={resolveComment.isPending}
                    className="ml-auto inline-flex items-center gap-1 rounded border border-[#E4E4E7] bg-white px-1.5 py-0.5 text-[11px] text-[#52525B] hover:bg-[#F4F4F5]">
                    {c.resolvedAt
                      ? <><RotateCcwIcon className="size-3" /> Reopen</>
                      : <><CheckCircle2Icon className="size-3" /> Resolve</>}
                  </button>
                )}
              </div>
              {c.body && <p className="whitespace-pre-wrap text-[13px] text-[#3F3F46]">{c.body}</p>}
              {c.resolvedAt && c.resolvedBy && (
                <p className="mt-1 text-[11px] text-emerald-700">Resolved by {c.resolvedBy.name} · {fmt(c.resolvedAt)}</p>
              )}
              {c.attachmentUrl && (
                <a href={c.attachmentUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#E4E4E7] bg-white px-2.5 py-1.5 text-[12px] text-[#18181B] hover:bg-[#F4F4F5]">
                  <PaperclipIcon className="size-3.5" />
                  {c.attachmentName ?? 'Attachment'}
                  <DownloadIcon className="size-3.5 text-[#71717A]" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="space-y-2 border-t border-[#EBEBEB] pt-3">
        {canFlag && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[#52525B]">About:</span>
            <Select value={section} onValueChange={(v) => { setSection((v as string | null) ?? GENERAL); setRow(''); }}>
              <SelectTrigger className="h-8 w-56 text-[12px]">
                <SelectValue>{section === GENERAL ? 'General comment' : sectionLabel(section)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GENERAL}>General comment</SelectItem>
                {REVIEW_SECTIONS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {rowAllowed && (
              <Input type="number" min={1} value={row} onChange={(e) => setRow(e.target.value)}
                placeholder="Row # (optional)" className="h-8 w-36 text-[12px]" />
            )}
            {flagged && (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-600">
                <FlagIcon className="size-3" /> This part turns red for the encoder until resolved.
              </span>
            )}
          </div>
        )}
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder={flagged ? 'What needs to be corrected here?' : 'Leave a comment…'}
          className="resize-none text-[13px]" />
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#71717A] hover:text-[#18181B]">
            <PaperclipIcon className="size-3.5" />
            <span className="max-w-[200px] truncate">{file ? file.name : 'Attach file'}</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button size="sm" disabled={addComment.isPending} onClick={submit}>
            {flagged ? <FlagIcon className="mr-1.5 size-3.5" /> : <SendIcon className="mr-1.5 size-3.5" />}
            {addComment.isPending ? 'Posting…' : flagged ? 'Flag for correction' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  );
}
