import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

// Keeps an in-progress GAD form in localStorage so a refresh, a closed tab or a
// dropped connection doesn't lose what the encoder typed. The copy is dropped
// once the form is saved/submitted to the server (`clear`).
//
// For an edit (editId set) the copy is tied to the server data it started
// from: if the submission changed since (e.g. the admin edited it), the stale
// local copy is ignored rather than silently overwriting newer data.

const PREFIX = 'gad-form:';

interface Stored<T> { data: T; base: string; savedAt: string }

/** Small, stable string hash (djb2) — only used to compare snapshots. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function read<T>(key: string): Stored<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Stored<T>) : null;
  } catch {
    return null;
  }
}

function remove(key: string) {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

export interface AutosaveControls {
  /** When the restored copy was last saved, or null if the form started fresh. */
  restoredAt: string | null;
  /** Throw away the local copy and start over from `makeInitial`. */
  discard: () => void;
  /** Forget the local copy — call after a successful save/submit. */
  clear: () => void;
}

export function useAutosavedState<T>(
  { templateId, userId, editId, base }: { templateId: string; userId?: string; editId?: string; base?: unknown },
  makeInitial: () => T,
): [T, Dispatch<SetStateAction<T>>, AutosaveControls] {
  const key = `${PREFIX}${userId ?? 'anon'}:${editId ?? 'new'}:${templateId}`;
  const baseSig = hash(JSON.stringify(base ?? null));

  const [{ initial, restoredAt: firstRestoredAt }] = useState(() => {
    const saved = read<T>(key);
    if (saved && saved.base === baseSig) return { initial: saved.data, restoredAt: saved.savedAt };
    return { initial: makeInitial(), restoredAt: null as string | null };
  });
  const [data, setData] = useState<T>(initial);
  const [restoredAt, setRestoredAt] = useState<string | null>(firstRestoredAt);

  // Snapshot of the untouched form, so merely opening a form saves nothing.
  const pristine = useRef<string | null>(null);
  const cleared  = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    const json = JSON.stringify(data);
    if (pristine.current === null && !firstRestoredAt) pristine.current = json;
    if (json === pristine.current) { remove(key); return; }
    try {
      const entry: Stored<T> = { data, base: baseSig, savedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch { /* storage full or blocked — the form still works, just unsaved */ }
  }, [data, key, baseSig, firstRestoredAt]);

  const clear = useCallback(() => { cleared.current = true; remove(key); }, [key]);

  const discard = useCallback(() => {
    remove(key);
    const fresh = makeInitial();
    pristine.current = JSON.stringify(fresh);
    setData(fresh);
    setRestoredAt(null);
  }, [key, makeInitial]);

  return [data, setData, { restoredAt, discard, clear }];
}
