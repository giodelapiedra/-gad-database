import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { Readable } from 'stream';
import prisma from '../utils/db';
import { sendSuccess, sendError } from '../utils/response';
import { streamFromR2 } from '../utils/s3';

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
// GET /api/public/resources?parentId=xxx
// Returns folder contents (folders + files) for the public site
// ---------------------------------------------------------------------------

export async function getResources(req: Request, res: Response): Promise<void> {
  try {
    const { parentId } = req.query as Record<string, string | undefined>;

    const [folders, files] = await Promise.all([
      prisma.resourceFolder.findMany({
        where: { parentId: parentId || null },
        include: {
          _count: { select: { children: true, files: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.resourceFile.findMany({
        where: { folderId: parentId || null },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const foldersData = folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      itemCount: f._count.children + f._count.files,
    }));

    const filesData = files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      size: f.size,
      mimeType: f.mimeType,
      url: getPublicUrl(f.fileName),
      createdAt: f.createdAt,
    }));

    sendSuccess(res, { folders: foldersData, files: filesData }, 'Resources retrieved');
  } catch (error) {
    console.error('public getResources error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/public/resources/folder/:id
// Returns folder detail with breadcrumb for public site
// ---------------------------------------------------------------------------

export async function getResourceFolder(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const folder = await prisma.resourceFolder.findUnique({
      where: { id },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: {
                  include: { parent: true },
                },
              },
            },
          },
        },
      },
    });

    if (!folder) {
      sendError(res, 'Folder not found.', 404);
      return;
    }

    const breadcrumb: { id: string; name: string }[] = [];
    let current: { id: string; name: string; parent?: any } | null = folder;
    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name });
      current = current.parent ?? null;
    }

    sendSuccess(res, { id: folder.id, name: folder.name, breadcrumb }, 'Folder retrieved');
  } catch (error) {
    console.error('public getResourceFolder error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/public/resources/view/:id — proxy file for viewing (no auth, no form)
// ---------------------------------------------------------------------------

export async function viewPublicResourceFile(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const file = await prisma.resourceFile.findUnique({ where: { id } });
    if (!file) {
      sendError(res, 'File not found.', 404);
      return;
    }

    const r2Response = await streamFromR2(file.fileName);

    if (!r2Response.Body) {
      sendError(res, 'File not available.', 404);
      return;
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (r2Response.ContentLength) {
      res.setHeader('Content-Length', r2Response.ContentLength);
    }

    const stream = r2Response.Body as Readable;
    stream.pipe(res);
  } catch (error) {
    console.error('viewPublicResourceFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/public/resources/tree/:name
// Returns a root folder (by name) with all subfolders + their files
// ---------------------------------------------------------------------------

export async function getResourceTree(req: Request, res: Response): Promise<void> {
  try {
    const name = req.params.name as string;

    const folder = await prisma.resourceFolder.findFirst({
      where: { name, parentId: null },
    });

    if (!folder) {
      sendSuccess(res, { sections: [] }, 'Resource tree retrieved');
      return;
    }

    // Get subfolders of this root folder
    const subfolders = await prisma.resourceFolder.findMany({
      where: { parentId: folder.id },
      orderBy: { name: 'asc' },
    });

    // For each subfolder, get its files
    const sections = await Promise.all(
      subfolders.map(async (sub) => {
        const files = await prisma.resourceFile.findMany({
          where: { folderId: sub.id },
          orderBy: { createdAt: 'desc' },
        });

        return {
          id: sub.id,
          name: sub.name,
          files: files.map((f) => ({
            id: f.id,
            originalName: f.originalName,
            size: f.size,
            mimeType: f.mimeType,
            url: getPublicUrl(f.fileName),
            createdAt: f.createdAt,
          })),
        };
      })
    );

    sendSuccess(res, { id: folder.id, name: folder.name, sections }, 'Resource tree retrieved');
  } catch (error) {
    console.error('public getResourceTree error:', error);
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

// ---------------------------------------------------------------------------
// POST /api/public/download — log info + stream file (resource or department)
// Body: { fileId, fileType, name, location, contactNo, organization, sex, age }
// ---------------------------------------------------------------------------

export async function publicDownload(req: Request, res: Response): Promise<void> {
  try {
    const {
      fileId,
      fileType,
      name: dlName,
      location,
      contactNo,
      organization,
      sex,
      age,
    } = req.body as Record<string, string>;

    if (!fileId || !fileType || !dlName || !location || !contactNo || !organization || !sex || !age) {
      sendError(res, 'All fields are required.');
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      sendError(res, 'Invalid age.');
      return;
    }

    if (!['MALE', 'FEMALE'].includes(sex.toUpperCase())) {
      sendError(res, 'Sex must be MALE or FEMALE.');
      return;
    }

    let fileName: string;
    let r2Key: string;
    let mimeType: string;

    if (fileType === 'resource') {
      const file = await prisma.resourceFile.findUnique({ where: { id: fileId } });
      if (!file) { sendError(res, 'File not found.', 404); return; }
      fileName = file.originalName;
      r2Key = file.fileName;
      mimeType = file.mimeType;
    } else if (fileType === 'department') {
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file) { sendError(res, 'File not found.', 404); return; }
      fileName = file.originalName;
      r2Key = file.fileName;
      mimeType = file.mimeType;
    } else {
      sendError(res, 'Invalid fileType. Must be "resource" or "department".');
      return;
    }

    // Save download log
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;

    await prisma.downloadLog.create({
      data: {
        fileType,
        fileId,
        fileName,
        name: dlName.trim(),
        location: location.trim(),
        contactNo: contactNo.trim(),
        organization: organization.trim(),
        sex: sex.toUpperCase(),
        age: ageNum,
        ip,
      },
    });

    // Stream file
    const r2Response = await streamFromR2(r2Key);

    if (!r2Response.Body) {
      sendError(res, 'File not available.', 404);
      return;
    }

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    if (r2Response.ContentLength) {
      res.setHeader('Content-Length', r2Response.ContentLength);
    }

    const stream = r2Response.Body as Readable;
    stream.pipe(res);
  } catch (error) {
    console.error('publicDownload error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

