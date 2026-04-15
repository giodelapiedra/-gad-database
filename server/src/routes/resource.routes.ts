import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import {
  getFolderContents,
  getFolder,
  createFolder,
  renameFolder,
  deleteFolder,
  uploadResourceFiles,
  renameResourceFile,
  deleteResourceFile,
  moveResources,
  bulkDeleteResources,
  viewResourceFile,
  downloadResourceFile,
  getTrashContents,
  restoreResources,
  permanentDeleteResources,
  emptyTrash,
} from '../controllers/resource.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { sendError } from '../utils/response';
import { Role } from '../types';

const router = Router();

const BLOCKED_EXTS = /\.(exe|bat|cmd|sh|msi|com|scr|ps1|vbs|wsf|jar)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_EXTS.test(file.originalname)) {
      cb(new Error('Executable files are not allowed.'));
    } else {
      cb(null, true);
    }
  },
});

function handleMulterUpload(req: Request, res: Response, next: NextFunction): void {
  const handler = upload.array('files', 20);
  handler(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      sendError(res, err.message, 400);
      return;
    }
    if (err instanceof Error) {
      sendError(res, err.message, 400);
      return;
    }
    next();
  });
}

// Folders
router.get('/folders', authenticate as RequestHandler, getFolderContents as RequestHandler);
router.get('/folders/:id', authenticate as RequestHandler, getFolder as RequestHandler);
router.post('/folders', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, createFolder as RequestHandler);
router.put('/folders/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, renameFolder as RequestHandler);
router.delete('/folders/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, deleteFolder as RequestHandler);

// Files
router.post('/files', authenticate as RequestHandler, roleGuard(Role.ADMIN, Role.ENCODER) as RequestHandler, handleMulterUpload as RequestHandler, uploadResourceFiles as RequestHandler);
router.put('/files/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN, Role.ENCODER) as RequestHandler, renameResourceFile as RequestHandler);
router.delete('/files/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, deleteResourceFile as RequestHandler);
router.get('/files/:id/view', authenticate as RequestHandler, viewResourceFile as RequestHandler);
router.get('/files/:id/download', authenticate as RequestHandler, downloadResourceFile as RequestHandler);

// Bulk operations
router.post('/move', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, moveResources as RequestHandler);
router.post('/bulk-delete', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, bulkDeleteResources as RequestHandler);

// Recycle Bin (admin only)
router.get('/trash', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, getTrashContents as RequestHandler);
router.post('/trash/restore', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, restoreResources as RequestHandler);
router.post('/trash/purge', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, permanentDeleteResources as RequestHandler);
router.post('/trash/empty', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, emptyTrash as RequestHandler);

export default router;
