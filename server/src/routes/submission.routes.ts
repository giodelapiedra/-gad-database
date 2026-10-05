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
  resolveComment,
  uploadEvidence,
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

// ── Evidence upload (proof for an AR row's Variance or Remarks) ──
const EVIDENCE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const EVIDENCE_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
]);
const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT },
  fileFilter: (_req, file, cb) => {
    // Phones and Windows often send HEIC photos / Office files as
    // application/octet-stream, so fall back to the extension.
    const ext = file.originalname.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
    if (EVIDENCE_TYPES.has(file.mimetype) || EVIDENCE_EXTS.has(ext)) cb(null, true);
    else cb(new Error('Only images, PDF, Word, Excel or PowerPoint files are allowed.'));
  },
});

function uploadEvidenceFile(req: Request, res: Response, next: NextFunction): void {
  evidenceUpload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      sendError(res, err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Maximum size is 15MB.' : err.message, 400);
      return;
    }
    if (err instanceof Error) { sendError(res, err.message, 400); return; }
    next();
  });
}

// POST /api/submissions/evidence — must come BEFORE /:id
router.post('/evidence', uploadEvidenceFile, uploadEvidence as RequestHandler);

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

// Reviewer resolves / reopens a flagged comment
router.patch('/:id/comments/:commentId', resolveComment as RequestHandler);

// Generate Excel from submission
router.post('/:id/generate', generate as RequestHandler);

// Permanent delete — own submissions for encoders; anything not yet approved
router.delete('/:id', deleteSubmission as RequestHandler);

export default router;
