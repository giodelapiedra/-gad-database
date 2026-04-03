import { Router, RequestHandler } from 'express';
import { getDepartments, getFiles, getYears, getSummary } from '../controllers/public.controller';

const router = Router();

// All routes here are public — no authenticate middleware
router.get('/departments', getDepartments as RequestHandler);
router.get('/files', getFiles as RequestHandler);
router.get('/years', getYears as RequestHandler);
router.get('/summary', getSummary as RequestHandler);

export default router;
