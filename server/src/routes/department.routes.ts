import { Router, RequestHandler } from 'express';
import { getAll, getOne, create, update, softDelete } from '../controllers/department.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate as RequestHandler, getAll as RequestHandler);
router.get('/:code', authenticate as RequestHandler, getOne as RequestHandler);
router.post('/', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, create as RequestHandler);
router.put('/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, update as RequestHandler);
router.delete('/:id', authenticate as RequestHandler, roleGuard(Role.ADMIN) as RequestHandler, softDelete as RequestHandler);

export default router;
