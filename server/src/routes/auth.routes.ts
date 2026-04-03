import { Router, RequestHandler } from 'express';
import { login, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login as RequestHandler);
router.get('/me', authenticate as RequestHandler, me as RequestHandler);

export default router;
