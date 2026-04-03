import { Response, NextFunction } from 'express';
import { AuthRequest, Role } from '../types';
import { sendError } from '../utils/response';

export function roleGuard(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Access denied. Not authenticated.', 401);
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      sendError(res, 'Insufficient permissions.', 403);
      return;
    }

    next();
  };
}
