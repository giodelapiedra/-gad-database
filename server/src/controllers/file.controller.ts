import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/db';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { uploadToR2, deleteFromR2 } from '../utils/s3';

function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL || 'https://gaduploads.tanauancity.com';
  return `${base}/${key}`;
}

// ---------------------------------------------------------------------------
// POST /api/files — upload file(s) to R2
// ---------------------------------------------------------------------------

export async function uploadFiles(req: AuthRequest, res: Response): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      sendError(res, 'No files uploaded.');
      return;
    }

    const { departmentId, year: yearStr } = req.body;

    if (!departmentId) {
      sendError(res, 'departmentId is required.');
      return;
    }

    const department = await prisma.department.findUnique({ where: { id: departmentId } });

    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    const saved = [];

    for (const file of files) {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const key = `${department.code}/${year}/${uniqueId}-${file.originalname}`;

      await uploadToR2(key, file.buffer, file.mimetype);

      const record = await prisma.file.create({
        data: {
          fileName: key,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          departmentId,
          year,
          uploadedById: req.user!.id,
        },
        include: {
          department: { select: { name: true, code: true, color: true } },
          uploadedBy: { select: { name: true } },
        },
      });

      saved.push({ ...record, url: getPublicUrl(key) });
    }

    sendSuccess(res, saved, `${saved.length} file(s) uploaded`, 201);
  } catch (error) {
    console.error('uploadFiles error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/files?dept=SPORTS&year=2026&search=coron&page=1&limit=20
// ---------------------------------------------------------------------------

export async function getFiles(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      dept,
      year,
      search,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit || '20', 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.FileWhereInput = {};

    if (dept) {
      const department = await prisma.department.findUnique({
        where: { code: dept.toUpperCase() },
        select: { id: true },
      });

      if (!department) {
        sendSuccess(res, { files: [], total: 0, page: pageNum, totalPages: 0 }, 'Files retrieved');
        return;
      }

      where.departmentId = department.id;
    }

    if (year) {
      where.year = parseInt(year, 10);
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { department: { code: { contains: search, mode: 'insensitive' } } },
        { department: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          department: { select: { name: true, code: true, color: true } },
          uploadedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.file.count({ where }),
    ]);

    const filesWithUrl = files.map((f) => ({
      ...f,
      url: getPublicUrl(f.fileName),
    }));

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, { files: filesWithUrl, total, page: pageNum, totalPages }, 'Files retrieved');
  } catch (error) {
    console.error('getFiles error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/files/years?dept=SPORTS — distinct years for a department
// ---------------------------------------------------------------------------

export async function getFileYears(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { dept } = req.query as Record<string, string | undefined>;

    const where: Prisma.FileWhereInput = {};

    if (dept) {
      const department = await prisma.department.findUnique({
        where: { code: dept.toUpperCase() },
        select: { id: true },
      });
      if (department) {
        where.departmentId = department.id;
      }
    }

    const years = await prisma.file.groupBy({
      by: ['year'],
      where,
      orderBy: { year: 'desc' },
    });

    sendSuccess(res, years.map((y) => y.year), 'Years retrieved');
  } catch (error) {
    console.error('getFileYears error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/files/:id/view — redirect to public URL
// ---------------------------------------------------------------------------

export async function viewFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const file = await prisma.file.findUnique({ where: { id } });

    if (!file) {
      sendError(res, 'File not found.', 404);
      return;
    }

    res.redirect(getPublicUrl(file.fileName));
  } catch (error) {
    console.error('viewFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/files/:id (ADMIN only)
// ---------------------------------------------------------------------------

export async function deleteFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const file = await prisma.file.findUnique({ where: { id } });

    if (!file) {
      sendError(res, 'File not found.', 404);
      return;
    }

    await deleteFromR2(file.fileName);
    await prisma.file.delete({ where: { id } });

    sendSuccess(res, null, 'File deleted');
  } catch (error) {
    console.error('deleteFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
