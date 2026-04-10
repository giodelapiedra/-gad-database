import { Router, RequestHandler } from 'express';
import { getDepartments, getFiles, getYears, getSummary, getResources, getResourceFolder, getResourceTree, viewPublicResourceFile, publicDownload } from '../controllers/public.controller';

const router = Router();

// All routes here are public — no authenticate middleware
router.get('/departments', getDepartments as RequestHandler);
router.get('/files', getFiles as RequestHandler);
router.get('/years', getYears as RequestHandler);
router.get('/summary', getSummary as RequestHandler);
router.get('/resources', getResources as RequestHandler);
router.get('/resources/folder/:id', getResourceFolder as RequestHandler);
router.get('/resources/view/:id', viewPublicResourceFile as RequestHandler);
router.get('/resources/tree/:name', getResourceTree as RequestHandler);
router.post('/download', publicDownload as RequestHandler);

export default router;
