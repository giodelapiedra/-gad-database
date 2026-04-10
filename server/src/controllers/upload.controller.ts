import { Response } from 'express';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import prisma from '../utils/db';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { parseExcelFile } from '../utils/excel.parser';

// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------

export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      sendError(res, 'No file uploaded.');
      return;
    }

    const { departmentId, year: yearOverride } = req.body;

    if (!departmentId) {
      sendError(res, 'departmentId is required.');
      return;
    }

    // Verify department exists
    const department = await prisma.department.findUnique({ where: { id: departmentId } });

    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    // Parse Excel
    let parsedRows;
    try {
      parsedRows = parseExcelFile(file.buffer);
    } catch (err) {
      sendError(res, err instanceof Error ? err.message : 'Failed to parse file.');
      return;
    }

    // Override year for all rows if provided
    const overrideYear = yearOverride ? parseInt(yearOverride, 10) : null;

    if (overrideYear !== null && (isNaN(overrideYear) || overrideYear < 1900 || overrideYear > 2100)) {
      sendError(res, 'Year must be between 1900 and 2100.');
      return;
    }

    // Separate valid and invalid rows
    const validRows: typeof parsedRows = [];
    const errors: string[] = [];

    for (const row of parsedRows) {
      if (row.error) {
        errors.push(`Row ${row.rowNumber}: ${row.error}`);
      } else {
        validRows.push(row);
      }
    }

    let inserted = 0;

    if (validRows.length > 0) {
      const recordData = validRows.map((row) => ({
        name: row.name,
        departmentId,
        year: overrideYear ?? row.year,
        status: row.status as 'ACTIVE' | 'PENDING' | 'INACTIVE',
        data: row.data as Prisma.InputJsonValue,
        uploadedById: req.user!.id,
      }));

      const result = await prisma.record.createMany({ data: recordData });
      inserted = result.count;
    }

    const skipped = parsedRows.length - inserted;
    const uploadYear = overrideYear ?? validRows[0]?.year ?? new Date().getFullYear();

    // Determine upload status
    let uploadStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS';
    if (inserted === 0) {
      uploadStatus = 'FAILED';
    } else if (errors.length > 0) {
      uploadStatus = 'PARTIAL';
    }

    // Create UploadLog
    await prisma.uploadLog.create({
      data: {
        departmentId,
        year: uploadYear,
        fileName: file.originalname,
        inserted,
        skipped,
        uploadedById: req.user!.id,
        status: uploadStatus,
        errors: errors,
      },
    });

    sendSuccess(
      res,
      { inserted, skipped, errors },
      `Upload complete: ${inserted} inserted, ${skipped} skipped`,
      201
    );
  } catch (error) {
    console.error('uploadFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/upload/template
// ---------------------------------------------------------------------------

export async function getTemplate(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = [
      {
        Name: 'Juan Dela Cruz',
        Status: 'ACTIVE',
        Year: new Date().getFullYear(),
        'Extra Column 1': 'Sample value',
        'Extra Column 2': 'Sample value',
      },
      {
        Name: 'Maria Santos',
        Status: 'ACTIVE',
        Year: new Date().getFullYear(),
        'Extra Column 1': 'Sample value',
        'Extra Column 2': 'Sample value',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Add note row at the bottom
    const noteRowIdx = rows.length + 2; // +1 for header, +1 for 0-based
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [['Note: You can add any extra columns after Year — they will be saved automatically.']],
      { origin: `A${noteRowIdx}` }
    );

    // Auto-size columns
    const headers = Object.keys(rows[0]);
    worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 20) }));

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="gad_upload_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('getTemplate error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/upload/logs?page=1&limit=20
// ---------------------------------------------------------------------------

export async function getLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit || '20', 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.uploadLog.findMany({
        include: {
          department: { select: { name: true, code: true, color: true } },
          uploadedBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.uploadLog.count(),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, { logs, total, page: pageNum, totalPages }, 'Upload logs retrieved');
  } catch (error) {
    console.error('getLogs error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
