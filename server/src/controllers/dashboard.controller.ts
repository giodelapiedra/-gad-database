import { Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const yearParam = req.query.year as string | undefined;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const yearFilter = year && !isNaN(year) ? { year } : {};

    const [totalFiles, departments] = await Promise.all([
      prisma.file.count({ where: yearFilter }),
      prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, color: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Total storage size
    const sizeAgg = await prisma.file.aggregate({
      _sum: { size: true },
      where: yearFilter,
    });
    const totalSize = sizeAgg._sum.size ?? 0;

    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const total = await prisma.file.count({
          where: { departmentId: dept.id, ...yearFilter },
        });

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          color: dept.color,
          total,
        };
      })
    );

    sendSuccess(res, {
      totalFiles,
      totalSize,
      totalDepartments: departments.length,
      departments: departmentStats,
    }, 'Dashboard summary retrieved');
  } catch (error) {
    console.error('getSummary error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function getGrowth(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, color: true },
      orderBy: { name: 'asc' },
    });

    const years = await prisma.file.groupBy({
      by: ['year'],
      orderBy: { year: 'asc' },
    });

    const labels = years.map((y) => String(y.year));

    const datasets = await Promise.all(
      departments.map(async (dept) => {
        const counts = await prisma.file.groupBy({
          by: ['year'],
          where: { departmentId: dept.id },
          _count: { id: true },
          orderBy: { year: 'asc' },
        });

        const countMap = new Map(counts.map((c) => [c.year, c._count.id]));
        const data = years.map((y) => countMap.get(y.year) ?? 0);

        return {
          dept: dept.name,
          code: dept.code,
          color: dept.color,
          data,
        };
      })
    );

    sendSuccess(res, { labels, datasets }, 'Growth data retrieved');
  } catch (error) {
    console.error('getGrowth error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function getAvailableYears(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const years = await prisma.file.groupBy({
      by: ['year'],
      orderBy: { year: 'asc' },
    });

    sendSuccess(res, years.map((y) => y.year), 'Available years retrieved');
  } catch (error) {
    console.error('getAvailableYears error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function getRecent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const take = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 50);

    const files = await prisma.file.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        department: {
          select: { name: true, code: true, color: true },
        },
        uploadedBy: {
          select: { name: true },
        },
      },
    });

    sendSuccess(res, files, 'Recent files retrieved');
  } catch (error) {
    console.error('getRecent error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/download-stats?page=1&limit=20
// ---------------------------------------------------------------------------

export async function getDownloadStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit || '20', 10)));
    const skip = (pageNum - 1) * limitNum;

    const [
      totalDownloads,
      byFileType,
      bySex,
      topFiles,
      recentDownloads,
      dailyCounts,
    ] = await Promise.all([
      prisma.downloadLog.count(),

      prisma.downloadLog.groupBy({
        by: ['fileType'],
        _count: true,
      }),

      prisma.downloadLog.groupBy({
        by: ['sex'],
        _count: true,
      }),

      prisma.$queryRaw<{ fileId: string; fileName: string; fileType: string; count: bigint }[]>`
        SELECT "fileId", "fileName", "fileType", COUNT(*)::int as count
        FROM "download_logs"
        GROUP BY "fileId", "fileName", "fileType"
        ORDER BY count DESC
        LIMIT 10
      `,

      prisma.downloadLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),

      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "download_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
    ]);

    const totalPages = Math.ceil(totalDownloads / limitNum);

    sendSuccess(res, {
      totalDownloads,
      byFileType: byFileType.map((r) => ({ type: r.fileType, count: r._count })),
      bySex: bySex.map((r) => ({ sex: r.sex, count: r._count })),
      topFiles: topFiles.map((r) => ({ ...r, count: Number(r.count) })),
      recentDownloads,
      dailyCounts: dailyCounts.map((r) => ({ date: r.date, count: Number(r.count) })),
      page: pageNum,
      totalPages,
    }, 'Download stats retrieved');
  } catch (error) {
    console.error('getDownloadStats error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
