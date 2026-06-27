import { Router, RequestHandler } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { Role } from '../types';

const router = Router();

// All user management routes require ADMIN role
router.use(authenticate as RequestHandler);
router.use(roleGuard(Role.ADMIN) as RequestHandler);

router.get('/', getUsers as RequestHandler);
router.post('/', createUser as RequestHandler);
router.put('/:id', updateUser as RequestHandler);
router.delete('/:id', deleteUser as RequestHandler);

export default router;
