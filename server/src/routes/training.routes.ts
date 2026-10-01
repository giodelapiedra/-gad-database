import { Router, RequestHandler } from 'express';
import {
  listTrainings,
  createTraining,
  updateTraining,
  setTrainingPublished,
  deleteTraining,
} from '../controllers/training.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { Role } from '../types';

const router = Router();

// Training management is ADMIN only; the public site reads via /api/public/trainings
router.use(authenticate as RequestHandler);
router.use(roleGuard(Role.ADMIN) as RequestHandler);

router.get('/', listTrainings as RequestHandler);
router.post('/', createTraining as RequestHandler);
router.put('/:id', updateTraining as RequestHandler);
router.patch('/:id/publish', setTrainingPublished as RequestHandler);
router.delete('/:id', deleteTraining as RequestHandler);

export default router;
