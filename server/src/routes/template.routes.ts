import { Router, RequestHandler } from 'express';
import { listTemplates, generateTemplate, importTemplate } from '../controllers/template.controller';
import { uploadSingle } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All template routes require authentication
router.use(authenticate as RequestHandler);

// GET /api/templates — list available template types
router.get('/', listTemplates as RequestHandler);

// POST /api/templates/:type/generate — generate filled Excel from form data
router.post('/:type/generate', generateTemplate as RequestHandler);

// POST /api/templates/import — read a filled-in template workbook back into form data
// (multipart: file, optional type, optional sheet)
router.post('/import', uploadSingle('file') as RequestHandler, importTemplate as RequestHandler);

export default router;
