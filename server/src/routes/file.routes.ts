import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import { uploadFiles, getFiles, getFileYears, viewFile, deleteFile } from '../controllers/file.controller';
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

router.get('/years', authenticate as RequestHandler, getFileYears as RequestHandler);
router.get('/', authenticate as RequestHandler, getFiles as RequestHandler);
router.get('/:id/view', authenticate as RequestHandler, viewFile as RequestHandler);
router.post('/', authenticate as RequestHandler, roleGuard(Role.ADMIN, Role.ENCODER) as RequestHandler, handleMulterUpload as RequestHandler, uploadFiles as RequestHandler);
router.delete('/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, deleteFile as RequestHandler);

export default router;
