import { Router, RequestHandler } from 'express';
import { list, readAll, readOne } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate as RequestHandler);

router.get('/', list as RequestHandler);
router.patch('/read-all', readAll as RequestHandler);
router.patch('/:id/read', readOne as RequestHandler);

export default router;
