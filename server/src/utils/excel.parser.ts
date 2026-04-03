import * as XLSX from 'xlsx';

export interface ParsedRow {
  rowNumber: number;
  name: string;
  status: string;
  year: number;
  data: Record<string, unknown>;
  error?: string;
}

export function parseExcelFile(buffer: Buffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No sheets found in the uploaded file.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('The uploaded file contains no data rows.');
  }

  const originalHeaders = Object.keys(rawRows[0]);

  // Try to find a "Name" column (case insensitive) — if none, use first column
  const nameHeader = originalHeaders.find(
    (h) => h.trim().toLowerCase() === 'name'
  ) ?? originalHeaders[0];

  const currentYear = new Date().getFullYear();

  return rawRows.map((row, index) => {
    const rowNumber = index + 2;
    const data: Record<string, unknown> = {};

    // Use the name column value, or first column if no Name header
    const name = String(row[nameHeader!] ?? '').trim();

    let status = 'ACTIVE';
    let year = currentYear;

    for (const header of originalHeaders) {
      const lower = header.trim().toLowerCase();
      const rawValue = row[header];

      // Check for optional system columns
      if (lower === 'status') {
        const s = String(rawValue ?? '').trim().toUpperCase();
        if (['ACTIVE', 'PENDING', 'INACTIVE'].includes(s)) {
          status = s;
        }
        continue;
      }

      if (lower === 'year') {
        const y = Number(rawValue);
        if (!isNaN(y) && y >= 1900 && y <= 2100) {
          year = Math.floor(y);
        }
        continue;
      }

      // Skip the name column from data (already stored as record name)
      if (header === nameHeader) continue;

      // Everything else → data: {}
      if (rawValue !== '' && rawValue !== null && rawValue !== undefined) {
        data[header] = rawValue;
      }
    }

    let error: string | undefined;
    if (!name) {
      error = 'Row is empty';
    }

    return { rowNumber, name, status, year, data, error };
  });
}
