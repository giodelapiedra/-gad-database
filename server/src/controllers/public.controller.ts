import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';

const prisma = new PrismaClient();

function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL || 'https://gaduploads.tanauancity.com';
  return `${base}/${key}`;
}

// ---------------------------------------------------------------------------
// GET /api/public/departments?year=2025
// Returns active departments with file counts (optionally filtered by year)
// ---------------------------------------------------------------------------

export async function getDepartments(req: Request, res: Response): Promise<void> {
  try {
    const { year } = req.query as Record<string, string | undefined>;
    const yearFilter: Prisma.FileWhereInput = {};
    if (year) yearFilter.year = parseInt(year, 10);

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, color: true, head: true },
      orderBy: { name: 'asc' },
    });

    const withCounts = await Promise.all(
      departments.map(async (dept) => {
        const fileCount = await prisma.file.count({
          where: { departmentId: dept.id, ...yearFilter },
        });
        return { ...dept, fileCount };
      })
    );

    sendSuccess(res, withCounts, 'Departments retrieved');
  } catch (error) {
    console.error('public getDepartments error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/public/files?dept=CODE&year=2025&search=...&page=1&limit=20
// Returns paginated files with public R2 URLs
// ---------------------------------------------------------------------------

export async function getFiles(req: Request, res: Response): Promise<void> {
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
      where.originalName = { contains: search, mode: 'insensitive' };
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          department: { select: { name: true, code: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.file.count({ where }),
    ]);

    const filesWithUrl = files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      originalName: f.originalName,
      size: f.size,
      mimeType: f.mimeType,
      year: f.year,
      createdAt: f.createdAt,
      department: f.department,
      url: getPublicUrl(f.fileName),
    }));

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, { files: filesWithUrl, total, page: pageNum, totalPages }, 'Files retrieved');
  } catch (error) {
    console.error('public getFiles error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/public/years
// Returns all distinct years that have files
// ---------------------------------------------------------------------------

export async function getYears(_req: Request, res: Response): Promise<void> {
  try {
    const years = await prisma.file.groupBy({
      by: ['year'],
      orderBy: { year: 'desc' },
    });

    sendSuccess(res, years.map((y) => y.year), 'Years retrieved');
  } catch (error) {
    console.error('public getYears error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/public/summary?year=2025
// Returns stats for the public database page
// ---------------------------------------------------------------------------

export async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    const { year } = req.query as Record<string, string | undefined>;
    const yearFilter: Prisma.FileWhereInput = {};
    if (year) yearFilter.year = parseInt(year, 10);

    const [totalFiles, totalDepartments] = await Promise.all([
      prisma.file.count({ where: yearFilter }),
      prisma.department.count({ where: { isActive: true } }),
    ]);

    // Departments that have at least one file for this year
    const deptsWithFiles = await prisma.file.groupBy({
      by: ['departmentId'],
      where: yearFilter,
    });

    const coverage = totalDepartments > 0
      ? Math.round((deptsWithFiles.length / totalDepartments) * 100)
      : 0;

    sendSuccess(res, {
      totalFiles,
      totalDepartments: deptsWithFiles.length,
      allDepartments: totalDepartments,
      coverage,
    }, 'Summary retrieved');
  } catch (error) {
    console.error('public getSummary error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
