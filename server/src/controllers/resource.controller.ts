import { Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { Readable } from 'stream';
import { uploadToR2, deleteFromR2, streamFromR2 } from '../utils/s3';

function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL || 'https://gaduploads.tanauancity.com';
  return `${base}/${key}`;
}

// ---------------------------------------------------------------------------
// GET /api/resources/folders?parentId=xxx  — list folders (+ files) at level
// ---------------------------------------------------------------------------

export async function getFolderContents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { parentId } = req.query as Record<string, string | undefined>;

    const where = { parentId: parentId || null };

    const [folders, files] = await Promise.all([
      prisma.resourceFolder.findMany({
        where,
        include: {
          _count: { select: { children: true, files: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.resourceFile.findMany({
        where: { folderId: parentId || null },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const filesWithUrl = files.map((f) => ({
      ...f,
      url: getPublicUrl(f.fileName),
    }));

    sendSuccess(res, { folders, files: filesWithUrl }, 'Folder contents retrieved');
  } catch (error) {
    console.error('getFolderContents error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/resources/folders/:id — get single folder (for breadcrumb)
// ---------------------------------------------------------------------------

export async function getFolder(req: AuthRequest, res: Response): Promise<void> {
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

    // Build breadcrumb path from nested parent includes
    const breadcrumb: { id: string; name: string }[] = [];
    let current: { id: string; name: string; parent?: any } | null = folder;
    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name });
      current = current.parent ?? null;
    }

    sendSuccess(res, { ...folder, breadcrumb }, 'Folder retrieved');
  } catch (error) {
    console.error('getFolder error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources/folders — create folder
// ---------------------------------------------------------------------------

export async function createFolder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const name = req.body.name as string | undefined;
    const parentId = req.body.parentId as string | undefined;

    if (!name || !name.trim()) {
      sendError(res, 'Folder name is required.');
      return;
    }

    if (parentId) {
      const parent = await prisma.resourceFolder.findUnique({ where: { id: parentId } });
      if (!parent) {
        sendError(res, 'Parent folder not found.', 404);
        return;
      }
    }

    // Check for duplicate folder name at the same level
    const duplicate = await prisma.resourceFolder.findFirst({
      where: { name: name.trim(), parentId: parentId || null },
    });
    if (duplicate) {
      sendError(res, 'A folder with this name already exists here.');
      return;
    }

    const folder = await prisma.resourceFolder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        createdById: req.user!.id,
      },
      include: {
        _count: { select: { children: true, files: true } },
        createdBy: { select: { name: true } },
      },
    });

    sendSuccess(res, folder, 'Folder created', 201);
  } catch (error) {
    console.error('createFolder error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/resources/folders/:id — rename folder
// ---------------------------------------------------------------------------

export async function renameFolder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const name = req.body.name as string | undefined;

    if (!name || !name.trim()) {
      sendError(res, 'Folder name is required.');
      return;
    }

    const existing = await prisma.resourceFolder.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Folder not found.', 404);
      return;
    }

    // Check for duplicate folder name at the same level
    const duplicate = await prisma.resourceFolder.findFirst({
      where: { name: name.trim(), parentId: existing.parentId, id: { not: id } },
    });
    if (duplicate) {
      sendError(res, 'A folder with this name already exists here.');
      return;
    }

    const folder = await prisma.resourceFolder.update({
      where: { id },
      data: { name: name.trim() },
    });

    sendSuccess(res, folder, 'Folder renamed');
  } catch (error) {
    console.error('renameFolder error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/resources/folders/:id — delete folder (cascades)
// ---------------------------------------------------------------------------

export async function deleteFolder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const folder = await prisma.resourceFolder.findUnique({ where: { id } });
    if (!folder) {
      sendError(res, 'Folder not found.', 404);
      return;
    }

    // Recursively collect all file keys for R2 cleanup
    async function collectFileKeys(folderId: string): Promise<string[]> {
      const keys: string[] = [];
      const files = await prisma.resourceFile.findMany({
        where: { folderId },
        select: { fileName: true },
      });
      keys.push(...files.map((f) => f.fileName));

      const subfolders = await prisma.resourceFolder.findMany({
        where: { parentId: folderId },
        select: { id: true },
      });
      for (const sub of subfolders) {
        keys.push(...(await collectFileKeys(sub.id)));
      }
      return keys;
    }

    const fileKeys = await collectFileKeys(id);

    // Delete from R2
    for (const key of fileKeys) {
      try {
        await deleteFromR2(key);
      } catch (e) {
        console.warn('Failed to delete R2 key:', key, e);
      }
    }

    // Cascade delete from DB
    await prisma.resourceFolder.delete({ where: { id } });

    sendSuccess(res, null, 'Folder deleted');
  } catch (error) {
    console.error('deleteFolder error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources/files — upload file(s) to a folder
// ---------------------------------------------------------------------------

export async function uploadResourceFiles(req: AuthRequest, res: Response): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      sendError(res, 'No files uploaded.');
      return;
    }

    const folderId = req.body.folderId as string | undefined;

    if (folderId) {
      const folder = await prisma.resourceFolder.findUnique({ where: { id: folderId } });
      if (!folder) {
        sendError(res, 'Folder not found.', 404);
        return;
      }
    }

    const saved = [];

    for (const file of files) {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const key = `resources/${uniqueId}-${file.originalname}`;

      await uploadToR2(key, file.buffer, file.mimetype);

      const record = await prisma.resourceFile.create({
        data: {
          fileName: key,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          folderId: folderId || null,
          uploadedById: req.user!.id,
        },
        include: { uploadedBy: { select: { name: true } } },
      });

      saved.push({ ...record, url: getPublicUrl(key) });
    }

    sendSuccess(res, saved, `${saved.length} file(s) uploaded`, 201);
  } catch (error) {
    console.error('uploadResourceFiles error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/resources/files/:id — rename file
// ---------------------------------------------------------------------------

export async function renameResourceFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const name = req.body.name as string | undefined;

    if (!name || !name.trim()) {
      sendError(res, 'File name is required.');
      return;
    }

    const existing = await prisma.resourceFile.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'File not found.', 404);
      return;
    }

    const file = await prisma.resourceFile.update({
      where: { id },
      data: { originalName: name.trim() },
      include: { uploadedBy: { select: { name: true } } },
    });

    sendSuccess(res, { ...file, url: getPublicUrl(file.fileName) }, 'File renamed');
  } catch (error) {
    console.error('renameResourceFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/resources/files/:id
// ---------------------------------------------------------------------------

export async function deleteResourceFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const file = await prisma.resourceFile.findUnique({ where: { id } });
    if (!file) {
      sendError(res, 'File not found.', 404);
      return;
    }

    await deleteFromR2(file.fileName);
    await prisma.resourceFile.delete({ where: { id } });

    sendSuccess(res, null, 'File deleted');
  } catch (error) {
    console.error('deleteResourceFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources/move — move files + folders to a target folder
// ---------------------------------------------------------------------------

export async function moveResources(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fileIds = req.body.fileIds as string[] | undefined;
    const folderIds = req.body.folderIds as string[] | undefined;
    const targetFolderId = req.body.targetFolderId as string | null | undefined;

    if ((!fileIds || fileIds.length === 0) && (!folderIds || folderIds.length === 0)) {
      sendError(res, 'No items selected.');
      return;
    }

    // Validate target folder exists (null = root)
    if (targetFolderId) {
      const target = await prisma.resourceFolder.findUnique({ where: { id: targetFolderId } });
      if (!target) {
        sendError(res, 'Target folder not found.', 404);
        return;
      }
    }

    // Prevent moving a folder into itself or its own descendant
    if (folderIds && folderIds.length > 0 && targetFolderId) {
      for (const folderId of folderIds) {
        if (folderId === targetFolderId) {
          sendError(res, 'Cannot move a folder into itself.');
          return;
        }
        // Walk up from target to root, check if we hit this folder
        let walkId: string | null = targetFolderId;
        while (walkId) {
          if (walkId === folderId) {
            sendError(res, 'Cannot move a folder into its own subfolder.');
            return;
          }
          const row: { parentId: string | null } | null = await prisma.resourceFolder.findUnique({
            where: { id: walkId },
            select: { parentId: true },
          });
          walkId = row?.parentId ?? null;
        }
      }
    }

    let movedFiles = 0;
    let movedFolders = 0;

    if (fileIds && fileIds.length > 0) {
      const result = await prisma.resourceFile.updateMany({
        where: { id: { in: fileIds } },
        data: { folderId: targetFolderId || null },
      });
      movedFiles = result.count;
    }

    if (folderIds && folderIds.length > 0) {
      const result = await prisma.resourceFolder.updateMany({
        where: { id: { in: folderIds } },
        data: { parentId: targetFolderId || null },
      });
      movedFolders = result.count;
    }

    sendSuccess(res, { movedFiles, movedFolders }, `Moved ${movedFiles + movedFolders} item(s)`);
  } catch (error) {
    console.error('moveResources error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources/bulk-delete — delete multiple files + folders
// ---------------------------------------------------------------------------

export async function bulkDeleteResources(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fileIds = req.body.fileIds as string[] | undefined;
    const folderIds = req.body.folderIds as string[] | undefined;

    if ((!fileIds || fileIds.length === 0) && (!folderIds || folderIds.length === 0)) {
      sendError(res, 'No items selected.');
      return;
    }

    let deletedFiles = 0;
    let deletedFolders = 0;

    // Delete files from R2 + DB
    if (fileIds && fileIds.length > 0) {
      const files = await prisma.resourceFile.findMany({
        where: { id: { in: fileIds } },
        select: { id: true, fileName: true },
      });

      for (const file of files) {
        try {
          await deleteFromR2(file.fileName);
        } catch (e) {
          console.warn('Failed to delete R2 key:', file.fileName, e);
        }
      }

      const result = await prisma.resourceFile.deleteMany({
        where: { id: { in: fileIds } },
      });
      deletedFiles = result.count;
    }

    // Delete folders (cascade handles children in DB, but clean R2 first)
    if (folderIds && folderIds.length > 0) {
      async function collectFileKeys(folderId: string): Promise<string[]> {
        const keys: string[] = [];
        const files = await prisma.resourceFile.findMany({
          where: { folderId },
          select: { fileName: true },
        });
        keys.push(...files.map((f) => f.fileName));

        const subfolders = await prisma.resourceFolder.findMany({
          where: { parentId: folderId },
          select: { id: true },
        });
        for (const sub of subfolders) {
          keys.push(...(await collectFileKeys(sub.id)));
        }
        return keys;
      }

      for (const folderId of folderIds) {
        const exists = await prisma.resourceFolder.findUnique({ where: { id: folderId } });
        if (!exists) continue;

        const fileKeys = await collectFileKeys(folderId);
        for (const key of fileKeys) {
          try {
            await deleteFromR2(key);
          } catch (e) {
            console.warn('Failed to delete R2 key:', key, e);
          }
        }

        await prisma.resourceFolder.delete({ where: { id: folderId } });
        deletedFolders++;
      }
    }

    sendSuccess(res, { deletedFiles, deletedFolders }, `Deleted ${deletedFiles + deletedFolders} item(s)`);
  } catch (error) {
    console.error('bulkDeleteResources error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/resources/files/:id/view — redirect to public URL
// ---------------------------------------------------------------------------

export async function viewResourceFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const file = await prisma.resourceFile.findUnique({ where: { id } });

    if (!file) {
      sendError(res, 'File not found.', 404);
      return;
    }

    res.redirect(getPublicUrl(file.fileName));
  } catch (error) {
    console.error('viewResourceFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/resources/files/:id/download — proxy download from R2
// ---------------------------------------------------------------------------

export async function downloadResourceFile(req: AuthRequest, res: Response): Promise<void> {
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
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    if (r2Response.ContentLength) {
      res.setHeader('Content-Length', r2Response.ContentLength);
    }

    const stream = r2Response.Body as Readable;
    stream.pipe(res);
  } catch (error) {
    console.error('downloadResourceFile error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
