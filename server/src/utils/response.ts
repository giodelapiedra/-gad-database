import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string,
  statusCode = 200
): void {
  const response: ApiResponse<T> = { success: true, data, message };
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400
): void {
  const response: ApiResponse<null> = { success: false, data: null, message };
  res.status(statusCode).json(response);
}
