import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { Role } from '../types';
import multer from 'multer';
import {
  listTemplates,
  getTemplate,
  servePdf,
  createTemplate,
  updateFieldMap,
  setPublished,
  deleteTemplate,
  generateFilledPdf,
} from '../controllers/hgdg.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Public-ish (authenticated, any role)
router.get('/', authenticate, listTemplates);
router.get('/:id', authenticate, getTemplate);
router.get('/:id/pdf', authenticate, servePdf);
router.post('/generate-filled', authenticate, generateFilledPdf);

// Admin only
router.post('/', authenticate, roleGuard(Role.ADMIN), upload.single('pdf'), createTemplate);
router.patch('/:id/fieldmap', authenticate, roleGuard(Role.ADMIN), updateFieldMap);
router.patch('/:id/publish', authenticate, roleGuard(Role.ADMIN), setPublished);
router.delete('/:id', authenticate, roleGuard(Role.ADMIN), deleteTemplate);

export default router;
