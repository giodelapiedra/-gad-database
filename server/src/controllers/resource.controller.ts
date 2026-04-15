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

// Delete R2 keys in parallel; errors are logged but do not abort.
async function deleteR2Keys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const results = await Promise.allSettled(keys.map((k) => deleteFromR2(k)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn('Failed to delete R2 key:', keys[i], r.reason);
  });
}

// Recursively collect descendant folder ids (only non-deleted, unless includeDeleted)
async function collectDescendantFolderIds(
  rootId: string,
  includeDeleted = false,
): Promise<string[]> {
  const ids: string[] = [];
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await prisma.resourceFolder.findMany({
      where: {
        parentId: current,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      select: { id: true },
    });
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// GET /api/resources/folders?parentId=xxx  — list folders (+ files) at level
// ---------------------------------------------------------------------------

export async function getFolderContents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { parentId } = req.query as Record<string, string | undefined>;

    const [folders, files] = await Promise.all([
      prisma.resourceFolder.findMany({
        where: { parentId: parentId || null, deletedAt: null },
        include: {
          _count: {
            select: {
              children: { where: { deletedAt: null } },
              files: { where: { deletedAt: null } },
            },
          },
          createdBy: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.resourceFile.findMany({
        where: { folderId: parentId || null, deletedAt: null },
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

    const folder = await prisma.resourceFolder.findFirst({
      where: { id, deletedAt: null },
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
      const parent = await prisma.resourceFolder.findFirst({
        where: { id: parentId, deletedAt: null },
      });
      if (!parent) {
        sendError(res, 'Parent folder not found.', 404);
        return;
      }
    }

    // Check for duplicate folder name at the same level (ignoring trashed)
    const duplicate = await prisma.resourceFolder.findFirst({
      where: { name: name.trim(), parentId: parentId || null, deletedAt: null },
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
        _count: {
          select: {
            children: { where: { deletedAt: null } },
            files: { where: { deletedAt: null } },
          },
        },
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

    const existing = await prisma.resourceFolder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      sendError(res, 'Folder not found.', 404);
      return;
    }

    // Check for duplicate folder name at the same level
    const duplicate = await prisma.resourceFolder.findFirst({
      where: {
        name: name.trim(),
        parentId: existing.parentId,
        deletedAt: null,
        id: { not: id },
      },
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
// DELETE /api/resources/folders/:id — soft delete folder (move to trash)
// ---------------------------------------------------------------------------

export async function deleteFolder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const folder = await prisma.resourceFolder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!folder) {
      sendError(res, 'Folder not found.', 404);
      return;
    }

    const timestamp = new Date();
    const descendantIds = await collectDescendantFolderIds(id, false);
    const allFolderIds = [id, ...descendantIds];

    await prisma.$transaction([
      prisma.resourceFolder.updateMany({
        where: { id: { in: allFolderIds }, deletedAt: null },
        data: { deletedAt: timestamp },
      }),
      prisma.resourceFile.updateMany({
        where: { folderId: { in: allFolderIds }, deletedAt: null },
        data: { deletedAt: timestamp },
      }),
    ]);

    sendSuccess(res, null, 'Folder moved to recycle bin');
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
      const folder = await prisma.resourceFolder.findFirst({
        where: { id: folderId, deletedAt: null },
      });
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

    const existing = await prisma.resourceFile.findFirst({
      where: { id, deletedAt: null },
    });
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
// DELETE /api/resources/files/:id — soft delete file (move to trash)
// ---------------------------------------------------------------------------

export async function deleteResourceFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const file = await prisma.resourceFile.findFirst({
      where: { id, deletedAt: null },
    });
    if (!file) {
      sendError(res, 'File not found.', 404);
      return;
    }

    await prisma.resourceFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'File moved to recycle bin');
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

    // Validate target folder exists and is not trashed (null = root)
    if (targetFolderId) {
      const target = await prisma.resourceFolder.findFirst({
        where: { id: targetFolderId, deletedAt: null },
      });
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
        where: { id: { in: fileIds }, deletedAt: null },
        data: { folderId: targetFolderId || null },
      });
      movedFiles = result.count;
    }

    if (folderIds && folderIds.length > 0) {
      const result = await prisma.resourceFolder.updateMany({
        where: { id: { in: folderIds }, deletedAt: null },
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
// POST /api/resources/bulk-delete — soft delete multiple files + folders
// ---------------------------------------------------------------------------

export async function bulkDeleteResources(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fileIds = req.body.fileIds as string[] | undefined;
    const folderIds = req.body.folderIds as string[] | undefined;

    if ((!fileIds || fileIds.length === 0) && (!folderIds || folderIds.length === 0)) {
      sendError(res, 'No items selected.');
      return;
    }

    const timestamp = new Date();
    let deletedFiles = 0;
    let deletedFolders = 0;

    if (fileIds && fileIds.length > 0) {
      const result = await prisma.resourceFile.updateMany({
        where: { id: { in: fileIds }, deletedAt: null },
        data: { deletedAt: timestamp },
      });
      deletedFiles = result.count;
    }

    if (folderIds && folderIds.length > 0) {
      // Collect all descendant folder ids so we cascade the soft delete
      const allFolderIds = new Set<string>();
      for (const folderId of folderIds) {
        const exists = await prisma.resourceFolder.findFirst({
          where: { id: folderId, deletedAt: null },
        });
        if (!exists) continue;
        allFolderIds.add(folderId);
        const descendants = await collectDescendantFolderIds(folderId, false);
        descendants.forEach((d) => allFolderIds.add(d));
      }

      if (allFolderIds.size > 0) {
        const idArray = Array.from(allFolderIds);
        await prisma.$transaction([
          prisma.resourceFolder.updateMany({
            where: { id: { in: idArray }, deletedAt: null },
            data: { deletedAt: timestamp },
          }),
          prisma.resourceFile.updateMany({
            where: { folderId: { in: idArray }, deletedAt: null },
            data: { deletedAt: timestamp },
          }),
        ]);
        deletedFolders = folderIds.filter((id) => allFolderIds.has(id)).length;
      }
    }

    sendSuccess(res, { deletedFiles, deletedFolders }, `Moved ${deletedFiles + deletedFolders} item(s) to recycle bin`);
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
    const file = await prisma.resourceFile.findFirst({
      where: { id, deletedAt: null },
    });

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

    const file = await prisma.resourceFile.findFirst({
      where: { id, deletedAt: null },
    });
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

// ---------------------------------------------------------------------------
// GET /api/resources/trash — list top-level trashed folders + files
// ---------------------------------------------------------------------------

export async function getTrashContents(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [folders, files] = await Promise.all([
      prisma.resourceFolder.findMany({
        where: {
          deletedAt: { not: null },
          OR: [{ parentId: null }, { parent: { deletedAt: null } }],
        },
        include: {
          _count: {
            select: {
              children: { where: { deletedAt: { not: null } } },
              files: { where: { deletedAt: { not: null } } },
            },
          },
          createdBy: { select: { name: true } },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.resourceFile.findMany({
        where: {
          deletedAt: { not: null },
          OR: [{ folderId: null }, { folder: { deletedAt: null } }],
        },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { deletedAt: 'desc' },
      }),
    ]);

    const filesWithUrl = files.map((f) => ({ ...f, url: getPublicUrl(f.fileName) }));

    sendSuccess(res, { folders, files: filesWithUrl }, 'Trash contents retrieved');
  } catch (error) {
    console.error('getTrashContents error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources/trash/restore — restore folders + files from trash
// ---------------------------------------------------------------------------

export async function restoreResources(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fileIds = req.body.fileIds as string[] | undefined;
    const folderIds = req.body.folderIds as string[] | undefined;

    if ((!fileIds || fileIds.length === 0) && (!folderIds || folderIds.length === 0)) {
      sendError(res, 'No items selected.');
      return;
    }

    let restoredFiles = 0;
    let restoredFolders = 0;

    // Restore folders: for each folder, also restore descendants that were
    // trashed at the exact same timestamp (trashed together).
    if (folderIds && folderIds.length > 0) {
      for (const folderId of folderIds) {
        const folder = await prisma.resourceFolder.findUnique({
          where: { id: folderId },
        });
        if (!folder || folder.deletedAt === null) continue;

        // If parent is trashed, restoring this folder would leave it orphaned.
        // Move it to root.
        let newParentId = folder.parentId;
        if (newParentId) {
          const parent = await prisma.resourceFolder.findUnique({
            where: { id: newParentId },
            select: { deletedAt: true },
          });
          if (!parent || parent.deletedAt !== null) {
            newParentId = null;
          }
        }

        const descendantIds = await collectDescendantFolderIds(folderId, true);
        const trashedAt = folder.deletedAt;

        await prisma.$transaction([
          prisma.resourceFolder.update({
            where: { id: folderId },
            data: { deletedAt: null, parentId: newParentId },
          }),
          prisma.resourceFolder.updateMany({
            where: { id: { in: descendantIds }, deletedAt: trashedAt },
            data: { deletedAt: null },
          }),
          prisma.resourceFile.updateMany({
            where: {
              folderId: { in: [folderId, ...descendantIds] },
              deletedAt: trashedAt,
            },
            data: { deletedAt: null },
          }),
        ]);
        restoredFolders++;
      }
    }

    // Restore files directly. If parent folder is still trashed or gone, lift
    // the file to root so it's accessible.
    if (fileIds && fileIds.length > 0) {
      for (const fileId of fileIds) {
        const file = await prisma.resourceFile.findUnique({ where: { id: fileId } });
        if (!file || file.deletedAt === null) continue;

        let newFolderId = file.folderId;
        if (newFolderId) {
          const folder = await prisma.resourceFolder.findUnique({
            where: { id: newFolderId },
            select: { deletedAt: true },
          });
          if (!folder || folder.deletedAt !== null) {
            newFolderId = null;
          }
        }

        await prisma.resourceFile.update({
          where: { id: fileId },
          data: { deletedAt: null, folderId: newFolderId },
        });
        restoredFiles++;
      }
    }

    sendSuccess(
      res,
      { restoredFiles, restoredFolders },
      `Restored ${restoredFiles + restoredFolders} item(s)`,
    );
  } catch (error) {
    console.error('restoreResources error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources/trash/purge — permanently delete items from trash
// ---------------------------------------------------------------------------

export async function permanentDeleteResources(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fileIds = req.body.fileIds as string[] | undefined;
    const folderIds = req.body.folderIds as string[] | undefined;

    if ((!fileIds || fileIds.length === 0) && (!folderIds || folderIds.length === 0)) {
      sendError(res, 'No items selected.');
      return;
    }

    let deletedFiles = 0;
    let deletedFolders = 0;

    if (fileIds && fileIds.length > 0) {
      const files = await prisma.resourceFile.findMany({
        where: { id: { in: fileIds }, deletedAt: { not: null } },
        select: { id: true, fileName: true },
      });

      await deleteR2Keys(files.map((f) => f.fileName));

      const result = await prisma.resourceFile.deleteMany({
        where: { id: { in: files.map((f) => f.id) } },
      });
      deletedFiles = result.count;
    }

    if (folderIds && folderIds.length > 0) {
      const validFolders = await prisma.resourceFolder.findMany({
        where: { id: { in: folderIds }, deletedAt: { not: null } },
        select: { id: true },
      });

      for (const { id: folderId } of validFolders) {
        const descendantIds = await collectDescendantFolderIds(folderId, true);
        const allFolderIds = [folderId, ...descendantIds];

        const r2Files = await prisma.resourceFile.findMany({
          where: { folderId: { in: allFolderIds } },
          select: { fileName: true },
        });

        await deleteR2Keys(r2Files.map((f) => f.fileName));

        // FK cascade handles descendant folder + file rows
        await prisma.resourceFolder.delete({ where: { id: folderId } });
        deletedFolders++;
      }
    }

    sendSuccess(
      res,
      { deletedFiles, deletedFolders },
      `Permanently deleted ${deletedFiles + deletedFolders} item(s)`,
    );
  } catch (error) {
    console.error('permanentDeleteResources error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources/trash/empty — permanently delete everything in trash
// ---------------------------------------------------------------------------

export async function emptyTrash(_req: AuthRequest, res: Response): Promise<void> {
  try {
    // Every file whose row will be purged — either directly trashed, or living
    // under any trashed folder (which cascade-deletes it).
    const [trashedFiles, trashedFolders] = await Promise.all([
      prisma.resourceFile.findMany({
        where: { deletedAt: { not: null } },
        select: { fileName: true },
      }),
      prisma.resourceFolder.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true },
      }),
    ]);

    const trashedFolderIds = trashedFolders.map((f) => f.id);
    const nestedLiveFiles = trashedFolderIds.length
      ? await prisma.resourceFile.findMany({
          where: { folderId: { in: trashedFolderIds }, deletedAt: null },
          select: { fileName: true },
        })
      : [];

    await deleteR2Keys([...trashedFiles, ...nestedLiveFiles].map((f) => f.fileName));

    // Cascade purges everything once trashed folders are gone; the file
    // deleteMany mops up direct-trashed files that weren't under a folder.
    await prisma.$transaction([
      prisma.resourceFolder.deleteMany({ where: { deletedAt: { not: null } } }),
      prisma.resourceFile.deleteMany({ where: { deletedAt: { not: null } } }),
    ]);

    sendSuccess(res, null, 'Recycle bin emptied');
  } catch (error) {
    console.error('emptyTrash error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
