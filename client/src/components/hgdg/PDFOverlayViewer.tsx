import { useRef, useEffect, useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { FieldDef } from '@/hooks/useHGDG';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewerMode = 'fill' | 'map';

type PDFOverlayViewerProps = {
  pdfUrl: string;
  fields: FieldDef[];
  values?: Record<string, string>;
  onChange?: (fieldId: string, value: string) => void;
  mode?: ViewerMode;
  onFieldsChange?: (fields: FieldDef[]) => void;
  onPageChange?: (page: number) => void;
};

// ─── Overlay Field (fill mode) ────────────────────────────────────────────────

function OverlayField({
  field,
  value,
  onChange,
  scale,
  pageH,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  scale: number;
  pageH: number;
}) {
  const left = (field.x / 100) * scale;
  const top = (field.y / 100) * pageH;
  const width = (field.w / 100) * scale;
  const height = (field.h / 100) * pageH;

  const base = 'absolute border border-blue-400/60 bg-white/80 focus-within:border-blue-600 focus-within:bg-white focus-within:shadow-md rounded-sm transition-all';

  const style: React.CSSProperties = { left, top, width, height, position: 'absolute' };

  if (field.type === 'radio' && field.options) {
    return (
      <div style={style} className={`${base} flex items-center gap-1 px-1 overflow-hidden`}>
        {field.options.map((opt) => (
          <label key={opt} className="flex items-center gap-0.5 cursor-pointer text-[10px] whitespace-nowrap">
            <input
              type="radio"
              name={field.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="w-3 h-3 accent-blue-600"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div style={style} className={`${base} flex items-center justify-center`}>
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="w-4 h-4 accent-blue-600"
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...style, fontSize: `${field.fontSize || 9}px`, lineHeight: '1.3', resize: 'none' }}
        className={`${base} p-0.5 overflow-hidden`}
      />
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...style, fontSize: `${field.fontSize || 9}px` }}
      className={`${base} px-0.5`}
    />
  );
}

// ─── Map mode: drag-to-create field ──────────────────────────────────────────

type DragState = { startX: number; startY: number; endX: number; endY: number } | null;

function MapOverlay({
  fields,
  onFieldsChange,
  scale,
  pageH,
  currentPage,
  selectedId,
  onSelect,
}: {
  fields: FieldDef[];
  onFieldsChange: (f: FieldDef[]) => void;
  scale: number;
  pageH: number;
  currentPage: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [drag, setDrag] = useState<DragState>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  function pct(px: number, total: number) { return (px / total) * 100; }

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-field]')) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    setDrag({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, endX: e.clientX - rect.left, endY: e.clientY - rect.top });
    onSelect(null);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    setDrag((d) => d ? { ...d, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null);
  }

  function onMouseUp() {
    if (!drag) return;
    const minSize = 10;
    const rawX = Math.min(drag.startX, drag.endX);
    const rawY = Math.min(drag.startY, drag.endY);
    const rawW = Math.abs(drag.endX - drag.startX);
    const rawH = Math.abs(drag.endY - drag.startY);
    if (rawW > minSize && rawH > minSize) {
      const newField: FieldDef = {
        id: `f${Date.now()}`,
        page: currentPage,
        x: pct(rawX, scale),
        y: pct(rawY, pageH),
        w: pct(rawW, scale),
        h: pct(rawH, pageH),
        type: 'text',
        label: 'New Field',
        fontSize: 9,
      };
      onFieldsChange([...fields, newField]);
      onSelect(newField.id);
    }
    setDrag(null);
  }

  const pageFields = fields.filter((f) => f.page === currentPage);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {pageFields.map((f) => {
        const left = (f.x / 100) * scale;
        const top = (f.y / 100) * pageH;
        const width = (f.w / 100) * scale;
        const height = (f.h / 100) * pageH;
        const isSelected = selectedId === f.id;
        return (
          <div
            key={f.id}
            data-field={f.id}
            onClick={(e) => { e.stopPropagation(); onSelect(f.id); }}
            style={{ left, top, width, height }}
            className={`absolute border-2 rounded-sm cursor-pointer transition-colors ${
              isSelected ? 'border-blue-600 bg-blue-100/50' : 'border-orange-400 bg-orange-50/40 hover:border-orange-600'
            }`}
          >
            <span className="absolute -top-4 left-0 text-[9px] font-medium whitespace-nowrap bg-orange-500 text-white px-1 rounded-sm truncate max-w-[120px]">
              {f.label}
            </span>
          </div>
        );
      })}

      {drag && (
        <div
          style={{
            left: Math.min(drag.startX, drag.endX),
            top: Math.min(drag.startY, drag.endY),
            width: Math.abs(drag.endX - drag.startX),
            height: Math.abs(drag.endY - drag.startY),
          }}
          className="absolute border-2 border-dashed border-blue-500 bg-blue-100/30 pointer-events-none"
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PDFOverlayViewer({
  pdfUrl,
  fields,
  values = {},
  onChange,
  mode = 'fill',
  onFieldsChange,
  onPageChange,
}: PDFOverlayViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const RENDER_WIDTH = 780;

  const handlePageLoad = useCallback((page: any) => {
    const vp = page.getViewport({ scale: 1 });
    const scale = RENDER_WIDTH / vp.width;
    setPageSize({ width: RENDER_WIDTH, height: vp.height * scale });
  }, []);

  function goTo(p: number) {
    const clamped = Math.max(1, Math.min(p, numPages));
    setCurrentPage(clamped);
    onPageChange?.(clamped);
  }

  const currentPageFields = fields.filter((f) => f.page === currentPage);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Pagination */}
      {numPages > 1 && (
        <div className="flex items-center gap-3 text-[13px]">
          <button onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}
            className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-gray-50">
            ← Prev
          </button>
          <span className="text-[#52525B]">Page {currentPage} of {numPages}</span>
          <button onClick={() => goTo(currentPage + 1)} disabled={currentPage >= numPages}
            className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-gray-50">
            Next →
          </button>
        </div>
      )}

      {/* PDF + overlay */}
      <div ref={containerRef} className="relative shadow-lg border border-[#D4D4D8] select-none" style={{ width: RENDER_WIDTH, height: pageSize.height || 'auto' }}>
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div style={{ width: RENDER_WIDTH, height: 1000 }} className="flex items-center justify-center bg-gray-100 text-[13px] text-gray-500">
              Loading PDF…
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            width={RENDER_WIDTH}
            onLoadSuccess={handlePageLoad}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>

        {pageSize.height > 0 && mode === 'fill' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full h-full pointer-events-auto">
              {currentPageFields.map((field) => (
                <OverlayField
                  key={field.id}
                  field={field}
                  value={values[field.id] ?? ''}
                  onChange={(v) => onChange?.(field.id, v)}
                  scale={RENDER_WIDTH}
                  pageH={pageSize.height}
                />
              ))}
            </div>
          </div>
        )}

        {pageSize.height > 0 && mode === 'map' && onFieldsChange && (
          <MapOverlay
            fields={fields}
            onFieldsChange={onFieldsChange}
            scale={RENDER_WIDTH}
            pageH={pageSize.height}
            currentPage={currentPage}
            selectedId={selectedFieldId}
            onSelect={setSelectedFieldId}
          />
        )}
      </div>

      {/* Field editor panel in map mode */}
      {mode === 'map' && selectedFieldId && onFieldsChange && (
        <FieldEditor
          field={fields.find((f) => f.id === selectedFieldId)!}
          onUpdate={(updated) => onFieldsChange(fields.map((f) => f.id === updated.id ? updated : f))}
          onDelete={() => {
            onFieldsChange(fields.filter((f) => f.id !== selectedFieldId));
            setSelectedFieldId(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Field editor (map mode sidebar) ─────────────────────────────────────────

function FieldEditor({
  field,
  onUpdate,
  onDelete,
}: {
  field: FieldDef;
  onUpdate: (f: FieldDef) => void;
  onDelete: () => void;
}) {
  function upd<K extends keyof FieldDef>(k: K, v: FieldDef[K]) {
    onUpdate({ ...field, [k]: v });
  }

  return (
    <div className="w-full max-w-[780px] rounded-[10px] border border-[#EBEBEB] bg-white p-4 text-[12px]">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-[#09090B]">Edit Field</span>
        <button onClick={onDelete} className="rounded px-2 py-0.5 text-red-500 hover:bg-red-50 text-[11px]">Delete</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] text-[#52525B]">Label</label>
          <input value={field.label} onChange={(e) => upd('label', e.target.value)}
            className="w-full rounded border border-[#E4E4E7] px-2 py-1 text-[12px]" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-[#52525B]">Type</label>
          <select value={field.type} onChange={(e) => upd('type', e.target.value as FieldDef['type'])}
            className="w-full rounded border border-[#E4E4E7] px-2 py-1 text-[12px]">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="textarea">Textarea</option>
            <option value="radio">Radio (Yes/No/NA)</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-[#52525B]">Font size</label>
          <input type="number" min={7} max={14} value={field.fontSize || 9}
            onChange={(e) => upd('fontSize', Number(e.target.value))}
            className="w-full rounded border border-[#E4E4E7] px-2 py-1 text-[12px]" />
        </div>
        {field.type === 'radio' && (
          <div className="col-span-full space-y-1">
            <label className="text-[11px] text-[#52525B]">Options (comma-separated)</label>
            <input
              value={(field.options || ['YES', 'NO', 'N/A']).join(', ')}
              onChange={(e) => upd('options', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="w-full rounded border border-[#E4E4E7] px-2 py-1 text-[12px]"
            />
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-[#52525B]">
        {(['x', 'y', 'w', 'h'] as const).map((k) => (
          <div key={k} className="space-y-0.5">
            <label>{k.toUpperCase()} (%)</label>
            <input type="number" min={0} max={100} step={0.1} value={Number(field[k]).toFixed(1)}
              onChange={(e) => upd(k, Number(e.target.value))}
              className="w-full rounded border border-[#E4E4E7] px-1 py-1 text-[11px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
