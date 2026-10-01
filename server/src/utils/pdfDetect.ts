import { PDFDocument, PDFName, PDFArray, PDFRef, PDFRawStream } from 'pdf-lib';
import zlib from 'zlib';
import { promisify } from 'util';

const inflateRaw = promisify(zlib.inflateRaw);
const inflate = promisify(zlib.inflate);

export interface DetectedField {
  id: string;
  label: string;
  page: number;
  x: number;   // % of page width, from left
  y: number;   // % of page height, from top (CSS convention)
  w: number;   // % of page width
  h: number;   // % of page height
  type: 'text';
  fontSize: number;
}

interface RawRect { x: number; y: number; w: number; h: number }

async function getPageContentStream(pdfDoc: PDFDocument, pageIdx: number): Promise<string> {
  const page = pdfDoc.getPages()[pageIdx];
  const contentsVal = page.node.get(PDFName.of('Contents'));
  if (!contentsVal) return '';

  const refs: PDFRef[] = [];
  if (contentsVal instanceof PDFRef) {
    refs.push(contentsVal);
  } else if (contentsVal instanceof PDFArray) {
    for (const item of contentsVal.asArray()) {
      if (item instanceof PDFRef) refs.push(item);
    }
  }

  const parts: string[] = [];
  for (const ref of refs) {
    const obj = pdfDoc.context.lookup(ref);
    if (!(obj instanceof PDFRawStream)) continue;

    const filterVal = obj.dict.get(PDFName.of('Filter'));
    const filterStr = filterVal ? filterVal.toString() : '';

    try {
      let bytes: Buffer;
      if (filterStr.includes('FlateDecode')) {
        try {
          bytes = await inflateRaw(Buffer.from(obj.contents));
        } catch {
          bytes = await inflate(Buffer.from(obj.contents));
        }
      } else {
        bytes = Buffer.from(obj.contents);
      }
      parts.push(bytes.toString('latin1'));
    } catch { /* skip undecodable streams */ }
  }
  return parts.join('\n');
}

function parseRects(content: string): RawRect[] {
  const rects: RawRect[] = [];
  // Match: number number number number re (PDF rectangle operator)
  const re = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+re\b/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    rects.push({
      x: parseFloat(m[1]),
      y: parseFloat(m[2]),
      w: parseFloat(m[3]),
      h: parseFloat(m[4]),
    });
  }
  return rects;
}

function normalize(r: RawRect): RawRect {
  return {
    x: r.w < 0 ? r.x + r.w : r.x,
    y: r.h < 0 ? r.y + r.h : r.y,
    w: Math.abs(r.w),
    h: Math.abs(r.h),
  };
}

function rectContains(outer: RawRect, inner: RawRect): boolean {
  const eps = 2;
  return (
    inner.x >= outer.x - eps &&
    inner.x + inner.w <= outer.x + outer.w + eps &&
    inner.y >= outer.y - eps &&
    inner.y + inner.h <= outer.y + outer.h + eps
  );
}

export async function detectFieldsFromPdf(pdfBuffer: Buffer): Promise<DetectedField[]> {
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  } catch {
    return [];
  }

  const pages = pdfDoc.getPages();
  const allFields: DetectedField[] = [];
  let counter = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const { width: pw, height: ph } = pages[pageIdx].getSize();
    const content = await getPageContentStream(pdfDoc, pageIdx);
    const rawRects = parseRects(content).map(normalize);

    // Filter by size: must be a reasonable cell (not tiny decorations or full-page borders)
    const sizedRects = rawRects.filter(r =>
      r.w >= 15 && r.h >= 8 &&
      r.w <= pw * 0.95 && r.h <= ph * 0.95
    );

    // Deduplicate
    const unique: RawRect[] = [];
    for (const r of sizedRects) {
      const dup = unique.some(
        u => Math.abs(u.x - r.x) < 1 && Math.abs(u.y - r.y) < 1 &&
             Math.abs(u.w - r.w) < 1 && Math.abs(u.h - r.h) < 1
      );
      if (!dup) unique.push(r);
    }

    // Remove container rects: any rect that fully contains 2+ other rects is an outer border
    const leafRects = unique.filter(r => {
      const contained = unique.filter(other => other !== r && rectContains(r, other));
      return contained.length < 2;
    });

    // Sort: top-to-bottom, left-to-right (natural reading order)
    leafRects.sort((a, b) => {
      const rowDiff = (ph - b.y - b.h) - (ph - a.y - a.h);
      if (Math.abs(rowDiff) > 5) return rowDiff;
      return a.x - b.x;
    });

    for (const r of leafRects) {
      counter++;
      allFields.push({
        id: `f${counter}`,
        label: `Field ${counter}`,
        page: pageIdx + 1,
        // Convert PDF coordinate (bottom-left origin) → CSS percentage (top-left origin)
        x: (r.x / pw) * 100,
        y: ((ph - r.y - r.h) / ph) * 100,
        w: (r.w / pw) * 100,
        h: (r.h / ph) * 100,
        type: 'text',
        fontSize: 9,
      });
    }
  }

  return allFields;
}
