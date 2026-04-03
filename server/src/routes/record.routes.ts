import { Router, RequestHandler } from 'express';
import { getAll, create, update, remove, exportRecords } from '../controllers/record.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { Role } from '../types';

const router = Router();

router.get('/export', authenticate as RequestHandler, exportRecords as RequestHandler);
router.get('/', authenticate as RequestHandler, getAll as RequestHandler);
router.post('/', authenticate as RequestHandler, roleGuard(Role.ADMIN, Role.ENCODER) as RequestHandler, create as RequestHandler);
router.put('/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN, Role.ENCODER) as RequestHandler, update as RequestHandler);
router.delete('/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, remove as RequestHandler);

export default router;
