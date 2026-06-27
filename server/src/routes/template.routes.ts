import { Router, RequestHandler } from 'express';
import { listTemplates, generateTemplate } from '../controllers/template.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All template routes require authentication
router.use(authenticate as RequestHandler);

// GET /api/templates — list available template types
router.get('/', listTemplates as RequestHandler);

// POST /api/templates/:type/generate — generate filled Excel from form data
router.post('/:type/generate', generateTemplate as RequestHandler);

export default router;
