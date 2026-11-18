import { Router, RequestHandler } from 'express';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  setEventPublished,
  deleteEvent,
  createContest,
  saveContestSetup,
  setContestStatus,
  setContestResultsPublished,
  deleteContest,
  saveJudgeScores,
  addJudge,
  downloadContestPdf,
} from '../controllers/tabulation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { Role } from '../types';

const router = Router();

// Tabulation is ADMIN only; live scores never leave this router.
// The public website reads published results via /api/public/tabulation.
router.use(authenticate as RequestHandler);
router.use(roleGuard(Role.ADMIN) as RequestHandler);

router.get('/events', listEvents as RequestHandler);
router.post('/events', createEvent as RequestHandler);
router.get('/events/:id', getEvent as RequestHandler);
router.put('/events/:id', updateEvent as RequestHandler);
router.patch('/events/:id/publish', setEventPublished as RequestHandler);
router.delete('/events/:id', deleteEvent as RequestHandler);

router.post('/events/:id/contests', createContest as RequestHandler);
router.put('/contests/:id', saveContestSetup as RequestHandler);
router.patch('/contests/:id/status', setContestStatus as RequestHandler);
router.patch('/contests/:id/publish', setContestResultsPublished as RequestHandler);
router.delete('/contests/:id', deleteContest as RequestHandler);
router.post('/contests/:id/judges', addJudge as RequestHandler);
router.get('/contests/:id/pdf', downloadContestPdf as RequestHandler);
router.put('/contests/:id/judges/:judgeId/scores', saveJudgeScores as RequestHandler);

export default router;
