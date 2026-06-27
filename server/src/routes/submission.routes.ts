import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  create,
  list,
  pendingCount,
  departmentStatus,
  getById,
  review,
  generate,
  deleteSubmission,
  updateFormData,
  addComment,
} from '../controllers/submission.controller';
import { authenticate } from '../middleware/auth.middleware';
import { sendError } from '../utils/response';

const router = Router();

router.use(authenticate as RequestHandler);

// ── Attachment upload (reviewer's attachment on a comment) ──
const MAX_ATTACHMENT = 15 * 1024 * 1024; // 15MB
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT },
});

function uploadAttachment(req: Request, res: Response, next: NextFunction): void {
  attachmentUpload.single('attachment')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      sendError(res, err.code === 'LIMIT_FILE_SIZE' ? 'Attachment too large. Maximum size is 15MB.' : err.message, 400);
      return;
    }
    if (err instanceof Error) { sendError(res, err.message, 400); return; }
    next();
  });
}

// GET /api/submissions/pending-count — must come BEFORE /:id
router.get('/pending-count', pendingCount as RequestHandler);

// GET /api/submissions/department-status — must come BEFORE /:id
router.get('/department-status', departmentStatus as RequestHandler);

// List all (admin) or own (encoder)
router.get('/', list as RequestHandler);

// Create new submission
router.post('/', create as RequestHandler);

// Single submission
router.get('/:id', getById as RequestHandler);

// Admin review
router.patch('/:id/review', review as RequestHandler);

// Edit form data (admin: any; encoder: own returned, optionally resubmit)
router.patch('/:id', updateFormData as RequestHandler);

// Add a comment, optionally with a reviewer attachment
router.post('/:id/comments', uploadAttachment, addComment as RequestHandler);

// Generate Excel from submission
router.post('/:id/generate', generate as RequestHandler);

// Permanent delete (own submissions for encoder; any for admin)
router.delete('/:id', deleteSubmission as RequestHandler);

export default router;
