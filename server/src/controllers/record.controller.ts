import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  departmentId: z.string().min(1, 'Department is required'),
  year: z.number().int().min(1900, 'Year min 1900').max(2100, 'Year max 2100'),
  status: z.enum(['ACTIVE', 'PENDING', 'INACTIVE']).default('ACTIVE'),
  data: z.record(z.string(), z.unknown()).optional(),
});

const updateSchema = createSchema.partial();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFirstZodError(error: z.ZodError): string {
  try {
    if (error.issues && error.issues.length > 0) {
      return error.issues[0].message;
    }
    const parsed = JSON.parse(error.message);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].message;
    }
  } catch {
    // fallback
  }
  return 'Invalid request data';
}

// ---------------------------------------------------------------------------
// GET /api/records
// ---------------------------------------------------------------------------

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      dept,
      year,
      status,
      search,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit || '20', 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.RecordWhereInput = {};

    if (dept) {
      const department = await prisma.department.findUnique({
        where: { code: dept.toUpperCase() },
        select: { id: true },
      });

      if (!department) {
        sendSuccess(res, { records: [], total: 0, page: pageNum, totalPages: 0 }, 'Records retrieved');
        return;
      }

      where.departmentId = department.id;
    }

    if (year) {
      where.year = parseInt(year, 10);
    }

    if (status) {
      where.status = status.toUpperCase() as 'ACTIVE' | 'PENDING' | 'INACTIVE';
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        include: {
          department: { select: { name: true, code: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.record.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, { records, total, page: pageNum, totalPages }, 'Records retrieved');
  } catch (error) {
    console.error('getAll records error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/records
// ---------------------------------------------------------------------------

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, getFirstZodError(parsed.error));
      return;
    }

    const { departmentId, data, ...rest } = parsed.data;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });

    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    const record = await prisma.record.create({
      data: {
        ...rest,
        departmentId,
        data: (data ?? {}) as Prisma.InputJsonValue,
        uploadedById: req.user!.id,
      },
      include: {
        department: { select: { name: true, code: true, color: true } },
      },
    });

    sendSuccess(res, record, 'Record created', 201);
  } catch (error) {
    console.error('create record error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/records/:id
// ---------------------------------------------------------------------------

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.record.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Record not found.', 404);
      return;
    }

    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, getFirstZodError(parsed.error));
      return;
    }

    const { departmentId, data, ...rest } = parsed.data;

    if (departmentId && departmentId !== existing.departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });

      if (!department) {
        sendError(res, 'Department not found.', 404);
        return;
      }
    }

    const record = await prisma.record.update({
      where: { id },
      data: {
        ...rest,
        ...(departmentId && { department: { connect: { id: departmentId } } }),
        ...(data !== undefined && { data: data as Prisma.InputJsonValue }),
      },
      include: {
        department: { select: { name: true, code: true, color: true } },
      },
    });

    sendSuccess(res, record, 'Record updated');
  } catch (error) {
    console.error('update record error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/records/:id
// ---------------------------------------------------------------------------

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.record.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Record not found.', 404);
      return;
    }

    await prisma.record.delete({ where: { id } });

    sendSuccess(res, null, 'Record deleted');
  } catch (error) {
    console.error('remove record error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/records/export?dept=PESO&year=2026
// ---------------------------------------------------------------------------

export async function exportRecords(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { dept, year } = req.query as Record<string, string | undefined>;

    if (!dept || !year) {
      sendError(res, 'Both dept and year query params are required.');
      return;
    }

    const department = await prisma.department.findUnique({
      where: { code: dept.toUpperCase() },
    });

    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    const yearNum = parseInt(year, 10);

    const records = await prisma.record.findMany({
      where: { departmentId: department.id, year: yearNum },
      include: {
        department: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Flatten: system fields + all data: {} keys as columns
    const rows = records.map((r) => {
      const dataFields = (r.data && typeof r.data === 'object') ? r.data as Record<string, unknown> : {};
      return {
        Name: r.name,
        Department: r.department.name,
        Year: r.year,
        Status: r.status,
        ...dataFields,
        'Date Added': new Date(r.createdAt).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Records');

    if (rows.length > 0) {
      const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, unknown>)[key] ?? '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `${dept.toUpperCase()}_gad_records_${yearNum}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('export records error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
