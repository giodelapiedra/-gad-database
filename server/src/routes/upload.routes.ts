import { Router, RequestHandler } from 'express';
import { uploadFile, getTemplate, getLogs } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { uploadSingle } from '../middleware/upload.middleware';
import { Role } from '../types';

const router = Router();

router.get('/template', authenticate as RequestHandler, getTemplate as RequestHandler);
router.get('/logs', authenticate as RequestHandler, getLogs as RequestHandler);
router.post('/', authenticate as RequestHandler, roleGuard(Role.ADMIN, Role.ENCODER) as RequestHandler, uploadSingle('file') as RequestHandler, uploadFile as RequestHandler);

export default router;
