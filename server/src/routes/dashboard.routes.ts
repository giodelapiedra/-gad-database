import { Router, RequestHandler } from 'express';
import { getSummary, getGrowth, getAvailableYears, getRecent, getDownloadStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/summary', authenticate as RequestHandler, getSummary as RequestHandler);
router.get('/growth', authenticate as RequestHandler, getGrowth as RequestHandler);
router.get('/years', authenticate as RequestHandler, getAvailableYears as RequestHandler);
router.get('/recent', authenticate as RequestHandler, getRecent as RequestHandler);
router.get('/download-stats', authenticate as RequestHandler, getDownloadStats as RequestHandler);

export default router;
